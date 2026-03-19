const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const where = {};
    if (req.query.type) where.type = req.query.type;
    if (req.query.channelId) where.channelId = Number(req.query.channelId);
    const assets = await prisma.asset.findMany({
      where, include: { channel: { select: { id: true, name: true, color: true } } }, orderBy: { createdAt: "desc" },
    });
    res.json(assets.map(a => ({ ...a, tags: a.tags ? a.tags.split(",").filter(Boolean) : [] })));
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, type, format, size, channelId, tags, fileUrl, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Nome obrigatório" });
    const asset = await prisma.asset.create({
      data: { name, type: type || "thumbnail", format: format || "", size: size || "",
        channelId: channelId ? Number(channelId) : null,
        tags: Array.isArray(tags) ? tags.join(",") : (tags || ""),
        fileUrl: fileUrl || "", notes: notes || "" },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.status(201).json({ ...asset, tags: asset.tags ? asset.tags.split(",").filter(Boolean) : [] });
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { name, type, format, size, channelId, tags, fileUrl, notes } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (format !== undefined) data.format = format;
    if (size !== undefined) data.size = size;
    if (fileUrl !== undefined) data.fileUrl = fileUrl;
    if (notes !== undefined) data.notes = notes;
    if (channelId !== undefined) data.channelId = channelId ? Number(channelId) : null;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags.join(",") : tags;
    const asset = await prisma.asset.update({
      where: { id: Number(req.params.id) }, data,
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.json({ ...asset, tags: asset.tags ? asset.tags.split(",").filter(Boolean) : [] });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.asset.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
