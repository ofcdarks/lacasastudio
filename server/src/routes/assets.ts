import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import path from "path";
import fs from "fs";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";
import { parsePagination, paginatedResponse } from "../services/pagination";
import logger from "../services/logger";
import type { AuthRequest, ValidatedRequest } from "../types";

const router = Router();
router.use(authenticate);

// List assets with filters
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as any);
    const where: any = { userId: req.userId };
    if (req.query.channelId) where.channelId = Number(req.query.channelId);
    if (req.query.type) where.type = req.query.type;
    if (req.query.folder) where.folder = req.query.folder as string;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where, take: limit, skip,
        include: { channel: { select: { id: true, name: true, color: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.asset.count({ where }),
    ]);

    res.json(paginatedResponse(assets, total, page, limit));
  } catch (err) { next(err); }
});

// Get unique folders for the user
router.get("/folders", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { userId: req.userId },
      select: { folder: true },
      distinct: ["folder"],
      orderBy: { folder: "asc" },
    });
    const folders = assets.map(a => a.folder || "/").filter((v, i, arr) => arr.indexOf(v) === i);
    if (!folders.includes("/")) folders.unshift("/");
    res.json(folders);
  } catch (err) { next(err); }
});

// Upload file + create asset (auto-detect format + size)
router.post("/upload", upload.single("file"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) { res.status(400).json({ error: "Arquivo obrigatório" }); return; }
    const { name, type, tags, notes, channelId, folder } = req.body as any;

    const ext = path.extname(req.file.originalname).replace(".", "").toUpperCase();
    const sizeBytes = req.file.size;
    let sizeStr: string;
    if (sizeBytes >= 1024 * 1024 * 1024) {
      sizeStr = `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (sizeBytes >= 1024 * 1024) {
      sizeStr = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (sizeBytes >= 1024) {
      sizeStr = `${(sizeBytes / 1024).toFixed(1)} KB`;
    } else {
      sizeStr = `${sizeBytes} B`;
    }

    const asset = await prisma.asset.create({
      data: {
        name: name || req.file.originalname.replace(/\.[^/.]+$/, ""),
        type: type || detectType(ext),
        format: ext,
        size: sizeStr,
        tags: tags || "",
        notes: notes || "",
        fileUrl: `/uploads/${req.userId}/${req.file.filename}`,
        filePath: req.file.path,
        folder: sanitizeFolder(folder || "/"),
        userId: req.userId,
        channelId: channelId ? Number(channelId) : null,
      },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    logger.info("Asset uploaded", { userId: req.userId, assetId: asset.id, format: ext, size: sizeStr });
    res.status(201).json(asset);
  } catch (err) { next(err); }
});

// Create metadata-only asset
router.post("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, type, format, size, tags, fileUrl, notes, channelId, folder } = req.body as any;
    if (!name) { res.status(400).json({ error: "Nome obrigatório" }); return; }
    const asset = await prisma.asset.create({
      data: {
        name,
        type: type || "thumbnail",
        format: format || "",
        size: size || "",
        tags: Array.isArray(tags) ? tags.join(",") : (tags || ""),
        fileUrl: fileUrl || "",
        notes: notes || "",
        folder: sanitizeFolder(folder || "/"),
        userId: req.userId,
        channelId: channelId ? Number(channelId) : null,
      },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.status(201).json(asset);
  } catch (err) { next(err); }
});

// Update asset
router.put("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!asset) { res.status(404).json({ error: "Ativo não encontrado" }); return; }
    const { name, type, tags, notes, channelId, folder } = req.body as any;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags.join(",") : tags;
    if (notes !== undefined) data.notes = notes;
    if (folder !== undefined) data.folder = sanitizeFolder(folder);
    if (channelId !== undefined) data.channelId = channelId ? Number(channelId) : null;
    const updated = await prisma.asset.update({
      where: { id: asset.id }, data,
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// Move asset to folder
router.put("/:id/move", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!asset) { res.status(404).json({ error: "Ativo não encontrado" }); return; }
    const { folder } = req.body as { folder: string };
    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: { folder: sanitizeFolder(folder) },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// Bulk move
router.post("/bulk-move", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids, folder } = req.body as { ids: number[]; folder: string };
    if (!ids?.length) { res.status(400).json({ error: "IDs obrigatórios" }); return; }
    await prisma.asset.updateMany({
      where: { id: { in: ids }, userId: req.userId },
      data: { folder: sanitizeFolder(folder) },
    });
    res.json({ ok: true, moved: ids.length });
  } catch (err) { next(err); }
});

// Delete asset
router.delete("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!asset) { res.status(404).json({ error: "Ativo não encontrado" }); return; }
    if (asset.filePath && fs.existsSync(asset.filePath)) {
      fs.unlinkSync(asset.filePath);
    }
    await prisma.asset.delete({ where: { id: asset.id } });
    logger.info("Asset deleted", { userId: req.userId, assetId: asset.id });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Auto-detect asset type from extension
function detectType(ext: string): string {
  const map: Record<string, string> = {
    JPG: "thumbnail", JPEG: "thumbnail", PNG: "thumbnail", WEBP: "thumbnail", PSD: "thumbnail", AI: "graphic",
    MP4: "intro", MOV: "intro", AVI: "intro",
    MP3: "audio", WAV: "audio", OGG: "audio",
    SVG: "graphic", EPS: "graphic",
    TTF: "font", OTF: "font", WOFF: "font", WOFF2: "font",
    SRT: "overlay", VTT: "overlay",
    JSON: "overlay", ZIP: "other", PDF: "other",
  };
  return map[ext] || "other";
}

// Sanitize folder path
function sanitizeFolder(folder: string): string {
  let clean = folder.replace(/[\\]/g, "/").replace(/\/+/g, "/");
  if (!clean.startsWith("/")) clean = "/" + clean;
  if (clean.length > 1 && clean.endsWith("/")) clean = clean.slice(0, -1);
  // Prevent path traversal
  clean = clean.replace(/\.\./g, "");
  return clean || "/";
}

export default router;
