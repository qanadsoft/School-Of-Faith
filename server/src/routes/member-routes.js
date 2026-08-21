import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sanitizeText } from "../utils/sanitize.js";
import {
  getMemberActivity,
  getMemberCertificates,
  getMemberCourses,
  getMemberDashboard,
  getMemberDonations,
  getMemberDownloads,
  getMemberEvents,
  getMemberPrayerRequests,
  getMemberProfile,
  getMemberTickets,
  getMemberWatchHistory,
  getReadingPlan,
  getSavedMessages,
} from "../services/member-service.js";
import { getContinueWatching, getVideoProgress, upsertVideoProgress, saveMessage } from "../services/video-service.js";

const router = Router();

router.use(requireAuth, requireRole("member"));

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const profile = await getMemberProfile(req.user.id);
    res.json(profile);
  })
);

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  bio: z.string().optional(),
  profileImage: z.string().nullable().optional(),
});

router.put(
  "/profile",
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const { firstName, lastName, bio, profileImage } = req.body;
    const result = await query(
      `
        UPDATE users
        SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          bio = COALESCE($3, bio),
          profile_image = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE profile_image END,
          updated_at = NOW()
        WHERE id = $5
        RETURNING id, first_name, last_name, email, profile_image, bio, join_date, membership_type, membership_status, is_active
      `,
      [
        firstName ? sanitizeText(firstName) : null,
        lastName ? sanitizeText(lastName) : null,
        bio !== undefined ? sanitizeText(bio) : null,
        profileImage !== undefined ? profileImage : null,
        req.user.id,
      ]
    );

    res.json(result.rows[0]);
  })
);

