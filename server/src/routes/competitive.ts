// ============================================
// server/src/routes/competitive.ts
// Novas features: Keywords, Tag Spy, SEO Audit,
// Daily Ideas, Compare, Velocity, Retention, Shorts Clipper
// 
// Adicionar ao server/src/index.ts:
//   import competitiveRoutes from "./routes/competitive";
//   app.use("/api/competitive", competitiveRoutes);
// ============================================

import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
const router = Router();
router.use(authenticate);

const LANG_RULE = "REGRA DE IDIOMA: Toda explicação, análise, dica, feedback, insight, estratégia e comentário deve ser SEMPRE em Português do Brasil (PT-BR). APENAS JSON válido sem markdown.";

// ── Helpers ──────────────────────────────────
const cache = new Map<string, { data: any; exp: number }>();
function cached(key: string, ttl = 300000): any | null {
  const c = cache.get(key);
  if (c && c.exp > Date.now()) return c.data;
  cache.delete(key);
  return null;
}
function setCache(key: string, data: any, ttl = 300000) {
  cache.set(key, { data, exp: Date.now() + ttl });
  if (cache.size > 300) { const now = Date.now(); for (const [k, v] of cache) { if (v.exp < now) cache.delete(k); } }
}

async function getYtKey(): Promise<string> {
  const c = cached("ytkey_c", 60000); if (c) return c;
  const s = await prisma.setting.findUnique({ where: { key: "youtube_api_key" } });
  const v = s?.value || ""; setCache("ytkey_c", v, 60000); return v;
}
async function getAiKey(): Promise<string> {
  const c = cached("aikey_c", 60000); if (c) return c;
  const s = await prisma.setting.findUnique({ where: { key: "laozhang_api_key" } });
  const v = s?.value || ""; setCache("aikey_c", v, 60000); return v;
}
async function getModel(): Promise<string> {
  const c = cached("model_c", 60000); if (c) return c;
  const s = await prisma.setting.findUnique({ where: { key: "ai_model" } });
  const v = s?.value || "claude-sonnet-4-6"; setCache("model_c", v, 60000); return v;
}

