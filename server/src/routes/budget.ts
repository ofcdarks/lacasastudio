// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

const mapItem = (i: any) => ({
  id: i.id,
  name: i.desc,
  category: i.category,
  amount: i.value,
  period: i.month || "mensal",
  notes: i.notes,
  channel: i.notes ? "" : "", // channel stored in notes if needed
  isIncome: i.type === "income",
  createdAt: i.createdAt,
});

router.get("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.budgetItem.findMany({ take: 200, where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
    res.json(items.map(mapItem));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro interno" });
  }
});

router.post("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, category, amount, period, notes, channel, isIncome } = req.body;
    if (!name || amount === undefined) { res.status(400).json({ error: "Nome e valor obrigatórios" }); return; }
    const item = await prisma.budgetItem.create({
      data: {
        desc: name || "",
        category: category || "other",
        value: Number(amount) || 0,
        type: isIncome ? "income" : "expense",
        month: period || "mensal",
        recurring: period === "mensal",
        notes: notes || "",
        userId: req.userId,
      }
    });
    res.status(201).json(mapItem(item));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro interno" });
  }
});

router.put("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.budgetItem.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
    const { name, category, amount, period, notes, isIncome } = req.body;
    const updated = await prisma.budgetItem.update({
      where: { id: item.id },
      data: {
        ...(name !== undefined && { desc: name }),
        ...(category !== undefined && { category }),
        ...(amount !== undefined && { value: Number(amount) }),
        ...(period !== undefined && { month: period, recurring: period === "mensal" }),
        ...(notes !== undefined && { notes }),
        ...(isIncome !== undefined && { type: isIncome ? "income" : "expense" }),
      }
    });
    res.json(mapItem(updated));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro interno" });
  }
});

router.delete("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.budgetItem.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
    await prisma.budgetItem.delete({ where: { id: item.id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro interno" });
  }
});

export default router;
