// Discord-style bitfield permissions
export const Permissions = {
  // General
  ADMINISTRATOR: 1n << 0n,
  MANAGE_SERVER: 1n << 1n,
  MANAGE_CHANNELS: 1n << 2n,
  MANAGE_ROLES: 1n << 3n,
  MANAGE_INVITES: 1n << 4n,

  // Membership
  KICK_MEMBERS: 1n << 5n,
  BAN_MEMBERS: 1n << 6n,
  TIMEOUT_MEMBERS: 1n << 7n,

  // Text
  SEND_MESSAGES: 1n << 10n,
  READ_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 12n,
  ATTACH_FILES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ADD_REACTIONS: 1n << 15n,
  MENTION_EVERYONE: 1n << 16n,
  PIN_MESSAGES: 1n << 17n,

  // Voice/Video
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  VIDEO: 1n << 22n,
  SCREEN_SHARE: 1n << 23n,
  MUTE_MEMBERS: 1n << 24n,
  DEAFEN_MEMBERS: 1n << 25n,
  MOVE_MEMBERS: 1n << 26n,
  PRIORITY_SPEAKER: 1n << 27n,
} as const;

// Preset permission combinations
export const PermissionPresets = {
  OWNER: Object.values(Permissions).reduce((a, b) => a | b, 0n),
  ADMIN:
    Permissions.MANAGE_SERVER |
    Permissions.MANAGE_CHANNELS |
    Permissions.MANAGE_ROLES |
    Permissions.MANAGE_INVITES |
    Permissions.KICK_MEMBERS |
    Permissions.BAN_MEMBERS |
    Permissions.TIMEOUT_MEMBERS |
    Permissions.SEND_MESSAGES |
    Permissions.READ_MESSAGES |
    Permissions.MANAGE_MESSAGES |
    Permissions.ATTACH_FILES |
    Permissions.EMBED_LINKS |
    Permissions.ADD_REACTIONS |
    Permissions.MENTION_EVERYONE |
    Permissions.PIN_MESSAGES |
    Permissions.CONNECT |
    Permissions.SPEAK |
    Permissions.VIDEO |
    Permissions.SCREEN_SHARE |
    Permissions.MUTE_MEMBERS |
    Permissions.DEAFEN_MEMBERS |
    Permissions.MOVE_MEMBERS,
  MODERATOR:
    Permissions.KICK_MEMBERS |
    Permissions.TIMEOUT_MEMBERS |
    Permissions.MANAGE_MESSAGES |
    Permissions.SEND_MESSAGES |
    Permissions.READ_MESSAGES |
    Permissions.ATTACH_FILES |
    Permissions.EMBED_LINKS |
    Permissions.ADD_REACTIONS |
    Permissions.MENTION_EVERYONE |
    Permissions.PIN_MESSAGES |
    Permissions.CONNECT |
    Permissions.SPEAK |
    Permissions.VIDEO |
    Permissions.SCREEN_SHARE |
    Permissions.MUTE_MEMBERS,
  MEMBER:
    Permissions.SEND_MESSAGES |
    Permissions.READ_MESSAGES |
    Permissions.ATTACH_FILES |
    Permissions.EMBED_LINKS |
    Permissions.ADD_REACTIONS |
    Permissions.CONNECT |
    Permissions.SPEAK |
    Permissions.VIDEO |
    Permissions.SCREEN_SHARE,
  GUEST: Permissions.READ_MESSAGES | Permissions.CONNECT,
} as const;

export function hasPermission(
  memberPermissions: bigint,
  permission: bigint
): boolean {
  if ((memberPermissions & Permissions.ADMINISTRATOR) !== 0n) return true;
  return (memberPermissions & permission) === permission;
}

export function addPermission(current: bigint, permission: bigint): bigint {
  return current | permission;
}

export function removePermission(current: bigint, permission: bigint): bigint {
  return current & ~permission;
}
