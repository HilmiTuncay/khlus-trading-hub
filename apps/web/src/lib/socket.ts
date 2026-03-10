import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@khlus/shared";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let isRefreshing = false;

// Token getter - store'dan alınacak, circular dependency önlemek için callback
let tokenGetter: (() => string | null) | null = null;

// Voice state getter - reconnect sonrası voice:join re-emit için
let voiceStateGetter: (() => { isConnected: boolean; activeVoiceChannel: { id: string } | null } | null) | null = null;
let userIdGetter: (() => string | null) | null = null;

export function setTokenGetter(getter: () => string | null) {
  tokenGetter = getter;
}

export function setVoiceStateGetter(getter: () => { isConnected: boolean; activeVoiceChannel: { id: string } | null } | null) {
  voiceStateGetter = getter;
}

export function setUserIdGetter(getter: () => string | null) {
  userIdGetter = getter;
}

function getToken(): string | null {
  return tokenGetter ? tokenGetter() : null;
}

export type ConnectionStatusType = "connected" | "connecting" | "disconnected";
type ConnectionStatusListener = (status: ConnectionStatusType) => void;
const statusListeners = new Set<ConnectionStatusListener>();

function notifyStatus(status: ConnectionStatusType) {
  statusListeners.forEach((fn) => fn(status));
}

export function onConnectionStatus(listener: ConnectionStatusListener) {
  statusListeners.add(listener);
  return () => { statusListeners.delete(listener); };
}

export function getSocket() {
  if (typeof window === "undefined") return null;

  if (!socket) {
    const token = getToken();
    if (!token) return null;

    socket = io(API_URL, {
      withCredentials: true,
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"],
      timeout: 20000,
    });

    socket.on("connect", () => {
      notifyStatus("connected");
      // Socket reconnect sonrası voice state'i koru
      const voiceState = voiceStateGetter?.();
      const userId = userIdGetter?.();
      if (voiceState?.isConnected && voiceState.activeVoiceChannel && userId) {
        socket!.emit("voice:join", {
          channelId: voiceState.activeVoiceChannel.id,
          userId,
        });
      }
    });

    socket.on("disconnect", () => {
      notifyStatus("disconnected");
    });

    socket.io.on("reconnect_attempt", () => {
      // Her reconnect'te güncel token'ı kullan (memory'den)
      const freshToken = getToken();
      if (freshToken && socket) {
        socket.auth = { token: freshToken };
      }
      notifyStatus("connecting");
    });

    socket.on("connect_error", async (err) => {
      if (err.message === "Authentication required") {
        socket?.disconnect();
        notifyStatus("disconnected");
        return;
      }

      // Token geçersiz/expired — refresh dene
      if (err.message === "Invalid token" && !isRefreshing) {
        isRefreshing = true;
        try {
          const res = await api.refreshToken();
          api.setToken(res.token);
          // Yeni token ile tekrar bağlan
          if (socket) {
            socket.auth = { token: res.token };
            socket.connect();
          }
        } catch {
          // Refresh de başarısız — disconnect
          socket?.disconnect();
          notifyStatus("disconnected");
        } finally {
          isRefreshing = false;
        }
      }
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s) return null as any;
  if (!s.connected) {
    // Bağlanmadan önce token'ı güncelle (memory'den)
    const freshToken = getToken();
    if (freshToken) {
      s.auth = { token: freshToken };
    }
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function resetSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
