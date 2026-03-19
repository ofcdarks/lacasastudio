const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const templates = await prisma.template.findMany({
      where: { userId: req.userId },
      include: { channel: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(templates);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, desc, episodes, structure, color, tags, channelId } = req.body;
    if (!name) return res.status(400).json({ error: "Nome obrigatório" });
    const t = await prisma.template.create({
      data: { name, desc, episodes, structure, color, tags, userId: req.userId, channelId: channelId ? Number(channelId) : null },
    });
    res.status(201).json(t);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const t = await prisma.template.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!t) return res.status(404).json({ error: "Template não encontrado" });
    await prisma.template.delete({ where: { id: t.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
