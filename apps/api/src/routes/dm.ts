import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { getIO } from "../socket";
import logger from "../lib/logger";
import { sanitizeText } from "../lib/sanitize";

export const dmRouter = Router();
dmRouter.use(authenticate);

// GET /api/dm/conversations - Kullanıcının tüm DM konuşmaları
dmRouter.get("/conversations", async (req: Request, res: Response) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: req.user!.userId } },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            author: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Her konuşma için karşı tarafın bilgilerini al
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.participants.find(
          (p) => p.userId !== req.user!.userId
        )?.userId;

        const otherUser = otherUserId
          ? await prisma.user.findUnique({
              where: { id: otherUserId },
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
              },
            })
          : null;

        return {
          id: conv.id,
          otherUser,
          lastMessage: conv.messages[0] || null,
          createdAt: conv.createdAt,
        };
      })
    );

    res.json({ conversations: enriched });
  } catch (error) {
    logger.error({ err: error }, "DM konuşma listesi hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/dm/conversations - Yeni DM konuşması başlat
const createConvSchema = z.object({
  targetUserId: z.string(),
});

dmRouter.post("/conversations", async (req: Request, res: Response) => {
  try {
    const { targetUserId } = createConvSchema.parse(req.body);

    if (targetUserId === req.user!.userId) {
      return res.status(400).json({ error: "Kendinize mesaj atamazsınız" });
    }

    // Hedef kullanıcı var mı?
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }

    // Mevcut konuşma var mı?
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.user!.userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
    });

    if (existing) {
      return res.json({ conversation: { id: existing.id } });
    }

    // Yeni konuşma oluştur
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          createMany: {
            data: [
              { userId: req.user!.userId },
              { userId: targetUserId },
            ],
          },
        },
      },
    });

    res.status(201).json({ conversation: { id: conversation.id } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "DM konuşma oluşturma hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// GET /api/dm/:conversationId/messages - Konuşma mesajları
dmRouter.get("/:conversationId/messages", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.conversationId as string;
    const cursor = req.query.cursor as string | undefined;

    // Katılımcı mı?
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: req.user!.userId,
        },
      },
    });

    if (!participant) {
      return res.status(403).json({ error: "Bu konuşmaya erişiminiz yok" });
    }

    const messages = await prisma.directMessage.findMany({
      where: { conversationId },
      take: 50,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    logger.error({ err: error }, "DM mesaj getirme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/dm/:conversationId/messages - DM mesaj gönder
const sendDMSchema = z.object({
  content: z.string().min(1).max(4000),
});

dmRouter.post("/:conversationId/messages", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.conversationId as string;
    const { content } = sendDMSchema.parse(req.body);

    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: req.user!.userId,
        },
      },
    });

    if (!participant) {
      return res.status(403).json({ error: "Bu konuşmaya erişiminiz yok" });
    }

    const message = await prisma.directMessage.create({
      data: {
        conversationId,
        authorId: req.user!.userId,
        content: sanitizeText(content),
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Socket ile bildir
    try {
      const io = getIO();
      io.to(`dm:${conversationId}`).emit("message:new", message as any);
    } catch {}

    res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "DM mesaj gönderme hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
