const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/video/:videoId", async (req, res, next) => {
  try {
    const items = await prisma.checklist.findMany({ where: { videoId: Number(req.params.videoId) }, orderBy: { id: "asc" } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { label, videoId } = req.body;
    const item = await prisma.checklist.create({ data: { label, videoId: Number(videoId) } });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const item = await prisma.checklist.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.checklist.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
