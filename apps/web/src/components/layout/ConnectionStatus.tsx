"use client";

import { useEffect, useState } from "react";
import { onConnectionStatus, type ConnectionStatusType } from "@/lib/socket";
import { Loader2, WifiOff } from "lucide-react";

export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatusType>("connected");

  useEffect(() => {
    return onConnectionStatus(setStatus);
  }, []);

  if (status === "connected") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white">
      {status === "connecting" ? (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Yeniden bağlanıyor...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span>Bağlantı koptu</span>
        </div>
      )}
    </div>
  );
}
