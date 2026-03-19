const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const NotifService = require("../services/notifications");

const router = Router();
router.use(authenticate);

const createVideoSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(200),
  channelId: z.number().int().positive(),
  status: z.string().optional(),
  date: z.string().optional(),
  priority: z.enum(["alta", "média", "baixa"]).optional(),
  duration: z.string().optional(),
});

const updateVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.string().optional(),
  date: z.string().optional(),
  priority: z.enum(["alta", "média", "baixa"]).optional(),
  duration: z.string().optional(),
  channelId: z.number().int().positive().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const where = { userId: req.userId };
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
    const video = await prisma.video.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
      include: { channel: true, scenes: { orderBy: { order: "asc" } }, checklists: true },
    });
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
    res.json(video);
  } catch (err) { next(err); }
});

router.post("/", validate(createVideoSchema), async (req, res, next) => {
  try {
    const { title, channelId, status, date, priority, duration } = req.validated;
    // Verify channel ownership
    const ch = await prisma.channel.findFirst({ where: { id: channelId, userId: req.userId } });
    if (!ch) return res.status(403).json({ error: "Canal não pertence a este usuário" });

    const video = await prisma.video.create({
      data: { title, channelId, userId: req.userId, status: status || "idea", date: date || "", priority: priority || "média", duration: duration || "" },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    await NotifService.videoCreated(req.userId, title);
    res.status(201).json(video);
  } catch (err) { next(err); }
});

router.put("/:id", validate(updateVideoSchema), async (req, res, next) => {
  try {
    const video = await prisma.video.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });

    const data = { ...req.validated };
    if (data.channelId) data.channelId = Number(data.channelId);

    const updated = await prisma.video.update({
      where: { id: video.id }, data,
      include: { channel: { select: { id: true, name: true, color: true } } },
    });

    // Notify on status change
    if (req.validated.status && req.validated.status !== video.status) {
      if (req.validated.status === "published") {
        await NotifService.videoPublished(req.userId, updated.title);
      } else {
        await NotifService.videoStatusChanged(req.userId, updated.title, req.validated.status);
      }
    }

    res.json(updated);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const video = await prisma.video.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
    await prisma.video.delete({ where: { id: video.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
