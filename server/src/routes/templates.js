const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const templates = await prisma.template.findMany({
      include: { channel: { select: { id: true, name: true, color: true } } }, orderBy: { createdAt: "desc" },
    });
    res.json(templates.map(t => ({ ...t, structure: t.structure ? t.structure.split("|") : [], tags: t.tags ? t.tags.split(",").filter(Boolean) : [] })));
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, desc, channelId, structure, color, tags } = req.body;
    if (!name) return res.status(400).json({ error: "Nome obrigatório" });
    const tpl = await prisma.template.create({
      data: { name, desc: desc || "", channelId: channelId ? Number(channelId) : null, structure: Array.isArray(structure) ? structure.join("|") : (structure || ""), color: color || "#3B82F6", tags: Array.isArray(tags) ? tags.join(",") : (tags || "") },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.status(201).json({ ...tpl, structure: tpl.structure ? tpl.structure.split("|") : [], tags: tpl.tags ? tpl.tags.split(",").filter(Boolean) : [] });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.template.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
