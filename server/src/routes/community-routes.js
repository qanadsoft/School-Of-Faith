import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sanitizeText } from "../utils/sanitize.js";
import {
  getCommunityCategories,
  getAllAdminCategories,
  listCommunityPosts,
  getCommunityPostById,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  togglePostLike,
  listPostComments,
  createPostComment,
  deletePostComment,
  reportCommunityPost,
  getAdminCommunityStats,
  getAdminCommunityPosts,
  updateAdminPostStatus,
  getAdminReports,
  updateAdminReportStatus,
} from "../services/community-service.js";

const router = Router();

// ─── Public/Member Category & Post Read ──────────────────────────────────────
router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    res.json(await getCommunityCategories());
  })
);

router.get(
  "/posts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { category, search } = req.query;
    const posts = await listCommunityPosts({
      categorySlug: category ? String(category) : undefined,
      search: search ? String(search) : undefined,
      currentUserId: req.user?.id,
      status: "approved",
    });
    res.json(posts);
  })
);

router.get(
  "/posts/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await getCommunityPostById(req.params.id, req.user?.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  })
);

// ─── Create, Edit, Delete Post ───────────────────────────────────────────────
const createPostSchema = z.object({
  content: z.string().min(1, "Post content is required"),
  categoryId: z.string().optional(),
});

router.post(
  "/posts",
  requireAuth,
  validate(createPostSchema),
  asyncHandler(async (req, res) => {
    const post = await createCommunityPost(req.user.id, {
      content: sanitizeText(req.body.content),
      categoryId: req.body.categoryId,
    });
    res.status(201).json(post);
  })
);

const updatePostSchema = z.object({
  content: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
});

router.put(
  "/posts/:id",
  requireAuth,
  validate(updatePostSchema),
  asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    const post = await updateCommunityPost(
      req.user.id,
      req.params.id,
      {
        content: req.body.content ? sanitizeText(req.body.content) : undefined,
        categoryId: req.body.categoryId,
      },
      isAdmin
    );
    res.json(post);
  })
);

router.delete(
  "/posts/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    await deleteCommunityPost(req.user.id, req.params.id, isAdmin);
    res.status(204).send();
  })
);

// ─── Likes ──────────────────────────────────────────────────────────────────
router.post(
  "/posts/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await togglePostLike(req.user.id, req.params.id);
    res.json(result);
  })
);

router.delete(
  "/posts/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await togglePostLike(req.user.id, req.params.id);
    res.json(result);
  })
);

// ─── Comments ───────────────────────────────────────────────────────────────
router.get(
  "/posts/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const comments = await listPostComments(req.params.id);
    res.json(comments);
  })
);

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});

router.post(
  "/posts/:id/comments",
  requireAuth,
  validate(createCommentSchema),
  asyncHandler(async (req, res) => {
    const comment = await createPostComment(
      req.user.id,
      req.params.id,
      sanitizeText(req.body.content)
    );
    res.status(201).json(comment);
  })
);

router.delete(
  "/comments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    await deletePostComment(req.user.id, req.params.id, isAdmin);
    res.status(204).send();
  })
);

// ─── Report ─────────────────────────────────────────────────────────────────
const reportSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

router.post(
  "/posts/:id/report",
  requireAuth,
  validate(reportSchema),
  asyncHandler(async (req, res) => {
    const report = await reportCommunityPost(
      req.user.id,
      req.params.id,
      sanitizeText(req.body.reason)
    );
    res.status(201).json(report);
  })
);

// ─── Admin Endpoints ────────────────────────────────────────────────────────
router.get(
  "/admin/stats",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.json(await getAdminCommunityStats());
  })
);

router.get(
  "/admin/posts",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { status, categoryId, search } = req.query;
    res.json(
      await getAdminCommunityPosts({
        status: status ? String(status) : undefined,
        categoryId: categoryId ? String(categoryId) : undefined,
        search: search ? String(search) : undefined,
      })
    );
  })
);

const adminPostStatusSchema = z.object({
  status: z.enum(["approved", "pending", "hidden"]),
});

router.patch(
  "/admin/posts/:id/status",
  requireAuth,
  requireRole("admin"),
  validate(adminPostStatusSchema),
  asyncHandler(async (req, res) => {
    res.json(await updateAdminPostStatus(req.params.id, req.body.status));
  })
);

router.get(
  "/admin/reports",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.json(await getAdminReports());
  })
);

const adminReportStatusSchema = z.object({
  status: z.enum(["pending", "reviewed", "dismissed"]),
});

router.patch(
  "/admin/reports/:id/status",
  requireAuth,
  requireRole("admin"),
  validate(adminReportStatusSchema),
  asyncHandler(async (req, res) => {
    res.json(await updateAdminReportStatus(req.params.id, req.body.status));
  })
);

router.get(
  "/admin/categories",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.json(await getAllAdminCategories());
  })
);

export default router;
