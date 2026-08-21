import { Router } from "express";
import { z } from "zod";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  listCourses,
  getCourseDetails,
  enrollMemberInCourse,
  saveLessonProgress,
  getCourseCertificate,
} from "../services/course-service.js";

const router = Router();

// GET /api/courses - List all published courses with dynamic progress
router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const { search, category, status } = req.query;
    const courses = await listCourses(userId, { search, category, status });
    res.json(courses);
  })
);

// GET /api/courses/:id - Course details with sequential lesson unlocking
router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const course = await getCourseDetails(req.params.id, userId);
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }
    res.json(course);
  })
);

// POST /api/courses/:id/enroll - Enroll in course
router.post(
  "/:id/enroll",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await enrollMemberInCourse(req.params.id, req.user.id);
    res.status(201).json(result);
  })
);

const progressSchema = z.object({
  lastPositionSeconds: z.number().int().nonnegative().default(0),
  watchDurationSeconds: z.number().int().nonnegative().default(0),
  progressPercentage: z.number().int().min(0).max(100).default(0),
  isCompleted: z.boolean().default(false),
});

// POST /api/courses/:id/lessons/:lessonId/progress - Update lesson progress & handle course completion
router.post(
  "/:id/lessons/:lessonId/progress",
  requireAuth,
  validate(progressSchema),
  asyncHandler(async (req, res) => {
    const result = await saveLessonProgress(
      req.params.id,
      req.params.lessonId,
      req.user.id,
      req.body
    );
    res.json(result);
  })
);

// GET /api/courses/:id/certificate - View course certificate
router.get(
  "/:id/certificate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const certificate = await getCourseCertificate(req.params.id, req.user.id);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found or course not yet completed." });
    }
    res.json(certificate);
  })
);

export default router;
