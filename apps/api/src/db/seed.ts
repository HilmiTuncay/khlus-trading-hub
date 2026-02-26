import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Test1234*", 12);

  // Test kullanıcıları
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "trader1@test.com" },
      update: {},
      create: { email: "trader1@test.com", username: "trader1", displayName: "Trader Ali", password, status: "online" },
    }),
    prisma.user.upsert({
      where: { email: "trader2@test.com" },
      update: {},
      create: { email: "trader2@test.com", username: "trader2", displayName: "Trader Mehmet", password, status: "online" },
    }),
    prisma.user.upsert({
      where: { email: "trader3@test.com" },
      update: {},
      create: { email: "trader3@test.com", username: "trader3", displayName: "Trader Ayşe", password, status: "idle" },
    }),
    prisma.user.upsert({
      where: { email: "trader4@test.com" },
      update: {},
      create: { email: "trader4@test.com", username: "trader4", displayName: "Trader Fatma", password, status: "offline" },
    }),
    prisma.user.upsert({
      where: { email: "trader5@test.com" },
      update: {},
      create: { email: "trader5@test.com", username: "trader5", displayName: "Trader Emre", password, status: "online" },
    }),
  ]);

  console.log(`${users.length} test kullanıcısı oluşturuldu`);
  console.log("Hepsinin şifresi: Test1234*\n");

  // Hilmi'nin hesabını bul
  const hilmi = await prisma.user.findUnique({ where: { email: "hilmituncay@gmail.com" } });

  if (hilmi) {
    // Test sunucusu oluştur
    const server = await prisma.server.upsert({
      where: { inviteCode: "khlus2026" },
      update: {},
      create: {
        name: "Khlus Trading",
        ownerId: hilmi.id,
        inviteCode: "khlus2026",
      },
    });

    // Varsayılan rol
    const role = await prisma.role.upsert({
      where: { id: "default-role-" + server.id },
      update: {},
      create: {
        id: "default-role-" + server.id,
        serverId: server.id,
        name: "everyone",
        permissions: "3072",
        position: 0,
        isDefault: true,
      },
    });

    // Kategoriler
    const genelKat = await prisma.category.create({
      data: { serverId: server.id, name: "Genel", position: 0 },
    }).catch(() => prisma.category.findFirst({ where: { serverId: server.id, name: "Genel" } }));

    const tradingKat = await prisma.category.create({
      data: { serverId: server.id, name: "Trading", position: 1 },
    }).catch(() => prisma.category.findFirst({ where: { serverId: server.id, name: "Trading" } }));

    const egitimKat = await prisma.category.create({
      data: { serverId: server.id, name: "Eğitim", position: 2 },
    }).catch(() => prisma.category.findFirst({ where: { serverId: server.id, name: "Eğitim" } }));

    // Kanallar
    const channels = [
      { serverId: server.id, categoryId: genelKat!.id, name: "genel-sohbet", type: "text", position: 0 },
      { serverId: server.id, categoryId: genelKat!.id, name: "duyurular", type: "text", position: 1 },
      { serverId: server.id, categoryId: tradingKat!.id, name: "analiz-paylaşımı", type: "text", position: 0 },
      { serverId: server.id, categoryId: tradingKat!.id, name: "sinyaller", type: "text", position: 1 },
      { serverId: server.id, categoryId: tradingKat!.id, name: "canlı-trading", type: "voice", position: 2 },
      { serverId: server.id, categoryId: tradingKat!.id, name: "analiz-odası", type: "video", position: 3 },
      { serverId: server.id, categoryId: egitimKat!.id, name: "sorular", type: "text", position: 0 },
      { serverId: server.id, categoryId: egitimKat!.id, name: "ders-odası", type: "video", position: 1 },
    ];

    for (const ch of channels) {
      await prisma.channel.create({ data: ch }).catch(() => {});
    }

    // Tüm kullanıcıları sunucuya ekle
    const allUsers = [hilmi, ...users];
    for (const user of allUsers) {
      const member = await prisma.member.upsert({
        where: { userId_serverId: { userId: user.id, serverId: server.id } },
        update: {},
        create: { userId: user.id, serverId: server.id },
      });

      await prisma.memberRole.upsert({
        where: { memberId_roleId: { memberId: member.id, roleId: role.id } },
        update: {},
        create: { memberId: member.id, roleId: role.id },
      });
    }

    console.log(`"${server.name}" sunucusu oluşturuldu`);
    console.log(`Davet kodu: khlus2026`);
    console.log(`${allUsers.length} üye eklendi`);
    console.log(`${channels.length} kanal oluşturuldu`);
  }

  await prisma.$disconnect();
}

main();
