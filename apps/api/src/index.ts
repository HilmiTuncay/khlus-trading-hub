import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer } from "http";
import { initSocket } from "./socket";
import { prisma } from "./db/prisma";
import { authRouter } from "./routes/auth";
import { serverRouter } from "./routes/servers";
import { channelRouter } from "./routes/channels";
import { messageRouter } from "./routes/messages";
import { memberRouter } from "./routes/members";
import { livekitRouter } from "./routes/livekit";
import { uploadRouter } from "./routes/uploads";
import { reactionRouter } from "./routes/reactions";
import { roleRouter } from "./routes/roles";
import { searchRouter } from "./routes/search";
import { dmRouter } from "./routes/dm";
import { eventRouter } from "./routes/events";

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || process.env.API_PORT || 3001;
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

console.log("[CORS] İzin verilen originler:", CORS_ORIGINS);

// Health check - tüm middleware'lerden ÖNCE, her zaman erişilebilir
app.get("/health", async (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  let dbStatus = "unknown";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }
  res.json({ status: "ok", db: dbStatus, timestamp: new Date().toISOString() });
});

// Güvenlik headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Origin yoksa (curl, server-to-server) veya listede varsa izin ver
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        // Vercel preview URL'lerini de kabul et (aynı proje)
        const isVercelPreview = CORS_ORIGINS.some((o) => {
          const domain = o.replace("https://", "").replace("http://", "");
          const baseName = domain.split(".")[0]; // ör: khlus-trading-hub
          return origin.includes(baseName) && origin.includes("vercel.app");
        });
        if (isVercelPreview) {
          callback(null, true);
        } else {
          console.warn(`[CORS] Reddedilen origin: ${origin} | İzin verilenler: ${CORS_ORIGINS.join(", ")}`);
          callback(null, false); // 500 yerine sessizce reddet
        }
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Genel rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla istek. Lütfen biraz bekleyin." },
});
app.use("/api/", generalLimiter);

// Auth rate limit (daha sıkı)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Çok fazla giriş denemesi. 15 dakika bekleyin." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Static files (uploads) - Content-Disposition header ile
app.use(
  "/uploads",
  (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  },
  express.static(path.join(process.cwd(), "uploads"))
);

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
app.use("/api/search", searchRouter);
app.use("/api/dm", dmRouter);
app.use("/api/events", eventRouter);

// Socket.io
initSocket(httpServer, CORS_ORIGINS);

httpServer.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);
  console.log(`[API] CORS origins: ${CORS_ORIGINS.join(", ")}`);
  console.log(`[API] NODE_ENV: ${process.env.NODE_ENV || "development"}`);
});
