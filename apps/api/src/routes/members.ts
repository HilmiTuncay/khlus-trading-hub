import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";

export const memberRouter = Router();
memberRouter.use(authenticate);

// GET /api/members/:serverId
memberRouter.get("/:serverId", async (req: Request, res: Response) => {
  try {
    const members = await prisma.member.findMany({
      where: { serverId: req.params.serverId },
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
    console.error("[Members] List error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// DELETE /api/members/:serverId/leave
memberRouter.delete("/:serverId/leave", async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.serverId },
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
          serverId: req.params.serverId,
        },
      },
    });

    res.json({ message: "Sunucudan ayrıldınız" });
  } catch (error) {
    console.error("[Members] Leave error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
