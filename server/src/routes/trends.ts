import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import cache from "../services/cache";

const router = Router();
router.use(authenticate);

const NICHE_QUERIES: Record<string, string[]> = {
  gaming: ["gameplay 2026", "gaming viral", "melhor jogada"],
  reviews: ["review produto 2026", "unboxing review", "vale a pena"],
  podcast: ["podcast entrevista", "podcast viral", "corte podcast"],
  musica: ["música nova 2026", "react música", "cover viral"],
  tutoriais: ["tutorial como fazer", "passo a passo", "aprenda"],
  fitness: ["treino academia", "antes e depois fitness", "dieta 2026"],
  financas: ["investimento 2026", "como ganhar dinheiro", "renda extra"],
  tecnologia: ["tecnologia 2026", "review tech", "melhor celular"],
  motivacional: ["motivação viral", "superação", "mindset"],
  comedia: ["comédia viral", "humor brasileiro", "memes"],
  unboxing: ["unboxing premium", "unboxing surpresa", "mega unboxing"],
  dark: ["psicologia dark", "fatos sombrios", "lado obscuro"],
  noticias: ["notícia urgente hoje", "breaking news brasil", "aconteceu agora"],
  terror: ["história de terror", "creepypasta", "lugar assombrado"],
  dramatico: ["história dramática", "caso real", "chocante"],
  cinema: ["análise filme", "review filme 2026", "cinema"],
  esportes: ["melhores gols", "esporte viral", "lance incrível"],
  geek: ["anime 2026", "marvel dc", "nerd cultura"],
  misterio: ["mistério não resolvido", "caso misterioso", "investigação"],
  educacao: ["educação viral", "curiosidades", "você sabia"],
  empreendedorismo: ["empreendedorismo 2026", "negócio do zero", "startup"],
  espiritualidade: ["espiritualidade", "meditação", "despertar"],
  ia: ["inteligência artificial 2026", "IA novidades", "chatgpt"],
  outro: ["viral brasil 2026", "trending", "mais visto"],
};

// Fetch trending videos by niche from YouTube API
router.get("/thumbnails/:niche", async (req: any, res: Response, next: NextFunction) => {
  try {
    const niche = req.params.niche;
    const cacheKey = `trends_${niche}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) { res.json(cached); return; }

    // Get YouTube API key
    const apiKeySetting = await prisma.setting.findUnique({ where: { key: "youtube_api_key" } });
    const apiKey = apiKeySetting?.value;
    if (!apiKey) {
      res.status(400).json({ error: "YouTube API Key não configurada. Vá em Configurações." });
      return;
    }

    const queries = NICHE_QUERIES[niche] || NICHE_QUERIES.outro;
    const query = queries[Math.floor(Math.random() * queries.length)];

    // Search trending videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=12&q=${encodeURIComponent(query)}&publishedAfter=${getDateMonthsAgo(3)}&relevanceLanguage=pt&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const err = await searchRes.text();
      res.status(500).json({ error: `YouTube API error: ${err}` });
      return;
    }
    const searchData = await searchRes.json() as any;

    // Get video stats
    const videoIds = searchData.items?.map((v: any) => v.id.videoId).filter(Boolean).join(",");
    if (!videoIds) { res.json({ videos: [], query }); return; }

    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`;
    const statsRes = await fetch(statsUrl);
    const statsData = await statsRes.json() as any;

    const videos = (statsData.items || []).map((v: any) => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,
      thumbnailDefault: v.snippet.thumbnails?.default?.url,
      views: parseInt(v.statistics.viewCount || "0"),
      likes: parseInt(v.statistics.likeCount || "0"),
      comments: parseInt(v.statistics.commentCount || "0"),
      publishedAt: v.snippet.publishedAt,
    })).sort((a: any, b: any) => b.views - a.views);

    const result = { videos, query, niche, fetchedAt: new Date().toISOString() };
    cache.set(cacheKey, result, 30 * 60 * 1000); // 30min cache
    res.json(result);
  } catch (err) { next(err); }
});

function getDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

export default router;
