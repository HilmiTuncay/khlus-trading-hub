import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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
import { searchRouter } from "./routes/search";
import { dmRouter } from "./routes/dm";
import { eventRouter } from "./routes/events";
import logger from "./lib/logger";
import { csrfProtection } from "./middleware/csrf";
import { prisma } from "./db/prisma";

const app = express();
app.set("trust proxy", 1); // Render reverse proxy arkasinda
const httpServer = createServer(app);

const PORT = process.env.PORT || process.env.API_PORT || 3001;
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

logger.info({ origins: CORS_ORIGINS }, "CORS izin verilen originler");

// Health check - tüm middleware'lerden ÖNCE, her zaman erişilebilir
// DB sorgusu kaldırıldı — cold start'ı 2-5sn yavaşlatıyordu
app.get("/health", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
          logger.warn({ origin, allowed: CORS_ORIGINS }, "CORS reddedilen origin");
          callback(null, false); // 500 yerine sessizce reddet
        }
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// CSRF koruması — Origin header doğrulama
app.use(csrfProtection(CORS_ORIGINS));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
    }, `${req.method} ${req.originalUrl} ${res.statusCode}`);
  });
  next();
});

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
  max: 50,
  message: { error: "Çok fazla giriş denemesi. 15 dakika bekleyin." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Static files (uploads) - Güvenlik header'ları ile
app.use(
  "/uploads",
  (req, res, next) => {
    // Dosya içeriğinin tarayıcı tarafından yorumlanmasını engelle
    res.setHeader("X-Content-Type-Options", "nosniff");
    // İndirme olarak sun (tarayıcıda çalıştırma yerine)
    // Sadece resimler inline gösterilebilir, diğerleri attachment
    const ext = path.extname(req.path).toLowerCase();
    const inlineAllowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    if (!inlineAllowed.includes(ext)) {
      res.setHeader("Content-Disposition", "attachment");
    }
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

// Prisma baglantisini onceden kur, sonra sunucuyu baslat
prisma.$connect()
  .then(() => {
    logger.info("Veritabani baglantisi kuruldu");
  })
  .catch((err) => {
    logger.error({ err }, "Veritabani ilk baglanti basarisiz");
  })
  .finally(() => {
    httpServer.listen(PORT, () => {
      logger.info({ port: PORT, origins: CORS_ORIGINS, env: process.env.NODE_ENV || "development" }, `API sunucusu port ${PORT} üzerinde çalışıyor`);

      // Render free tier keep-alive: 14dk'da bir self-ping (15dk inaktivite uyku eşiği)
      const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL || process.env.API_PUBLIC_URL;
      if (KEEP_ALIVE_URL) {
        const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 dakika
        setInterval(async () => {
          try {
            await fetch(`${KEEP_ALIVE_URL}/health`);
            logger.debug("Keep-alive ping gönderildi");
          } catch {
            // Sessizce devam et
          }
        }, KEEP_ALIVE_INTERVAL);
        logger.info({ url: KEEP_ALIVE_URL, intervalMin: 14 }, "Keep-alive aktif");
      }
    });
  });
