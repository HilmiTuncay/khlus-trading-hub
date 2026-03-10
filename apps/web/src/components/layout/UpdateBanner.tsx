"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export function UpdateBanner() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    window.electronAPI.onUpdateDownloaded?.((version: string) => {
      setUpdateVersion(version);
    });
  }, []);

  if (!updateVersion) return null;

  const handleInstall = () => {
    setInstalling(true);
    window.electronAPI?.installUpdate?.();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 bg-brand px-4 py-2 text-sm text-white shadow-lg">
      <Download size={16} />
      <span>Yeni sürüm hazır: v{updateVersion}</span>
      <button
        onClick={handleInstall}
        disabled={installing}
        className="rounded-md bg-white/20 px-3 py-1 font-medium hover:bg-white/30 transition disabled:opacity-50"
      >
        {installing ? "Yükleniyor..." : "Güncelle"}
      </button>
      <button
        onClick={() => setUpdateVersion(null)}
        className="ml-1 rounded-md px-2 py-1 hover:bg-white/20 transition text-white/70"
      >
        ✕
      </button>
    </div>
  );
}
