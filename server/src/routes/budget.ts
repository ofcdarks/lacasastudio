// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.budgetItem.findMany({ take: 100, where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
    // Map DB fields back to frontend format
    res.json(items.map(i => ({
      id: i.id, name: i.desc, category: i.category, amount: i.value,
      period: i.month || "mensal", notes: i.notes, channel: i.type !== "expense" ? i.type : "",
      createdAt: i.createdAt
    })));
  } catch (err: any) { console.error("budget error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, category, amount, period, notes, channel } = req.body;
    if (!name || amount === undefined) { res.status(400).json({ error: "Nome e valor obrigatórios" }); return; }
    const item = await prisma.budgetItem.create({
      data: {
        desc: name || "", category: category || "other", value: Number(amount) || 0,
        type: channel || "expense", month: period || "mensal",
        recurring: period === "mensal", notes: notes || "", userId: req.userId
      }
    });
    res.status(201).json({ id: item.id, name: item.desc, category: item.category, amount: item.value, period: item.month, notes: item.notes, channel: item.type !== "expense" ? item.type : "" });
  } catch (err: any) { console.error("budget error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.put("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.budgetItem.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
    const { name, category, amount, period, notes, channel } = req.body;
    const updated = await prisma.budgetItem.update({
      where: { id: item.id },
      data: {
        ...(name !== undefined && { desc: name }),
        ...(category !== undefined && { category }),
        ...(amount !== undefined && { value: Number(amount) }),
        ...(period !== undefined && { month: period, recurring: period === "mensal" }),
        ...(notes !== undefined && { notes }),
        ...(channel !== undefined && { type: channel || "expense" }),
      }
    });
    res.json({ id: updated.id, name: updated.desc, category: updated.category, amount: updated.value, period: updated.month, notes: updated.notes, channel: updated.type !== "expense" ? updated.type : "" });
  } catch (err: any) { console.error("budget error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.delete("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.budgetItem.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
    await prisma.budgetItem.delete({ where: { id: item.id } });
    res.json({ ok: true });
  } catch (err: any) { console.error("budget error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

export default router;
