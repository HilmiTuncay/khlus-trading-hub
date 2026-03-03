import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@khlus/shared";
import { api } from "@/lib/api";

const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let isRefreshing = false;

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
    const token = localStorage.getItem("token");
    if (!token) return null;

    socket = io(API_URL, {
      withCredentials: !isTauriEnv,
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
    });

    socket.on("disconnect", () => {
      notifyStatus("disconnected");
    });

    socket.io.on("reconnect_attempt", () => {
      // Her reconnect'te güncel token'ı kullan
      const freshToken = localStorage.getItem("token");
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
          localStorage.setItem("token", res.token);
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
    // Bağlanmadan önce token'ı güncelle
    const freshToken = localStorage.getItem("token");
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
