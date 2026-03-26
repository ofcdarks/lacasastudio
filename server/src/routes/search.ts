// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) return res.json({ videos: [], ideas: [], assets: [], scripts: [] });

    const [videos, ideas, assets, scripts] = await Promise.all([
      prisma.video.findMany({ take: 100,
        where: { userId: req.userId, title: { contains: q } },
        include: { channel: { select: { id: true, name: true, color: true } } },
        take: 10,
      }),
      prisma.idea.findMany({ take: 100,
        where: { userId: req.userId, OR: [{ title: { contains: q } }, { content: { contains: q } }, { tags: { contains: q } }] },
        take: 10,
      }),
      prisma.asset.findMany({ take: 100,
        where: { userId: req.userId, OR: [{ name: { contains: q } }, { tags: { contains: q } }] },
        take: 10,
      }),
      prisma.script.findMany({ take: 100,
        where: { video: { userId: req.userId }, content: { contains: q } },
        include: { video: { select: { id: true, title: true } } },
        take: 10,
      }),
    ]);

    res.json({ videos, ideas, assets, scripts });
  } catch (err: any) { console.error("search error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

export default router;
