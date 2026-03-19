const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

const SENSITIVE_KEYS = ["laozhang_api_key", "youtube_api_key"];

router.get("/", async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const obj = {};
    settings.forEach(s => {
      if (SENSITIVE_KEYS.includes(s.key) && s.value) {
        obj[s.key] = "••••••••" + s.value.slice(-4);
      } else {
        obj[s.key] = s.value;
      }
    });
    res.json(obj);
  } catch (err) { next(err); }
});

router.get("/raw/:key", async (req, res, next) => {
  try {
    const s = await prisma.setting.findUnique({ where: { key: req.params.key } });
    res.json({ value: s?.value || "" });
  } catch (err) { next(err); }
});

router.put("/", async (req, res, next) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
