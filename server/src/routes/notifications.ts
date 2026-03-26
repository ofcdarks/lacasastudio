// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const notifs = await prisma.notification.findMany({ take: 100,
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifs);
  } catch (err: any) { console.error("notifications error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.put("/:id/read", async (req: any, res: Response, next: NextFunction) => {
  try {
    const notif = await prisma.notification.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!notif) return res.status(404).json({ error: "Notificação não encontrada" });
    await prisma.notification.update({ where: { id: notif.id }, data: { read: true } });
    res.json({ ok: true });
  } catch (err: any) { console.error("notifications error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.put("/read-all", async (req: any, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.userId, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch (err: any) { console.error("notifications error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.delete("/clear", async (req: any, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.userId, read: true } });
    res.json({ ok: true });
  } catch (err: any) { console.error("notifications error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

export default router;
