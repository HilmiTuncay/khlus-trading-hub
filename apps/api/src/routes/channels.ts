import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { checkPermission } from "../utils/permissions";
import { Permissions } from "@khlus/shared";
import logger from "../lib/logger";
import { sanitizeText } from "../lib/sanitize";

export const channelRouter = Router();
channelRouter.use(authenticate);

const createChannelSchema = z.object({
  serverId: z.string(),
  categoryId: z.string().optional(),
  name: z
    .string()
    .min(1)
    .max(100)
    .transform((v) => v.toLowerCase().replace(/\s+/g, "-")),
  type: z.enum(["text", "voice", "video"]).default("text"),
  topic: z.string().max(500).optional(),
});

// POST /api/channels
channelRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = createChannelSchema.parse(req.body);

    const canManage = await checkPermission(
      req.user!.userId,
      data.serverId,
      Permissions.MANAGE_CHANNELS
    );

    if (!canManage) {
      return res.status(403).json({ error: "Kanal oluşturma yetkiniz yok" });
    }

    const channelCount = await prisma.channel.count({
      where: { serverId: data.serverId },
    });

    const channel = await prisma.channel.create({
      data: {
        serverId: data.serverId,
        categoryId: data.categoryId,
        name: sanitizeText(data.name),
        type: data.type,
        topic: data.topic ? sanitizeText(data.topic) : undefined,
        position: channelCount,
      },
    });

    res.status(201).json({ channel });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Kanal oluşturma hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// GET /api/channels/:channelId
channelRouter.get("/:channelId", async (req: Request, res: Response) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.channelId },
      include: { category: true },
    });

    if (!channel) {
      return res.status(404).json({ error: "Kanal bulunamadı" });
    }

    res.json({ channel });
  } catch (error) {
    logger.error({ err: error }, "Kanal getirme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// PATCH /api/channels/:channelId - Kanal guncelle
const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).transform((v) => v.toLowerCase().replace(/\s+/g, "-")).optional(),
  topic: z.string().max(500).optional().nullable(),
  categoryId: z.string().optional().nullable(),
});

channelRouter.patch("/:channelId", async (req: Request, res: Response) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.channelId as string },
    });

    if (!channel) {
      return res.status(404).json({ error: "Kanal bulunamadı" });
    }

    const canManage = await checkPermission(
      req.user!.userId,
      channel.serverId,
      Permissions.MANAGE_CHANNELS
    );

    if (!canManage) {
      return res.status(403).json({ error: "Kanal düzenleme yetkiniz yok" });
    }

    const data = updateChannelSchema.parse(req.body);

    const updated = await prisma.channel.update({
      where: { id: channel.id },
      data: {
        ...(data.name !== undefined && { name: sanitizeText(data.name) }),
        ...(data.topic !== undefined && { topic: data.topic ? sanitizeText(data.topic) : null }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
    });

    res.json({ channel: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Kanal güncelleme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// DELETE /api/channels/:channelId
channelRouter.delete("/:channelId", async (req: Request, res: Response) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.channelId as string },
    });

    if (!channel) {
      return res.status(404).json({ error: "Kanal bulunamadı" });
    }

    const canManageChannels = await checkPermission(
      req.user!.userId,
      channel.serverId,
      Permissions.MANAGE_CHANNELS
    );

    if (!canManageChannels) {
      return res.status(403).json({ error: "Kanal silme yetkiniz yok" });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.message.deleteMany({ where: { channelId: channel.id } });
      await tx.channelPermission.deleteMany({ where: { channelId: channel.id } });
      await tx.channel.delete({ where: { id: channel.id } });
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Kanal silme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// --- Kategori Endpointleri ---

const createCategorySchema = z.object({
  serverId: z.string(),
  name: z.string().min(1).max(100),
});

// POST /api/channels/categories
channelRouter.post("/categories", async (req: Request, res: Response) => {
  try {
    const data = createCategorySchema.parse(req.body);

    const canManageCats = await checkPermission(
      req.user!.userId,
      data.serverId,
      Permissions.MANAGE_CHANNELS
    );
    if (!canManageCats) {
      return res.status(403).json({ error: "Kategori oluşturma yetkiniz yok" });
    }

    const catCount = await prisma.category.count({ where: { serverId: data.serverId } });

    const category = await prisma.category.create({
      data: {
        serverId: data.serverId,
        name: sanitizeText(data.name),
        position: catCount,
      },
    });

    res.status(201).json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Kategori oluşturma hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// PATCH /api/channels/categories/:categoryId
channelRouter.patch("/categories/:categoryId", async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.categoryId as string },
    });

    if (!category) {
      return res.status(404).json({ error: "Kategori bulunamadı" });
    }

    const canEdit = await checkPermission(req.user!.userId, category.serverId, Permissions.MANAGE_CHANNELS);
    if (!canEdit) {
      return res.status(403).json({ error: "Kategori düzenleme yetkiniz yok" });
    }

    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);

    const updated = await prisma.category.update({
      where: { id: category.id },
      data: { name: sanitizeText(name) },
    });

    res.json({ category: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Kategori güncelleme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// DELETE /api/channels/categories/:categoryId
channelRouter.delete("/categories/:categoryId", async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.categoryId as string },
    });

    if (!category) {
      return res.status(404).json({ error: "Kategori bulunamadı" });
    }

    const canDelete = await checkPermission(req.user!.userId, category.serverId, Permissions.MANAGE_CHANNELS);
    if (!canDelete) {
      return res.status(403).json({ error: "Kategori silme yetkiniz yok" });
    }

    await prisma.$transaction(async (tx: any) => {
      // Kategorideki kanallari kategorisiz yap
      await tx.channel.updateMany({
        where: { categoryId: category.id },
        data: { categoryId: null },
      });
      await tx.category.delete({ where: { id: category.id } });
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Kategori silme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
