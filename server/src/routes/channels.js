const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const channels = await prisma.channel.findMany({
      include: { _count: { select: { videos: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(channels.map(c => ({ ...c, videoCount: c._count.videos })));
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
    const channel = await prisma.channel.create({ data: { name, color: color || "#EF4444", icon: icon || "📺" } });
    res.status(201).json(channel);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const channel = await prisma.channel.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(channel);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.channel.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
