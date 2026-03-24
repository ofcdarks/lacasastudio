import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import logger from "../services/logger";

const router = Router();
router.use(authenticate);

// Sensitive keys that only admin can see/edit
const ADMIN_KEYS = new Set([
  "laozhang_api_key",
  "youtube_api_key",
  "imagefx_cookie",
  "block_registration",
]);

// Keys any user can read (but not the value of admin keys)
const PUBLIC_KEYS = new Set([
  "ai_model",
]);

// GET all settings — non-admin only sees public keys
router.get("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const isAdmin = user?.isAdmin === true;

    const settings = await prisma.setting.findMany();
    const obj: any = {};
    settings.forEach((s: any) => {
      if (isAdmin) {
        // Admin sees everything
        obj[s.key] = s.value;
      } else if (PUBLIC_KEYS.has(s.key)) {
        // Regular user sees only public keys
        obj[s.key] = s.value;
      } else if (ADMIN_KEYS.has(s.key)) {
        // Regular user knows the key exists but not the value
        obj[s.key] = s.value ? "••••••••" : "";
      }
    });
    res.json(obj);
  } catch (err) { next(err); }
});

// GET raw setting by key — admin only for sensitive keys
router.get("/raw/:key", async (req: any, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key;

    // If it's an admin key, check admin
    if (ADMIN_KEYS.has(key)) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user?.isAdmin) {
        res.status(403).json({ error: "Apenas administradores podem ver esta configuração" });
        return;
      }
    }

    const s = await prisma.setting.findUnique({ where: { key } });
    res.json(s || { key, value: "" });
  } catch (err) { next(err); }
});

// PUT settings — admin only for sensitive keys
router.put("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const entries = Object.entries(req.body as Record<string, string>);
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const isAdmin = user?.isAdmin === true;

    // Validate
    for (const [key, value] of entries) {
      if (typeof key !== "string" || typeof value !== "string") {
        res.status(400).json({ error: "Dados inválidos" }); return;
      }
      if (key.length > 100 || value.length > 10000) {
        res.status(400).json({ error: "Valor muito longo" }); return;
      }
      // Block non-admin from changing sensitive keys
      if (ADMIN_KEYS.has(key) && !isAdmin) {
        res.status(403).json({ error: `Apenas administradores podem alterar "${key}"` });
        return;
      }
    }

    for (const [key, value] of entries) {
      await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }

    logger.info("Settings updated", { userId: req.userId, keys: entries.map(([k]) => k) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Check if configured (public — just tells if API is ready, not the key)
router.get("/status", async (req: any, res: Response, next: NextFunction) => {
  try {
    const keys = await prisma.setting.findMany({
      where: { key: { in: ["laozhang_api_key", "youtube_api_key", "imagefx_cookie", "ai_model"] } },
      select: { key: true, value: true },
    });
    const status: any = {};
    keys.forEach((s: any) => {
      status[s.key] = s.value ? true : false; // true = configured, false = empty
    });
    res.json(status);
  } catch (err) { next(err); }
});

export default router;
