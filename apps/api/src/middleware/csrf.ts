import { Request, Response, NextFunction } from "express";
import logger from "../lib/logger";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Tauri masaustu uygulamasi originleri
const TAURI_ORIGINS = ["https://tauri.localhost", "tauri://localhost"];

export function csrfProtection(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Safe method'lar muaf
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // Origin veya Referer yoksa izin ver (curl, server-to-server)
    if (!origin && !referer) {
      return next();
    }

    const checkOrigin = origin || (referer ? new URL(referer).origin : null);

    if (!checkOrigin) {
      return next();
    }

    // İzin verilen origin listesinde mi?
    if (allowedOrigins.includes(checkOrigin) || TAURI_ORIGINS.includes(checkOrigin)) {
      return next();
    }

    // Vercel preview URL'lerini de kabul et
    const isVercelPreview = allowedOrigins.some((o) => {
      const domain = o.replace("https://", "").replace("http://", "");
      const baseName = domain.split(".")[0];
      return checkOrigin.includes(baseName) && checkOrigin.includes("vercel.app");
    });

    if (isVercelPreview) {
      return next();
    }

    logger.warn({ origin: checkOrigin, method: req.method, url: req.originalUrl }, "CSRF koruması: reddedilen origin");
    return res.status(403).json({ error: "Geçersiz istek kaynağı" });
  };
}
