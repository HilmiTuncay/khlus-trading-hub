import { Request, Response, NextFunction } from "express";
import logger from "../lib/logger";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfProtection(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Safe method'lar muaf
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const hasAuthHeader = !!req.headers.authorization;

    // Authorization header varsa CSRF kontrolünü atla
    // (Tarayıcı form submit ile Authorization header gönderemez)
    if (hasAuthHeader) {
      return next();
    }

    // Origin veya Referer yoksa ve Authorization yok → CSRF riski, reddet
    // (Eski davranış: izin veriyordu, bu güvenlik açığıydı)
    if (!origin && !referer) {
      logger.warn({ method: req.method, url: req.originalUrl }, "CSRF koruması: Origin/Referer ve Authorization header eksik");
      return res.status(403).json({ error: "İstek kaynağı doğrulanamadı" });
    }

    let refererOrigin: string | null = null;
    if (referer) {
      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        return res.status(403).json({ error: "Geçersiz Referer başlığı" });
      }
    }
    const checkOrigin = origin || refererOrigin;

    if (!checkOrigin) {
      logger.warn({ method: req.method, url: req.originalUrl }, "CSRF koruması: Origin belirlenemedi");
      return res.status(403).json({ error: "İstek kaynağı doğrulanamadı" });
    }

    // İzin verilen origin listesinde mi?
    if (allowedOrigins.includes(checkOrigin)) {
      return next();
    }

    // Vercel preview URL'lerini de kabul et
    const isVercelPreview = allowedOrigins.some((o) => {
      const domain = o.replace("https://", "").replace("http://", "");
      const baseName = domain.split(".")[0];
      const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`^https://${escaped}(-[a-z0-9]+)*\\.vercel\\.app$`);
      return re.test(checkOrigin);
    });

    if (isVercelPreview) {
      return next();
    }

    logger.warn({ origin: checkOrigin, method: req.method, url: req.originalUrl }, "CSRF koruması: reddedilen origin");
    return res.status(403).json({ error: "Geçersiz istek kaynağı" });
  };
}