async function ytFetch(path: string, ytKey: string) {
  const ck = "ytc:" + path;
  const c = cached(ck);
  if (c) return c;
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}${sep}key=${ytKey}`);
  if (!res.ok) throw new Error(`YouTube API: ${res.status}`);
  const data = await res.json() as any;
  setCache(ck, data);
  return data;
}

async function fetchAI(aiKey: string, model: string, system: string, user: string, maxTokens = 2500): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.5, max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, { role: "user", content: user }]
      })
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data = await res.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "{}").trim();
    return JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("Timeout — IA demorou demais.");
    if (e instanceof SyntaxError) throw new Error("IA retornou formato inválido.");
    throw e;
  }
}

const fmt = (n: number) => { if (n >= 1e9) return (n/1e9).toFixed(1)+"B"; if (n >= 1e6) return (n/1e6).toFixed(1)+"M"; if (n >= 1e3) return (n/1e3).toFixed(1)+"K"; return String(n); };


// ═══════════════════════════════════════════
// 1. KEYWORD RESEARCH ENGINE
// ═══════════════════════════════════════════
router.post("/keywords/search", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const { keyword, niche } = req.body;
    if (!keyword?.trim()) { res.status(400).json({ error: "Keyword obrigatória" }); return; }

    // Search YouTube for this keyword
    const search = await ytFetch(
      `search?part=snippet&type=video&q=${encodeURIComponent(keyword)}&maxResults=15&order=viewCount`,
      ytKey
    );
    const videoIds = (search.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
    
    let videos: any[] = [];
    if (videoIds.length) {
      const vData = await ytFetch(`videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}`, ytKey);
      videos = (vData.items || []).map((v: any) => ({
        id: v.id,
        title: v.snippet?.title || "",
        channelTitle: v.snippet?.channelTitle || "",
        views: Number(v.statistics?.viewCount || 0),
        likes: Number(v.statistics?.likeCount || 0),
        comments: Number(v.statistics?.commentCount || 0),
        publishedAt: v.snippet?.publishedAt || "",
        duration: v.contentDetails?.duration || "",
        tags: v.snippet?.tags || [],
        thumbnail: v.snippet?.thumbnails?.medium?.url || "",
      }));
    }

    // Calculate competition & volume scores
    const totalResults = Number(search.pageInfo?.totalResults || 0);
    const avgViews = videos.length ? Math.round(videos.reduce((a: number, v: any) => a + v.views, 0) / videos.length) : 0;
    const maxViews = videos.length ? Math.max(...videos.map((v: any) => v.views)) : 0;
    
    // Competition: 0 = no competition, 100 = extremely competitive
    let competition = 0;
    if (totalResults > 1000000) competition = 95;
    else if (totalResults > 500000) competition = 85;
    else if (totalResults > 100000) competition = 70;
    else if (totalResults > 50000) competition = 55;
    else if (totalResults > 10000) competition = 40;
    else if (totalResults > 1000) competition = 25;
    else competition = 10;

    // Volume proxy (avg views of top results)
    let volumeScore = 0;
    if (avgViews > 1000000) volumeScore = 95;
    else if (avgViews > 500000) volumeScore = 85;
    else if (avgViews > 100000) volumeScore = 75;
    else if (avgViews > 50000) volumeScore = 60;
    else if (avgViews > 10000) volumeScore = 45;
    else if (avgViews > 1000) volumeScore = 30;
    else volumeScore = 15;

    // Keyword score = volume high + competition low = good opportunity
    const score = Math.round((volumeScore * 0.6) + ((100 - competition) * 0.4));

    // Get related keywords from YouTube autocomplete
    let related: string[] = [];
    try {
      const autoRes = await fetch(`https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(keyword)}&output=toolbar`);
      if (autoRes.ok) {
        const text = await autoRes.text();
        const matches = text.match(/data="([^"]+)"/g) || [];
        related = matches.map(m => m.replace('data="', '').replace('"', '')).filter(r => r !== keyword).slice(0, 12);
      }
    } catch {}
    // Fallback: extract common words from video titles
    if (!related.length) {
      const words = new Map<string, number>();
      videos.forEach((v: any) => {
        v.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3 && !keyword.toLowerCase().includes(w)).forEach((w: string) => words.set(w, (words.get(w) || 0) + 1));
      });
      related = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => `${keyword} ${e[0]}`);
    }

    // Collect all tags from top videos
    const allTags = new Map<string, number>();
    videos.forEach((v: any) => { (v.tags || []).forEach((t: string) => allTags.set(t.toLowerCase(), (allTags.get(t.toLowerCase()) || 0) + 1)); });
    const topTags = [...allTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([tag, count]) => ({ tag, frequency: count }));

    // Save to DB
    await (prisma as any).keywordResult.create({
      data: { keyword, score, volume: String(volumeScore), competition: String(competition), avgViews, topResults: JSON.stringify(videos.slice(0, 10)), related: JSON.stringify(related), niche: niche || "", userId: req.user.id }
    });

    res.json({
      keyword,
      score,
      volumeScore,
      competition,
      totalResults,
      avgViews,
      maxViews,
      volumeLabel: volumeScore >= 70 ? "Alto" : volumeScore >= 40 ? "Médio" : "Baixo",
      competitionLabel: competition >= 70 ? "Alta" : competition >= 40 ? "Média" : "Baixa",
      opportunity: score >= 70 ? "Excelente" : score >= 50 ? "Boa" : score >= 30 ? "Moderada" : "Difícil",
      topVideos: videos.slice(0, 10),
      related,
      topTags,
    });
  } catch (err) { next(err); }
});

// Keyword history
router.get("/keywords/history", async (req: any, res: Response, next: NextFunction) => {
  try {
    const results = await (prisma as any).keywordResult.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(results);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 2. COMPETITOR TAG SPY
// ═══════════════════════════════════════════
router.post("/tag-spy", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const { videoUrl } = req.body;
    if (!videoUrl?.trim()) { res.status(400).json({ error: "URL ou ID do vídeo obrigatório" }); return; }

    // Extract video ID from URL
    let videoId = videoUrl.trim();
    const urlMatch = videoUrl.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (urlMatch) videoId = urlMatch[1];

    const vData = await ytFetch(`videos?part=snippet,statistics,contentDetails&id=${videoId}`, ytKey);
    const video = vData.items?.[0];
    if (!video) { res.status(404).json({ error: "Vídeo não encontrado" }); return; }

    const tags = video.snippet?.tags || [];
    const title = video.snippet?.title || "";
    const description = (video.snippet?.description || "").slice(0, 500);
    const channelTitle = video.snippet?.channelTitle || "";
    const views = Number(video.statistics?.viewCount || 0);
    const likes = Number(video.statistics?.likeCount || 0);
    const comments = Number(video.statistics?.commentCount || 0);

    // For each tag, check if it appears in title/description (stronger signal)
    const tagAnalysis = tags.map((tag: string) => {
      const inTitle = title.toLowerCase().includes(tag.toLowerCase());
      const inDesc = description.toLowerCase().includes(tag.toLowerCase());
      return {
        tag,
        inTitle,
        inDescription: inDesc,
        strength: inTitle && inDesc ? "forte" : inTitle || inDesc ? "médio" : "fraco",
        charCount: tag.length,
      };
    });

    // Extract hashtags from description
    const hashtags = (video.snippet?.description || "").match(/#\w+/g) || [];

    res.json({
      videoId,
      title,
      channelTitle,
      views,
      likes,
      comments,
      thumbnail: video.snippet?.thumbnails?.high?.url || "",
      publishedAt: video.snippet?.publishedAt || "",
      duration: video.contentDetails?.duration || "",
      tagCount: tags.length,
      tags: tagAnalysis,
      hashtags: Array.from(new Set(hashtags as string[])),
      titleLength: title.length,
      descriptionLength: (video.snippet?.description || "").length,
      hasTimestamps: /\d{1,2}:\d{2}/.test(video.snippet?.description || ""),
      hasLinks: /https?:\/\//.test(video.snippet?.description || ""),
    });
  } catch (err) { next(err); }
});

// Bulk tag spy (multiple videos)
router.post("/tag-spy/bulk", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const { videoIds } = req.body;
    if (!videoIds?.length) { res.status(400).json({ error: "IDs obrigatórios" }); return; }

    const ids = videoIds.slice(0, 10).join(",");
    const vData = await ytFetch(`videos?part=snippet,statistics&id=${ids}`, ytKey);
    
    // Aggregate all tags
    const tagMap = new Map<string, { count: number; totalViews: number; videos: string[] }>();
    (vData.items || []).forEach((v: any) => {
      const views = Number(v.statistics?.viewCount || 0);
      (v.snippet?.tags || []).forEach((tag: string) => {
        const key = tag.toLowerCase();
        const existing = tagMap.get(key) || { count: 0, totalViews: 0, videos: [] };
        existing.count++;
        existing.totalViews += views;
        existing.videos.push(v.snippet?.title || "");
        tagMap.set(key, existing);
      });
    });

    const commonTags = [...tagMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([tag, data]) => ({
        tag,
        frequency: data.count,
        avgViews: Math.round(data.totalViews / data.count),
        usedIn: data.videos.slice(0, 3),
      }));

    res.json({ totalVideos: vData.items?.length || 0, commonTags });
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 3. SEO SCORE AUDIT
// ═══════════════════════════════════════════
router.post("/seo-audit", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const { videoUrl } = req.body;
    if (!videoUrl?.trim()) { res.status(400).json({ error: "URL do vídeo obrigatória" }); return; }

    let videoId = videoUrl.trim();
    const urlMatch = videoUrl.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (urlMatch) videoId = urlMatch[1];

    const vData = await ytFetch(`videos?part=snippet,statistics,contentDetails&id=${videoId}`, ytKey);
    const video = vData.items?.[0];
    if (!video) { res.status(404).json({ error: "Vídeo não encontrado" }); return; }

    const title = video.snippet?.title || "";
    const description = video.snippet?.description || "";
    const tags = video.snippet?.tags || [];
    const views = Number(video.statistics?.viewCount || 0);
    const likes = Number(video.statistics?.likeCount || 0);
    const comments = Number(video.statistics?.commentCount || 0);

    // Audit checks
    const checks: { label: string; pass: boolean; score: number; tip: string; category: string }[] = [];

    // TITLE checks
    checks.push({
      label: "Título entre 40-65 caracteres",
      pass: title.length >= 40 && title.length <= 65,
      score: title.length >= 40 && title.length <= 65 ? 10 : title.length >= 30 ? 5 : 0,
      tip: title.length < 40 ? `Título curto (${title.length} chars). Adicione mais contexto.` : title.length > 65 ? `Título longo (${title.length} chars). Será cortado nos resultados.` : `Tamanho ideal (${title.length} chars).`,
      category: "title",
    });
    checks.push({
      label: "Título tem número ou lista",
      pass: /\d/.test(title),
      score: /\d/.test(title) ? 5 : 0,
      tip: /\d/.test(title) ? "Números no título aumentam CTR." : "Títulos com números têm CTR 36% maior.",
      category: "title",
    });
    checks.push({
      label: "Título tem gatilho emocional",
      pass: /!|\?|🔥|😱|incrível|chocante|segredo|nunca|impossível|verdade/i.test(title),
      score: /!|\?|🔥|😱/i.test(title) ? 5 : 0,
      tip: "Gatilhos emocionais geram curiosidade e aumentam cliques.",
      category: "title",
    });

    // DESCRIPTION checks
    checks.push({
      label: "Descrição com 200+ palavras",
      pass: description.split(/\s+/).length >= 200,
      score: description.split(/\s+/).length >= 200 ? 10 : description.split(/\s+/).length >= 100 ? 5 : 0,
      tip: `Descrição com ${description.split(/\s+/).length} palavras. YouTube usa a descrição para entender o conteúdo.`,
      category: "description",
    });
    checks.push({
      label: "Descrição tem timestamps",
      pass: /\d{1,2}:\d{2}/.test(description),
      score: /\d{1,2}:\d{2}/.test(description) ? 8 : 0,
      tip: /\d{1,2}:\d{2}/.test(description) ? "Timestamps melhoram retenção e podem gerar capítulos." : "Adicione timestamps — geram capítulos automaticamente.",
      category: "description",
    });
    checks.push({
      label: "Descrição tem links",
      pass: /https?:\/\//.test(description),
      score: /https?:\/\//.test(description) ? 5 : 0,
      tip: "Links na descrição aumentam engajamento e monetização.",
      category: "description",
    });
    checks.push({
      label: "Descrição tem hashtags",
      pass: /#\w+/.test(description),
      score: /#\w+/.test(description) ? 5 : 0,
      tip: "Adicione 3-5 hashtags relevantes para aparecer em buscas.",
      category: "description",
    });
    checks.push({
      label: "CTA na descrição (inscreva, like, etc)",
      pass: /inscrev|subscribe|like|coment|compartilh|share|sino|bell/i.test(description),
      score: /inscrev|subscribe/i.test(description) ? 5 : 0,
      tip: "Call-to-action na descrição converte viewers passivos.",
      category: "description",
    });

    // TAGS checks
    checks.push({
      label: "Vídeo tem 5+ tags",
      pass: tags.length >= 5,
      score: tags.length >= 5 ? 8 : tags.length >= 3 ? 4 : 0,
      tip: `${tags.length} tags. O ideal é 8-15 tags relevantes.`,
      category: "tags",
    });
    checks.push({
      label: "Tags incluem keyword principal",
      pass: tags.some((t: string) => title.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(title.split(" ")[0]?.toLowerCase())),
      score: 7,
      tip: "A keyword principal do título deve estar nas tags.",
      category: "tags",
    });
    checks.push({
      label: "Mix de tags curtas e longas",
      pass: tags.some((t: string) => t.split(" ").length === 1) && tags.some((t: string) => t.split(" ").length >= 3),
      score: tags.some((t: string) => t.split(" ").length === 1) && tags.some((t: string) => t.split(" ").length >= 3) ? 5 : 0,
      tip: "Combine tags de 1 palavra (broad) com tags de 3+ palavras (long-tail).",
      category: "tags",
    });

    // ENGAGEMENT checks
    const engRate = views > 0 ? ((likes + comments) / views * 100) : 0;
    checks.push({
      label: "Taxa de engajamento > 3%",
      pass: engRate >= 3,
      score: engRate >= 5 ? 10 : engRate >= 3 ? 7 : engRate >= 1 ? 3 : 0,
      tip: `Engajamento: ${engRate.toFixed(1)}%. Média YouTube é ~3-5%.`,
      category: "engagement",
    });
    checks.push({
      label: "Ratio likes/views > 3%",
      pass: views > 0 && (likes / views * 100) >= 3,
      score: views > 0 && (likes / views * 100) >= 3 ? 7 : 0,
      tip: `Likes/Views: ${views > 0 ? (likes / views * 100).toFixed(1) : 0}%.`,
      category: "engagement",
    });

    const totalScore = checks.reduce((a, c) => a + c.score, 0);
    const maxScore = checks.length * 10; // approximate
    const normalizedScore = Math.round((totalScore / maxScore) * 100);

    // Category scores
    const categories = ["title", "description", "tags", "engagement"];
    const categoryScores = categories.map(cat => {
      const catChecks = checks.filter(c => c.category === cat);
      const catScore = catChecks.reduce((a, c) => a + c.score, 0);
      const catMax = catChecks.length * 10;
      return { category: cat, score: Math.round((catScore / catMax) * 100), passed: catChecks.filter(c => c.pass).length, total: catChecks.length };
    });

    res.json({
      videoId,
      title,
      channelTitle: video.snippet?.channelTitle || "",
      thumbnail: video.snippet?.thumbnails?.high?.url || "",
      views, likes, comments,
      overallScore: Math.min(100, normalizedScore),
      grade: normalizedScore >= 80 ? "A" : normalizedScore >= 60 ? "B" : normalizedScore >= 40 ? "C" : "D",
      verdict: normalizedScore >= 80 ? "Otimizado — continue assim!" : normalizedScore >= 60 ? "Bom — ajustes pequenos trariam mais views" : normalizedScore >= 40 ? "Precisa melhorar — várias oportunidades perdidas" : "Crítico — SEO precisa de atenção urgente",
      checks,
      categoryScores,
      tagCount: tags.length,
      descriptionWordCount: description.split(/\s+/).length,
      titleLength: title.length,
      engagementRate: Number(engRate.toFixed(2)),
    });
  } catch (err) { next(err); }
});

// Pre-publish audit (without URL — uses local data)
router.post("/seo-audit/pre-publish", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { title, description, tags, niche, thumbnailConcept } = req.body;
    const model = await getModel();

    const result = await fetchAI(aiKey, model,
      "Expert em YouTube SEO. Audite o conteúdo pré-publicação. " + LANG_RULE,
      `Audite este vídeo ANTES de publicar:
