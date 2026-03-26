// @ts-nocheck
import { parsePagination, paginatedResponse } from "../services/pagination";
import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import NotifService from "../services/notifications";
import AuditService from "../services/audit";
import logger from "../services/logger";

const router = Router();
router.use(authenticate);

const createVideoSchema = z.object({
  title: z.string().min(1).max(200),
  channelId: z.number().int().positive(),
  status: z.string().optional(),
  date: z.string().optional(),
  priority: z.enum(["alta", "média", "baixa"]).optional(),
  duration: z.string().optional(),
});

const updateVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.string().optional(),
  date: z.string().optional(),
  priority: z.enum(["alta", "média", "baixa"]).optional(),
  duration: z.string().optional(),
  channelId: z.number().int().positive().optional(),
});

router.get("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as any);
    const where: any = { userId: req.userId };
    if (req.query.channelId) where.channelId = Number(req.query.channelId);
    if (req.query.status) where.status = req.query.status;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where, take: limit, skip,
        select: {
          id: true, title: true, status: true, date: true, priority: true, duration: true,
          channelId: true, createdAt: true, updatedAt: true,
          channel: { select: { id: true, name: true, color: true, icon: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.video.count({ where }),
    ]);

    res.json(paginatedResponse(videos, total, page, limit));
  } catch (err: any) { console.error("videos error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.get("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const video = await prisma.video.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
      include: { channel: true, scenes: { orderBy: { order: "asc" } }, checklists: true },
    });
    if (!video) { res.status(404).json({ error: "Vídeo não encontrado" }); return; }
    res.json(video);
  } catch (err: any) { console.error("videos error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/", validate(createVideoSchema), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { title, channelId, status, date, priority, duration } = req.validated;
    const ch = await prisma.channel.findFirst({ where: { id: channelId, userId: req.userId } });
    if (!ch) { res.status(403).json({ error: "Canal não pertence a este usuário" }); return; }

    const video = await prisma.video.create({
      data: { title, channelId, userId: req.userId, status: status || "idea", date: date || "", priority: priority || "média", duration: duration || "" },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    await NotifService.videoCreated(req.userId, title);
    logger.info("Video created", { userId: req.userId, videoId: video.id });
    res.status(201).json(video);
  } catch (err: any) { console.error("videos error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.put("/:id", validate(updateVideoSchema), async (req: any, res: Response, next: NextFunction) => {
  try {
    const video = await prisma.video.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!video) { res.status(404).json({ error: "Vídeo não encontrado" }); return; }

    const updated = await prisma.video.update({
      where: { id: video.id }, data: req.validated,
      include: { channel: { select: { id: true, name: true, color: true } } },
    });

    if (req.validated.status && req.validated.status !== video.status) {
      if (req.validated.status === "published") {
        await NotifService.videoPublished(req.userId, updated.title);
      } else {
        await NotifService.videoStatusChanged(req.userId, updated.title, req.validated.status);
      }
    }
    logger.info("Video updated", { userId: req.userId, videoId: video.id });
    res.json(updated);
  } catch (err: any) { console.error("videos error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.delete("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const video = await prisma.video.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!video) { res.status(404).json({ error: "Vídeo não encontrado" }); return; }
    await prisma.video.delete({ where: { id: video.id } });
    await AuditService.dataDeleted(req.userId, "video", video.id, req.ip || "");
    logger.info("Video deleted", { userId: req.userId, videoId: video.id });
    res.json({ ok: true });
  } catch (err: any) { console.error("videos error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

export default router;
