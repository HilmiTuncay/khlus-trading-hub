import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { checkPermission } from "../utils/permissions";
import { Permissions } from "@khlus/shared";
import { getIO } from "../socket";
import logger from "../lib/logger";

export const memberRouter = Router();
memberRouter.use(authenticate);

// GET /api/members/:serverId
memberRouter.get("/:serverId", async (req: Request, res: Response) => {
  try {
    const members = await prisma.member.findMany({
      where: { serverId: req.params.serverId as string },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
        roles: {
          include: { role: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    res.json({ members });
  } catch (error) {
    logger.error({ err: error }, "Üye listesi hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// DELETE /api/members/:serverId/leave
memberRouter.delete("/:serverId/leave", async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.serverId as string },
    });

    if (!server) {
      return res.status(404).json({ error: "Sunucu bulunamadı" });
    }

    if (server.ownerId === req.user!.userId) {
      return res.status(400).json({ error: "Sunucu sahibi sunucudan ayrılamaz" });
    }

    await prisma.member.delete({
      where: {
        userId_serverId: {
          userId: req.user!.userId,
          serverId: req.params.serverId as string,
        },
      },
    });

    res.json({ message: "Sunucudan ayrıldınız" });
  } catch (error) {
    logger.error({ err: error }, "Üye ayrılma hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/members/:serverId/kick/:userId - Üyeyi at
memberRouter.post("/:serverId/kick/:userId", async (req: Request, res: Response) => {
  try {
    const serverId = req.params.serverId as string;
    const targetUserId = req.params.userId as string;

    // Kendini atamazsın
    if (targetUserId === req.user!.userId) {
      return res.status(400).json({ error: "Kendinizi atamazsınız" });
    }

    // Sunucu sahibi atılamaz
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) {
      return res.status(404).json({ error: "Sunucu bulunamadı" });
    }
    if (server.ownerId === targetUserId) {
      return res.status(400).json({ error: "Sunucu sahibi atılamaz" });
    }

    const canKick = await checkPermission(req.user!.userId, serverId, Permissions.KICK_MEMBERS);
    if (!canKick) {
      return res.status(403).json({ error: "Üye atma yetkiniz yok" });
    }

    const member = await prisma.member.findUnique({
      where: { userId_serverId: { userId: targetUserId, serverId } },
    });

    if (!member) {
      return res.status(404).json({ error: "Üye bulunamadı" });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.memberRole.deleteMany({ where: { memberId: member.id } });
      await tx.member.delete({ where: { id: member.id } });
    });

    try {
      const io = getIO();
      io.to(`server:${serverId}`).emit("member:leave", { userId: targetUserId, serverId });
    } catch {}

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Üye atma hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/members/:serverId/ban/:userId - Üyeyi banla
const banSchema = z.object({
  reason: z.string().max(500).optional(),
});

memberRouter.post("/:serverId/ban/:userId", async (req: Request, res: Response) => {
  try {
    const serverId = req.params.serverId as string;
    const targetUserId = req.params.userId as string;
    const { reason } = banSchema.parse(req.body || {});

    if (targetUserId === req.user!.userId) {
      return res.status(400).json({ error: "Kendinizi banlayamazsınız" });
    }

    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) {
      return res.status(404).json({ error: "Sunucu bulunamadı" });
    }
    if (server.ownerId === targetUserId) {
      return res.status(400).json({ error: "Sunucu sahibi banlanamaz" });
    }

    const canBan = await checkPermission(req.user!.userId, serverId, Permissions.BAN_MEMBERS);
    if (!canBan) {
      return res.status(403).json({ error: "Ban yetkiniz yok" });
    }

    await prisma.$transaction(async (tx: any) => {
      // Ban kaydı oluştur
      await tx.ban.upsert({
        where: { serverId_userId: { serverId, userId: targetUserId } },
        create: {
          serverId,
          userId: targetUserId,
          reason,
          bannedBy: req.user!.userId,
        },
        update: {
          reason,
          bannedBy: req.user!.userId,
        },
      });

      // Üyeyse sunucudan çıkar
      const member = await tx.member.findUnique({
        where: { userId_serverId: { userId: targetUserId, serverId } },
      });

      if (member) {
        await tx.memberRole.deleteMany({ where: { memberId: member.id } });
        await tx.member.delete({ where: { id: member.id } });
      }
    });

    try {
      const io = getIO();
      io.to(`server:${serverId}`).emit("member:leave", { userId: targetUserId, serverId });
    } catch {}

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ err: error }, "Üye banlama hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// DELETE /api/members/:serverId/ban/:userId - Ban kaldır
memberRouter.delete("/:serverId/ban/:userId", async (req: Request, res: Response) => {
  try {
    const serverId = req.params.serverId as string;
    const targetUserId = req.params.userId as string;

    const canBan = await checkPermission(req.user!.userId, serverId, Permissions.BAN_MEMBERS);
    if (!canBan) {
      return res.status(403).json({ error: "Ban yönetme yetkiniz yok" });
    }

    await prisma.ban.delete({
      where: { serverId_userId: { serverId, userId: targetUserId } },
    }).catch(() => {});

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Ban kaldırma hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// GET /api/members/:serverId/bans - Ban listesi
memberRouter.get("/:serverId/bans", async (req: Request, res: Response) => {
  try {
    const serverId = req.params.serverId as string;

    const canBan = await checkPermission(req.user!.userId, serverId, Permissions.BAN_MEMBERS);
    if (!canBan) {
      return res.status(403).json({ error: "Ban listesini görme yetkiniz yok" });
    }

    const bans = await prisma.ban.findMany({
      where: { serverId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ bans });
  } catch (error) {
    logger.error({ err: error }, "Ban listesi hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
