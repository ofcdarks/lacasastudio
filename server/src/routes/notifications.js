const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
    res.json(notifs);
  } catch (err) { next(err); }
});

router.put("/:id/read", async (req, res, next) => {
  try {
    const notif = await prisma.notification.update({ where: { id: Number(req.params.id) }, data: { read: true } });
    res.json(notif);
  } catch (err) { next(err); }
});

router.put("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ data: { read: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
