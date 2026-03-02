"use client";

import { useEffect, useState, useCallback } from "react";
import { onConnectionStatus, getSocket, type ConnectionStatusType } from "@/lib/socket";
import { api } from "@/lib/api";
import { useServerStore } from "@/stores/server";
import { useVoiceStore } from "@/stores/voice";
import { useAuthStore } from "@/stores/auth";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warn";
}

function timestamp() {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const typeColor: Record<LogEntry["type"], string> = {
  info: "text-blue-400",
  success: "text-green-400",
  error: "text-red-400",
  warn: "text-yellow-400",
};

export function SystemLogPanel() {
  const [open, setOpen] = useState(false);
  const [socketStatus, setSocketStatus] = useState<ConnectionStatusType>("disconnected");
  const [apiStatus, setApiStatus] = useState<"ok" | "down" | "checking">("checking");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const { servers, activeServer, activeChannel } = useServerStore();
  const { isConnected: voiceConnected, activeVoiceChannel, channelUsers } = useVoiceStore();
  const { user } = useAuthStore();

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [...prev.slice(-29), { time: timestamp(), message, type }]);
  }, []);

  // Socket durumu
  useEffect(() => {
    const unsub = onConnectionStatus((status) => {
      setSocketStatus(status);
      if (status === "connected") addLog("Socket.io baglandi", "success");
      else if (status === "disconnected") addLog("Socket.io baglanti kesildi", "error");
      else addLog("Socket.io yeniden baglaniyor...", "warn");
    });

    // Ilk durum kontrolu
    const s = getSocket();
    if (s?.connected) setSocketStatus("connected");

    return unsub;
  }, [addLog]);

  // API health check (her 30s)
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      setApiStatus("checking");
      const ok = await api.healthCheck();
      if (!mounted) return;
      setApiStatus(ok ? "ok" : "down");
      if (ok) addLog("API sunucusu aktif", "success");
      else addLog("API sunucusu yanitlamiyor", "error");
    };
    check();
    const timer = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(timer); };
  }, [addLog]);

  // Sunucu degisikliklerini logla
  useEffect(() => {
    if (activeServer) {
      addLog(`Sunucu: ${activeServer.name}`, "info");
    }
  }, [activeServer?.id, addLog]);

  useEffect(() => {
    if (activeChannel) {
      addLog(`Kanal: #${activeChannel.name}`, "info");
    }
  }, [activeChannel?.id, addLog]);

  // Voice durumu
  useEffect(() => {
    if (voiceConnected && activeVoiceChannel) {
      addLog(`Ses: ${activeVoiceChannel.name} baglanildi`, "success");
    }
  }, [voiceConnected, activeVoiceChannel?.id, addLog]);

  const totalVoiceUsers = Object.values(channelUsers).reduce((sum, arr) => sum + arr.length, 0);

  const statusDot = (status: "ok" | "err" | "warn") => {
    const colors = { ok: "bg-green-400", err: "bg-red-400", warn: "bg-yellow-400" };
    return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[status]}`} />;
  };

  if (!user) return null;

  return (
    <div className="fixed top-2 right-2 z-[60] select-none" style={{ fontSize: "11px" }}>
      {/* Toggle butonu */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-gray-300 backdrop-blur-sm hover:bg-black/70 transition-colors border border-white/10"
      >
        <Activity className="h-3 w-3" />
        <span>Log</span>
        {/* Ozet noktalar */}
        {!open && (
          <span className="flex items-center gap-1 ml-1">
            {statusDot(apiStatus === "ok" ? "ok" : apiStatus === "down" ? "err" : "warn")}
            {statusDot(socketStatus === "connected" ? "ok" : socketStatus === "disconnected" ? "err" : "warn")}
            {voiceConnected && statusDot("ok")}
          </span>
        )}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-1 w-72 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-gray-300 shadow-xl">
          {/* Durum ozeti */}
          <div className="px-3 py-2 border-b border-white/10 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">API Sunucu</span>
              <span className="flex items-center gap-1.5">
                {statusDot(apiStatus === "ok" ? "ok" : apiStatus === "down" ? "err" : "warn")}
                <span className={apiStatus === "ok" ? "text-green-400" : apiStatus === "down" ? "text-red-400" : "text-yellow-400"}>
                  {apiStatus === "ok" ? "Aktif" : apiStatus === "down" ? "Kapalı" : "Kontrol..."}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Socket.io</span>
              <span className="flex items-center gap-1.5">
                {statusDot(socketStatus === "connected" ? "ok" : socketStatus === "disconnected" ? "err" : "warn")}
                <span className={socketStatus === "connected" ? "text-green-400" : socketStatus === "disconnected" ? "text-red-400" : "text-yellow-400"}>
                  {socketStatus === "connected" ? "Bagli" : socketStatus === "disconnected" ? "Kopuk" : "Baglaniyor"}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Ses (LiveKit)</span>
              <span className="flex items-center gap-1.5">
                {statusDot(voiceConnected ? "ok" : "err")}
                <span className={voiceConnected ? "text-green-400" : "text-gray-500"}>
                  {voiceConnected ? activeVoiceChannel?.name || "Aktif" : "Kapalı"}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-gray-400">Sunucular</span>
              <span className="text-gray-300">{servers.length} adet</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Aktif Sunucu</span>
              <span className="text-gray-300 truncate max-w-[140px]">{activeServer?.name || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Aktif Kanal</span>
              <span className="text-gray-300 truncate max-w-[140px]">{activeChannel ? `#${activeChannel.name}` : "—"}</span>
            </div>
            {totalVoiceUsers > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Seste</span>
                <span className="text-gray-300">{totalVoiceUsers} kisi</span>
              </div>
            )}
          </div>

          {/* Log kayitlari */}
          <div className="max-h-36 overflow-y-auto px-3 py-2 space-y-0.5 font-mono scrollbar-thin scrollbar-thumb-white/10">
            {logs.length === 0 ? (
              <span className="text-gray-500">Henuz log yok...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-1.5 leading-tight">
                  <span className="text-gray-500 shrink-0">{log.time}</span>
                  <span className={typeColor[log.type]}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
