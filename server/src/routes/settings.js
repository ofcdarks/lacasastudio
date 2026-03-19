const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    settings.forEach(s => {
      // Mask API key for security
      if (s.key === "ai_api_key" && s.value) {
        map[s.key] = s.value.slice(0, 8) + "..." + s.value.slice(-4);
        map["ai_api_key_set"] = true;
      } else {
        map[s.key] = s.value;
      }
    });
    res.json(map);
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

// Internal: get raw API key (not exposed to client)
router._getApiKey = async () => {
  const s = await prisma.setting.findUnique({ where: { key: "ai_api_key" } });
  return s?.value || "";
};

module.exports = router;
