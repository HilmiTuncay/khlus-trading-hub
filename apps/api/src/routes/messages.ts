import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { getIO } from "../socket";
import logger from "../lib/logger";
import { sanitizeText } from "../lib/sanitize";

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
    logger.error({ err: error }, "Mesaj getirme hatası");
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
        content: sanitizeText(data.content),
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
    logger.error({ err: error }, "Mesaj gönderme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/messages/signal - Trading sinyali gönder
const signalSchema = z.object({
  channelId: z.string(),
  direction: z.enum(["long", "short"]),
  symbol: z.string().min(1).max(20),
  entry: z.string().min(1),
  targets: z.array(z.string()).min(1).max(5),
  stopLoss: z.string().min(1),
  notes: z.string().max(500).optional(),
});

messageRouter.post("/signal", async (req: Request, res: Response) => {
  try {
    const data = signalSchema.parse(req.body);

    const channel = await prisma.channel.findUnique({
      where: { id: data.channelId },
    });

    if (!channel) {
      return res.status(404).json({ error: "Kanal bulunamadı" });
    }

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

    const symbol = sanitizeText(data.symbol);
    const entry = sanitizeText(data.entry);
    const stopLoss = sanitizeText(data.stopLoss);
    const targets = data.targets.map(sanitizeText);
    const notes = data.notes ? sanitizeText(data.notes) : "";
    const content = `📊 ${data.direction.toUpperCase()} ${symbol} @ ${entry}`;

    const message = await prisma.message.create({
      data: {
        channelId: data.channelId,
        authorId: req.user!.userId,
        content,
        type: "signal",
        metadata: {
          direction: data.direction,
          symbol,
          entry,
          targets,
          stopLoss,
          notes,
        },
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    try {
      const io = getIO();
      io.to(`channel:${data.channelId}`).emit("message:new", message as any);
    } catch {}

    res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Sinyal gönderme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/messages/poll - Anket oluştur
const pollSchema = z.object({
  channelId: z.string(),
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(100)).min(2).max(6),
});

messageRouter.post("/poll", async (req: Request, res: Response) => {
  try {
    const data = pollSchema.parse(req.body);

    const channel = await prisma.channel.findUnique({
      where: { id: data.channelId },
    });

    if (!channel) {
      return res.status(404).json({ error: "Kanal bulunamadı" });
    }

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

    const question = sanitizeText(data.question);
    const options = data.options.map((opt) => sanitizeText(opt));

    const message = await prisma.message.create({
      data: {
        channelId: data.channelId,
        authorId: req.user!.userId,
        content: `📊 ${question}`,
        type: "poll",
        metadata: {
          question,
          options: options.map((opt) => ({ text: opt, votes: [] as string[] })),
        },
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    try {
      const io = getIO();
      io.to(`channel:${data.channelId}`).emit("message:new", message as any);
    } catch {}

    res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Anket oluşturma hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// PUT /api/messages/:messageId/vote - Ankete oy ver
messageRouter.put("/:messageId/vote", async (req: Request, res: Response) => {
  try {
    const { optionIndex } = z.object({ optionIndex: z.number().min(0) }).parse(req.body);

    const message = await prisma.message.findUnique({
      where: { id: req.params.messageId },
      include: { channel: true },
    });

    if (!message || message.type !== "poll") {
      return res.status(404).json({ error: "Anket bulunamadı" });
    }

    const metadata = message.metadata as any;
    if (!metadata?.options || optionIndex >= metadata.options.length) {
      return res.status(400).json({ error: "Geçersiz seçenek" });
    }

    // Önceki oyları kaldır, yeni oy ekle (toggle)
    const userId = req.user!.userId;
    const options = metadata.options.map((opt: any, i: number) => {
      const votes = (opt.votes || []).filter((v: string) => v !== userId);
      if (i === optionIndex && !(opt.votes || []).includes(userId)) {
        votes.push(userId);
      }
      return { ...opt, votes };
    });

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { metadata: { ...metadata, options } },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    try {
      const io = getIO();
      io.to(`channel:${message.channelId}`).emit("message:update", updated as any);
    } catch {}

    res.json({ message: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Oy verme hatası");
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
    logger.error({ err: error }, "Mesaj silme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// PUT /api/messages/:messageId/pin - Mesajı pinle/pin kaldır (toggle)
messageRouter.put("/:messageId/pin", async (req: Request, res: Response) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.messageId },
      include: { channel: true },
    });

    if (!message) {
      return res.status(404).json({ error: "Mesaj bulunamadı" });
    }

    // Üyelik kontrolü
    const member = await prisma.member.findUnique({
      where: {
        userId_serverId: {
          userId: req.user!.userId,
          serverId: message.channel.serverId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Bu sunucunun üyesi değilsiniz" });
    }

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: {
        isPinned: !message.isPinned,
        pinnedAt: !message.isPinned ? new Date() : null,
        pinnedBy: !message.isPinned ? req.user!.userId : null,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    try {
      const io = getIO();
      io.to(`channel:${message.channelId}`).emit("message:update", updated as any);
    } catch {}

    res.json({ message: updated });
  } catch (error) {
    logger.error({ err: error }, "Mesaj pin hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// GET /api/messages/:channelId/pinned - Pinlenmiş mesajları getir
messageRouter.get("/:channelId/pinned", async (req: Request, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        channelId: req.params.channelId,
        isPinned: true,
      },
      orderBy: { pinnedAt: "desc" },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        reactions: true,
      },
    });

    const messagesWithGroupedReactions = messages.map((msg: any) => {
      const grouped = (msg.reactions || []).reduce((acc: Record<string, string[]>, r: any) => {
        if (!acc[r.emoji]) acc[r.emoji] = [];
        acc[r.emoji].push(r.userId);
        return acc;
      }, {});
      return { ...msg, reactions: grouped };
    });

    res.json({ messages: messagesWithGroupedReactions });
  } catch (error) {
    logger.error({ err: error }, "Pinli mesaj getirme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
