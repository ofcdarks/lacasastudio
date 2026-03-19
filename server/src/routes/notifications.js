const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifs);
  } catch (err) { next(err); }
});

router.put("/:id/read", async (req, res, next) => {
  try {
    const notif = await prisma.notification.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!notif) return res.status(404).json({ error: "Notificação não encontrada" });
    await prisma.notification.update({ where: { id: notif.id }, data: { read: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.put("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.userId, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete("/clear", async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.userId, read: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