Título: "${title}"
Descrição: "${(description || "").slice(0, 300)}"
Tags: ${JSON.stringify(tags || [])}
Nicho: ${niche || "geral"}
Conceito Thumb: ${thumbnailConcept || "N/A"}

JSON: {"score":85,"grade":"A","titleAnalysis":{"score":90,"strengths":["Ponto 1"],"improvements":["Melhoria 1"],"betterVersions":["Título melhorado 1","Título 2"]},"descriptionAnalysis":{"score":70,"missing":["O que falta"],"improvements":["Sugestão"]},"tagAnalysis":{"score":80,"missing":["Tag que falta"],"unnecessary":["Tag desnecessária"],"suggested":["nova tag 1","nova tag 2"]},"thumbnailAnalysis":{"score":75,"tips":["Dica 1"]},"overallTips":["Dica geral 1","Dica 2"],"predictedCTR":"5-8%","competitiveness":"média"}`,
      2000
    );
    res.json(result);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 4. DAILY IDEAS ENGINE
// ═══════════════════════════════════════════
router.post("/daily-ideas/generate", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    const aiKey = await getAiKey();
    if (!ytKey || !aiKey) { res.status(400).json({ error: "Configure YouTube + AI API Keys" }); return; }

    // Get user's saved channels for context
    const saved = await prisma.savedChannel.findMany({ where: { userId: req.user.id }, take: 10 });
    const niches: string[] = Array.from(new Set(saved.map((s: any) => String(s.niche)).filter(Boolean)));
    const channelNames = saved.map(s => s.name).slice(0, 5);
    
    // Get trending videos
    const trending = await ytFetch("videos?part=snippet,statistics&chart=mostPopular&regionCode=BR&maxResults=10", ytKey);
    const trendingTitles = (trending.items || []).map((v: any) => v.snippet?.title).slice(0, 5);

    const model = await getModel();
    const ideas = await fetchAI(aiKey, model,
      "Expert em estratégia YouTube. Gere ideias de vídeo personalizadas baseadas no contexto do creator. " + LANG_RULE,
      `Gere 10 ideias de vídeo para HOJE baseado neste contexto:
Nichos do creator: ${niches.join(", ") || "geral"}
Canais monitorados: ${channelNames.join(", ") || "nenhum"}
Trending no Brasil hoje: ${trendingTitles.join(" | ")}

Para CADA ideia retorne JSON array:
[{"title":"Título do vídeo sugerido","potential":"high","niche":"nicho","reasoning":"Por que essa ideia funciona AGORA (2-3 frases)","tags":"tag1, tag2, tag3","thumbnailIdea":"Conceito de thumbnail","estimatedViews":"10K-50K","urgency":"alta"}]

Potenciais: very_high, high, medium, low. Urgência: alta (publicar hoje), média (esta semana), baixa (qualquer momento).
Priorize ideias que surfam tendências ATUAIS e que combinem com os nichos do creator.`,
      3000
    );

    // Save to DB
    const ideaList = Array.isArray(ideas) ? ideas : ideas?.ideas || [];
    for (const idea of ideaList.slice(0, 10)) {
      await (prisma as any).dailyIdea.create({
        data: {
          title: idea.title || "",
          potential: idea.potential || "medium",
          niche: idea.niche || "",
          reasoning: idea.reasoning || "",
          tags: idea.tags || "",
          userId: req.user.id,
        }
      });
    }

    res.json({ ideas: ideaList, generatedAt: new Date().toISOString(), niches, trendingContext: trendingTitles });
  } catch (err) { next(err); }
});

router.get("/daily-ideas", async (req: any, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const ideas = await (prisma as any).dailyIdea.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    res.json(ideas);
  } catch (err) { next(err); }
});

router.put("/daily-ideas/:id/use", async (req: any, res: Response, next: NextFunction) => {
  try {
    await (prisma as any).dailyIdea.update({ where: { id: Number(req.params.id) }, data: { used: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 5. CHANNEL COMPARATOR (Head-to-Head)
// ═══════════════════════════════════════════
router.post("/compare", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    const aiKey = await getAiKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const { channelIds } = req.body; // array of ytChannelIds
    if (!channelIds?.length || channelIds.length < 2) { res.status(400).json({ error: "Selecione pelo menos 2 canais" }); return; }

    const channels: any[] = [];
    for (const chId of channelIds.slice(0, 4)) {
      const chData = await ytFetch(`channels?part=snippet,statistics,contentDetails&id=${chId}`, ytKey);
      const ch = chData.items?.[0];
      if (!ch) continue;

      // Get recent videos
      const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
      let recentViews: number[] = [];
      if (uploads) {
        const pl = await ytFetch(`playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=10`, ytKey);
        const vids = (pl.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
        if (vids.length) {
          const vData = await ytFetch(`videos?part=statistics&id=${vids.join(",")}`, ytKey);
          recentViews = (vData.items || []).map((v: any) => Number(v.statistics?.viewCount || 0));
        }
      }

      const subs = Number(ch.statistics?.subscriberCount || 0);
      const totalViews = Number(ch.statistics?.viewCount || 0);
      const videoCount = Number(ch.statistics?.videoCount || 0);
      const avgViews = recentViews.length ? Math.round(recentViews.reduce((a, b) => a + b, 0) / recentViews.length) : 0;
      const engRate = subs > 0 ? Number(((avgViews / subs) * 100).toFixed(1)) : 0;

      channels.push({
        ytChannelId: chId,
        name: ch.snippet?.title || "",
        thumbnail: ch.snippet?.thumbnails?.default?.url || "",
        subscribers: subs,
        totalViews,
        videoCount,
        avgViews,
        engagementRate: engRate,
        viewsPerSub: subs > 0 ? Number((avgViews / subs).toFixed(2)) : 0,
        uploadsPerMonth: videoCount > 0 ? Number((videoCount / Math.max(1, 12)).toFixed(1)) : 0,
        recentViews,
      });
    }

    // Radar data (normalized 0-100)
    const maxSubs = Math.max(...channels.map(c => c.subscribers));
    const maxViews = Math.max(...channels.map(c => c.avgViews));
    const maxEng = Math.max(...channels.map(c => c.engagementRate));
    const maxFreq = Math.max(...channels.map(c => c.uploadsPerMonth));
    const maxTotal = Math.max(...channels.map(c => c.totalViews));
    const maxVids = Math.max(...channels.map(c => c.videoCount));

    const radarData = channels.map(c => ({
      name: c.name,
      subscribers: maxSubs ? Math.round((c.subscribers / maxSubs) * 100) : 0,
      avgViews: maxViews ? Math.round((c.avgViews / maxViews) * 100) : 0,
      engagement: maxEng ? Math.round((c.engagementRate / maxEng) * 100) : 0,
      frequency: maxFreq ? Math.round((c.uploadsPerMonth / maxFreq) * 100) : 0,
      totalViews: maxTotal ? Math.round((c.totalViews / maxTotal) * 100) : 0,
      catalog: maxVids ? Math.round((c.videoCount / maxVids) * 100) : 0,
    }));

    // AI insight
    let insight = "";
    if (aiKey) {
      try {
        const model = await getModel();
        const aiResult = await fetchAI(aiKey, model,
          "Analista de YouTube. Compare canais e dê insights acionáveis. " + LANG_RULE,
          `Compare estes canais e dê insights:
