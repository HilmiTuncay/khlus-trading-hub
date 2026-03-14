import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { checkPermission } from "../utils/permissions";
import { Permissions } from "@khlus/shared";
import logger from "../lib/logger";
import { sanitizeText } from "../lib/sanitize";

export const eventRouter = Router();
eventRouter.use(authenticate);

// GET /api/events/:serverId - Sunucunun etkinliklerini getir
eventRouter.get("/:serverId", async (req: Request, res: Response) => {
  try {
    const serverId = req.params.serverId as string;

    const member = await prisma.member.findUnique({
      where: {
        userId_serverId: {
          userId: req.user!.userId,
          serverId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Bu sunucunun üyesi değilsiniz" });
    }

    const events = await prisma.event.findMany({
      where: {
        serverId,
        startAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Son 1 günden itibaren
      },
      orderBy: { startAt: "asc" },
      take: 50,
    });

    res.json({ events });
  } catch (error) {
    logger.error({ err: error }, "Etkinlik listesi hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/events - Etkinlik oluştur
const createEventSchema = z.object({
  serverId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  channelId: z.string().optional(),
  startAt: z.string(), // ISO date string
  endAt: z.string().optional(),
});

eventRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = createEventSchema.parse(req.body);

    const member = await prisma.member.findUnique({
      where: {
        userId_serverId: {
          userId: req.user!.userId,
          serverId: data.serverId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Bu sunucunun üyesi değilsiniz" });
    }

    // Etkinlik oluşturma izni kontrolü
    const canManage = await checkPermission(req.user!.userId, data.serverId, Permissions.MANAGE_SERVER);
    if (!canManage) {
      return res.status(403).json({ error: "Etkinlik oluşturma yetkiniz yok" });
    }

    // channelId sunucuya ait mi doğrula
    if (data.channelId) {
      const channel = await prisma.channel.findUnique({ where: { id: data.channelId } });
      if (!channel || channel.serverId !== data.serverId) {
        return res.status(400).json({ error: "Geçersiz kanal" });
      }
    }

    // Tarih doğrulaması
    const startAt = new Date(data.startAt);
    if (isNaN(startAt.getTime()) || startAt < new Date()) {
      return res.status(400).json({ error: "Başlangıç tarihi gelecekte olmalı" });
    }
    let endAt: Date | null = null;
    if (data.endAt) {
      endAt = new Date(data.endAt);
      if (isNaN(endAt.getTime()) || endAt < startAt) {
        return res.status(400).json({ error: "Bitiş tarihi başlangıçtan sonra olmalı" });
      }
    }

    const event = await prisma.event.create({
      data: {
        serverId: data.serverId,
        createdBy: req.user!.userId,
        title: sanitizeText(data.title),
        description: data.description ? sanitizeText(data.description) : null,
        channelId: data.channelId || null,
        startAt,
        endAt,
      },
    });

    res.status(201).json({ event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Etkinlik oluşturma hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// DELETE /api/events/:eventId
eventRouter.delete("/:eventId", async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
    });

    if (!event) {
      return res.status(404).json({ error: "Etkinlik bulunamadı" });
    }

    // Sadece oluşturan veya sunucu sahibi silebilir
    if (event.createdBy !== req.user!.userId) {
      const server = await prisma.server.findUnique({
        where: { id: event.serverId },
      });
      if (server?.ownerId !== req.user!.userId) {
        return res.status(403).json({ error: "Bu etkinliği silme yetkiniz yok" });
      }
    }

    await prisma.event.delete({ where: { id: event.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Etkinlik silme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
