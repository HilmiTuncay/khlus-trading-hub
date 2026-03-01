import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import logger from "../lib/logger";
import { sanitizeText } from "../lib/sanitize";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";

const registerSchema = z.object({
  email: z.string().email("Geçerli bir email adresi girin"),
  username: z
    .string()
    .min(3, "Kullanıcı adı en az 3 karakter olmalı")
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Sadece harf, rakam ve alt cizgi kullanılabilir"),
  displayName: z.string().min(1).max(64),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Hesap kilitleme — in-memory
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 dakika
const loginAttempts = new Map<string, { failedCount: number; lockedUntil: number }>();

function checkLockout(email: string): { locked: boolean; remainingMs?: number } {
  const entry = loginAttempts.get(email);
  if (!entry) return { locked: false };
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return { locked: true, remainingMs: entry.lockedUntil - Date.now() };
  }
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(email);
    return { locked: false };
  }
  return { locked: false };
}

function recordFailedLogin(email: string) {
  const entry = loginAttempts.get(email) || { failedCount: 0, lockedUntil: 0 };
  entry.failedCount++;
  if (entry.failedCount >= LOCKOUT_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    logger.warn({ email }, "Hesap kilitlendi — çok fazla başarısız giriş denemesi");
  }
  loginAttempts.set(email, entry);
}

function clearLoginAttempts(email: string) {
  loginAttempts.delete(email);
}

function generateTokens(userId: string, email: string) {
  const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
  const refreshToken = jwt.sign({ userId, email }, JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
  return { token, refreshToken };
}

// POST /api/auth/register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      return res.status(400).json({ error: "Bu email adresi zaten kullanılıyor" });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
    if (existingUsername) {
      return res.status(400).json({ error: "Bu kullanıcı adı zaten kullanılıyor" });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: sanitizeText(data.displayName),
        password: hashedPassword,
      },
    });

    const { token, refreshToken } = generateTokens(user.id, user.email);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Register hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    // Hesap kilit kontrolü
    const lockStatus = checkLockout(data.email);
    if (lockStatus.locked) {
      const remainingMin = Math.ceil((lockStatus.remainingMs || 0) / 60_000);
      return res.status(429).json({
        error: `Çok fazla başarısız giriş denemesi. Lütfen ${remainingMin} dakika sonra tekrar deneyin.`,
      });
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      recordFailedLogin(data.email);
      return res.status(401).json({ error: "Email veya şifre hatalı" });
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      recordFailedLogin(data.email);
      return res.status(401).json({ error: "Email veya şifre hatalı" });
    }

    // Başarılı giriş — counter sıfırla
    clearLoginAttempts(data.email);

    await prisma.user.update({
      where: { id: user.id },
      data: { status: "online" },
    });

    const { token, refreshToken } = generateTokens(user.id, user.email);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Login hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/auth/refresh
authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token bulunamadı" });
    }

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      userId: string;
      email: string;
    };

    const tokens = generateTokens(payload.userId, payload.email);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token: tokens.token });
  } catch {
    res.status(401).json({ error: "Geçersiz refresh token" });
  }
});

// GET /api/auth/me
authRouter.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }

    res.json({ user });
  } catch (error) {
    logger.error({ err: error }, "Auth me hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// PATCH /api/auth/profile - Profil güncelle
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  status: z.enum(["online", "idle", "dnd", "offline"]).optional(),
});

authRouter.patch("/profile", authenticate, async (req: Request, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    if (data.displayName) {
      data.displayName = sanitizeText(data.displayName);
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
      },
    });

    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Profil güncelleme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/auth/logout
authRouter.post("/logout", authenticate, async (req: Request, res: Response) => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { status: "offline" },
  });

  res.clearCookie("refreshToken");
  res.json({ message: "Başarıyla çıkış yapıldı" });
});
