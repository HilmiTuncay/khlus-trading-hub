import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";

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

    const channelCount = await prisma.channel.count({
      where: { serverId: data.serverId },
    });

    const channel = await prisma.channel.create({
      data: {
        serverId: data.serverId,
        categoryId: data.categoryId,
        name: data.name,
        type: data.type,
        topic: data.topic,
        position: channelCount,
      },
    });

    res.status(201).json({ channel });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("[Channels] Create error:", error);
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
    console.error("[Channels] Get error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
