import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { getIO } from "../socket";

export const reactionRouter = Router();
reactionRouter.use(authenticate);

const toggleReactionSchema = z.object({
  messageId: z.string(),
  emoji: z.string().min(1).max(8),
});

// PUT /api/reactions - Toggle reaction (ekle/kaldır)
reactionRouter.put("/", async (req: Request, res: Response) => {
  try {
    const { messageId, emoji } = toggleReactionSchema.parse(req.body);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { channelId: true, channel: { select: { serverId: true } } },
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

    // Toggle: varsa kaldır, yoksa ekle
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: req.user!.userId,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: {
          messageId,
          userId: req.user!.userId,
          emoji,
        },
      });
    }

    // Güncel reaksiyonları al
    const reactions = await prisma.reaction.findMany({
      where: { messageId },
    });

    // Gruplanmış reaksiyonlar
    const grouped = reactions.reduce((acc: Record<string, string[]>, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r.userId);
      return acc;
    }, {});

    // Socket ile bildir
    try {
      const io = getIO();
      io.to(`channel:${message.channelId}`).emit("message:update", {
        id: messageId,
        reactions: grouped,
      } as any);
    } catch {
      // Socket might not be initialized
    }

    res.json({ reactions: grouped });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("[Reactions] Toggle error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// GET /api/reactions/:messageId - Mesajın reaksiyonları
reactionRouter.get("/:messageId", async (req: Request, res: Response) => {
  try {
    const reactions = await prisma.reaction.findMany({
      where: { messageId: req.params.messageId as string },
    });

    const grouped = reactions.reduce((acc: Record<string, string[]>, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r.userId);
      return acc;
    }, {});

    res.json({ reactions: grouped });
  } catch (error) {
    console.error("[Reactions] Get error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
