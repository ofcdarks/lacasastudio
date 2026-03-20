import prisma from "./prisma";

async function main() {
  // Ensure at least one admin exists - promote first user if needed
  const adminCount = await prisma.user.count({ where: { isAdmin: true } });
  if (adminCount === 0) {
    const firstUser = await prisma.user.findFirst({ orderBy: { id: "asc" } });
    if (firstUser) {
      await prisma.user.update({ where: { id: firstUser.id }, data: { isAdmin: true } });
      console.log("✅ Promoted to admin:", firstUser.email);
    }
  }
  // System config defaults
  try {
    await prisma.systemConfig.upsert({ where: { key: "block_registration" }, create: { key: "block_registration", value: "false" }, update: {} });
  } catch {}
}

main().catch(console.error);
