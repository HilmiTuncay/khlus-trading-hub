"use client";

import { useEffect } from "react";

// Tauri masaustu uygulamasinda WebView2 varsayilan sag tik menusunu (Yazdir, Kaydet vb.) engelle
export function TauriContextMenuBlocker() {
  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    const handler = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  return null;
}
