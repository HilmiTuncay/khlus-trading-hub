import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.argv[2];
  if (!newPassword) {
    console.log("Kullanım: npx tsx src/db/reset-password.ts <yeni-sifre>");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  const user = await prisma.user.update({
    where: { email: "hilmituncay@gmail.com" },
    data: { password: hashed },
  });

  console.log(`Şifre sıfırlandı: ${user.email}`);
  await prisma.$disconnect();
}

main();
