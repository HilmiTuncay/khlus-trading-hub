import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../lib/logger";

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";

if (!process.env.JWT_SECRET) {
  logger.warn("JWT_SECRET ortam değişkeni ayarlanmamış! Varsayılan secret kullanılıyor.");
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Geçersiz veya süresi dolmuş token" });
  }
}
