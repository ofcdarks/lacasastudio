// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import bcrypt from "bcryptjs";

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

// GET /admin/stats
router.get("/stats", async (req: any, res: Response, next: NextFunction) => {
  try {
    const [users, videos, ideas, channels] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.idea.count(),
      prisma.channel.count(),
    ]);
    const recentUsers = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true, isAdmin: true } });
    res.json({ users, videos, ideas, channels, recentUsers });
  } catch (err) { next(err); }
});

// GET /admin/users
router.get("/users", async (req: any, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({ take: 100,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, avatar: true, isAdmin: true, createdAt: true,
        _count: { select: { videos: true, channels: true, ideas: true } }
      }
    });
    res.json(users);
  } catch (err) { next(err); }
});

// PUT /admin/users/:id — update user (toggle admin, change role)
router.put("/users/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { isAdmin, role, name, email } = req.body as any;
    const data: any = {};
    if (isAdmin !== undefined) data.isAdmin = isAdmin;
    if (role !== undefined) data.role = role;
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data });
    res.json({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, role: user.role });
  } catch (err) { next(err); }
});

// DELETE /admin/users/:id
router.delete("/users/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (id === req.userId) { res.status(400).json({ error: "Não pode deletar a si mesmo" }); return; }
    // Delete all user data
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.seoResult.deleteMany({ where: { video: { userId: id } } }),
      prisma.script.deleteMany({ where: { video: { userId: id } } }),
      prisma.checklist.deleteMany({ where: { video: { userId: id } } }),
      prisma.scene.deleteMany({ where: { video: { userId: id } } }),
      prisma.video.deleteMany({ where: { userId: id } }),
      prisma.channel.deleteMany({ where: { userId: id } }),
      prisma.idea.deleteMany({ where: { userId: id } }),
      prisma.asset.deleteMany({ where: { userId: id } }),
      prisma.budgetItem.deleteMany({ where: { userId: id } }),
      prisma.meta.deleteMany({ where: { userId: id } }),
      prisma.template.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /admin/config — get system config
router.get("/config", async (req: any, res: Response, next: NextFunction) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const obj: any = {};
    configs.forEach((c: any) => { obj[c.key] = c.value; });
    res.json(obj);
  } catch (err) { next(err); }
});

// PUT /admin/config — update system config
router.put("/config", async (req: any, res: Response, next: NextFunction) => {
  try {
    const entries = Object.entries(req.body as Record<string, string>);
    for (const [key, value] of entries) {
      await prisma.systemConfig.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /admin/reset-password/:id
router.post("/reset-password/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body as any;
    if (!password || password.length < 4) { res.status(400).json({ error: "Senha deve ter no mínimo 4 caracteres" }); return; }
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { password: hashed } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
