import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, displayName: true, createdAt: true },
  });
  console.log("=== KAYITLI KULLANICILAR ===");
  console.log(JSON.stringify(users, null, 2));
  console.log(`Toplam: ${users.length} kullanıcı`);
  await prisma.$disconnect();
}

main();
