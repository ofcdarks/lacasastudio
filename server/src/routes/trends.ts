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
  historia: ["ancient civilizations documentary", "lost civilizations history", "ancient history documentary", "civilização antiga documentário", "história civilizações perdidas", "ancient egypt mystery", "aztec maya inca documentary", "mesoamerica ancient history"],
  educacao: ["curiosidades incríveis educação", "você sabia que", "educação viral", "aula online"],
  empreendedorismo: ["empreendedorismo 2026 negócio", "startup do zero", "renda online"],
  espiritualidade: ["espiritualidade despertar", "meditação guiada", "energia"],
  ia: ["inteligência artificial 2026 novidade", "chatgpt novo", "IA ferramenta"],
  outro: ["viral brasil 2026", "trending youtube", "mais visto semana"],
};

// Detect user's niche from their channels + YouTube API
router.get("/my-niche", async (req: any, res: Response, next: NextFunction) => {
  try {
    // 1. Check user channels for niche field
    let channels: any[] = [];
    try {
      channels = await prisma.channel.findMany({
        where: { userId: req.userId },
        select: { id: true, name: true, niche: true },
      });
    } catch { channels = []; }

    // Don't blindly trust saved niche — always re-verify against videos
    const savedNiche = channels.find((c: any) => c.niche && c.niche.trim() !== "")?.niche || "";

    // 2. Try to detect from user's videos in DB
    let videos: any[] = [];
    try {
      videos = await prisma.video.findMany({
        where: { userId: req.userId },
        select: { title: true, tags: true },
        take: 30,
        orderBy: { createdAt: "desc" },
      });
    } catch { videos = []; }

    if (videos.length > 0) {
      const allText = videos.map((v: any) => `${v.title || ""} ${v.tags || ""}`).join(" ").toLowerCase();
      const detected = detectNicheFromText(allText);
      if (detected) {
        // Save/update detected niche to channel
        if (channels.length > 0) {
          try { await prisma.channel.update({ where: { id: channels[0].id }, data: { niche: detected } }); } catch {}
        }
        res.json({ niche: detected, channel: channels[0]?.name || "Seu Canal", source: "detected", confidence: 1 });
        return;
      }
    }

    // 3. Try YouTube API - fetch recent videos from user's channel
    if (channels.length > 0) {
      try {
        const apiKeySetting = await prisma.setting.findUnique({ where: { key: "youtube_api_key" } });
        const apiKey = apiKeySetting?.value;
        if (apiKey) {
          // Search for the channel name on YouTube
          const chName = channels[0].name;
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(chName)}&maxResults=1&key=${apiKey}`;
          const searchRes = await fetch(searchUrl);
          if (searchRes.ok) {
            const searchData = await searchRes.json() as any;
            const channelId = searchData.items?.[0]?.id?.channelId;
            if (channelId) {
              // Fetch recent videos from this channel
              const vidsUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=15&key=${apiKey}`;
              const vidsRes = await fetch(vidsUrl);
              if (vidsRes.ok) {
                const vidsData = await vidsRes.json() as any;
                const titles = (vidsData.items || []).map((v: any) => v.snippet?.title || "").join(" ").toLowerCase();
                const detected = detectNicheFromText(titles);
                if (detected) {
                  try { await prisma.channel.update({ where: { id: channels[0].id }, data: { niche: detected } }); } catch {}
                  res.json({ niche: detected, channel: chName, source: "youtube-api", channelId });
                  return;
                }
              }
            }
          }
        }
      } catch {}
    }

    // Fallback to saved niche if re-detection failed
    if (savedNiche) {
      res.json({ niche: savedNiche, channel: channels[0]?.name || "", source: "channel" });
      return;
    }
    res.json({ niche: "", channel: channels[0]?.name || "", source: "none" });
  } catch (err: any) {
    res.json({ niche: "", channel: "", source: "none" });
  }
});

