import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { authenticate } from "../middleware/auth";
import logger from "../lib/logger";

export const uploadRouter = Router();
uploadRouter.use(authenticate);

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Klasör yoksa oluştur
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    // İzin verilen tipler
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "text/plain",
      "video/mp4", "video/webm",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Desteklenmeyen dosya tipi"));
    }
  },
});

// POST /api/uploads - Dosya yukle
uploadRouter.post("/", upload.array("files", 5), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Dosya bulunamadı" });
    }

    const attachments = files.map((file) => ({
      id: crypto.randomUUID(),
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
    }));

    res.status(201).json({ attachments });
  } catch (error: any) {
    if (error.message === "Desteklenmeyen dosya tipi") {
      return res.status(400).json({ error: error.message });
    }
    logger.error({ err: error }, "Dosya yükleme hatası");
    res.status(500).json({ error: "Dosya yükleme hatası" });
  }
});
