"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/servers");
    } catch (err: any) {
      setError(err.message || "Giris basarisiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-secondary p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand">Khlus Trading Hub</h1>
          <p className="mt-2 text-text-secondary">Hesabiniza giris yapin</p>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">
              Sifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-3 font-semibold text-surface-primary transition hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? "Giris yapiliyor..." : "Giris Yap"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          Hesabiniz yok mu?{" "}
          <Link href="/auth/register" className="text-brand hover:underline">
            Kayit ol
          </Link>
        </p>
      </div>
    </div>
  );
}
