const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/video/:videoId", async (req, res, next) => {
  try {
    const video = await prisma.video.findFirst({ where: { id: Number(req.params.videoId), userId: req.userId } });
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
    const items = await prisma.checklist.findMany({ where: { videoId: video.id } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { label, videoId } = req.body;
    if (!label || !videoId) return res.status(400).json({ error: "Label e vídeo obrigatórios" });
    const video = await prisma.video.findFirst({ where: { id: Number(videoId), userId: req.userId } });
    if (!video) return res.status(403).json({ error: "Acesso negado" });
    const item = await prisma.checklist.create({ data: { label, videoId: video.id } });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const cl = await prisma.checklist.findUnique({ where: { id: Number(req.params.id) }, include: { video: true } });
    if (!cl || cl.video.userId !== req.userId) return res.status(404).json({ error: "Item não encontrado" });
    const { label, done } = req.body;
    const updated = await prisma.checklist.update({
      where: { id: cl.id },
      data: { ...(label !== undefined && { label }), ...(done !== undefined && { done }) },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const cl = await prisma.checklist.findUnique({ where: { id: Number(req.params.id) }, include: { video: true } });
    if (!cl || cl.video.userId !== req.userId) return res.status(404).json({ error: "Item não encontrado" });
    await prisma.checklist.delete({ where: { id: cl.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
