import { Router, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";
import { authenticate, signToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({ email: z.string().email(), name: z.string().min(2), password: z.string().min(4) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

// Register
router.post("/register", validate(registerSchema), async (req: any, res: Response, next: NextFunction) => {
  try {
    // Check if registration is blocked
    const config = await prisma.systemConfig.findUnique({ where: { key: "block_registration" } }).catch(() => null);
    if (config?.value === "true") {
      res.status(403).json({ error: "Novos cadastros estão bloqueados pelo administrador" });
      return;
    }
    const { email, name, password } = req.body as any;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) { res.status(400).json({ error: "Email já cadastrado" }); return; }
    const hashed = await bcrypt.hash(password, 10);
    // First user is always admin
    const userCount = await prisma.user.count();
    const user = await prisma.user.create({ data: { email, name, password: hashed, isAdmin: userCount === 0 } });
    const token = signToken({ id: user.id });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, isAdmin: user.isAdmin } });
  } catch (err) { next(err); }
});

// Login
router.post("/login", validate(loginSchema), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as any;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { res.status(401).json({ error: "Credenciais inválidas" }); return; }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { res.status(401).json({ error: "Credenciais inválidas" }); return; }
    const token = signToken({ id: user.id });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, isAdmin: user.isAdmin } });
  } catch (err) { next(err); }
});

// Promote to admin (only if no admin exists in DB)
router.post("/promote-admin", authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Check if current user is already admin
    const me = await prisma.user.findUnique({ where: { id: req.userId } });
    if (me?.isAdmin) { res.json({ ok: true, message: "Você já é admin" }); return; }
    
    // Allow promote if: no real admin exists OR user is the first registered user
    const firstUser = await prisma.user.findFirst({ orderBy: { id: "asc" } });
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    
    const totalUsers = await prisma.user.count();
    if (adminCount > 0 && totalUsers > 1 && firstUser?.id !== req.userId) {
      res.status(400).json({ error: "Já existe um administrador. Peça ao admin atual para te promover." }); 
      return; 
    }
    
    // Promote
    const user = await prisma.user.update({ where: { id: req.userId }, data: { isAdmin: true } });
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, isAdmin: true } });
  } catch (err) { next(err); }
});

// Me
router.get("/me", authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, name: true, email: true, avatar: true, role: true, isAdmin: true } });
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

export default router;
