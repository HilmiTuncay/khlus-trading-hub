import { Router, Request, Response } from "express";
import { AccessToken } from "livekit-server-sdk";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import logger from "../lib/logger";

export const livekitRouter = Router();
livekitRouter.use(authenticate);

// POST /api/livekit/token - Ses/Video odasi icin token al
livekitRouter.post("/token", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: "channelId gerekli" });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      logger.error({ hasKey: !!apiKey, hasSecret: !!apiSecret, hasUrl: !!livekitUrl }, "LiveKit env eksik");
      return res.status(503).json({ error: "Ses/video sistemi henüz yapılandırılmamış. Yöneticiyle iletişime geçin." });
    }

    // Verify channel exists and is voice/video type
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || (channel.type !== "voice" && channel.type !== "video")) {
      return res.status(400).json({ error: "Geçersiz ses/video kanalı" });
    }

    // Verify membership
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

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    // Room name = channel ID for uniqueness
    const roomName = `channel-${channelId}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity: req.user!.userId,
      name: user?.displayName || "Kullanıcı",
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    res.json({
      token: jwt,
      room: roomName,
      livekitUrl,
    });
  } catch (error) {
    logger.error({ err: error }, "LiveKit token hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
