const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = Router();
router.use(authenticate);

const budgetSchema = z.object({
  category: z.string().min(1).max(100),
  desc: z.string().max(500),
  value: z.number().min(0),
  type: z.enum(["expense", "income"]).optional(),
  month: z.string().optional(),
  recurring: z.boolean().optional(),
  notes: z.string().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const items = await prisma.budgetItem.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post("/", validate(budgetSchema), async (req, res, next) => {
  try {
    const item = await prisma.budgetItem.create({ data: { ...req.validated, userId: req.userId } });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put("/:id", validate(budgetSchema.partial()), async (req, res, next) => {
  try {
    const item = await prisma.budgetItem.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    const updated = await prisma.budgetItem.update({ where: { id: item.id }, data: req.validated });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const item = await prisma.budgetItem.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    await prisma.budgetItem.delete({ where: { id: item.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
