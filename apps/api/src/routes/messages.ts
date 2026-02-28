import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { getIO } from "../socket";

export const messageRouter = Router();
messageRouter.use(authenticate);

const attachmentSchema = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
});

const sendMessageSchema = z.object({
  channelId: z.string(),
  content: z.string().max(4000).default(""),
  attachments: z.array(attachmentSchema).default([]),
}).refine((data) => data.content.trim().length > 0 || data.attachments.length > 0, {
  message: "Mesaj içeriği veya dosya eklenmeli",
});

// GET /api/messages/:channelId
messageRouter.get("/:channelId", async (req: Request, res: Response) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const messages = await prisma.message.findMany({
      where: { channelId: req.params.channelId },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reactions: true,
      },
    });

    // Reaksiyonları gruplanmış şekilde döndür
    const messagesWithGroupedReactions = messages.map((msg: any) => {
      const grouped = (msg.reactions || []).reduce((acc: Record<string, string[]>, r: any) => {
        if (!acc[r.emoji]) acc[r.emoji] = [];
        acc[r.emoji].push(r.userId);
        return acc;
      }, {});
      return { ...msg, reactions: grouped };
    });

    res.json({ messages: messagesWithGroupedReactions.reverse() });
  } catch (error) {
    console.error("[Messages] Get error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/messages
messageRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = sendMessageSchema.parse(req.body);

    const channel = await prisma.channel.findUnique({
      where: { id: data.channelId },
    });

    if (!channel) {
      return res.status(404).json({ error: "Kanal bulunamadı" });
    }

    // Check membership
    const member = await prisma.member.findUnique({
      where: {
        userId_serverId: {
          userId: req.user!.userId,
          serverId: channel.serverId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Bu sunucunun üyesi değilsiniz" });
    }

    const message = await prisma.message.create({
      data: {
        channelId: data.channelId,
        authorId: req.user!.userId,
        content: data.content,
        attachments: data.attachments.length > 0 ? data.attachments : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Broadcast via Socket.io
    try {
      const io = getIO();
      io.to(`channel:${data.channelId}`).emit("message:new", message as any);
    } catch {
      // Socket might not be initialized in tests
    }

    res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("[Messages] Send error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// DELETE /api/messages/:messageId
messageRouter.delete("/:messageId", async (req: Request, res: Response) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.messageId },
    });

    if (!message) {
      return res.status(404).json({ error: "Mesaj bulunamadı" });
    }

    if (message.authorId !== req.user!.userId) {
      return res.status(403).json({ error: "Bu mesajı silme yetkiniz yok" });
    }

    await prisma.message.delete({ where: { id: req.params.messageId } });

    try {
      const io = getIO();
      io.to(`channel:${message.channelId}`).emit("message:delete", {
        messageId: message.id,
        channelId: message.channelId,
      });
    } catch {
      // Socket might not be initialized
    }

    res.json({ message: "Mesaj silindi" });
  } catch (error) {
    console.error("[Messages] Delete error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