router.delete(
  "/profile/image",
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        UPDATE users
        SET profile_image = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING id, first_name, last_name, email, profile_image, bio, join_date, membership_type, membership_status, is_active
      `,
      [req.user.id]
    );

    res.json(result.rows[0]);
  })
);

router.get(
  "/certificates/settings",
  asyncHandler(async (req, res) => {
    const result = await query(`SELECT * FROM certificate_settings WHERE id = 1`);
    if (!result.rows[0]) {
      return res.json({
        branding_name: 'The School of Faith',
        title: 'Certificate of Completion',
        subtitle: 'This is proudly presented to',
        description: 'For successfully completing all requirements and modules of the discipleship course:',
        signature_name: 'Pastor Sarah Jenkins',
        signature_title: 'Senior Pastor & Founder',
        footer_text: 'Accredited by The School of Faith Global Leadership Network',
      });
    }
    res.json(result.rows[0]);
  })
);

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const dashboard = await getMemberDashboard(req.user.id);
    res.json(dashboard);
  })
);

router.get("/courses", asyncHandler(async (req, res) => res.json(await getMemberCourses(req.user.id))));
router.get("/watch-history", asyncHandler(async (req, res) => res.json(await getMemberWatchHistory(req.user.id))));
router.get(
  "/certificates",
  asyncHandler(async (req, res) => res.json(await getMemberCertificates(req.user.id)))
);

const claimCertSchema = z.object({
  courseId: z.string().uuid(),
});

router.post(
  "/certificates/claim",
  validate(claimCertSchema),
  asyncHandler(async (req, res) => {
    const courseId = req.body.courseId;
    const userId = req.user.id;

    // Check if course exists
    const courseRes = await query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
    if (!courseRes.rows[0]) {
      return res.status(404).json({ message: "Course not found." });
    }

    // Check if certificate already exists
    const existing = await query(
      `SELECT * FROM certificates WHERE member_id = $1 AND course_id = $2`,
      [userId, courseId]
    );
    if (existing.rows[0]) {
      return res.json(existing.rows[0]);
    }

    const certNum = `SOF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const result = await query(
      `
        INSERT INTO certificates (member_id, course_id, certificate_number, issue_date, status, title)
        VALUES ($1, $2, $3, CURRENT_DATE, 'valid', $4)
        RETURNING *
      `,
      [userId, courseId, certNum, `Certificate of Completion - ${courseRes.rows[0].title}`]
    );

    // Update enrollment status to completed
    await query(
      `
        UPDATE course_enrollments
        SET status = 'completed', completed_at = NOW()
        WHERE member_id = $1 AND course_id = $2
      `,
      [userId, courseId]
    );

    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        VALUES ($1, 'certificate_earned', $2, 'certificate', $3)
      `,
      [userId, `Earned certificate for: ${courseRes.rows[0].title}`, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  })
);
router.get("/events", asyncHandler(async (req, res) => res.json(await getMemberEvents(req.user.id))));
router.get("/tickets", asyncHandler(async (req, res) => res.json(await getMemberTickets(req.user.id))));
router.get(
  "/donations",
  asyncHandler(async (req, res) => res.json(await getMemberDonations(req.user.id)))
);
router.get(
  "/prayer-requests",
  asyncHandler(async (req, res) => res.json(await getMemberPrayerRequests(req.user.id)))
);
router.get(
  "/downloads",
  asyncHandler(async (req, res) => res.json(await getMemberDownloads(req.user.id)))
);

const downloadSchema = z.object({
  resourceName: z.string().min(1),
  title: z.string().optional(),
  resourceType: z.string().default("video"),
  fileUrl: z.string().optional().nullable(),
  resourceUrl: z.string().optional().nullable(),
});

router.post(
  "/downloads",
  validate(downloadSchema),
  asyncHandler(async (req, res) => {
    const title = req.body.title || req.body.resourceName;
    const resourceUrl = req.body.resourceUrl || req.body.fileUrl || null;
    const result = await query(
      `
        INSERT INTO downloads (member_id, resource_name, title, resource_type, file_url, resource_url, downloaded_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `,
      [
        req.user.id,
        sanitizeText(req.body.resourceName),
        sanitizeText(title),
        req.body.resourceType,
        req.body.fileUrl || resourceUrl,
        resourceUrl,
      ]
    );

    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        VALUES ($1, 'resource_downloaded', $2, 'download', $3)
      `,
      [req.user.id, `Downloaded: ${sanitizeText(title)}`, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.delete(
  "/downloads/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM downloads WHERE id = $1 AND member_id = $2`, [
      req.params.id,
      req.user.id,
    ]);
    res.status(204).send();
  })
);

router.get(
  "/saved-messages",
  asyncHandler(async (req, res) => res.json(await getSavedMessages(req.user.id)))
);
router.get(
  "/reading-plan",
  asyncHandler(async (req, res) => res.json(await getReadingPlan(req.user.id)))
);

router.get(
  "/reading-plans/featured",
  asyncHandler(async (req, res) => {
    let result = await query(
      `SELECT * FROM reading_plans WHERE is_featured = TRUE AND active = TRUE ORDER BY updated_at DESC LIMIT 1`
    );
    if (!result.rows[0]) {
      result = await query(`SELECT * FROM reading_plans WHERE active = TRUE ORDER BY created_at ASC LIMIT 1`);
    }
    if (!result.rows[0]) {
      return res.json(null);
    }
    const plan = result.rows[0];
    const itemsRes = await query(
      `SELECT * FROM reading_plan_items WHERE plan_id = $1 ORDER BY day_number ASC`,
      [plan.id]
    );
    let progressRows = [];
    if (req.user?.id) {
      const progRes = await query(
        `SELECT item_id, notes, completed_at FROM member_reading_progress WHERE member_id = $1 AND plan_id = $2`,
        [req.user.id, plan.id]
      );
      progressRows = progRes.rows;
    }
    res.json({
      ...plan,
      items: itemsRes.rows,
      progress: progressRows,
    });
  })
);

