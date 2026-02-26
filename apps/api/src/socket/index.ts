import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  VoiceUser,
} from "@khlus/shared";
import { prisma } from "../db/prisma";

let io: Server<ClientToServerEvents, ServerToClientEvents>;

// channelId -> Map<userId, VoiceUser>
const voiceChannels = new Map<string, Map<string, VoiceUser>>();
// socketId -> { channelId, userId }
const socketVoiceState = new Map<string, { channelId: string; userId: string }>();

export function initSocket(httpServer: HttpServer, corsOrigin: string) {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Text kanal odası
    socket.on("channel:join", (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on("channel:leave", (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    // Ses/video kanalına katılma
    socket.on("voice:join", async (data) => {
      try {
        const { channelId, userId } = data;

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
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (channel) {
          socket.join(`server:${channel.serverId}`);
        }

        // Herkese bildir
        io.to(`server:${channel?.serverId}`).emit("voice:user_joined", {
          channelId,
          user: voiceUser,
        });

        console.log(`[Voice] ${user.displayName} -> ${channelId}`);
      } catch (error) {
        console.error("[Voice] Join error:", error);
      }
    });

    // Ses/video kanalından ayrılma
    socket.on("voice:leave", (data) => {
      const { channelId, userId } = data;
      removeUserFromVoice(socket, channelId, userId);
      socketVoiceState.delete(socket.id);
    });

    // Sunucudaki tüm voice durumlarını iste
    socket.on("voice:get_users", async (serverId) => {
      try {
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
        console.error("[Voice] Get users error:", error);
      }
    });

    // Mesaj
    socket.on("message:send", async (data) => {
      try {
        console.log(`[Socket] Message in channel:${data.channelId}`);
      } catch (error) {
        console.error("[Socket] Error handling message:", error);
      }
    });

    // Typing
    socket.on("typing:start", (channelId) => {
      socket.to(`channel:${channelId}`).emit("typing:start", {
        userId: (socket as any).userId || "unknown",
        channelId,
      });
    });

    socket.on("typing:stop", (channelId) => {
      socket.to(`channel:${channelId}`).emit("typing:stop", {
        userId: (socket as any).userId || "unknown",
        channelId,
      });
    });

    // Bağlantı koptuğunda voice'dan da çık
    socket.on("disconnect", () => {
      const state = socketVoiceState.get(socket.id);
      if (state) {
        removeUserFromVoice(socket, state.channelId, state.userId);
        socketVoiceState.delete(socket.id);
      }
      console.log(`[Socket] Client disconnected: ${socket.id}`);
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
