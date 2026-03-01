"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const ok = await api.healthCheck();
      if (!cancelled) {
        setServerStatus(ok ? "online" : "offline");
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const retryConnection = async () => {
    setServerStatus("checking");
    const ok = await api.healthCheck();
    setServerStatus(ok ? "online" : "offline");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      router.push("/servers");
    } catch (err: any) {
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-secondary p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand">Khlus Trading Hub</h1>
          <p className="mt-2 text-text-secondary">Yeni hesap oluşturun</p>
        </div>

        {/* Sunucu durumu */}
        {serverStatus === "checking" && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
            Sunucuya bağlanılıyor... (İlk bağlantı 30 saniye sürebilir)
          </div>
        )}
        {serverStatus === "offline" && (
          <div className="mb-4 rounded-lg bg-accent-red/10 p-3 text-sm text-accent-red">
            <p>Sunucuya ulaşılamıyor.</p>
            <button
              onClick={retryConnection}
              className="mt-1 text-xs underline hover:no-underline"
            >
              Tekrar dene
            </button>
          </div>
        )}
        {serverStatus === "online" && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            Sunucu bağlantısı aktif
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-accent-red/10 p-3 text-sm text-accent-red">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">
              Email
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update("email")}
              className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              required
            />
          </div>

          <div>
            <label htmlFor="register-username" className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">
              Kullanıcı Adı
            </label>
            <input
              id="register-username"
              name="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={update("username")}
              placeholder="sadece harf, rakam ve _"
              className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              required
            />
          </div>

          <div>
            <label htmlFor="register-displayName" className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">
              Görünen Ad
            </label>
            <input
              id="register-displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              value={form.displayName}
              onChange={update("displayName")}
              className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              required
            />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">
              Şifre
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update("password")}
              minLength={8}
              className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-3 font-semibold text-surface-primary transition hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          Zaten hesabınız var mı?{" "}
          <Link href="/auth/login" className="text-brand hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}
