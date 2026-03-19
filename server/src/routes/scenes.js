const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");

const router = Router();
router.use(authenticate);

router.get("/video/:videoId", async (req, res, next) => {
  try {
    const scenes = await prisma.scene.findMany({
      where: { videoId: Number(req.params.videoId) },
      orderBy: { order: "asc" },
    });
    res.json(scenes);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { videoId, type, title, duration, notes, camera, audio, color } = req.body;
    const count = await prisma.scene.count({ where: { videoId: Number(videoId) } });
    const scene = await prisma.scene.create({
      data: { videoId: Number(videoId), type: type || "content", title, duration: duration || "", notes: notes || "", camera: camera || "", audio: audio || "", color: color || "#3B82F6", order: count },
    });
    res.status(201).json(scene);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const scene = await prisma.scene.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(scene);
  } catch (err) { next(err); }
});

router.put("/reorder/:videoId", async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    await Promise.all(orderedIds.map((id, i) => prisma.scene.update({ where: { id }, data: { order: i } })));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.scene.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
