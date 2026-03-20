import prisma from "./prisma";
import bcrypt from "bcryptjs";

async function main() {
  // Ensure at least one admin exists
  const adminCount = await prisma.user.count({ where: { isAdmin: true } });
  
  if (adminCount === 0) {
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      // No users at all - create default admin
      const hashed = await bcrypt.hash("admin123", 10);
      await prisma.user.create({
        data: { email: "admin@lacasastudio.com", name: "Administrador", password: hashed, isAdmin: true, role: "admin" }
      });
      console.log("✅ Admin created: admin@lacasastudio.com / admin123");
    } else {
      // Users exist but none is admin - promote the first user
      const firstUser = await prisma.user.findFirst({ orderBy: { id: "asc" } });
      if (firstUser) {
        await prisma.user.update({ where: { id: firstUser.id }, data: { isAdmin: true } });
        console.log("✅ First user promoted to admin:", firstUser.email);
      }
    }
  }

  // Ensure system config defaults
  try {
    await prisma.systemConfig.upsert({
      where: { key: "block_registration" },
      create: { key: "block_registration", value: "false" },
      update: {}
    });
  } catch {}
}

main().catch(console.error);
