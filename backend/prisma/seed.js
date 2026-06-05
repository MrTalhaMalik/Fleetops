// Run via `npx prisma db seed`. Idempotent — re-running just refreshes the
// password hash on the two seed accounts and leaves everything else alone.
//
// Default credentials:
//   admin@admin.com    / 1234
//   driver@driver.com  / 1234
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("1234", 10);

  await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: { passwordHash },
    create: {
      email: "admin@admin.com",
      name: "Admin",
      role: "admin",
      passwordHash,
      avatarColor: "bg-foreground",
    },
  });

  await prisma.user.upsert({
    where: { email: "driver@driver.com" },
    update: { passwordHash },
    create: {
      email: "driver@driver.com",
      name: "Driver",
      role: "driver",
      passwordHash,
      avatarColor: "bg-amber-500",
      driver: {
        create: {
          name: "Driver",
          email: "driver@driver.com",
          avatarColor: "bg-amber-500",
          approved: true,
        },
      },
    },
  });

  console.log("[seed] default accounts ready");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
