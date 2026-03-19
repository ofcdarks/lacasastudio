const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/video/:videoId", async (req, res, next) => {
  try {
    const results = await prisma.seoResult.findMany({
      where: { videoId: Number(req.params.videoId) },
      orderBy: { createdAt: "desc" },
    });
    res.json(results.map(r => ({
      ...r,
      titles: r.titles ? JSON.parse(r.titles) : [],
      tags: r.tags ? JSON.parse(r.tags) : [],
      score: r.score ? JSON.parse(r.score) : {},
    })));
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { videoId, titles, description, tags, score, tips } = req.body;
    const result = await prisma.seoResult.create({
      data: {
        videoId: Number(videoId),
        titles: JSON.stringify(titles || []),
        description: description || "",
        tags: JSON.stringify(tags || []),
        score: JSON.stringify(score || {}),
        tips: tips || "",
      },
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.seoResult.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
