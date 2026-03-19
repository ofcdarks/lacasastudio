const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/video/:videoId", async (req, res, next) => {
  try {
    const scripts = await prisma.script.findMany({
      where: { videoId: Number(req.params.videoId) },
      orderBy: { createdAt: "desc" },
    });
    res.json(scripts);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { videoId, content } = req.body;
    const script = await prisma.script.create({
      data: { videoId: Number(videoId), content: content || "" },
    });
    res.status(201).json(script);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const script = await prisma.script.update({
      where: { id: Number(req.params.id) },
      data: { content: req.body.content },
    });
    res.json(script);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.script.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
