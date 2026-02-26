import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@khlus/shared";
import { prisma } from "../db/prisma";

let io: Server<ClientToServerEvents, ServerToClientEvents>;

export function initSocket(httpServer: HttpServer, corsOrigin: string) {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a channel room
    socket.on("channel:join", (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`[Socket] ${socket.id} joined channel:${channelId}`);
    });

    // Leave a channel room
    socket.on("channel:leave", (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    // Handle new message
    socket.on("message:send", async (data) => {
      try {
        // Message creation is handled via REST API
        // Socket is used for broadcasting only
        console.log(`[Socket] Message in channel:${data.channelId}`);
      } catch (error) {
        console.error("[Socket] Error handling message:", error);
      }
    });

    // Typing indicators
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

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