${channels.map(c => `- ${c.name}: ${fmt(c.subscribers)} subs, ${fmt(c.avgViews)} views/vídeo, engajamento ${c.engagementRate}%`).join("\n")}

JSON: {"winner":"Nome do canal mais forte","reason":"Por que é o mais forte (2 frases)","insights":[{"channel":"Nome","strength":"Ponto forte","weakness":"Ponto fraco","tip":"Dica específica"}],"conclusion":"Conclusão de 2-3 frases comparando todos"}`,
          1500
        );
        insight = aiResult;
      } catch {}
    }

    res.json({ channels, radarData, insight });
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 6. VIDEO VELOCITY TRACKER
// ═══════════════════════════════════════════
router.post("/velocity/check", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }

    // Get recent videos from saved channels
    const saved = await prisma.savedChannel.findMany({ where: { userId: req.user.id }, take: 10 });
    const results: any[] = [];

    for (const ch of saved) {
      try {
        const chData = await ytFetch(`channels?part=contentDetails&id=${ch.ytChannelId}`, ytKey);
        const uploads = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploads) continue;

        const pl = await ytFetch(`playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=3`, ytKey);
        const vids = (pl.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
        if (!vids.length) continue;

        const vData = await ytFetch(`videos?part=snippet,statistics&id=${vids.join(",")}`, ytKey);
        for (const v of (vData.items || [])) {
          const views = Number(v.statistics?.viewCount || 0);
          const publishedAt = new Date(v.snippet?.publishedAt || Date.now());
          const hoursAgo = Math.max(1, (Date.now() - publishedAt.getTime()) / 3600000);
          const velocity = Math.round(views / hoursAgo);

          // Check previous velocity record
          const prev = await (prisma as any).videoVelocity.findFirst({
            where: { ytVideoId: v.id },
            orderBy: { checkedAt: "desc" },
          });

          const prevVelocity = prev ? prev.velocity : 0;
          const trend = velocity > prevVelocity * 1.2 ? "accelerating" : velocity < prevVelocity * 0.8 ? "decelerating" : "stable";

          // Save snapshot
          await (prisma as any).videoVelocity.create({
            data: { ytVideoId: v.id, title: v.snippet?.title || "", channelName: ch.name, views, prevViews: prev?.views || 0, velocity }
          });

          results.push({
            videoId: v.id,
            title: v.snippet?.title || "",
            channelName: ch.name,
            thumbnail: v.snippet?.thumbnails?.medium?.url || "",
            views,
            velocity,
            prevVelocity,
            trend,
            hoursAgo: Math.round(hoursAgo),
            publishedAt: v.snippet?.publishedAt || "",
            isViral: velocity > 1000,
            isTrending: velocity > 500,
          });
        }
      } catch {}
    }

    results.sort((a, b) => b.velocity - a.velocity);
    res.json({ videos: results, checkedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

// Velocity history for a specific video
router.get("/velocity/history/:videoId", async (req: any, res: Response, next: NextFunction) => {
  try {
    const records = await (prisma as any).videoVelocity.findMany({
      where: { ytVideoId: req.params.videoId },
      orderBy: { checkedAt: "asc" },
      take: 48,
    });
    res.json(records);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 7. RETENTION HOOK ANALYZER
// ═══════════════════════════════════════════
router.post("/retention-analyze", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { scenes, title, niche, totalDuration } = req.body;
    if (!scenes?.length) { res.status(400).json({ error: "Cenas obrigatórias" }); return; }
    const model = await getModel();

    const result = await fetchAI(aiKey, model,
      "Expert em retenção de audiência YouTube. Analise cada cena do storyboard e identifique riscos de abandono. " + LANG_RULE,
      `Analise a retenção cena-por-cena deste vídeo:
