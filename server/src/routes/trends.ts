// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import cache from "../services/cache";

const router = Router();
router.use(authenticate);

const NICHE_QUERIES: Record<string, string[]> = {
  gaming: ["gameplay 2026", "gaming viral", "melhor jogada", "jogo novo"],
  reviews: ["review produto 2026", "unboxing review", "vale a pena comprar"],
  podcast: ["podcast entrevista", "podcast viral", "corte podcast viral"],
  musica: ["música nova 2026", "react música", "cover viral"],
  tutoriais: ["tutorial como fazer", "passo a passo tutorial", "aprenda fazer"],
  fitness: ["treino academia 2026", "antes e depois fitness", "dieta resultado"],
  financas: ["investimento 2026", "como ganhar dinheiro", "renda extra online"],
  tecnologia: ["tecnologia 2026", "review tech celular", "melhor notebook"],
  motivacional: ["motivação viral", "superação história", "mindset sucesso"],
  comedia: ["comédia viral brasileira", "humor memes 2026", "piada viral"],
  unboxing: ["unboxing premium", "mega unboxing surpresa", "abrindo caixa"],
  dark: ["psicologia dark lado obscuro", "fatos sombrios", "manipulação"],
  noticias: ["notícia urgente hoje brasil", "breaking news", "aconteceu agora"],
  terror: ["história de terror real", "creepypasta assustador", "lugar assombrado"],
  dramatico: ["história dramática real", "caso chocante verdadeiro", "inacreditável"],
  cinema: ["análise filme 2026", "review filme cinema", "trailer reação"],
  esportes: ["melhores gols 2026", "lance incrível esporte", "futebol viral"],
  geek: ["anime 2026 novo", "marvel dc geek", "nerd cultura pop"],
  misterio: ["mistério não resolvido", "caso misterioso real", "investigação"],
  educacao: ["curiosidades incríveis", "você sabia que", "educação viral"],
  empreendedorismo: ["empreendedorismo 2026 negócio", "startup do zero", "renda online"],
  espiritualidade: ["espiritualidade despertar", "meditação guiada", "energia"],
  ia: ["inteligência artificial 2026 novidade", "chatgpt novo", "IA ferramenta"],
  outro: ["viral brasil 2026", "trending youtube", "mais visto semana"],
};

