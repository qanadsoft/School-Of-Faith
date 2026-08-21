import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { ensureDatabase } from "./db/pool.js";
import authRoutes from "./routes/auth-routes.js";
import memberRoutes from "./routes/member-routes.js";
import adminRoutes from "./routes/admin-routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import videoRoutes from "./routes/video-routes.js";
import { prayerRoutes } from "./routes/prayer-routes.js";
import courseRoutes from "./routes/course-routes.js";
import { campaignRouter, donationRouter } from "./routes/donation-routes.js";
import communityRoutes from "./routes/community-routes.js";

const app = express();

const allowedOrigins = (config.clientUrl || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", date: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/member", memberRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/prayer", prayerRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/campaigns", campaignRouter);
app.use("/api/donations", donationRouter);

app.use(notFoundHandler);
app.use(errorHandler);

ensureDatabase()
  .then(() => {
    app.listen(config.port, "0.0.0.0", () => {
      console.log(`Server listening on http://0.0.0.0:${config.port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
