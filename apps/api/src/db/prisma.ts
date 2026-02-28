import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Bağlantı URL'ini belirle
function getDatasourceUrl(): string | undefined {
  // DIRECT_URL varsa ve geçerliyse kullan (pooler prepared statement sorununu önler)
  const directUrl = process.env.DIRECT_URL;
  if (directUrl && directUrl.startsWith("postgres")) {
    console.log("[DB] DIRECT_URL kullanılıyor (pooler bypass)");
    return directUrl;
  }
  // Yoksa DATABASE_URL'i kullan, ama connection_limit ekle
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const separator = dbUrl.includes("?") ? "&" : "?";
    const fixedUrl = dbUrl.includes("connection_limit") ? dbUrl : `${dbUrl}${separator}connection_limit=1`;
    console.log("[DB] DATABASE_URL kullanılıyor");
    return fixedUrl;
  }
  return undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
    datasourceUrl: getDatasourceUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
