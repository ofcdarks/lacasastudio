const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const metas = await prisma.meta.findMany({
      include: { items: true, channel: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(metas);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, channelId, items } = req.body;
    const meta = await prisma.meta.create({
      data: { title, channelId: channelId ? Number(channelId) : null,
        items: { create: (items || []).map(i => ({ label: i.label, current: i.current || 0, target: i.target || 0, unit: i.unit || "" })) } },
      include: { items: true, channel: { select: { id: true, name: true, color: true } } },
    });
    res.status(201).json(meta);
  } catch (err) { next(err); }
});

router.put("/item/:id", async (req, res, next) => {
  try {
    const item = await prisma.metaItem.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.meta.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
