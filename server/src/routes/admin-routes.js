import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sanitizeText } from "../utils/sanitize.js";
import {
  getAdminDashboard,
  getAdminActivity,
  getTableRows,
  listMembers,
  getMemberById,
  getMemberStats,
} from "../services/admin-service.js";
import {
  getAdminPrayerRequests,
  getAdminPrayerStats,
  updatePrayerStatus,
  getAdminPrayerFocuses,
  createPrayerFocus,
  updatePrayerFocus,
  deletePrayerFocus,
} from "../services/prayer-service.js";
import {
  getAdminCourseLessons,
  createAdminLesson,
  updateAdminLesson,
  deleteAdminLesson,
  getAdminCourseEnrollments,
} from "../services/course-service.js";
import {
  getAdminCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getAdminDonationStats,
  getAdminDonationsList,
  recordDonation,
} from "../services/donation-service.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

// ─── Dashboard ──────────────────────────────────────────────────────────────
router.get("/dashboard", asyncHandler(async (req, res) => res.json(await getAdminDashboard())));
router.get("/activity", asyncHandler(async (req, res) => res.json(await getAdminActivity())));

// ─── Members ─────────────────────────────────────────────────────────────────
router.get("/members", asyncHandler(async (req, res) => res.json(await listMembers())));

router.get(
  "/members/:id",
  asyncHandler(async (req, res) => {
    const member = await getMemberById(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found." });
    res.json(member);
  })
);

router.get(
  "/members/:id/stats",
  asyncHandler(async (req, res) => res.json(await getMemberStats(req.params.id)))
);

const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  membershipType: z.string().min(1).default("Member"),
  membershipStatus: z.enum(["active", "inactive", "suspended"]).default("active"),
  isActive: z.boolean().default(true),
});

router.post(
  "/members",
  validate(createMemberSchema),
  asyncHandler(async (req, res) => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash(req.body.password, 10);

    // Find member role id
    const roleRes = await query(`SELECT id FROM roles WHERE name = 'member' LIMIT 1`);
    const memberRoleId = roleRes.rows[0]?.id;

    const result = await query(
      `
        INSERT INTO users
          (first_name, last_name, email, password_hash, membership_type, membership_status, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, first_name, last_name, email, join_date, membership_type, membership_status, is_active
      `,
      [
        sanitizeText(req.body.firstName),
        sanitizeText(req.body.lastName),
        req.body.email.toLowerCase(),
        hash,
        sanitizeText(req.body.membershipType),
        req.body.membershipStatus,
        req.body.isActive,
      ]
    );

    const user = result.rows[0];

    if (memberRoleId) {
      await query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, memberRoleId]
      );
    }

    res.status(201).json(user);
  })
);

const memberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  membershipType: z.string().min(1),
  membershipStatus: z.enum(["active", "inactive", "suspended"]),
  isActive: z.boolean(),
  bio: z.string().optional().default(""),
  profileImage: z.string().nullable().optional(),
});

router.put(
  "/members/:id",
  validate(memberSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        UPDATE users
        SET
          first_name = $1,
          last_name = $2,
          email = $3,
          membership_type = $4,
          membership_status = $5,
          is_active = $6,
          bio = $7,
          profile_image = COALESCE($8, profile_image),
          updated_at = NOW()
        WHERE id = $9
        RETURNING id, first_name, last_name, email, profile_image, bio, join_date, membership_type, membership_status, is_active
      `,
      [
        sanitizeText(req.body.firstName),
        sanitizeText(req.body.lastName),
        req.body.email.toLowerCase(),
        sanitizeText(req.body.membershipType),
        req.body.membershipStatus,
        req.body.isActive,
        sanitizeText(req.body.bio ?? ""),
        req.body.profileImage ?? null,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Member not found." });
    res.json(result.rows[0]);
  })
);

// ─── Tags ────────────────────────────────────────────────────────────────────
router.get("/tags", asyncHandler(async (req, res) => res.json(await getTableRows("tags"))));

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  textColor: z.string().min(1),
});

router.post(
  "/tags",
  validate(tagSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `INSERT INTO tags (name, color, text_color) VALUES ($1, $2, $3) RETURNING *`,
      [sanitizeText(req.body.name), req.body.color, req.body.textColor]
    );
    res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/tags/:id",
  validate(tagSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE tags SET name = $1, color = $2, text_color = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [sanitizeText(req.body.name), req.body.color, req.body.textColor, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Tag not found." });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/tags/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM tags WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

router.post(
  "/members/:id/tags/:tagId",
  asyncHandler(async (req, res) => {
    await query(
      `INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.params.tagId]
    );
    res.status(201).json({ message: "Tag assigned." });
  })
);

