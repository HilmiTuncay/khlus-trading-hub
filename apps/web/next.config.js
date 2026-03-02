/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tauri icin static export (masaustu uygulamada Node.js sunucu yok)
  output: process.env.TAURI_ENV ? "export" : undefined,
  transpilePackages: ["@khlus/shared"],
  images: {
    // SSG modunda next/image optimizasyonu calismaz
    unoptimized: !!process.env.TAURI_ENV,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