function detectNicheFromText(text: string): string | null {
  const keywords: Record<string, string[]> = {
    gaming: ["game", "gameplay", "jogando", "jogo", "gamer", "ps5", "xbox", "fortnite", "minecraft", "roblox", "fps", "rpg", "mmorpg", "steam", "valorant", "league", "free fire"],
    financas: ["dinheiro", "investir", "investimento", "renda", "finanças", "cripto", "bitcoin", "trader", "bolsa", "ações", "poupança", "rico", "milionário", "forex"],
    tecnologia: ["tech", "celular", "notebook", "app", "software", "programação", "código", "iphone", "android", "samsung", "review tech", "unboxing tech"],
    fitness: ["treino", "academia", "dieta", "musculação", "saúde", "emagrecer", "shape", "whey", "hipertrofia", "cardio", "exercício"],
    comedia: ["humor", "comédia", "piada", "engraçado", "meme", "zoeira", "react", "tente não rir"],
    historia: [
      // Geral
      "historia", "história", "civilização", "civilizacao", "civilizações", "civilizacoes",
      "império", "imperio", "impérios", "guerra mundial", "batalha", "antigo", "antiga", "antiguidade",
      "medieval", "reis", "reis e", "dinastia", "revolução", "revolucao",
      "arqueologia", "arqueológic", "mitologia", "mitológic", "lenda", "lendas",
      // Civilizações específicas
      "faraó", "farao", "egito", "egípcio", "egipcio", "pirâmide", "piramide",
      "roma", "romano", "romanos", "grécia", "grecia", "grego", "gregos",
      "mesopotâmia", "mesopotamia", "babilônia", "babilonia", "suméri", "sumeri", "assíri",
      "persa", "persas", "otomano", "otomanos", "bizantin",
      "viking", "vikings", "nórdic", "nordico", "samurai", "samurais",
      "cruzadas", "feudal", "mongol", "mongóis",
      // América Latina / Mesoamérica — PRIORIDADE ALTA
      "inca", "incas", "asteca", "astecas", "azteca", "aztecas",
      "maia", "maias", "maya", "mayas",
      "olmeca", "olmecas", "tolteca", "toltecas", "zapoteca", "zapotecas",
      "mesoamerica", "mesoamérica", "pré-colombian", "pre-colombian",
      "teotihuacan", "tenochtitlan", "chichen itza", "machu picchu", "nazca",
      "quetzalcoatl", "tlaloc", "huitzilopochtli", "pachamama", "viracocha",
      "tiahuanaco", "tiwanaku", "chan chan", "caral", "moai", "rapa nui",
      "civilização antiga", "civilizacao antiga", "ancient civilization",
      "civilizações perdidas", "civilizacoes perdidas",
      "história antiga", "historia antiga", "mundo antigo",
      // Documentário histórico
      "documentário", "documentario", "discovery", "history channel",
      "graham hancock", "ancient aliens", "lost civilization",
      "construções antigas", "construcoes antigas", "templo", "templos",
      "ruínas", "ruinas", "artefato", "artefatos", "relíquia", "reliquia",
      "tumba", "tumbas", "sarcófago", "sarcofago", "múmia", "mumia",
      "hieróglifo", "hieroglifo", "calendário maia", "calendario maia",
    ],
    educacao: ["aprender", "ensinar", "aula", "curso", "estudo", "escola", "faculdade", "enem", "vestibular", "concurso", "professor", "matéria", "prova"],
    dark: ["dark", "psicologia", "manipulação", "sombrio", "obscuro", "mente", "comportamento", "narcisista"],
    musica: ["música", "cover", "cantando", "violão", "guitarra", "beat", "rap", "funk", "sertanejo", "pagode"],
    cinema: ["filme", "cinema", "trailer", "série", "review filme", "análise", "marvel", "dc", "netflix"],
    esportes: ["futebol", "gol", "esporte", "campeonato", "nba", "ufc", "libertadores", "copa do mundo", "olimpíada"],
    motivacional: ["motivação", "sucesso", "mindset", "superação", "foco", "disciplina", "produtividade"],
    terror: ["terror", "horror", "medo", "assombrado", "fantasma", "creepy", "paranormal", "sobrenatural"],
    ia: ["inteligência artificial", "chatgpt", "claude", "machine learning", "openai", "prompt engineering", "automação ia", "deep learning", "neural", "llm", "gpt-4", "midjourney", "stable diffusion"],
    noticias: ["notícia", "urgente", "breaking", "aconteceu", "plantão", "política", "governo"],
    empreendedorismo: ["empreender", "negócio", "startup", "empresa", "marketing", "vendas", "dropshipping", "loja"],
    podcast: ["podcast", "entrevista", "conversa", "papo", "bate-papo", "episódio"],
    reviews: ["review", "análise", "vale a pena", "unboxing", "teste", "comparativo"],
    tutoriais: ["tutorial", "como fazer", "passo a passo", "aprenda", "dica", "hack"],
  };

  const scores: [string, number][] = [];
  for (const [niche, kws] of Object.entries(keywords)) {
    let score = 0;
    for (const kw of kws) {
      const matches = text.split(kw.toLowerCase()).length - 1;
      // Give double weight to longer/more specific keywords (3+ words)
      const weight = kw.split(" ").length >= 3 ? 2 : 1;
      score += matches * weight;
    }
    if (score > 0) scores.push([niche, score]);
  }
  
  scores.sort((a, b) => b[1] - a[1]);
  return scores.length > 0 && scores[0][1] >= 2 ? scores[0][0] : null;
}


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