router.delete(
  "/members/:id/tags/:tagId",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM user_tags WHERE user_id = $1 AND tag_id = $2`, [
      req.params.id,
      req.params.tagId,
    ]);
    res.status(204).send();
  })
);

// ─── Courses ─────────────────────────────────────────────────────────────────
router.get("/courses", asyncHandler(async (req, res) => res.json(await getTableRows("courses"))));
router.get("/enrollments", asyncHandler(async (req, res) => res.json(await getTableRows("course_enrollments", "enrolled_at DESC"))));
router.get("/purchases", asyncHandler(async (req, res) => res.json(await getTableRows("course_purchases", "purchased_at DESC"))));

router.get(
  "/members/:id/enrollments",
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        SELECT ce.*, JSON_BUILD_OBJECT(
          'id', c.id, 'title', c.title, 'instructor', c.instructor,
          'category', c.category, 'archived', c.archived
        ) AS course
        FROM course_enrollments ce
        JOIN courses c ON c.id = ce.course_id
        WHERE ce.member_id = $1
        ORDER BY ce.enrolled_at DESC
      `,
      [req.params.id]
    );
    res.json(result.rows);
  })
);

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  instructor: z.string().min(1),
  category: z.string().min(1),
  difficulty: z.string().min(1),
  durationMinutes: z.number().int().nonnegative(),
  imageUrl: z.string().nullable().optional(),
  archived: z.boolean().optional(),
});

router.post(
  "/courses",
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO courses (title, description, instructor, category, difficulty, duration_minutes, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        sanitizeText(req.body.title),
        sanitizeText(req.body.description),
        sanitizeText(req.body.instructor),
        sanitizeText(req.body.category),
        sanitizeText(req.body.difficulty),
        req.body.durationMinutes,
        req.body.imageUrl ?? null,
      ]
    );
    res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/courses/:id",
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        UPDATE courses
        SET title = $1, description = $2, instructor = $3, category = $4,
            difficulty = $5, duration_minutes = $6, image_url = $7,
            archived = COALESCE($8, archived), updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `,
      [
        sanitizeText(req.body.title),
        sanitizeText(req.body.description),
        sanitizeText(req.body.instructor),
        sanitizeText(req.body.category),
        sanitizeText(req.body.difficulty),
        req.body.durationMinutes,
        req.body.imageUrl ?? null,
        req.body.archived ?? null,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Course not found." });
    res.json(result.rows[0]);
  })
);

router.patch(
  "/courses/:id/archive",
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE courses SET archived = NOT archived, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Course not found." });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/courses/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM courses WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

// ─── Course Lessons (Admin) ──────────────────────────────────────────────────
router.get(
  "/courses/:id/lessons",
  asyncHandler(async (req, res) => {
    const lessons = await getAdminCourseLessons(req.params.id);
    res.json(lessons);
  })
);

const lessonSchema = z.object({
  title: z.string().min(1),
  durationMinutes: z.number().int().nonnegative().default(30),
  sortOrder: z.number().int().optional(),
  videoUrl: z.string().nullable().optional(),
});

router.post(
  "/courses/:id/lessons",
  validate(lessonSchema),
  asyncHandler(async (req, res) => {
    const lesson = await createAdminLesson(req.params.id, req.body);
    res.status(201).json(lesson);
  })
);

router.put(
  "/courses/:id/lessons/:lessonId",
  validate(lessonSchema.partial()),
  asyncHandler(async (req, res) => {
    const lesson = await updateAdminLesson(req.params.lessonId, req.body);
    if (!lesson) return res.status(404).json({ message: "Lesson not found." });
    res.json(lesson);
  })
);

router.delete(
  "/courses/:id/lessons/:lessonId",
  asyncHandler(async (req, res) => {
    await deleteAdminLesson(req.params.lessonId);
    res.status(204).send();
  })
);

router.get(
  "/courses/:id/enrollment-stats",
  asyncHandler(async (req, res) => {
    const enrollments = await getAdminCourseEnrollments(req.params.id);
    res.json(enrollments);
  })
);

const enrollmentSchema = z.object({
  memberId: z.string().uuid(),
  courseId: z.string().uuid(),
  status: z.enum(["active", "completed", "cancelled"]).default("active"),
});

router.post(
  "/enrollments",
  validate(enrollmentSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO course_enrollments (member_id, course_id, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (member_id, course_id)
        DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
        RETURNING *
      `,
      [req.body.memberId, req.body.courseId, req.body.status]
    );

    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        SELECT $1, 'course_enrolled', 'Enrolled in ' || c.title, 'course', $2
        FROM courses c WHERE c.id = $2
      `,
      [req.body.memberId, req.body.courseId]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.patch(
  "/enrollments/:id",
  asyncHandler(async (req, res) => {
    const statusSchema = z.object({ status: z.enum(["active", "completed", "cancelled"]) });
    const { status } = statusSchema.parse(req.body);
    const completedAt = status === "completed" ? "NOW()" : "NULL";
    const result = await query(
      `
        UPDATE course_enrollments
        SET status = $1, completed_at = ${completedAt}, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Enrollment not found." });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/enrollments/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM course_enrollments WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

