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

// Magic bytes tanımları (dosya imzaları)
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  "image/jpeg": [{ bytes: [0xFF, 0xD8, 0xFF] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  "image/gif": [{ bytes: [0x47, 0x49, 0x46, 0x38] }], // GIF87a veya GIF89a
  "image/webp": [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
  "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  "video/mp4": [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }], // ftyp
  "video/webm": [{ bytes: [0x1A, 0x45, 0xDF, 0xA3] }], // EBML header
};

// Dosya içeriğini magic bytes ile doğrula
async function validateMagicBytes(filePath: string, mimetype: string): Promise<boolean> {
  const signatures = MAGIC_BYTES[mimetype];

  // text/plain için magic bytes kontrolü yapma (metin dosyaları)
  if (mimetype === "text/plain") {
    return true;
  }

  if (!signatures) {
    return false;
  }

  const buffer = Buffer.alloc(16);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  // Tüm imzaların eşleşmesi gerekiyor (webp gibi çoklu kontrol için)
  for (const sig of signatures) {
    const offset = sig.offset || 0;
    const matches = sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    if (!matches) {
      return false;
    }
  }

  return true;
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
    // İzin verilen tipler (ön kontrol - magic bytes sonra doğrulanacak)
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

    // Magic bytes doğrulaması - dosya içeriğinin gerçekten belirtilen tipte olduğunu kontrol et
    const validatedFiles: Express.Multer.File[] = [];
    const invalidFiles: string[] = [];

    for (const file of files) {
      const isValid = await validateMagicBytes(file.path, file.mimetype);
      if (isValid) {
        validatedFiles.push(file);
      } else {
        // Geçersiz dosyayı sil
        try {
          fs.unlinkSync(file.path);
        } catch {
          // Silme hatası önemli değil
        }
        invalidFiles.push(file.originalname);
        logger.warn(
          { filename: file.originalname, mimetype: file.mimetype },
          "Magic bytes doğrulaması başarısız - dosya silindi"
        );
      }
    }

    if (invalidFiles.length > 0 && validatedFiles.length === 0) {
      return res.status(400).json({
        error: `Dosya içeriği belirtilen tiple eşleşmiyor: ${invalidFiles.join(", ")}`,
      });
    }

    const attachments = validatedFiles.map((file) => ({
      id: crypto.randomUUID(),
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
    }));

    res.status(201).json({
      attachments,
      ...(invalidFiles.length > 0 && { rejected: invalidFiles }),
    });
  } catch (error: any) {
    if (error.message === "Desteklenmeyen dosya tipi") {
      return res.status(400).json({ error: error.message });
    }
    logger.error({ err: error }, "Dosya yükleme hatası");
    res.status(500).json({ error: "Dosya yükleme hatası" });
  }
});
