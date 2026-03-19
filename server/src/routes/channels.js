const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const NotifService = require("../services/notifications");

const router = Router();
router.use(authenticate);

const channelSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
  icon: z.string().max(10).optional(),
  subs: z.string().max(50).optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const channels = await prisma.channel.findMany({
      where: { userId: req.userId },
      include: { _count: { select: { videos: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(channels);
  } catch (err) { next(err); }
});

router.post("/", validate(channelSchema), async (req, res, next) => {
  try {
    const { name, color, icon, subs } = req.validated;
    const ch = await prisma.channel.create({
      data: { name, color: color || "#EF4444", icon: icon || "📺", subs: subs || "0", userId: req.userId },
    });
    await NotifService.channelCreated(req.userId, name);
    res.status(201).json(ch);
  } catch (err) { next(err); }
});

router.put("/:id", validate(channelSchema.partial()), async (req, res, next) => {
  try {
    const ch = await prisma.channel.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!ch) return res.status(404).json({ error: "Canal não encontrado" });
    const updated = await prisma.channel.update({ where: { id: ch.id }, data: req.validated });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const ch = await prisma.channel.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!ch) return res.status(404).json({ error: "Canal não encontrado" });
    await prisma.channel.delete({ where: { id: ch.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
