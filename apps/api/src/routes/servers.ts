import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { PermissionPresets } from "@khlus/shared";

export const serverRouter = Router();
serverRouter.use(authenticate);

const createServerSchema = z.object({
  name: z.string().min(1).max(100),
});

// GET /api/servers - Kullanicinin uye oldugu sunucular
serverRouter.get("/", async (req: Request, res: Response) => {
  try {
    const servers = await prisma.server.findMany({
      where: {
        members: { some: { userId: req.user!.userId } },
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ servers });
  } catch (error) {
    console.error("[Servers] List error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/servers - Yeni sunucu olustur
serverRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name } = createServerSchema.parse(req.body);
    const inviteCode = crypto.randomBytes(4).toString("hex");

    const server = await prisma.$transaction(async (tx: any) => {
      // Create server
      const server = await tx.server.create({
        data: {
          name,
          ownerId: req.user!.userId,
          inviteCode,
        },
      });

      // Create default role (@everyone)
      const defaultRole = await tx.role.create({
        data: {
          serverId: server.id,
          name: "everyone",
          permissions: PermissionPresets.MEMBER.toString(),
          position: 0,
          isDefault: true,
        },
      });

      // Add owner as member
      const member = await tx.member.create({
        data: {
          userId: req.user!.userId,
          serverId: server.id,
        },
      });

      // Assign default role to owner
      await tx.memberRole.create({
        data: { memberId: member.id, roleId: defaultRole.id },
      });

      // Create default categories and channels
      const generalCategory = await tx.category.create({
        data: { serverId: server.id, name: "Genel", position: 0 },
      });

      const tradingCategory = await tx.category.create({
        data: { serverId: server.id, name: "Trading", position: 1 },
      });

      await tx.channel.createMany({
        data: [
          {
            serverId: server.id,
            categoryId: generalCategory.id,
            name: "genel-sohbet",
            type: "text",
            position: 0,
          },
          {
            serverId: server.id,
            categoryId: generalCategory.id,
            name: "duyurular",
            type: "text",
            position: 1,
          },
          {
            serverId: server.id,
            categoryId: tradingCategory.id,
            name: "analiz-paylasimi",
            type: "text",
            position: 0,
          },
          {
            serverId: server.id,
            categoryId: tradingCategory.id,
            name: "canli-trading",
            type: "voice",
            position: 1,
          },
        ],
      });

      return server;
    });

    res.status(201).json({ server });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("[Servers] Create error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// GET /api/servers/:serverId
serverRouter.get("/:serverId", async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.serverId },
      include: {
        categories: { orderBy: { position: "asc" } },
        channels: { orderBy: { position: "asc" } },
        roles: { orderBy: { position: "desc" } },
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
            },
            roles: { include: { role: true } },
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!server) {
      return res.status(404).json({ error: "Sunucu bulunamadı" });
    }

    const isMember = server.members.some((m: any) => m.userId === req.user!.userId);
    if (!isMember) {
      return res.status(403).json({ error: "Bu sunucuya erisim yetkiniz yok" });
    }

    res.json({ server });
  } catch (error) {
    console.error("[Servers] Get error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// PATCH /api/servers/:serverId - Sunucu guncelle (sadece sahip)
const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  iconUrl: z.string().url().optional().nullable(),
});

serverRouter.patch("/:serverId", async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.serverId },
    });

    if (!server) {
      return res.status(404).json({ error: "Sunucu bulunamadı" });
    }

    if (server.ownerId !== req.user!.userId) {
      return res.status(403).json({ error: "Sadece sunucu sahibi düzenleyebilir" });
    }

    const data = updateServerSchema.parse(req.body);

    const updated = await prisma.server.update({
      where: { id: req.params.serverId },
      data,
    });

    res.json({ server: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("[Servers] Update error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// DELETE /api/servers/:serverId - Sunucu sil (sadece sahip)
serverRouter.delete("/:serverId", async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.serverId },
    });

    if (!server) {
      return res.status(404).json({ error: "Sunucu bulunamadı" });
    }

    if (server.ownerId !== req.user!.userId) {
      return res.status(403).json({ error: "Sadece sunucu sahibi silebilir" });
    }

    // Cascade delete: messages -> channels -> categories -> members -> roles -> server
    await prisma.$transaction(async (tx: any) => {
      // Delete messages in server channels
      await tx.message.deleteMany({
        where: { channel: { serverId: server.id } },
      });
      // Delete channel permissions
      await tx.channelPermission.deleteMany({
        where: { channel: { serverId: server.id } },
      });
      // Delete channels
      await tx.channel.deleteMany({ where: { serverId: server.id } });
      // Delete categories
      await tx.category.deleteMany({ where: { serverId: server.id } });
      // Delete member roles
      await tx.memberRole.deleteMany({
        where: { member: { serverId: server.id } },
      });
      // Delete members
      await tx.member.deleteMany({ where: { serverId: server.id } });
      // Delete roles
      await tx.role.deleteMany({ where: { serverId: server.id } });
      // Delete server
      await tx.server.delete({ where: { id: server.id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("[Servers] Delete error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// PATCH /api/servers/:serverId/invite-code - Davet kodu yenile
serverRouter.patch("/:serverId/invite-code", async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.serverId },
    });

    if (!server) {
      return res.status(404).json({ error: "Sunucu bulunamadı" });
    }

    if (server.ownerId !== req.user!.userId) {
      return res.status(403).json({ error: "Sadece sunucu sahibi davet kodunu yenileyebilir" });
    }

    const newInviteCode = crypto.randomBytes(4).toString("hex");
    const updated = await prisma.server.update({
      where: { id: server.id },
      data: { inviteCode: newInviteCode },
    });

    res.json({ inviteCode: updated.inviteCode });
  } catch (error) {
    console.error("[Servers] Invite code refresh error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/servers/join/:inviteCode - Davet koduyla katil
serverRouter.post("/join/:inviteCode", async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { inviteCode: req.params.inviteCode },
      include: { roles: { where: { isDefault: true } } },
    });

    if (!server) {
      return res.status(404).json({ error: "Geçersiz davet kodu" });
    }

    const existingMember = await prisma.member.findUnique({
      where: {
        userId_serverId: {
          userId: req.user!.userId,
          serverId: server.id,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: "Zaten bu sunucunun üyesisiniz" });
    }

    // Ban kontrolü
    const ban = await prisma.ban.findUnique({
      where: { serverId_userId: { serverId: server.id, userId: req.user!.userId } },
    });
    if (ban) {
      return res.status(403).json({ error: "Bu sunucudan banlandınız" });
    }

    const member = await prisma.member.create({
      data: {
        userId: req.user!.userId,
        serverId: server.id,
      },
    });

    // Assign default role
    if (server.roles[0]) {
      await prisma.memberRole.create({
        data: { memberId: member.id, roleId: server.roles[0].id },
      });
    }

    res.status(201).json({ server, member });
  } catch (error) {
    console.error("[Servers] Join error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
