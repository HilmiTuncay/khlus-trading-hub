import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { initSocket } from "./socket";
import { authRouter } from "./routes/auth";
import { serverRouter } from "./routes/servers";
import { channelRouter } from "./routes/channels";
import { messageRouter } from "./routes/messages";
import { memberRouter } from "./routes/members";
import { livekitRouter } from "./routes/livekit";

const app = express();
const httpServer = createServer(app);

const PORT = process.env.API_PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// Middleware
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/servers", serverRouter);
app.use("/api/channels", channelRouter);
app.use("/api/messages", messageRouter);
app.use("/api/members", memberRouter);
app.use("/api/livekit", livekitRouter);

// Socket.io
initSocket(httpServer, CORS_ORIGIN);

httpServer.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
});
