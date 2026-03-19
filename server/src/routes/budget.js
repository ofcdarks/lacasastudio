const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const items = await prisma.budgetItem.findMany({ orderBy: { createdAt: "desc" } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { category, desc, value, type, month, recurring, notes } = req.body;
    const item = await prisma.budgetItem.create({
      data: {
        category: category || "outros", desc: desc || "", value: value || 0,
        type: type || "expense", month: month || "",
        recurring: recurring || false, notes: notes || "",
      },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { category, desc, value, type, recurring, notes } = req.body;
    const data = {};
    if (category !== undefined) data.category = category;
    if (desc !== undefined) data.desc = desc;
    if (value !== undefined) data.value = Number(value);
    if (type !== undefined) data.type = type;
    if (recurring !== undefined) data.recurring = recurring;
    if (notes !== undefined) data.notes = notes;
    const item = await prisma.budgetItem.update({ where: { id: Number(req.params.id) }, data });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.budgetItem.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
