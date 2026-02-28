import { prisma } from "../db/prisma";
import { Permissions, hasPermission } from "@khlus/shared";

/**
 * Bir kullanıcının sunucudaki tüm izinlerini hesapla.
 * Sunucu sahibi otomatik ADMINISTRATOR alır.
 */
export async function getMemberPermissions(
  userId: string,
  serverId: string
): Promise<bigint> {
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { ownerId: true },
  });

  if (!server) return 0n;

  // Sunucu sahibi = tam yetki
  if (server.ownerId === userId) {
    return Object.values(Permissions).reduce((a, b) => a | b, 0n);
  }

  const member = await prisma.member.findUnique({
    where: { userId_serverId: { userId, serverId } },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!member) return 0n;

  // Tüm rollerin izinlerini birleştir
  let permissions = 0n;
  for (const mr of member.roles) {
    permissions |= BigInt(mr.role.permissions);
  }

  return permissions;
}

/**
 * Kullanıcının belirli bir izne sahip olup olmadığını kontrol et.
 */
export async function checkPermission(
  userId: string,
  serverId: string,
  permission: bigint
): Promise<boolean> {
  const perms = await getMemberPermissions(userId, serverId);
  return hasPermission(perms, permission);
}

/**
 * Kanal bazlı izin override'larını hesaba katarak kontrol et.
 */
export async function checkChannelPermission(
  userId: string,
  serverId: string,
  channelId: string,
  permission: bigint
): Promise<boolean> {
  const perms = await getMemberPermissions(userId, serverId);

  // ADMINISTRATOR her şeyi bypass eder
  if (hasPermission(perms, Permissions.ADMINISTRATOR)) return true;

  // Kanal override'larını kontrol et
  const member = await prisma.member.findUnique({
    where: { userId_serverId: { userId, serverId } },
    include: { roles: { select: { roleId: true } } },
  });

  if (!member) return false;

  const roleIds = member.roles.map((r) => r.roleId);

  const overrides = await prisma.channelPermission.findMany({
    where: {
      channelId,
      roleId: { in: roleIds },
    },
  });

  let finalPerms = perms;
  for (const override of overrides) {
    finalPerms &= ~BigInt(override.deny);
    finalPerms |= BigInt(override.allow);
  }

  return (finalPerms & permission) === permission;
}
