import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { checkPermission } from "../utils/permissions";
import { Permissions } from "@khlus/shared";

export const roleRouter = Router();
roleRouter.use(authenticate);

const createRoleSchema = z.object({
  serverId: z.string(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#99AAB5"),
  permissions: z.string().default("0"),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  permissions: z.string().optional(),
});

// GET /api/roles/:serverId - Sunucunun tüm rolleri
roleRouter.get("/:serverId", async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      where: { serverId: req.params.serverId as string },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { position: "desc" },
    });

    res.json({ roles });
  } catch (error) {
    console.error("[Roles] List error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/roles - Yeni rol oluştur
roleRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = createRoleSchema.parse(req.body);

    const canManage = await checkPermission(
      req.user!.userId,
      data.serverId,
      Permissions.MANAGE_ROLES
    );

    if (!canManage) {
      return res.status(403).json({ error: "Rol yönetme yetkiniz yok" });
    }

    const maxPosition = await prisma.role.aggregate({
      where: { serverId: data.serverId },
      _max: { position: true },
    });

    const role = await prisma.role.create({
      data: {
        serverId: data.serverId,
        name: data.name,
        color: data.color,
        permissions: data.permissions,
        position: (maxPosition._max.position || 0) + 1,
      },
    });

    res.status(201).json({ role });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("[Roles] Create error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// PATCH /api/roles/:roleId - Rol güncelle
roleRouter.patch("/:roleId", async (req: Request, res: Response) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId as string },
    });

    if (!role) {
      return res.status(404).json({ error: "Rol bulunamadı" });
    }

    const canManage = await checkPermission(
      req.user!.userId,
      role.serverId,
      Permissions.MANAGE_ROLES
    );

    if (!canManage) {
      return res.status(403).json({ error: "Rol yönetme yetkiniz yok" });
    }

    if (role.isDefault) {
      // Default rol sadece permissions değiştirilebilir
      const data = z.object({ permissions: z.string() }).parse(req.body);
      const updated = await prisma.role.update({
        where: { id: role.id },
        data: { permissions: data.permissions },
      });
      return res.json({ role: updated });
    }

    const data = updateRoleSchema.parse(req.body);

    const updated = await prisma.role.update({
      where: { id: role.id },
      data,
    });

    res.json({ role: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("[Roles] Update error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// DELETE /api/roles/:roleId - Rol sil
roleRouter.delete("/:roleId", async (req: Request, res: Response) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId as string },
    });

    if (!role) {
      return res.status(404).json({ error: "Rol bulunamadı" });
    }

    if (role.isDefault) {
      return res.status(400).json({ error: "Varsayılan rol silinemez" });
    }

    const canManage = await checkPermission(
      req.user!.userId,
      role.serverId,
      Permissions.MANAGE_ROLES
    );

    if (!canManage) {
      return res.status(403).json({ error: "Rol yönetme yetkiniz yok" });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.memberRole.deleteMany({ where: { roleId: role.id } });
      await tx.channelPermission.deleteMany({ where: { roleId: role.id } });
      await tx.role.delete({ where: { id: role.id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("[Roles] Delete error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// PUT /api/roles/assign - Üyeye rol ata/kaldır (toggle)
const assignRoleSchema = z.object({
  memberId: z.string(),
  roleId: z.string(),
});

roleRouter.put("/assign", async (req: Request, res: Response) => {
  try {
    const { memberId, roleId } = assignRoleSchema.parse(req.body);

    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return res.status(404).json({ error: "Üye bulunamadı" });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.serverId !== member.serverId) {
      return res.status(400).json({ error: "Geçersiz rol" });
    }

    if (role.isDefault) {
      return res.status(400).json({ error: "Varsayılan rol atanamaz/kaldırılamaz" });
    }

    const canManage = await checkPermission(
      req.user!.userId,
      member.serverId,
      Permissions.MANAGE_ROLES
    );

    if (!canManage) {
      return res.status(403).json({ error: "Rol yönetme yetkiniz yok" });
    }

    // Toggle: varsa kaldır, yoksa ekle
    const existing = await prisma.memberRole.findUnique({
      where: { memberId_roleId: { memberId, roleId } },
    });

    if (existing) {
      await prisma.memberRole.delete({
        where: { memberId_roleId: { memberId, roleId } },
      });
      res.json({ action: "removed" });
    } else {
      await prisma.memberRole.create({
        data: { memberId, roleId },
      });
      res.json({ action: "added" });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("[Roles] Assign error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
