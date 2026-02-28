import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";

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
    console.error("[Events] List error:", error);
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

    const event = await prisma.event.create({
      data: {
        serverId: data.serverId,
        createdBy: req.user!.userId,
        title: data.title,
        description: data.description || null,
        channelId: data.channelId || null,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : null,
      },
    });

    res.status(201).json({ event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("[Events] Create error:", error);
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
    console.error("[Events] Delete error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