// ─── Watch History ────────────────────────────────────────────────────────────
router.get("/watch-activity", asyncHandler(async (req, res) => {
  const result = await query(
    `
      SELECT
        wh.*,
        JSON_BUILD_OBJECT('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name) AS member,
        JSON_BUILD_OBJECT('id', c.id, 'title', c.title) AS course
      FROM watch_history wh
      JOIN users u ON u.id = wh.member_id
      JOIN courses c ON c.id = wh.course_id
      ORDER BY wh.watched_at DESC
    `
  );
  res.json(result.rows);
}));

const watchActivitySchema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().nullable().optional(),
  watchDurationMinutes: z.number().int().positive(),
  completionPercentage: z.number().min(0).max(100).optional().default(0),
});

router.post(
  "/watch-activity",
  validate(watchActivitySchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO watch_history (member_id, course_id, lesson_id, watch_duration_minutes, completion_percentage)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        req.body.userId,
        req.body.courseId,
        req.body.lessonId ?? null,
        req.body.watchDurationMinutes,
        req.body.completionPercentage ?? 0,
      ]
    );

    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        VALUES ($1, 'video_watched', $2, 'course', $3)
      `,
      [
        req.body.userId,
        `Watched ${req.body.watchDurationMinutes} minutes of course content`,
        req.body.courseId,
      ]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.delete(
  "/watch-activity/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM watch_history WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

// ─── Certificates ─────────────────────────────────────────────────────────────
router.get("/certificates", asyncHandler(async (req, res) => {
  const result = await query(
    `
      SELECT
        cert.*,
        JSON_BUILD_OBJECT('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name) AS member,
        JSON_BUILD_OBJECT('id', c.id, 'title', c.title) AS course
      FROM certificates cert
      JOIN users u ON u.id = cert.member_id
      JOIN courses c ON c.id = cert.course_id
      ORDER BY cert.issue_date DESC
    `
  );
  res.json(result.rows);
}));

router.get("/certificates/settings", asyncHandler(async (req, res) => {
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
}));

const certificateSettingsSchema = z.object({
  branding_name: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  signature_name: z.string().optional(),
  signature_title: z.string().optional(),
  footer_text: z.string().optional(),
});

router.put(
  "/certificates/settings",
  validate(certificateSettingsSchema),
  asyncHandler(async (req, res) => {
    const { branding_name, title, subtitle, description, signature_name, signature_title, footer_text } = req.body;
    const result = await query(
      `
        INSERT INTO certificate_settings (id, branding_name, title, subtitle, description, signature_name, signature_title, footer_text, updated_at)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET
          branding_name = EXCLUDED.branding_name,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          description = EXCLUDED.description,
          signature_name = EXCLUDED.signature_name,
          signature_title = EXCLUDED.signature_title,
          footer_text = EXCLUDED.footer_text,
          updated_at = NOW()
        RETURNING *
      `,
      [
        branding_name || 'The School of Faith',
        title || 'Certificate of Completion',
        subtitle || 'This is proudly presented to',
        description || 'For successfully completing all requirements and modules of the discipleship course:',
        signature_name || 'Pastor Sarah Jenkins',
        signature_title || 'Senior Pastor & Founder',
        footer_text || 'Accredited by The School of Faith Global Leadership Network',
      ]
    );

    res.json(result.rows[0]);
  })
);

const certificateSchema = z.object({
  memberId: z.string().uuid(),
  courseId: z.string().uuid(),
  certificateNumber: z.string().min(1),
  title: z.string().min(1),
  issueDate: z.string().default(() => new Date().toISOString().split("T")[0]),
  status: z.enum(["valid", "revoked"]).default("valid"),
});

router.post(
  "/certificates",
  validate(certificateSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO certificates (member_id, course_id, certificate_number, title, issue_date, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        req.body.memberId,
        req.body.courseId,
        sanitizeText(req.body.certificateNumber),
        sanitizeText(req.body.title),
        req.body.issueDate,
        req.body.status,
      ]
    );

    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        SELECT $1, 'certificate_earned', 'Earned certificate: ' || $2, 'course', $3
      `,
      [req.body.memberId, sanitizeText(req.body.title), req.body.courseId]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.patch(
  "/certificates/:id/revoke",
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE certificates SET status = 'revoked', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Certificate not found." });
    res.json(result.rows[0]);
  })
);

