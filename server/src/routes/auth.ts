import { Router, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";
import { authenticate, signAccessToken, createRefreshToken, rotateRefreshToken, revokeAllUserTokens } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { z } from "zod";
import AuditService from "../services/audit";
import logger from "../services/logger";

const router = Router();

const registerSchema = z.object({ email: z.string().email(), name: z.string().min(2), password: z.string().min(6) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

// Register
router.post("/register", validate(registerSchema), async (req: any, res: Response, next: NextFunction) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: "block_registration" } }).catch(() => null);
    if (config?.value === "true") {
      res.status(403).json({ error: "Novos cadastros estão bloqueados pelo administrador" });
      return;
    }
    const { email, name, password } = req.validated;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) { res.status(400).json({ error: "Email já cadastrado" }); return; }
    const hashed = await bcrypt.hash(password, 12);
    const userCount = await prisma.user.count();
    const isFirstAndAdmin = userCount === 0 && email === "rudysilvaads@gmail.com";
    const user = await prisma.user.create({ data: { email, name, password: hashed, isAdmin: isFirstAndAdmin } });
    const accessToken = signAccessToken({ id: user.id });
    const refreshToken = await createRefreshToken(user.id);
    logger.info("User registered", { userId: user.id, email });
    await AuditService.log(user.id, "register", "auth", undefined, `New user: ${email}`, req.ip || "");
    res.status(201).json({
      token: accessToken, refreshToken,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, isAdmin: user.isAdmin },
    });
  } catch (err) { next(err); }
});

// Login
router.post("/login", validate(loginSchema), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.validated;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await AuditService.loginFailed(email, req.ip || "");
      res.status(401).json({ error: "Credenciais inválidas" }); return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await AuditService.loginFailed(email, req.ip || "");
      res.status(401).json({ error: "Credenciais inválidas" }); return;
    }
    const accessToken = signAccessToken({ id: user.id });
    const refreshToken = await createRefreshToken(user.id);
    await AuditService.loginSuccess(user.id, req.ip || "");
    logger.info("User logged in", { userId: user.id });
    res.json({
      token: accessToken, refreshToken,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, isAdmin: user.isAdmin },
    });
  } catch (err) { next(err); }
});

// Refresh token
router.post("/refresh", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) { res.status(400).json({ error: "Refresh token obrigatório" }); return; }
    const result = await rotateRefreshToken(refreshToken);
    if (!result) { res.status(401).json({ error: "Refresh token inválido ou expirado" }); return; }
    res.json({ token: result.accessToken, refreshToken: result.refreshToken });
  } catch (err) { next(err); }
});

// Logout (revoke all refresh tokens)
router.post("/logout", authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    await revokeAllUserTokens(req.userId);
    await AuditService.log(req.userId, "logout", "auth", undefined, undefined, req.ip || "");
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Promote to admin — only specific email allowed
router.post("/promote-admin", authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const ADMIN_EMAIL = "rudysilvaads@gmail.com";
    const me = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!me) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    if (me.isAdmin) { res.json({ ok: true, message: "Você já é admin" }); return; }
    // Only the designated email can become admin
    if (me.email !== ADMIN_EMAIL) {
      res.status(403).json({ error: "Apenas o administrador autorizado pode obter esse acesso." }); return;
    }
    const user = await prisma.user.update({ where: { id: req.userId }, data: { isAdmin: true } });
    await AuditService.adminAction(req.userId, "promote", "Self-promoted to admin", req.ip || "");
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, isAdmin: true } });
  } catch (err) { next(err); }
});

// Me
router.get("/me", authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, avatar: true, role: true, isAdmin: true },
    });
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

export default router;
