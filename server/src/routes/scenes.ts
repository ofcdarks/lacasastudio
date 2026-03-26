// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
const router = Router();
router.use(authenticate);

async function ownsVideo(userId: any, videoId: any) {
  return prisma.video.findFirst({ where: { id: Number(videoId), userId } });
}

router.get("/video/:videoId", async (req: any, res: Response, next: NextFunction) => {
  try {
    const video = await ownsVideo(req.userId, req.params.videoId);
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
    const scenes = await prisma.scene.findMany({ take: 100, where: { videoId: video.id }, orderBy: { order: "asc" } });
    res.json(scenes);
  } catch (err: any) { console.error("scenes error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { title, videoId, type, duration, notes, camera, audio, color, order } = req.body as any;
    if (!title || !videoId) return res.status(400).json({ error: "Título e vídeo obrigatórios" });
    const video = await ownsVideo(req.userId, videoId);
    if (!video) return res.status(403).json({ error: "Acesso negado" });
    const scene = await prisma.scene.create({ data: { title, videoId: video.id, type, duration, notes, camera, audio, color, order: order || 0 } });
    res.status(201).json(scene);
  } catch (err: any) { console.error("scenes error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.put("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const scene = await prisma.scene.findUnique({ where: { id: Number(req.params.id) }, include: { video: true } });
    if (!scene || scene.video.userId !== req.userId) return res.status(404).json({ error: "Cena não encontrada" });
    const { title, type, duration, notes, camera, audio, color, order } = req.body as any;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (type !== undefined) data.type = type;
    if (duration !== undefined) data.duration = duration;
    if (notes !== undefined) data.notes = notes;
    if (camera !== undefined) data.camera = camera;
    if (audio !== undefined) data.audio = audio;
    if (color !== undefined) data.color = color;
    if (order !== undefined) data.order = order;
    const updated = await prisma.scene.update({ where: { id: scene.id }, data });
    res.json(updated);
  } catch (err: any) { console.error("scenes error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.put("/reorder/:videoId", async (req: any, res: Response, next: NextFunction) => {
  try {
    const video = await ownsVideo(req.userId, req.params.videoId);
    if (!video) return res.status(403).json({ error: "Acesso negado" });
    const { orderedIds } = req.body as any;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds obrigatório" });
    await Promise.all(orderedIds.map((id, i) => prisma.scene.update({ where: { id }, data: { order: i } })));
    res.json({ ok: true });
  } catch (err: any) { console.error("scenes error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.delete("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const scene = await prisma.scene.findUnique({ where: { id: Number(req.params.id) }, include: { video: true } });
    if (!scene || scene.video.userId !== req.userId) return res.status(404).json({ error: "Cena não encontrada" });
    await prisma.scene.delete({ where: { id: scene.id } });
    res.json({ ok: true });
  } catch (err: any) { console.error("scenes error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

export default router;