// ─── Events ───────────────────────────────────────────────────────────────────
router.get("/events", asyncHandler(async (req, res) => {
  const result = await query(
    `
      SELECT
        e.*,
        COUNT(er.id)::int AS registration_count,
        COUNT(ea.id) FILTER (WHERE ea.status = 'attended')::int AS attendance_count
      FROM events e
      LEFT JOIN event_registrations er ON er.event_id = e.id
      LEFT JOIN event_attendance ea ON ea.event_id = e.id
      GROUP BY e.id
      ORDER BY e.starts_at DESC
    `
  );
  res.json(result.rows);
}));

router.get(
  "/events/:id/registrations",
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        SELECT
          er.*,
          COALESCE(ea.status, 'registered') AS attendance_status,
          JSON_BUILD_OBJECT('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name, 'email', u.email) AS member
        FROM event_registrations er
        JOIN users u ON u.id = er.member_id
        LEFT JOIN event_attendance ea ON ea.event_id = er.event_id AND ea.member_id = er.member_id
        WHERE er.event_id = $1
        ORDER BY er.registered_at DESC
      `,
      [req.params.id]
    );
    res.json(result.rows);
  })
);

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable().optional(),
  location: z.string().default(""),
  capacity: z.number().int().nonnegative().default(0),
  archived: z.boolean().optional().default(false),
});

router.post(
  "/events",
  validate(eventSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO events (title, description, starts_at, ends_at, location, capacity, archived)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        sanitizeText(req.body.title),
        sanitizeText(req.body.description),
        req.body.startsAt,
        req.body.endsAt ?? null,
        sanitizeText(req.body.location),
        req.body.capacity,
        req.body.archived ?? false,
      ]
    );
    res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/events/:id",
  validate(eventSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        UPDATE events
        SET title = $1, description = $2, starts_at = $3, ends_at = $4,
            location = $5, capacity = $6, archived = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `,
      [
        sanitizeText(req.body.title),
        sanitizeText(req.body.description),
        req.body.startsAt,
        req.body.endsAt ?? null,
        sanitizeText(req.body.location),
        req.body.capacity,
        req.body.archived ?? false,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Event not found." });
    res.json(result.rows[0]);
  })
);

