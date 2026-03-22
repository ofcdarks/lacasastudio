import { Router, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/upload";
import logger from "../services/logger";

const router = Router();
router.use(authenticate);

// List assets
router.get("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const where: any = { userId: req.userId };
    if (req.query.channelId) where.channelId = Number(req.query.channelId);
    if (req.query.type) where.type = req.query.type;
    if (req.query.folder) where.folder = req.query.folder;

    const assets = await prisma.asset.findMany({
      where,
      include: { channel: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(assets);
  } catch (err) { next(err); }
});

// Get folders
router.get("/folders", async (req: any, res: Response, next: NextFunction) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { userId: req.userId },
      select: { folder: true },
      distinct: ["folder"],
      orderBy: { folder: "asc" },
    });
    const folders = assets
      .map((a: any) => a.folder || "/")
      .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);
    if (!folders.includes("/")) folders.unshift("/");
    res.json(folders);
  } catch (err: any) {
    // If folder column doesn't exist yet, return default
    logger.warn("Folders endpoint error (column may not exist yet)", { error: err.message });
    res.json(["/"]);
  }
});

// Upload file
router.post("/upload", upload.single("file"), async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.file) { res.status(400).json({ error: "Arquivo obrigatório" }); return; }
    const { name, type, tags, notes, channelId, folder } = req.body;

    const ext = path.extname(req.file.originalname).replace(".", "").toUpperCase();
    const sizeBytes = req.file.size;
    let sizeStr: string;
    if (sizeBytes >= 1073741824) sizeStr = `${(sizeBytes / 1073741824).toFixed(2)} GB`;
    else if (sizeBytes >= 1048576) sizeStr = `${(sizeBytes / 1048576).toFixed(2)} MB`;
    else if (sizeBytes >= 1024) sizeStr = `${(sizeBytes / 1024).toFixed(1)} KB`;
    else sizeStr = `${sizeBytes} B`;

    // Build data object - only include folder if column exists
    const data: any = {
      name: name || req.file.originalname.replace(/\.[^/.]+$/, ""),
      type: type || detectType(ext),
      format: ext,
      size: sizeStr,
      tags: tags || "",
      notes: notes || "",
      fileUrl: `/uploads/${req.userId}/${req.file.filename}`,
      filePath: req.file.path,
      userId: req.userId,
      channelId: channelId ? Number(channelId) : null,
    };

    // Try with folder first, fallback without
    let asset;
    try {
      data.folder = sanitizeFolder(folder || "/");
      asset = await prisma.asset.create({
        data,
        include: { channel: { select: { id: true, name: true, color: true } } },
      });
    } catch (e: any) {
      // If folder column doesn't exist, try without it
      if (e.message?.includes("folder") || e.code === "P2009") {
        delete data.folder;
        asset = await prisma.asset.create({
          data,
          include: { channel: { select: { id: true, name: true, color: true } } },
        });
      } else {
        throw e;
      }
    }

    logger.info("Asset uploaded", { userId: req.userId, assetId: asset.id, format: ext, size: sizeStr });
    res.status(201).json(asset);
  } catch (err: any) {
    logger.error("Upload failed", { error: err.message, stack: err.stack });
    next(err);
  }
});

// Create metadata-only
router.post("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, type, format, size, tags, fileUrl, notes, channelId, folder } = req.body;
    if (!name) { res.status(400).json({ error: "Nome obrigatório" }); return; }

    const data: any = {
      name, type: type || "thumbnail", format: format || "", size: size || "",
      tags: Array.isArray(tags) ? tags.join(",") : (tags || ""),
      fileUrl: fileUrl || "", notes: notes || "",
      userId: req.userId,
      channelId: channelId ? Number(channelId) : null,
    };

    try {
      data.folder = sanitizeFolder(folder || "/");
      const asset = await prisma.asset.create({
        data,
        include: { channel: { select: { id: true, name: true, color: true } } },
      });
      res.status(201).json(asset);
    } catch (e: any) {
      if (e.message?.includes("folder") || e.code === "P2009") {
        delete data.folder;
        const asset = await prisma.asset.create({
          data,
          include: { channel: { select: { id: true, name: true, color: true } } },
        });
        res.status(201).json(asset);
      } else { throw e; }
    }
  } catch (err) { next(err); }
});

// Update
router.put("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!asset) { res.status(404).json({ error: "Ativo não encontrado" }); return; }
    const { name, type, tags, notes, channelId, folder } = req.body;
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

// Move
router.put("/:id/move", async (req: any, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!asset) { res.status(404).json({ error: "Ativo não encontrado" }); return; }
    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: { folder: sanitizeFolder(req.body.folder) },
      include: { channel: { select: { id: true, name: true, color: true } } },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// Bulk move
router.post("/bulk-move", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { ids, folder } = req.body;
    if (!ids?.length) { res.status(400).json({ error: "IDs obrigatórios" }); return; }
    await prisma.asset.updateMany({
      where: { id: { in: ids }, userId: req.userId },
      data: { folder: sanitizeFolder(folder) },
    });
    res.json({ ok: true, moved: ids.length });
  } catch (err) { next(err); }
});

// Delete
router.delete("/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!asset) { res.status(404).json({ error: "Ativo não encontrado" }); return; }
    if (asset.filePath && fs.existsSync(asset.filePath)) {
      try { fs.unlinkSync(asset.filePath); } catch {}
    }
    await prisma.asset.delete({ where: { id: asset.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

function detectType(ext: string): string {
  const map: Record<string, string> = {
    JPG: "thumbnail", JPEG: "thumbnail", PNG: "thumbnail", WEBP: "thumbnail", PSD: "thumbnail",
    MP4: "intro", MOV: "intro", AVI: "intro", MKV: "intro",
    MP3: "audio", WAV: "audio", OGG: "audio", FLAC: "audio",
    SVG: "graphic", AI: "graphic", EPS: "graphic",
    TTF: "font", OTF: "font", WOFF: "font", WOFF2: "font",
    SRT: "overlay", VTT: "overlay",
    JSON: "other", ZIP: "other", PDF: "other",
  };
  return map[ext] || "other";
}

function sanitizeFolder(folder: string): string {
  let clean = (folder || "/").replace(/[\\]/g, "/").replace(/\/+/g, "/");
  if (!clean.startsWith("/")) clean = "/" + clean;
  if (clean.length > 1 && clean.endsWith("/")) clean = clean.slice(0, -1);
  clean = clean.replace(/\.\./g, "");
  return clean || "/";
}

export default router;
