const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

const YT_API = "https://www.googleapis.com/youtube/v3";
const LAOZHANG_URL = "https://api.laozhang.ai/v1/chat/completions";

async function getSetting(key) {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value || "";
}

async function callAI(prompt, system) {
  const apiKey = await getSetting("laozhang_api_key");
  const model = await getSetting("ai_model") || "claude-sonnet-4-6";
  if (!apiKey) throw new Error("Configure a API Key da LaoZhang nas Configurações");
  const res = await fetch(LAOZHANG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: 0.7, max_tokens: 6000, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Channel Stats ──────────────────────────────────────────
router.get("/channel/:channelId", async (req, res, next) => {
  try {
    const key = await getSetting("youtube_api_key");
    if (!key) return res.status(400).json({ error: "Configure sua YouTube API Key nas Configurações" });
    const { channelId } = req.params;
    const url = channelId.startsWith("UC")
      ? `${YT_API}/channels?part=statistics,snippet,contentDetails&id=${channelId}&key=${key}`
      : `${YT_API}/channels?part=statistics,snippet,contentDetails&forHandle=${channelId}&key=${key}`;
    const resp = await fetch(url);
    if (!resp.ok) return res.status(resp.status).json({ error: `YouTube API: ${await resp.text()}` });
    const data = await resp.json();
    if (!data.items?.length) return res.status(404).json({ error: "Canal não encontrado" });
    const ch = data.items[0];
    res.json({
      id: ch.id, title: ch.snippet.title, description: ch.snippet.description,
      thumbnail: ch.snippet.thumbnails?.medium?.url, customUrl: ch.snippet.customUrl,
      publishedAt: ch.snippet.publishedAt,
      stats: { subscribers: Number(ch.statistics.subscriberCount), views: Number(ch.statistics.viewCount), videos: Number(ch.statistics.videoCount) },
      uploadsPlaylist: ch.contentDetails?.relatedPlaylists?.uploads,
    });
  } catch (err) { next(err); }
});

// ── Recent Videos ──────────────────────────────────────────
router.get("/videos/:channelId", async (req, res, next) => {
  try {
    const key = await getSetting("youtube_api_key");
    if (!key) return res.status(400).json({ error: "Configure sua YouTube API Key nas Configurações" });
    const max = req.query.max || 15;
    const chResp = await fetch(`${YT_API}/channels?part=contentDetails&id=${req.params.channelId}&key=${key}`);
    const chData = await chResp.json();
    const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return res.status(404).json({ error: "Playlist não encontrada" });
    const plResp = await fetch(`${YT_API}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${max}&key=${key}`);
    const plData = await plResp.json();
    const videoIds = (plData.items || []).map(i => i.contentDetails.videoId).join(",");
    if (!videoIds) return res.json([]);
    const vResp = await fetch(`${YT_API}/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${key}`);
    const vData = await vResp.json();
    res.json((vData.items || []).map(v => ({
      id: v.id, title: v.snippet.title, thumbnail: v.snippet.thumbnails?.medium?.url,
      publishedAt: v.snippet.publishedAt, duration: v.contentDetails.duration,
      stats: { views: Number(v.statistics.viewCount || 0), likes: Number(v.statistics.likeCount || 0), comments: Number(v.statistics.commentCount || 0) },
    })));
  } catch (err) { next(err); }
});

// ── Deep AI Analysis ───────────────────────────────────────
router.post("/analyze", async (req, res, next) => {
  try {
    const { channelName, stats, recentVideos, channelDescription } = req.body;

    const videoList = (recentVideos || []).map((v, i) =>
      `${i + 1}. "${v.title}" — ${v.stats?.views} views, ${v.stats?.likes} likes, ${v.stats?.comments} comentários, publicado: ${v.publishedAt?.slice(0, 10)}`
    ).join("\n");

    const avgViews = recentVideos?.length > 0 ? Math.round(recentVideos.reduce((a, v) => a + (v.stats?.views || 0), 0) / recentVideos.length) : 0;
    const avgLikes = recentVideos?.length > 0 ? Math.round(recentVideos.reduce((a, v) => a + (v.stats?.likes || 0), 0) / recentVideos.length) : 0;
    const avgComments = recentVideos?.length > 0 ? Math.round(recentVideos.reduce((a, v) => a + (v.stats?.comments || 0), 0) / recentVideos.length) : 0;
    const engagementRate = avgViews > 0 ? ((avgLikes + avgComments) / avgViews * 100).toFixed(2) : 0;

    const system = `Você é o MELHOR consultor de YouTube do mundo. Você já trabalhou com MrBeast, Veritasium, Marques Brownlee e os maiores canais do planeta. Sua análise é cirúrgica, baseada em dados, e sempre acionável.

Você entende profundamente: algoritmo do YouTube, CTR, AVD (Average View Duration), retenção, impressões, taxa de engajamento, frequency de publicação, análise competitiva, trends, e psicologia de audiência.

SEMPRE responda em português brasileiro. Seja direto, prático e EXTREMAMENTE específico. Nada genérico.
Responda APENAS JSON válido sem markdown.`;

    const prompt = `ANÁLISE PROFUNDA do canal YouTube:

=== DADOS DO CANAL ===
Nome: ${channelName}
Descrição: ${channelDescription || "N/A"}
Inscritos: ${stats?.subscribers?.toLocaleString() || "N/A"}
Views totais: ${stats?.views?.toLocaleString() || "N/A"}
Total de vídeos: ${stats?.videos || "N/A"}

=== MÉTRICAS CALCULADAS ===
Views médios por vídeo: ${avgViews.toLocaleString()}
Likes médios: ${avgLikes.toLocaleString()}
Comentários médios: ${avgComments.toLocaleString()}
Taxa de engajamento: ${engagementRate}%

=== ÚLTIMOS ${recentVideos?.length || 0} VÍDEOS ===
${videoList}

=== ANÁLISE REQUERIDA ===
Retorne EXATAMENTE este JSON:
{
  "summary": "Diagnóstico completo do canal em 3-4 frases com dados específicos",
  "growthScore": 0-100,
  "strengths": ["3-4 pontos fortes ESPECÍFICOS baseados nos dados"],
  "weaknesses": ["3-4 pontos fracos ESPECÍFICOS"],
  "improvements": ["5 ações CONCRETAS e IMEDIATAS para melhorar (com exemplos)"],
  "contentStrategy": {
    "bestPostingDay": "dia da semana específico baseado na análise",
    "bestPostingTime": "horário específico (ex: 15h-17h horário de Brasília)",
    "idealVideoLength": "duração ideal em minutos baseada no nicho (ex: 12-18 minutos)",
    "videosPerWeek": "número ideal de vídeos por semana",
    "reasoning": "explicação de por que essas recomendações"
  },
  "nextVideoIdeas": [
    {"title": "título viral completo", "whyItWorks": "por que este título vai funcionar", "estimatedViews": "estimativa de views"},
    {"title": "título 2", "whyItWorks": "razão", "estimatedViews": "X"},
    {"title": "título 3", "whyItWorks": "razão", "estimatedViews": "X"},
    {"title": "título 4", "whyItWorks": "razão", "estimatedViews": "X"},
    {"title": "título 5", "whyItWorks": "razão", "estimatedViews": "X"},
    {"title": "título 6", "whyItWorks": "razão", "estimatedViews": "X"},
    {"title": "título 7", "whyItWorks": "razão", "estimatedViews": "X"},
    {"title": "título 8", "whyItWorks": "razão", "estimatedViews": "X"}
  ],
  "engagementTips": ["4 dicas ESPECÍFICAS para aumentar engajamento neste canal"],
  "thumbnailTips": "recomendações específicas de thumbnail para este nicho",
  "competitorAnalysis": "análise do posicionamento do canal no nicho e o que os concorrentes fazem melhor",
  "monthlyGoals": {
    "subscribers": "meta realista de inscritos para próximo mês",
    "views": "meta de views",
    "videos": "meta de vídeos a publicar"
  }
}`;

    const raw = await callAI(prompt, system);
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      parsed._metrics = { avgViews, avgLikes, avgComments, engagementRate };
      res.json(parsed);
    } catch {
      res.status(500).json({ error: "IA retornou formato inválido", raw });
    }
  } catch (err) { next(err); }
});

module.exports = router;
