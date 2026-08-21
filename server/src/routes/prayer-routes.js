import { Router } from "express";
import { z } from "zod";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getPrayerWall,
  getTodayPrayerFocus,
  recordPrayerAction,
  recordFocusPrayerAction,
  createPrayerRequest,
  getMemberPrayerRequests,
  updatePrayerStatus,
  getPrayerComments,
  addPrayerComment,
} from "../services/prayer-service.js";
import { query } from "../db/pool.js";

const router = Router();

// ─── Public / Member Prayer Wall ─────────────────────────────────────────────
router.get(
  "/wall",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const requests = await getPrayerWall(userId);
    res.json(requests);
  })
);

// ─── Today's Prayer Focus ───────────────────────────────────────────────────
router.get(
  "/focus/today",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const focus = await getTodayPrayerFocus(userId);
    res.json(focus);
  })
);

// ─── Click "I'm Praying" on a Request ────────────────────────────────────────
router.post(
  "/requests/:id/pray",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await recordPrayerAction(req.params.id, req.user.id);
    res.json(result);
  })
);

// ─── Click "I'm Praying" on Today's Focus ────────────────────────────────────
router.post(
  "/focus/:id/pray",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await recordFocusPrayerAction(req.params.id, req.user.id);
    res.json(result);
  })
);

// ─── Submit Prayer Request / Praise Report ───────────────────────────────────
const submitPrayerSchema = z.object({
  title: z.string().optional().default(""),
  description: z.string().min(1, "Please share the details of your request."),
  category: z.string().optional().default("General"),
  type: z.enum(["request", "praise"]).optional().default("request"),
  authorName: z.string().nullable().optional(),
  isAnonymous: z.boolean().optional().default(false),
});

router.post(
  "/requests",
  requireAuth,
  validate(submitPrayerSchema),
  asyncHandler(async (req, res) => {
    const newRequest = await createPrayerRequest(req.user.id, req.body);
    res.status(201).json(newRequest);
  })
);

// ─── Member's Own Requests ───────────────────────────────────────────────────
router.get(
  "/my-requests",
  requireAuth,
  asyncHandler(async (req, res) => {
    const requests = await getMemberPrayerRequests(req.user.id);
    res.json(requests);
  })
);

// ─── Member Mark Answered ────────────────────────────────────────────────────
router.patch(
  "/requests/:id/answered",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Ensure ownership
    const check = await query(`SELECT id FROM prayer_requests WHERE id = $1 AND member_id = $2`, [req.params.id, req.user.id]);
    if (!check.rows[0]) {
      return res.status(404).json({ message: "Prayer request not found." });
    }
    const updated = await updatePrayerStatus(req.params.id, "answered");
    res.json(updated);
  })
);

// ─── Member Delete Own Request ───────────────────────────────────────────────
router.delete(
  "/requests/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM prayer_requests WHERE id = $1 AND member_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Prayer request not found." });
    }
    res.status(204).send();
  })
);

// ─── Replies / Comments on a Prayer Request ─────────────────────────────────
router.get(
  "/requests/:id/comments",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const comments = await getPrayerComments(req.params.id);
    res.json(comments);
  })
);

const commentSchema = z.object({
  content: z.string().min(1, "Comment content cannot be empty"),
  authorName: z.string().nullable().optional(),
});

router.post(
  "/requests/:id/comments",
  requireAuth,
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    const comment = await addPrayerComment(
      req.params.id,
      req.user.id,
      req.body.content,
      req.body.authorName || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim()
    );
    res.status(201).json(comment);
  })
);

export const prayerRoutes = router;