router.post(
  "/reading-plans/:id/progress/:itemId",
  asyncHandler(async (req, res) => {
    const { id: planId, itemId } = req.params;
    const { notes } = req.body || {};
    const check = await query(
      `SELECT id FROM member_reading_progress WHERE member_id = $1 AND item_id = $2`,
      [req.user.id, itemId]
    );
    let completed = false;
    if (check.rows[0]) {
      // Allow unmarking
      await query(`DELETE FROM member_reading_progress WHERE member_id = $1 AND item_id = $2`, [
        req.user.id,
        itemId,
      ]);
      completed = false;
    } else {
      // Check if already completed a day today
      const todayCheck = await query(
        `SELECT id FROM member_reading_progress 
         WHERE member_id = $1 AND plan_id = $2 AND completed_at::date = CURRENT_DATE`,
        [req.user.id, planId]
      );
      if (todayCheck.rows.length > 0) {
        return res.status(400).json({
          message: "You have already completed today's reading. Next day will unlock tomorrow when the date changes.",
          code: "DAILY_LIMIT_REACHED"
        });
      }

      await query(
        `
          INSERT INTO member_reading_progress (member_id, plan_id, item_id, notes, completed_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (member_id, item_id) DO UPDATE SET notes = EXCLUDED.notes, completed_at = NOW()
        `,
        [req.user.id, planId, itemId, notes || null]
      );
      completed = true;
    }
    res.json({ completed });
  })
);
router.get(
  "/activity",
  asyncHandler(async (req, res) => res.json(await getMemberActivity(req.user.id)))
);

const prayerRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["active", "answered", "archived"]).default("active"),
  isPrivate: z.boolean().default(true),
});

router.post(
  "/prayer-requests",
  validate(prayerRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO prayer_requests (member_id, title, description, status, is_private)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        req.user.id,
        sanitizeText(req.body.title),
        sanitizeText(req.body.description),
        req.body.status,
        req.body.isPrivate,
      ]
    );

    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        VALUES ($1, 'prayer_request_submitted', $2, 'prayer_request', $3)
      `,
      [req.user.id, `Submitted prayer request: ${sanitizeText(req.body.title)}`, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/prayer-requests/:id",
  validate(prayerRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        UPDATE prayer_requests
        SET title = $1, description = $2, status = $3, is_private = $4, updated_at = NOW()
        WHERE id = $5 AND member_id = $6
        RETURNING *
      `,
      [
        sanitizeText(req.body.title),
        sanitizeText(req.body.description),
        req.body.status,
        req.body.isPrivate,
        req.params.id,
        req.user.id,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Prayer request not found." });
    }

    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        VALUES ($1, 'prayer_request_updated', $2, 'prayer_request', $3)
      `,
      [req.user.id, `Updated prayer request: ${sanitizeText(req.body.title)}`, result.rows[0].id]
    );

    res.json(result.rows[0]);
  })
);

router.delete(
  "/saved-messages/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM saved_messages WHERE id = $1 AND member_id = $2`, [
      req.params.id,
      req.user.id,
    ]);
    res.status(204).send();
  })
);

router.get("/continue-watching", asyncHandler(async (req, res) => {
  res.json(await getContinueWatching(req.user.id));
}));

router.get("/video-progress/:messageId", asyncHandler(async (req, res) => {
  const progress = await getVideoProgress(req.user.id, req.params.messageId);
  res.json(progress || null);
}));

const videoProgressSchema = z.object({
  messageId: z.string().uuid(),
  lastPositionSeconds: z.number().int().min(0),
  watchDurationSeconds: z.number().int().min(0),
  progressPercentage: z.number().min(0).max(100),
  isCompleted: z.boolean().default(false),
});

router.post("/video-progress", validate(videoProgressSchema), asyncHandler(async (req, res) => {
  const result = await upsertVideoProgress(req.user.id, req.body);
  res.json(result);
}));

const saveMessageSchema = z.object({
  messageId: z.string().uuid(),
});

router.post("/saved-messages", validate(saveMessageSchema), asyncHandler(async (req, res) => {
  const result = await saveMessage(req.user.id, req.body.messageId);
  res.status(201).json(result);
}));

export default router;
