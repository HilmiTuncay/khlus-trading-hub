"use client";

import { useEffect, useState, useRef } from "react";
import { onConnectionStatus, connectSocket, type ConnectionStatusType } from "@/lib/socket";
import { Loader2, WifiOff, RefreshCw, Wifi } from "lucide-react";

export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatusType>("connected");
  const [showRecovered, setShowRecovered] = useState(false);
  const wasDisconnected = useRef(false);

  useEffect(() => {
    return onConnectionStatus((newStatus) => {
      // Bağlantı geri geldiğinde kısa süre "bağlandı" göster
      if (newStatus === "connected" && wasDisconnected.current) {
        setShowRecovered(true);
        setTimeout(() => setShowRecovered(false), 2000);
      }
      wasDisconnected.current = newStatus === "disconnected";
      setStatus(newStatus);
    });
  }, []);

  if (showRecovered) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white">
        <div className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 shadow-lg">
          <Wifi className="h-4 w-4" />
          <span>Baglanti yeniden kuruldu</span>
        </div>
      </div>
    );
  }

  if (status === "connected") return null;

  const handleRetry = () => {
    connectSocket();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white">
      {status === "connecting" ? (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Yeniden baglaniliyor...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span>Baglanti koptu</span>
          <button
            onClick={handleRetry}
            className="ml-2 flex items-center gap-1 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition"
          >
            <RefreshCw className="h-3 w-3" />
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
}
