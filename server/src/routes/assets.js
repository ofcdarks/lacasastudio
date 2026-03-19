const { Router } = require("express");
const { z } = require("zod");
const path = require("path");
const fs = require("fs");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { upload } = require("../middleware/upload");

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const where = { userId: req.userId };
    if (req.query.channelId) where.channelId = Number(req.query.channelId);
    if (req.query.type) where.type = req.query.type;
    const assets = await prisma.asset.findMany({
      where,
      include: { channel: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(assets);
  } catch (err) { next(err); }
});

// Upload file + create asset
router.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Arquivo obrigatório" });
    const { name, type, tags, notes, channelId } = req.body;
    const asset = await prisma.asset.create({
      data: {
        name: name || req.file.originalname,
        type: type || "other",
        format: path.extname(req.file.originalname).replace(".", ""),
        size: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
        tags: tags || "",
        notes: notes || "",
        fileUrl: `/uploads/${req.userId}/${req.file.filename}`,
        filePath: req.file.path,
        userId: req.userId,
        channelId: channelId ? Number(channelId) : null,
      },
    });
    res.status(201).json(asset);
  } catch (err) { next(err); }
});

// Create metadata-only asset (backward compat)
router.post("/", async (req, res, next) => {
  try {
    const { name, type, format, size, tags, fileUrl, notes, channelId } = req.body;
    if (!name) return res.status(400).json({ error: "Nome obrigatório" });
    const asset = await prisma.asset.create({
      data: { name, type, format, size, tags, fileUrl, notes, userId: req.userId, channelId: channelId ? Number(channelId) : null },
    });
    res.status(201).json(asset);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const asset = await prisma.asset.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!asset) return res.status(404).json({ error: "Ativo não encontrado" });
    const { name, type, tags, notes, channelId } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (tags !== undefined) data.tags = tags;
    if (notes !== undefined) data.notes = notes;
    if (channelId !== undefined) data.channelId = channelId ? Number(channelId) : null;
    const updated = await prisma.asset.update({ where: { id: asset.id }, data });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const asset = await prisma.asset.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!asset) return res.status(404).json({ error: "Ativo não encontrado" });
    // Delete physical file if exists
    if (asset.filePath && fs.existsSync(asset.filePath)) {
      fs.unlinkSync(asset.filePath);
    }
    await prisma.asset.delete({ where: { id: asset.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