Título: "${title || "Sem título"}"
Nicho: ${niche || "geral"}
Duração total: ${totalDuration || "N/A"}

Cenas:
${scenes.map((s: any, i: number) => `[Cena ${i+1}] ${s.title || "Sem título"} (${s.duration || "?"}) — ${s.notes || "sem notas"}`).join("\n")}

Para CADA cena, analise:
JSON: {"overallRetention":75,"retentionCurve":[{"scene":1,"predicted":95,"risk":"low","microHook":"Hook sugerido pra manter atenção"},{"scene":2,"predicted":70,"risk":"medium","microHook":"..."}],"dropoffPoints":[{"afterScene":3,"reason":"Por que viewers saem aqui","fix":"Como resolver"}],"hooks":{"opening":"Hook ideal pro início (primeiros 5 segundos)","reEngagement":["Re-hook pra minuto 2","Re-hook pra minuto 5"],"payoffTeaser":"Teaser do payoff pra colocar no início"},"structureTips":["Dica de estrutura 1","Dica 2"],"estimatedAvgViewDuration":"8:30","retentionVsAvg":"acima da média"}`,
      3000
    );
    res.json(result);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 8. SHORTS CLIPPER (Text-first)
// ═══════════════════════════════════════════
router.post("/shorts-clip", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { script, title, scenes, niche } = req.body;
    if (!script && !scenes?.length) { res.status(400).json({ error: "Roteiro ou cenas obrigatórios" }); return; }
    const model = await getModel();

    const content = script || scenes.map((s: any, i: number) => `[${s.title}] ${s.notes || ""}`).join("\n");

    const result = await fetchAI(aiKey, model,
      "Expert em YouTube Shorts e conteúdo viral curto. Extraia os melhores momentos de um roteiro longo. " + LANG_RULE,
      `Extraia 5 Shorts (30-60s) do roteiro deste vídeo longo:
