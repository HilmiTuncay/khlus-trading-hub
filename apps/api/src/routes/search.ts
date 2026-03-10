import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import logger from "../lib/logger";
import { checkChannelPermission } from "../utils/permissions";
import { Permissions } from "@khlus/shared";

export const searchRouter = Router();
searchRouter.use(authenticate);

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  serverId: z.string(),
  type: z.enum(["messages", "members", "all"]).default("all"),
});

// GET /api/search?query=xxx&serverId=xxx&type=all
searchRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { query, serverId, type } = searchSchema.parse(req.query);

    // Üyelik kontrolü
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

    const results: { messages?: any[]; members?: any[] } = {};

    if (type === "messages" || type === "all") {
      const messages = await prisma.message.findMany({
        where: {
          channel: { serverId },
          content: { contains: query, mode: "insensitive" },
        },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          channel: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      });
      // Kullanıcının okuma izni olmayan kanallardaki mesajları filtrele
      const filteredMessages = [];
      for (const msg of messages) {
        const hasReadPerm = await checkChannelPermission(req.user!.userId, serverId, msg.channel.id, Permissions.READ_MESSAGES);
        if (hasReadPerm) {
          filteredMessages.push(msg);
        }
      }
      results.messages = filteredMessages;
    }

    if (type === "members" || type === "all") {
      const members = await prisma.member.findMany({
        where: {
          serverId,
          user: {
            OR: [
              { displayName: { contains: query, mode: "insensitive" } },
              { username: { contains: query, mode: "insensitive" } },
            ],
          },
        },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
          },
        },
        take: 10,
      });
      results.members = members;
    }

    res.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Arama hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
