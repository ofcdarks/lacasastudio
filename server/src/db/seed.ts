import prisma from "./prisma";
import bcrypt from "bcryptjs";

async function main() {
  // Create admin user if no users exist
  const count = await prisma.user.count();
  if (count === 0) {
    const hashed = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: { email: "admin@lacasastudio.com", name: "Administrador", password: hashed, isAdmin: true, role: "admin" }
    });
    console.log("✅ Admin user created: admin@lacasastudio.com / admin123");
  }
  // Ensure system config defaults
  const blockReg = await prisma.systemConfig.findUnique({ where: { key: "block_registration" } }).catch(() => null);
  if (!blockReg) {
    await prisma.systemConfig.create({ data: { key: "block_registration", value: "false" } }).catch(() => {});
  }
}

main().catch(console.error);
