"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-accent-red/10 p-3 text-sm text-accent-red">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={update("email")}
              className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              value={form.username}
              onChange={update("username")}
              placeholder="sadece harf, rakam ve _"
              className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">
              Görünen Ad
            </label>
            <input
              type="text"
              value={form.displayName}
              onChange={update("displayName")}
              className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">
              Şifre
            </label>
            <input
              type="password"
              value={form.password}
              onChange={update("password")}
              minLength={6}
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