// Detect user's niche from their channels
router.get("/my-niche", async (req: any, res: Response, next: NextFunction) => {
  try {
    // Check if user has channels with niche set
    const channels = await prisma.channel.findMany({
      where: { userId: req.userId },
      select: { id: true, name: true, niche: true },
    });

    // If any channel has niche set, return it
    const withNiche = channels.filter((c: any) => c.niche && c.niche.trim() !== "");
    if (withNiche.length > 0) {
      res.json({ niche: withNiche[0].niche, channel: withNiche[0].name, source: "channel" });
      return;
    }

    // If channels exist but no niche, try to detect from channel name + videos
    if (channels.length > 0) {
      const videos = await prisma.video.findMany({
        where: { userId: req.userId },
        select: { title: true, tags: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      if (videos.length > 0) {
        const allText = videos.map((v: any) => `${v.title} ${v.tags || ""}`).join(" ").toLowerCase();
        const nicheScores: Record<string, number> = {};
        const keywords: Record<string, string[]> = {
          gaming: ["game", "gameplay", "jogando", "jogo", "gamer", "ps5", "xbox", "fortnite", "minecraft"],
          financas: ["dinheiro", "investir", "renda", "finanças", "cripto", "bitcoin", "trader", "bolsa"],
          tecnologia: ["tech", "celular", "notebook", "app", "software", "programação", "código"],
          fitness: ["treino", "academia", "dieta", "musculação", "saúde", "emagrecer", "shape"],
          comedia: ["humor", "comédia", "piada", "engraçado", "meme", "zoeira"],
          educacao: ["aprender", "ensinar", "aula", "curso", "estudo", "escola", "faculdade"],
          dark: ["dark", "psicologia", "manipulação", "sombrio", "obscuro", "mente"],
          musica: ["música", "cover", "cantando", "violão", "guitarra", "beat", "rap"],
          cinema: ["filme", "cinema", "trailer", "série", "review filme", "análise"],
          esportes: ["futebol", "gol", "esporte", "treino", "jogo ao vivo"],
          motivacional: ["motivação", "sucesso", "mindset", "superação", "foco"],
          terror: ["terror", "horror", "medo", "assombrado", "fantasma", "creepy"],
          ia: ["inteligência artificial", "ia", "chatgpt", "claude", "machine learning"],
        };

        for (const [niche, kws] of Object.entries(keywords)) {
          nicheScores[niche] = kws.reduce((sum, kw) => sum + (allText.split(kw).length - 1), 0);
        }

        const detected = Object.entries(nicheScores).sort((a, b) => b[1] - a[1])[0];
        if (detected && detected[1] > 0) {
          res.json({ niche: detected[0], channel: channels[0].name, source: "detected", confidence: detected[1] });
          return;
        }
      }
    }

    res.json({ niche: "", channel: "", source: "none" });
  } catch (err: any) {
    // niche column might not exist yet
    res.json({ niche: "", channel: "", source: "none" });
  }
});

// Fetch trending videos by niche
router.get("/thumbnails/:niche", async (req: any, res: Response, next: NextFunction) => {
  try {
    const niche = req.params.niche;
    const format = (req.query.format as string) || "all"; // all, landscape, portrait
    const cacheKey = `trends_${niche}_${format}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) { res.json(cached); return; }

    const apiKeySetting = await prisma.setting.findUnique({ where: { key: "youtube_api_key" } });
    const apiKey = apiKeySetting?.value;
    if (!apiKey) {
      res.status(400).json({ error: "YouTube API Key não configurada. Vá em Configurações." });
      return;
    }

    const queries = NICHE_QUERIES[niche] || NICHE_QUERIES.outro;
    const query = queries[Math.floor(Math.random() * queries.length)];

    // videoDimension filter: 2d = standard, any = all
    // For portrait/shorts we search differently
    let searchQuery = query;
    let maxResults = 20;
    if (format === "portrait") {
      searchQuery += " #shorts";
      maxResults = 16;
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}&publishedAfter=${getDateMonthsAgo(3)}&relevanceLanguage=pt&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const err = await searchRes.text();
      res.status(500).json({ error: `YouTube API error: ${err}` });
      return;
    }
    const searchData = await searchRes.json() as any;

    const videoIds = searchData.items?.map((v: any) => v.id.videoId).filter(Boolean).join(",");
    if (!videoIds) { res.json({ videos: [], query: searchQuery }); return; }

    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`;
    const statsRes = await fetch(statsUrl);
    const statsData = await statsRes.json() as any;

    let videos = (statsData.items || []).map((v: any) => {
      const duration = v.contentDetails?.duration || "";
      const isShort = parseDuration(duration) <= 60;
      return {
        id: v.id,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,
        thumbnailDefault: v.snippet.thumbnails?.default?.url,
        views: parseInt(v.statistics.viewCount || "0"),
        likes: parseInt(v.statistics.likeCount || "0"),
        comments: parseInt(v.statistics.commentCount || "0"),
        publishedAt: v.snippet.publishedAt,
        duration,
        isShort,
        format: isShort ? "portrait" : "landscape",
      };
    });

    // Filter by format
    if (format === "landscape") {
      videos = videos.filter((v: any) => !v.isShort);
    } else if (format === "portrait") {
      videos = videos.filter((v: any) => v.isShort);
    }

    videos.sort((a: any, b: any) => b.views - a.views);

    const result = { videos, query: searchQuery, niche, format, fetchedAt: new Date().toISOString() };
    cache.set(cacheKey, result, 30 * 60 * 1000);
    res.json(result);
  } catch (err) { next(err); }
});

// Save niche to channel
router.put("/channel-niche/:channelId", async (req: any, res: Response, next: NextFunction) => {
  try {
    const channel = await prisma.channel.findFirst({ where: { id: Number(req.params.channelId), userId: req.userId } });
    if (!channel) { res.status(404).json({ error: "Canal não encontrado" }); return; }
    const updated = await prisma.channel.update({
      where: { id: channel.id },
      data: { niche: req.body.niche || "" },
    });
    res.json(updated);
  } catch (err: any) {
    if (err.message?.includes("niche")) { res.json({ ok: true, note: "niche column not yet available" }); }
    else next(err);
  }
});

function getDateMonthsAgo(months: number): string {
  const d = new Date(); d.setMonth(d.getMonth() - months); return d.toISOString();
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
}

export default router;

// ═══ Thumb History ═══

// Save generated thumbnail
router.post("/thumb-history", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { niche, prompt, imageUrl, title, style, score, metadata } = req.body;
    const entry = await prisma.thumbHistory.create({
      data: {
        userId: req.userId,
        niche: niche || "",
        prompt: prompt || "",
        imageUrl: imageUrl || "",
        title: title || "",
        style: style || "",
        score: score || 0,
        metadata: typeof metadata === "string" ? metadata : JSON.stringify(metadata || {}),
      },
    });
    res.status(201).json(entry);
  } catch (err: any) {
    if (err.message?.includes("ThumbHistory") || err.code === "P2021") {
      res.json({ ok: true, note: "table not yet created" });
    } else { next(err); }
  }
});

// List thumb history
router.get("/thumb-history", async (req: any, res: Response, next: NextFunction) => {
  try {
    const niche = req.query.niche as string;
    const where: any = { userId: req.userId };
    if (niche) where.niche = niche;
    const history = await prisma.thumbHistory.findMany({
      where, orderBy: { createdAt: "desc" }, take: 50,
    });
    res.json(history);
  } catch (err: any) {
    if (err.message?.includes("ThumbHistory") || err.code === "P2021") {
      res.json([]);
    } else { next(err); }
  }
});

// Delete thumb from history
router.delete("/thumb-history/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    await prisma.thumbHistory.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message?.includes("ThumbHistory")) { res.json({ ok: true }); }
    else { next(err); }
  }
});

// Niche stats (which styles perform best)
router.get("/thumb-stats", async (req: any, res: Response, next: NextFunction) => {
  try {
    const history = await prisma.thumbHistory.findMany({
      where: { userId: req.userId },
      select: { niche: true, style: true, score: true },
    });
    const stats: Record<string, { count: number; avgScore: number; styles: Record<string, number> }> = {};
    history.forEach((h: any) => {
      if (!stats[h.niche]) stats[h.niche] = { count: 0, avgScore: 0, styles: {} };
      stats[h.niche].count++;
      stats[h.niche].avgScore += h.score;
      stats[h.niche].styles[h.style] = (stats[h.niche].styles[h.style] || 0) + 1;
    });
    for (const k of Object.keys(stats)) {
      if (stats[k].count > 0) stats[k].avgScore = Math.round(stats[k].avgScore / stats[k].count);
    }
    res.json(stats);
  } catch (err: any) {
    res.json({});
  }
});
