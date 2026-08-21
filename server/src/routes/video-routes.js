import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getPublishedVideos,
  getRecentVideos,
  getVideoById,
  getAllTopics,
  getTopicBySlug,
  getVideosByTopic,
} from "../services/video-service.js";

const router = Router();

router.get("/recent", asyncHandler(async (req, res) => {
  const videos = await getRecentVideos(12);
  res.json(videos);
}));

router.get("/topics", asyncHandler(async (req, res) => {
  const topics = await getAllTopics();
  res.json(topics);
}));

router.get("/topics/:slug", asyncHandler(async (req, res) => {
  const topic = await getTopicBySlug(req.params.slug);
  if (!topic) return res.status(404).json({ message: "Topic not found" });
  res.json(topic);
}));

router.get("/topics/:slug/videos", asyncHandler(async (req, res) => {
  const data = await getVideosByTopic(req.params.slug);
  if (!data) return res.status(404).json({ message: "Topic not found" });
  res.json(data);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const video = await getVideoById(req.params.id);
  if (!video) return res.status(404).json({ message: "Video not found" });
  res.json(video);
}));

router.get("/", asyncHandler(async (req, res) => {
  const videos = await getPublishedVideos(req.query.topic);
  res.json(videos);
}));

export default router;
