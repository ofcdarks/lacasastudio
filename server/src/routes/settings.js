const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { next(err); }
});

router.get("/raw/:key", async (req, res, next) => {
  try {
    const s = await prisma.setting.findUnique({ where: { key: req.params.key } });
    res.json(s || { key: req.params.key, value: "" });
  } catch (err) { next(err); }
});

router.put("/", async (req, res, next) => {
  try {
    const entries = Object.entries(req.body);
    // Validate no script injection
    for (const [key, value] of entries) {
      if (typeof key !== "string" || typeof value !== "string") {
        return res.status(400).json({ error: "Dados inválidos" });
      }
      if (key.length > 100 || value.length > 5000) {
        return res.status(400).json({ error: "Valor muito longo" });
      }
    }
    for (const [key, value] of entries) {
      await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
