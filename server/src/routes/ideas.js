const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const ideas = await prisma.idea.findMany({
      include: { channel: { select: { id: true, name: true, color: true } } },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
    res.json(ideas.map(i => ({ ...i, tags: i.tags ? i.tags.split(",").filter(Boolean) : [] })));
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, content, imageUrl, tags, color, channelId, pinned } = req.body;
    if (!title) return res.status(400).json({ error: "Título obrigatório" });
    const idea = await prisma.idea.create({
      data: {
        title, content: content || "", imageUrl: imageUrl || "",
        tags: Array.isArray(tags) ? tags.join(",") : (tags || ""),
        color: color || "#3B82F6", pinned: pinned || false,
        channelId: channelId ? Number(channelId) : null,
      },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.status(201).json({ ...idea, tags: idea.tags ? idea.tags.split(",").filter(Boolean) : [] });
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { title, content, imageUrl, tags, color, channelId, pinned } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags.join(",") : tags;
    if (color !== undefined) data.color = color;
    if (pinned !== undefined) data.pinned = pinned;
    if (channelId !== undefined) data.channelId = channelId ? Number(channelId) : null;
    const idea = await prisma.idea.update({
      where: { id: Number(req.params.id) }, data,
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.json({ ...idea, tags: idea.tags ? idea.tags.split(",").filter(Boolean) : [] });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.idea.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
