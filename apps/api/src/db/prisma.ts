import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Supabase PgBouncer (transaction mode) prepared statement desteklemiyor.
// DATABASE_URL'e pgbouncer=true&prepared_statements=false ekle.
function getDatasourceUrl(): string {
  const url = process.env.DATABASE_URL || "";
  if (!url) return url;
  if (url.includes("pgbouncer=true")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}pgbouncer=true&prepared_statements=false`;
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
