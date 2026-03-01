import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@khlus/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

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
      withCredentials: true,
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,       // 30sn'den 5sn'ye düşürüldü - daha hızlı reconnect
      transports: ["websocket", "polling"], // WebSocket öncelikli - polling'i atla
      timeout: 20000,                   // Bağlantı timeout'u
    });

    socket.on("connect", () => {
      notifyStatus("connected");
    });

    socket.on("disconnect", () => {
      notifyStatus("disconnected");
    });

    socket.io.on("reconnect_attempt", () => {
      notifyStatus("connecting");
    });

    socket.on("connect_error", (err) => {
      // Auth hatası alırsa reconnect'i durdur (sonsuz döngü önleme)
      if (err.message === "Authentication required" || err.message === "Invalid token") {
        socket?.disconnect();
        notifyStatus("disconnected");
      }
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s) return null as any;
  if (!s.connected) {
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
    socket.disconnect();
    socket = null;
  }
}
