"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

export default function Home() {
  const router = useRouter();
  const { user, isLoading, loadUser } = useAuthStore();
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    loadUser().catch(() => setLoadFailed(true));
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/servers");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [user, isLoading, router]);

  // 15 saniye sonra hala yükleniyorsa login'e yönlendir
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        router.replace("/auth/login");
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [isLoading, router]);

  if (loadFailed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-text-secondary">Sunucuya bağlanılamadı</p>
          <button
            onClick={() => {
              setLoadFailed(false);
              loadUser().catch(() => setLoadFailed(true));
            }}
            className="rounded-lg bg-brand px-6 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Tekrar Dene
          </button>
          <button
            onClick={() => router.replace("/auth/login")}
            className="text-sm text-text-secondary underline hover:no-underline"
          >
            Giriş sayfasına git
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-text-secondary">Yükleniyor...</p>
      </div>
    </div>
  );
}
