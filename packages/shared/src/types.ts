// ==================== User ====================
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: Date;
}

export type UserStatus = "online" | "idle" | "dnd" | "offline";

// ==================== Server ====================
export interface Server {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  inviteCode: string;
  createdAt: Date;
}

// ==================== Channel ====================
export interface Channel {
  id: string;
  serverId: string;
  categoryId: string | null;
  name: string;
  type: ChannelType;
  topic: string | null;
  position: number;
}

export type ChannelType = "text" | "voice" | "video";

// ==================== Category ====================
export interface Category {
  id: string;
  serverId: string;
  name: string;
  position: number;
}

// ==================== Member ====================
export interface Member {
  id: string;
  userId: string;
  serverId: string;
  nickname: string | null;
  joinedAt: Date;
  roles: Role[];
}

// ==================== Role ====================
export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: string;
  permissions: bigint;
  position: number;
}

// ==================== Message ====================
export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  attachments: Attachment[];
  editedAt: Date | null;
  createdAt: Date;
  author?: User;
}

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

// ==================== Socket Events ====================
export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:update": (message: Message) => void;
  "message:delete": (data: { messageId: string; channelId: string }) => void;
  "member:join": (member: Member) => void;
  "member:leave": (data: { userId: string; serverId: string }) => void;
  "member:update": (member: Member) => void;
  "presence:update": (data: { userId: string; status: UserStatus }) => void;
  "typing:start": (data: { userId: string; channelId: string }) => void;
  "typing:stop": (data: { userId: string; channelId: string }) => void;
}

export interface ClientToServerEvents {
  "channel:join": (channelId: string) => void;
  "channel:leave": (channelId: string) => void;
  "message:send": (data: { channelId: string; content: string }) => void;
  "typing:start": (channelId: string) => void;
  "typing:stop": (channelId: string) => void;
}
