import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  VoiceUser,
} from "@khlus/shared";
import { prisma } from "../db/prisma";
import logger from "../lib/logger";
import { env } from "../config/env";
import { checkChannelPermission } from "../utils/permissions";
import { Permissions } from "@khlus/shared";

let io: Server<ClientToServerEvents, ServerToClientEvents>;

// channelId -> Map<userId, VoiceUser>
const voiceChannels = new Map<string, Map<string, VoiceUser>>();
// socketId -> { channelId, userId }
const socketVoiceState = new Map<string, { channelId: string; userId: string }>();

// Socket rate limiter
function createSocketRateLimiter(maxEvents: number, windowMs: number) {
  const counters = new Map<string, { count: number; resetAt: number }>();
  return (socketId: string): boolean => {
    const now = Date.now();
    const entry = counters.get(socketId);
    if (!entry || now > entry.resetAt) {
      counters.set(socketId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count++;
    return entry.count <= maxEvents;
  };
}

const messageRateLimit = createSocketRateLimiter(30, 10_000); // 30 event / 10s
const typingRateLimit = createSocketRateLimiter(5, 5_000); // 5 event / 5s

export function initSocket(httpServer: HttpServer, corsOrigins: string[]) {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // Vercel preview URL'lerini kabul et
          const isVercelPreview = corsOrigins.some((o) => {
            const domain = o.replace("https://", "").replace("http://", "");
            const baseName = domain.split(".")[0];
            const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`^https://${escaped}(-[a-z0-9]+)*\\.vercel\\.app$`);
            return re.test(origin);
          });
          callback(null, isVercelPreview);
        }
      },
      credentials: true,
    },
    // Cloud hosting için optimize edilmiş ayarlar
    pingInterval: 25000,    // 25sn - sunucu her 25sn'de ping atar
    pingTimeout: 30000,     // 30sn - client'ın cevap vermesi için süre (cloud gecikmeleri için geniş)
    transports: ["websocket", "polling"], // WebSocket öncelikli
    allowUpgrades: true,
    upgradeTimeout: 10000,
  });

  // Socket authentication middleware — anonim bağlantıyı reddet
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const authenticatedUserId: string = (socket as any).userId;
    logger.info({ socketId: socket.id, userId: authenticatedUserId }, "Socket client bağlandı");

    // Text kanal veya DM odası — üyelik kontrolü
    socket.on("channel:join", async (channelId) => {
      try {
        // DM konuşması: "dm:<conversationId>" formatında
        if (channelId.startsWith("dm:")) {
          const conversationId = channelId.slice(3);
          const participant = await prisma.conversationParticipant.findUnique({
            where: {
              conversationId_userId: {
                conversationId,
                userId: authenticatedUserId,
              },
            },
          });
          if (!participant) {
            logger.warn({ userId: authenticatedUserId, channelId }, "Yetkisiz DM katılma denemesi");
            return;
          }
          socket.join(`dm:${conversationId}`);
          return;
        }

        // Normal kanal
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          select: { serverId: true },
        });
        if (!channel) return;

        const member = await prisma.member.findUnique({
          where: { userId_serverId: { userId: authenticatedUserId, serverId: channel.serverId } },
        });
        if (!member) {
          logger.warn({ userId: authenticatedUserId, channelId }, "Yetkisiz kanal katılma denemesi");
          return;
        }

        // Kanal izni kontrolü
        const hasReadPerm = await checkChannelPermission(authenticatedUserId, channel.serverId, channelId, Permissions.READ_MESSAGES);
        if (!hasReadPerm) {
          logger.warn({ userId: authenticatedUserId, channelId }, "Kanal okuma izni yok");
          return;
        }

        socket.join(`channel:${channelId}`);
      } catch (error) {
        logger.error({ err: error, channelId }, "channel:join hatası");
      }
    });

    socket.on("channel:leave", (channelId) => {
      if (channelId.startsWith("dm:")) {
        socket.leave(channelId);
      } else {
        socket.leave(`channel:${channelId}`);
      }
    });

    // Ses/video kanalına katılma — sadece authenticatedUserId, üyelik kontrolü
    socket.on("voice:join", async (data) => {
      try {
        const { channelId } = data;
        const userId = authenticatedUserId;

        // Kanal ve üyelik kontrolü
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) return;

        const member = await prisma.member.findUnique({
          where: { userId_serverId: { userId, serverId: channel.serverId } },
        });
        if (!member) {
          logger.warn({ userId, channelId }, "Yetkisiz voice katılma denemesi");
          return;
        }

        // Kanal izni kontrolü
        const hasConnectPerm = await checkChannelPermission(userId, channel.serverId, channelId, Permissions.CONNECT);
        if (!hasConnectPerm) {
          logger.warn({ userId, channelId }, "Voice bağlanma izni yok");
          return;
        }

        // Kullanıcı bilgilerini çek
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        });

        if (!user) return;

        const voiceUser: VoiceUser = {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        };

        // Önceki odadan çık
        const prevState = socketVoiceState.get(socket.id);
        if (prevState) {
          removeUserFromVoice(socket, prevState.channelId, prevState.userId);
        }

        // Yeni odaya ekle
        if (!voiceChannels.has(channelId)) {
          voiceChannels.set(channelId, new Map());
        }
        voiceChannels.get(channelId)!.set(userId, voiceUser);
        socketVoiceState.set(socket.id, { channelId, userId });

        // Sunucu odasına katıl (broadcast için)
        socket.join(`server:${channel.serverId}`);

        // Herkese bildir
        io.to(`server:${channel.serverId}`).emit("voice:user_joined", {
          channelId,
          user: voiceUser,
        });

        logger.info({ userId: user.id, displayName: user.displayName, channelId }, "Voice kanalına katıldı");
      } catch (error) {
        logger.error({ err: error }, "Voice join hatası");
      }
    });

    // Ses/video kanalından ayrılma
    socket.on("voice:leave", (data) => {
      const { channelId } = data;
      removeUserFromVoice(socket, channelId, authenticatedUserId);
      socketVoiceState.delete(socket.id);
    });

    // Sunucudaki tüm voice durumlarını iste — üyelik kontrolü
    socket.on("voice:get_users", async (serverId) => {
      try {
        // Üyelik kontrolü
        const member = await prisma.member.findUnique({
          where: { userId_serverId: { userId: authenticatedUserId, serverId } },
        });
        if (!member) {
          logger.warn({ userId: authenticatedUserId, serverId }, "Yetkisiz voice:get_users denemesi");
          return;
        }

        // Bu sunucudaki tüm kanalları bul
        const channels = await prisma.channel.findMany({
          where: { serverId, type: { in: ["voice", "video"] } },
          select: { id: true },
        });

        // Sunucu odasına katıl
        socket.join(`server:${serverId}`);

        // Her kanal için aktif kullanıcıları gönder
        for (const ch of channels) {
          const users = voiceChannels.get(ch.id);
          if (users && users.size > 0) {
            socket.emit("voice:channel_users", {
              channelId: ch.id,
              users: Array.from(users.values()),
            });
          }
        }
      } catch (error) {
        logger.error({ err: error }, "Voice get users hatası");
      }
    });

    // Mesaj — rate limiting
    socket.on("message:send", async (data) => {
      if (!messageRateLimit(socket.id)) {
        logger.warn({ socketId: socket.id, userId: authenticatedUserId }, "Socket mesaj rate limit aşıldı");
        return;
      }
      try {
        logger.debug({ channelId: data.channelId }, "Socket mesaj alındı");
      } catch (error) {
        logger.error({ err: error }, "Socket mesaj hatası");
      }
    });

    // Typing — rate limiting + üyelik kontrolü
    socket.on("typing:start", async (channelId) => {
      if (!typingRateLimit(socket.id)) return;
      try {
        const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
        if (!channel) return;
        const member = await prisma.member.findUnique({
          where: { userId_serverId: { userId: authenticatedUserId, serverId: channel.serverId } },
        });
        if (!member) return;
        socket.to(`channel:${channelId}`).emit("typing:start", {
          userId: authenticatedUserId,
          channelId,
        });
      } catch {}
    });

    socket.on("typing:stop", async (channelId) => {
      try {
        const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
        if (!channel) return;
        const member = await prisma.member.findUnique({
          where: { userId_serverId: { userId: authenticatedUserId, serverId: channel.serverId } },
        });
        if (!member) return;
        socket.to(`channel:${channelId}`).emit("typing:stop", {
          userId: authenticatedUserId,
          channelId,
        });
      } catch {}
    });

    // Bağlantı koptuğunda voice'dan da çık
    socket.on("disconnect", () => {
      const state = socketVoiceState.get(socket.id);
      if (state) {
        removeUserFromVoice(socket, state.channelId, state.userId);
        socketVoiceState.delete(socket.id);
      }
      logger.info({ socketId: socket.id }, "Socket client ayrıldı");
    });
  });

  return io;
}

async function removeUserFromVoice(socket: any, channelId: string, userId: string) {
  const channelUsers = voiceChannels.get(channelId);
  if (channelUsers) {
    channelUsers.delete(userId);
    if (channelUsers.size === 0) {
      voiceChannels.delete(channelId);
    }
  }

  // Sunucu ID'sini bul ve herkese bildir
  try {
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (channel) {
      io.to(`server:${channel.serverId}`).emit("voice:user_left", {
        channelId,
        userId,
      });
    }
  } catch {}
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
