const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const members = await prisma.teamMember.findMany({ include: { channels: { select: { id: true, name: true, color: true } } }, orderBy: { name: "asc" } });
    res.json(members);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, role, email, channelIds } = req.body;
    if (!name) return res.status(400).json({ error: "Nome obrigatório" });
    const avatar = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const member = await prisma.teamMember.create({
      data: { name, role: role || "editor", email: email || "", avatar, status: "online",
        channels: channelIds?.length ? { connect: channelIds.map(id => ({ id })) } : undefined },
      include: { channels: { select: { id: true, name: true, color: true } } },
    });
    res.status(201).json(member);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { channelIds, ...data } = req.body;
    const member = await prisma.teamMember.update({
      where: { id: Number(req.params.id) },
      data: { ...data, ...(channelIds ? { channels: { set: channelIds.map(id => ({ id })) } } : {}) },
      include: { channels: { select: { id: true, name: true, color: true } } },
    });
    res.json(member);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.teamMember.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