router.patch(
  "/events/:id/archive",
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE events SET archived = NOT archived, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Event not found." });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/events/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM events WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

const attendanceSchema = z.object({
  userId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: z.enum(["registered", "attended", "cancelled", "no_show"]),
});

router.post(
  "/event-attendance",
  validate(attendanceSchema),
  asyncHandler(async (req, res) => {
    // Upsert attendance record
    const result = await query(
      `
        INSERT INTO event_attendance (member_id, event_id, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (member_id, event_id)
        DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
        RETURNING *
      `,
      [req.body.userId, req.body.eventId, req.body.status]
    );

    // Log attended activity
    if (req.body.status === "attended") {
      await query(
        `
          INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
          SELECT $1, 'event_attended', 'Attended ' || e.title, 'event', $2
          FROM events e WHERE e.id = $2
          ON CONFLICT DO NOTHING
        `,
        [req.body.userId, req.body.eventId]
      );
    }

    res.json(result.rows[0]);
  })
);

const registrationSchema = z.object({
  memberId: z.string().uuid(),
  eventId: z.string().uuid(),
  registrationStatus: z.enum(["registered", "cancelled", "no_show"]).default("registered"),
});

router.post(
  "/event-registrations",
  validate(registrationSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO event_registrations (member_id, event_id, registration_status)
        VALUES ($1, $2, $3)
        ON CONFLICT (member_id, event_id)
        DO UPDATE SET registration_status = EXCLUDED.registration_status, updated_at = NOW()
        RETURNING *
      `,
      [req.body.memberId, req.body.eventId, req.body.registrationStatus]
    );
    res.status(201).json(result.rows[0]);
  })
);

router.delete(
  "/event-registrations/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM event_registrations WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

// ─── Event Tickets ────────────────────────────────────────────────────────────
router.get("/event-tickets", asyncHandler(async (req, res) => {
  const result = await query(
    `
      SELECT
        et.*,
        JSON_BUILD_OBJECT('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name, 'email', u.email) AS member,
        JSON_BUILD_OBJECT('id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'location', e.location) AS event
      FROM event_tickets et
      JOIN users u ON u.id = et.member_id
      JOIN events e ON e.id = et.event_id
      ORDER BY et.issued_at DESC
    `
  );
  res.json(result.rows);
}));

const ticketSchema = z.object({
  memberId: z.string().uuid(),
  eventId: z.string().uuid(),
  ticketNumber: z.string().optional(),
  attendanceStatus: z.enum(["registered", "attended", "cancelled", "no_show"]).default("registered"),
  ticketStatus: z.enum(["valid", "used", "cancelled"]).default("valid"),
});

router.post(
  "/event-tickets",
  validate(ticketSchema),
  asyncHandler(async (req, res) => {
    const ticketNumber =
      req.body.ticketNumber ??
      `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Ensure registration exists
    const regResult = await query(
      `
        INSERT INTO event_registrations (member_id, event_id, registration_status)
        VALUES ($1, $2, 'registered')
        ON CONFLICT (member_id, event_id) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `,
      [req.body.memberId, req.body.eventId]
    );
    const registrationId = regResult.rows[0]?.id;

    const result = await query(
      `
        INSERT INTO event_tickets (member_id, event_id, registration_id, ticket_number, attendance_status, ticket_status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        req.body.memberId,
        req.body.eventId,
        registrationId,
        sanitizeText(ticketNumber),
        req.body.attendanceStatus,
        req.body.ticketStatus,
      ]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.patch(
  "/event-tickets/:id",
  asyncHandler(async (req, res) => {
    const patchSchema = z.object({
      ticketStatus: z.enum(["valid", "used", "cancelled"]).optional(),
      attendanceStatus: z.enum(["registered", "attended", "cancelled", "no_show"]).optional(),
    });
    const { ticketStatus, attendanceStatus } = patchSchema.parse(req.body);

    const result = await query(
      `
        UPDATE event_tickets
        SET
          ticket_status = COALESCE($1, ticket_status),
          attendance_status = COALESCE($2, attendance_status),
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [ticketStatus ?? null, attendanceStatus ?? null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Ticket not found." });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/event-tickets/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM event_tickets WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

// ─── Messages / Videos ────────────────────────────────────────────────────────
router.get("/messages", asyncHandler(async (req, res) => {
  const result = await query(
    `
      SELECT
        m.*,
        (SELECT COUNT(*)::int FROM saved_messages sm WHERE sm.message_id = m.id) AS saved_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', t.id, 'name', t.name, 'slug', t.slug, 'icon', t.icon)
            ORDER BY t.sort_order
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS topics
      FROM messages m
      LEFT JOIN message_topics mt ON mt.message_id = m.id
      LEFT JOIN topics t ON t.id = mt.topic_id
      GROUP BY m.id
      ORDER BY m.published_at DESC
    `
  );
  res.json(result.rows);
}));

const messageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  speaker: z.string().min(1, "Speaker is required"),
  category: z.string().nullable().optional().default("General"),
  description: z.string().nullable().optional().default(""),
  thumbnailUrl: z.string().nullable().optional().or(z.literal("")),
  videoUrl: z.string().nullable().optional().or(z.literal("")),
  durationMinutes: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === "") return 0;
      const n = Number(val);
      return isNaN(n) || n < 0 ? 0 : Math.floor(n);
    }),
  originalUrl: z.string().nullable().optional().default("#"),
  publishedAt: z.string().nullable().optional().default(() => new Date().toISOString().split("T")[0]),
  archived: z.boolean().optional().default(false),
  topicIds: z.array(z.string()).optional().default([]),
});

router.post(
  "/messages",
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO messages (title, speaker, category, description, thumbnail_url, video_url, duration_minutes, original_url, published_at, archived)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        sanitizeText(req.body.title),
        sanitizeText(req.body.speaker),
        sanitizeText(req.body.category),
        sanitizeText(req.body.description ?? ""),
        req.body.thumbnailUrl ?? null,
        req.body.videoUrl ?? null,
        req.body.durationMinutes ?? 0,
        req.body.originalUrl || "#",
        req.body.publishedAt,
        req.body.archived ?? false,
      ]
    );

    const message = result.rows[0];

    // Associate topics if provided
    if (req.body.topicIds && req.body.topicIds.length > 0) {
      for (const topicId of req.body.topicIds) {
        await query(
          `INSERT INTO message_topics (message_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [message.id, topicId]
        );
      }
    }

    res.status(201).json(message);
  })
);

router.put(
  "/messages/:id",
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        UPDATE messages
        SET title = $1, speaker = $2, category = $3, description = $4,
            thumbnail_url = $5, video_url = $6, duration_minutes = $7,
            original_url = $8, published_at = $9, archived = $10, updated_at = NOW()
        WHERE id = $11
        RETURNING *
      `,
      [
        sanitizeText(req.body.title),
        sanitizeText(req.body.speaker),
        sanitizeText(req.body.category),
        sanitizeText(req.body.description ?? ""),
        req.body.thumbnailUrl ?? null,
        req.body.videoUrl ?? null,
        req.body.durationMinutes ?? 0,
        req.body.originalUrl || "#",
        req.body.publishedAt,
        req.body.archived ?? false,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Message not found." });

    // Sync topics
    if (req.body.topicIds !== undefined) {
      await query(`DELETE FROM message_topics WHERE message_id = $1`, [req.params.id]);
      for (const topicId of req.body.topicIds) {
        await query(
          `INSERT INTO message_topics (message_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [req.params.id, topicId]
        );
      }
    }

    res.json(result.rows[0]);
  })
);

router.patch(
  "/messages/:id/archive",
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE messages SET archived = NOT archived, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Message not found." });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/messages/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM messages WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

// ─── Reading Plans ────────────────────────────────────────────────────────────
router.get("/reading-plans", asyncHandler(async (req, res) => {
  const result = await query(
    `
      SELECT rp.*,
        (SELECT COUNT(*)::int FROM reading_plan_items rpi WHERE rpi.plan_id = rp.id) AS item_count
      FROM reading_plans rp
      ORDER BY rp.created_at DESC
    `
  );
  res.json(result.rows);
}));

router.get(
  "/reading-plans/:id/items",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM reading_plan_items WHERE plan_id = $1 ORDER BY day_number`,
      [req.params.id]
    );
    res.json(result.rows);
  })
);

router.get(
  "/reading-plans/:id/progress",
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        SELECT
          mrp.member_id,
          u.first_name,
          u.last_name,
          COUNT(mrp.id)::int AS completed_days,
          rp.total_days
        FROM member_reading_progress mrp
        JOIN users u ON u.id = mrp.member_id
        JOIN reading_plans rp ON rp.id = mrp.plan_id
        WHERE mrp.plan_id = $1
        GROUP BY mrp.member_id, u.first_name, u.last_name, rp.total_days
        ORDER BY completed_days DESC
      `,
      [req.params.id]
    );
    res.json(result.rows);
  })
);

const readingPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  totalDays: z.number().int().positive(),
  active: z.boolean().optional().default(true),
  pdfUrl: z.string().nullable().optional(),
  badgeText: z.string().optional().default("New Resource"),
  isFeatured: z.boolean().optional().default(true),
});

router.post(
  "/reading-plans",
  validate(readingPlanSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO reading_plans (name, description, total_days, active, pdf_url, badge_text, is_featured)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        sanitizeText(req.body.name),
        sanitizeText(req.body.description),
        req.body.totalDays,
        req.body.active ?? true,
        req.body.pdfUrl || null,
        sanitizeText(req.body.badgeText || "New Resource"),
        req.body.isFeatured ?? true,
      ]
    );
    res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/reading-plans/:id",
  validate(readingPlanSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        UPDATE reading_plans
        SET name = $1, description = $2, total_days = $3, active = $4,
            pdf_url = $5, badge_text = $6, is_featured = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `,
      [
        sanitizeText(req.body.name),
        sanitizeText(req.body.description),
        req.body.totalDays,
        req.body.active ?? true,
        req.body.pdfUrl || null,
        sanitizeText(req.body.badgeText || "New Resource"),
        req.body.isFeatured ?? true,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Reading plan not found." });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/reading-plans/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM reading_plans WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

const planItemSchema = z.object({
  title: z.string().min(1),
  reference: z.string().default(""),
  keyVerse: z.string().optional().default(""),
  devotional: z.string().optional().default(""),
  prayer: z.string().optional().default(""),
  dayNumber: z.number().int().positive(),
});

router.post(
  "/reading-plans/:id/items",
  validate(planItemSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO reading_plan_items (plan_id, day_number, title, reference, key_verse, devotional, prayer)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (plan_id, day_number) DO UPDATE
        SET title = EXCLUDED.title, reference = EXCLUDED.reference, key_verse = EXCLUDED.key_verse,
            devotional = EXCLUDED.devotional, prayer = EXCLUDED.prayer, updated_at = NOW()
        RETURNING *
      `,
      [
        req.params.id,
        req.body.dayNumber,
        sanitizeText(req.body.title),
        sanitizeText(req.body.reference),
        sanitizeText(req.body.keyVerse || ""),
        sanitizeText(req.body.devotional || ""),
        sanitizeText(req.body.prayer || ""),
      ]
    );
    res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/reading-plans/items/:itemId",
  validate(planItemSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        UPDATE reading_plan_items
        SET title = $1, reference = $2, key_verse = $3, devotional = $4, prayer = $5, day_number = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `,
      [
        sanitizeText(req.body.title),
        sanitizeText(req.body.reference),
        sanitizeText(req.body.keyVerse || ""),
        sanitizeText(req.body.devotional || ""),
        sanitizeText(req.body.prayer || ""),
        req.body.dayNumber,
        req.params.itemId,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Item not found." });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/reading-plans/items/:itemId",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM reading_plan_items WHERE id = $1`, [req.params.itemId]);
    res.status(204).send();
  })
);

// Member reading progress management (admin)
const readingProgressSchema = z.object({
  memberId: z.string().uuid(),
  planId: z.string().uuid(),
  itemId: z.string().uuid(),
});

router.post(
  "/reading-progress",
  validate(readingProgressSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO member_reading_progress (member_id, plan_id, item_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (member_id, item_id) DO NOTHING
        RETURNING *
      `,
      [req.body.memberId, req.body.planId, req.body.itemId]
    );

    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        SELECT $1, 'reading_completed',
          'Completed reading: ' || rpi.title,
          'reading_plan', $3
        FROM reading_plan_items rpi WHERE rpi.id = $2
      `,
      [req.body.memberId, req.body.itemId, req.body.planId]
    );

    res.status(201).json(result.rows[0] ?? { message: "Already completed." });
  })
);

router.delete(
  "/reading-progress",
  asyncHandler(async (req, res) => {
    const { memberId, itemId } = req.body;
    await query(
      `DELETE FROM member_reading_progress WHERE member_id = $1 AND item_id = $2`,
      [memberId, itemId]
    );
    res.status(204).send();
  })
);

// ─── Downloads ────────────────────────────────────────────────────────────────
router.get("/downloads", asyncHandler(async (req, res) => {
  const result = await query(
    `
      SELECT
        d.*,
        JSON_BUILD_OBJECT('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name) AS member
      FROM downloads d
      JOIN users u ON u.id = d.member_id
      ORDER BY d.downloaded_at DESC
    `
  );
  res.json(result.rows);
}));

const downloadSchema = z.object({
  memberId: z.string().uuid(),
  resourceName: z.string().min(1),
  resourceType: z.string().min(1),
  fileUrl: z.string().default("#"),
});

router.post(
  "/downloads",
  validate(downloadSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        INSERT INTO downloads (member_id, resource_name, resource_type, file_url)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        req.body.memberId,
        sanitizeText(req.body.resourceName),
        sanitizeText(req.body.resourceType),
        req.body.fileUrl,
      ]
    );

    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description)
        VALUES ($1, 'download_performed', $2)
      `,
      [req.body.memberId, `Downloaded ${sanitizeText(req.body.resourceName)}`]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.delete(
  "/downloads/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM downloads WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

// ─── Campaigns (Admin) ────────────────────────────────────────────────────────
router.get(
  "/campaigns",
  asyncHandler(async (req, res) => {
    const campaigns = await getAdminCampaigns();
    res.json(campaigns);
  })
);

const campaignSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  imageUrl: z.string().optional().nullable(),
  goalAmount: z.number().nonnegative().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

router.post(
  "/campaigns",
  validate(campaignSchema),
  asyncHandler(async (req, res) => {
    const campaign = await createCampaign(req.body);
    res.status(201).json(campaign);
  })
);

router.put(
  "/campaigns/:id",
  validate(campaignSchema.partial().extend({ archived: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const campaign = await updateCampaign(req.params.id, req.body);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.json(campaign);
  })
);

router.delete(
  "/campaigns/:id",
  asyncHandler(async (req, res) => {
    await deleteCampaign(req.params.id);
    res.status(204).send();
  })
);

// ─── Donations (Admin) ────────────────────────────────────────────────────────
router.get(
  "/donations/stats",
  asyncHandler(async (req, res) => {
    const stats = await getAdminDonationStats();
    res.json(stats);
  })
);

router.get(
  "/donations",
  asyncHandler(async (req, res) => {
    const { search, fund, status, donationType } = req.query;
    const donations = await getAdminDonationsList({
      search: search ? String(search) : undefined,
      fund: fund ? String(fund) : undefined,
      status: status ? String(status) : undefined,
      donationType: donationType ? String(donationType) : undefined,
    });
    res.json(donations);
  })
);

const adminDonationSchema = z.object({
  memberId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  currency: z.string().min(1).default("USD"),
  method: z.string().min(1).default("card"),
  transactionId: z.string().optional(),
  donationType: z.string().min(1).default("one_time"),
  fund: z.string().min(1).default("Where needed most"),
  campaign: z.string().nullable().optional(),
  paymentStatus: z.enum(["pending", "completed", "failed", "refunded"]).default("completed"),
});

router.post(
  "/donations",
  validate(adminDonationSchema),
  asyncHandler(async (req, res) => {
    const donation = await recordDonation(req.body);
    res.status(201).json(donation);
  })
);

// ─── Prayer Requests & Focuses ───────────────────────────────────────────────
router.get(
  "/prayer-requests",
  asyncHandler(async (req, res) => {
    const status = req.query.status || null;
    const requests = await getAdminPrayerRequests(status);
    res.json(requests);
  })
);

router.get(
  "/prayer-stats",
  asyncHandler(async (req, res) => {
    const stats = await getAdminPrayerStats();
    res.json(stats);
  })
);

const prayerAdminSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "answered", "archived", "active"]),
});

router.patch(
  "/prayer-requests/:id",
  validate(prayerAdminSchema),
  asyncHandler(async (req, res) => {
    const status = req.body.status === "active" ? "approved" : req.body.status;
    const updated = await updatePrayerStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ message: "Prayer request not found." });
    res.json(updated);
  })
);

router.delete(
  "/prayer-requests/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM prayer_requests WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  })
);

// ─── Admin: Daily Prayer Focus ───────────────────────────────────────────────
router.get(
  "/prayer-focuses",
  asyncHandler(async (req, res) => {
    const focuses = await getAdminPrayerFocuses();
    res.json(focuses);
  })
);

const prayerFocusSchema = z.object({
  title: z.string().min(1, "Title is required"),
  topic: z.string().optional().default("Global Missions"),
  scripture: z.string().optional().default(""),
  description: z.string().min(1, "Description is required"),
  activeDate: z.string().optional(),
  isPublished: z.boolean().optional().default(true),
});

router.post(
  "/prayer-focuses",
  validate(prayerFocusSchema),
  asyncHandler(async (req, res) => {
    const focus = await createPrayerFocus(req.body);
    res.status(201).json(focus);
  })
);

router.put(
  "/prayer-focuses/:id",
  validate(prayerFocusSchema.partial()),
  asyncHandler(async (req, res) => {
    const updated = await updatePrayerFocus(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Prayer focus not found." });
    res.json(updated);
  })
);

router.patch(
  "/prayer-focuses/:id/publish",
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE prayer_focuses SET is_published = NOT is_published, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Prayer focus not found." });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/prayer-focuses/:id",
  asyncHandler(async (req, res) => {
    await deletePrayerFocus(req.params.id);
    res.status(204).send();
  })
);

export default router;
