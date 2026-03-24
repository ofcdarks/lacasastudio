import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import logger from "../services/logger";

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════
// GLOBAL SETTINGS (admin only for sensitive)
// ═══════════════════════════════════════

const ADMIN_KEYS = new Set(["laozhang_api_key", "imagefx_cookie", "block_registration"]);
const PUBLIC_KEYS = new Set(["ai_model"]);

router.get("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const isAdmin = user?.isAdmin === true && user?.email === "rudysilvaads@gmail.com";
    const settings = await prisma.setting.findMany();
    const obj: any = {};
    settings.forEach((s: any) => {
      if (isAdmin || PUBLIC_KEYS.has(s.key)) obj[s.key] = s.value;
      else if (ADMIN_KEYS.has(s.key)) obj[s.key] = s.value ? "••••••••" : "";
    });
    res.json(obj);
  } catch (err) { next(err); }
});

router.get("/raw/:key", async (req: any, res: Response, next: NextFunction) => {
  try {
    if (ADMIN_KEYS.has(req.params.key)) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user?.isAdmin) { res.status(403).json({ error: "Apenas admin" }); return; }
    }
    const s = await prisma.setting.findUnique({ where: { key: req.params.key } });
    res.json(s || { key: req.params.key, value: "" });
  } catch (err) { next(err); }
});

router.put("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const entries = Object.entries(req.body as Record<string, string>);
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const isAdmin = user?.isAdmin === true && user?.email === "rudysilvaads@gmail.com";
    for (const [key, value] of entries) {
      if (typeof key !== "string" || typeof value !== "string") { res.status(400).json({ error: "Dados inválidos" }); return; }
      if (ADMIN_KEYS.has(key) && !isAdmin) { res.status(403).json({ error: `Apenas admin pode alterar "${key}"` }); return; }
    }
    for (const [key, value] of entries) {
      await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    logger.info("Settings updated", { userId: req.userId, keys: entries.map(([k]) => k) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get("/status", async (req: any, res: Response, next: NextFunction) => {
  try {
    const keys = await prisma.setting.findMany({
      where: { key: { in: ["laozhang_api_key", "youtube_api_key", "imagefx_cookie", "ai_model"] } },
      select: { key: true, value: true },
    });
    const status: any = {};
    keys.forEach((s: any) => { status[s.key] = !!s.value; });
    // Also check user's own keys
    const userKeys = await prisma.userSetting.findMany({
      where: { userId: req.userId, key: { in: ["user_api_key", "user_api_provider"] } },
    });
    userKeys.forEach((s: any) => { status[s.key] = !!s.value; });
    res.json(status);
  } catch (err: any) {
    // UserSetting table might not exist yet
    const keys = await prisma.setting.findMany({
      where: { key: { in: ["laozhang_api_key", "youtube_api_key", "imagefx_cookie", "ai_model"] } },
      select: { key: true, value: true },
    });
    const status: any = {};
    keys.forEach((s: any) => { status[s.key] = !!s.value; });
    res.json(status);
  }
});

// ═══════════════════════════════════════
// USER SETTINGS (per-user, isolated)
// ═══════════════════════════════════════

// Get all user settings
router.get("/user", async (req: any, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.userSetting.findMany({ where: { userId: req.userId } });
    const obj: any = {};
    settings.forEach((s: any) => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err: any) {
    // Table might not exist yet after migration
    if (err.message?.includes("UserSetting") || err.code === "P2021") {
      res.json({});
    } else { next(err); }
  }
});

// Save user settings
router.put("/user", async (req: any, res: Response, next: NextFunction) => {
  try {
    const entries = Object.entries(req.body as Record<string, string>);
    for (const [key, value] of entries) {
      if (typeof key !== "string" || typeof value !== "string") { res.status(400).json({ error: "Dados inválidos" }); return; }
      if (key.length > 100 || value.length > 10000) { res.status(400).json({ error: "Valor muito longo" }); return; }
    }
    for (const [key, value] of entries) {
      await prisma.userSetting.upsert({
        where: { userId_key: { userId: req.userId, key } },
        create: { userId: req.userId, key, value },
        update: { value },
      });
    }
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message?.includes("UserSetting") || err.code === "P2021") {
      res.status(500).json({ error: "Execute 'npx prisma db push' para criar a tabela de configurações do usuário" });
    } else { next(err); }
  }
});

export default router;
