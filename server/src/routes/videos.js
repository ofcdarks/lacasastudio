const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const where = {};
    if (req.query.channelId) where.channelId = Number(req.query.channelId);
    if (req.query.status) where.status = req.query.status;
    const videos = await prisma.video.findMany({
      where,
      include: { channel: { select: { id: true, name: true, color: true, icon: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(videos);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({
      where: { id: Number(req.params.id) },
      include: { channel: true, scenes: { orderBy: { order: "asc" } }, checklists: true },
    });
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
    res.json(video);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, channelId, status, date, priority, duration } = req.body;
    if (!title || !channelId) return res.status(400).json({ error: "Título e canal obrigatórios" });
    const video = await prisma.video.create({
      data: { title, channelId: Number(channelId), status: status || "idea", date: date || "", priority: priority || "média", duration: duration || "" },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.status(201).json(video);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { title, status, date, priority, duration, channelId } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (status !== undefined) data.status = status;
    if (date !== undefined) data.date = date;
    if (priority !== undefined) data.priority = priority;
    if (duration !== undefined) data.duration = duration;
    if (channelId !== undefined) data.channelId = Number(channelId);
    const video = await prisma.video.update({
      where: { id: Number(req.params.id) },
      data,
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.json(video);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.video.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
