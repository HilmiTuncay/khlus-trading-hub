import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer } from "http";
import { initSocket } from "./socket";
import { authRouter } from "./routes/auth";
import { serverRouter } from "./routes/servers";
import { channelRouter } from "./routes/channels";
import { messageRouter } from "./routes/messages";
import { memberRouter } from "./routes/members";
import { livekitRouter } from "./routes/livekit";
import { uploadRouter } from "./routes/uploads";
import { reactionRouter } from "./routes/reactions";
import { roleRouter } from "./routes/roles";

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || process.env.API_PORT || 3001;
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Geliştirme aşamasında tümüne izin ver
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Static files (uploads)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/servers", serverRouter);
app.use("/api/channels", channelRouter);
app.use("/api/messages", messageRouter);
app.use("/api/members", memberRouter);
app.use("/api/livekit", livekitRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/reactions", reactionRouter);
app.use("/api/roles", roleRouter);

// Socket.io
initSocket(httpServer, CORS_ORIGINS);

httpServer.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
});