Título original: "${title || "Sem título"}"
Nicho: ${niche || "geral"}

Conteúdo:
${content.slice(0, 2000)}

Para CADA Short retorne:
JSON: {"shorts":[{"title":"Título viral do Short","hook":"Primeiros 3 segundos (texto exato)","script":"Roteiro completo do short (30-60 segundos)","timecodeStart":"Minuto/cena de onde veio no vídeo original","timecodeEnd":"Até onde vai","whyViral":"Por que este trecho tem potencial viral","cta":"CTA final (ex: veja o vídeo completo no link)","hashtags":["#tag1","#tag2","#tag3"],"estimatedViews":"100K-500K","platform":"YouTube Shorts"}],"strategy":"Estratégia de publicação: qual postar primeiro, intervalo entre posts, melhor horário"}`,
      3500
    );
    res.json(result);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// SNAPSHOT COLLECTOR (para Analytics e Velocity)
// Chamar via cron ou endpoint manual
// ═══════════════════════════════════════════
router.post("/snapshots/collect", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    
    const saved = await prisma.savedChannel.findMany({ where: { userId: req.user.id } });
    const today = new Date().toISOString().split("T")[0];
    let collected = 0;

    for (const ch of saved) {
      // Check if already collected today
      const existing = await (prisma as any).channelSnapshot.findFirst({
        where: { savedChannelId: ch.id, date: today }
      });
      if (existing) continue;

      try {
        const chData = await ytFetch(`channels?part=statistics&id=${ch.ytChannelId}`, ytKey);
        const stats = chData.items?.[0]?.statistics;
        if (!stats) continue;

        await (prisma as any).channelSnapshot.create({
          data: {
            savedChannelId: ch.id,
            ytChannelId: ch.ytChannelId,
            channelName: ch.name,
            subscribers: Number(stats.subscriberCount || 0),
            totalViews: Number(stats.viewCount || 0),
            videoCount: Number(stats.videoCount || 0),
            date: today,
          }
        });
        collected++;
      } catch {}
    }

    res.json({ collected, total: saved.length, date: today });
  } catch (err) { next(err); }
});

router.get("/snapshots/:channelId", async (req: any, res: Response, next: NextFunction) => {
  try {
    const snapshots = await (prisma as any).channelSnapshot.findMany({
      where: { savedChannelId: Number(req.params.channelId) },
      orderBy: { date: "asc" },
      take: 90,
    });
    res.json(snapshots);
  } catch (err) { next(err); }
});


export default router;
