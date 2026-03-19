const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

const YT_API = "https://www.googleapis.com/youtube/v3";

async function getYtKey() {
  const s = await prisma.setting.findUnique({ where: { key: "youtube_api_key" } });
  return s?.value || "";
}

async function getAiKey() {
  const s = await prisma.setting.findUnique({ where: { key: "laozhang_api_key" } });
  return s?.value || "";
}

async function getModel() {
  const s = await prisma.setting.findUnique({ where: { key: "ai_model" } });
  return s?.value || "claude-sonnet-4-6";
}

// Fetch channel stats by channel ID or handle
router.get("/channel/:channelId", async (req, res, next) => {
  try {
    const key = await getYtKey();
    if (!key) return res.status(400).json({ error: "Configure sua YouTube API Key nas Configurações" });

    const { channelId } = req.params;
    let url;
    if (channelId.startsWith("UC")) {
      url = `${YT_API}/channels?part=statistics,snippet,contentDetails&id=${channelId}&key=${key}`;
    } else {
      // Try as handle
      url = `${YT_API}/channels?part=statistics,snippet,contentDetails&forHandle=${channelId}&key=${key}`;
    }

    const resp = await fetch(url);
    if (!resp.ok) {
      const err = await resp.text();
      return res.status(resp.status).json({ error: `YouTube API: ${err}` });
    }
    const data = await resp.json();
    if (!data.items?.length) return res.status(404).json({ error: "Canal não encontrado" });

    const ch = data.items[0];
    res.json({
      id: ch.id,
      title: ch.snippet.title,
      description: ch.snippet.description,
      thumbnail: ch.snippet.thumbnails?.medium?.url,
      customUrl: ch.snippet.customUrl,
      publishedAt: ch.snippet.publishedAt,
      stats: {
        subscribers: Number(ch.statistics.subscriberCount),
        views: Number(ch.statistics.viewCount),
        videos: Number(ch.statistics.videoCount),
      },
      uploadsPlaylist: ch.contentDetails?.relatedPlaylists?.uploads,
    });
  } catch (err) { next(err); }
});

// Fetch recent videos from a channel
router.get("/videos/:channelId", async (req, res, next) => {
  try {
    const key = await getYtKey();
    if (!key) return res.status(400).json({ error: "Configure sua YouTube API Key nas Configurações" });

    const { channelId } = req.params;
    const max = req.query.max || 10;

    // First get uploads playlist
    const chResp = await fetch(`${YT_API}/channels?part=contentDetails&id=${channelId}&key=${key}`);
    const chData = await chResp.json();
    const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return res.status(404).json({ error: "Playlist de uploads não encontrada" });

    // Get playlist items
    const plResp = await fetch(`${YT_API}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${max}&key=${key}`);
    const plData = await plResp.json();
    const videoIds = (plData.items || []).map(i => i.contentDetails.videoId).join(",");
    if (!videoIds) return res.json([]);

    // Get video stats
    const vResp = await fetch(`${YT_API}/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${key}`);
    const vData = await vResp.json();

    const videos = (vData.items || []).map(v => ({
      id: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails?.medium?.url,
      publishedAt: v.snippet.publishedAt,
      duration: v.contentDetails.duration,
      stats: {
        views: Number(v.statistics.viewCount || 0),
        likes: Number(v.statistics.likeCount || 0),
        comments: Number(v.statistics.commentCount || 0),
      },
    }));

    res.json(videos);
  } catch (err) { next(err); }
});

// AI Analysis of channel data
router.post("/analyze", async (req, res, next) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) return res.status(400).json({ error: "Configure sua API Key da LaoZhang nas Configurações" });
    const model = await getModel();

    const { channelName, stats, recentVideos } = req.body;

    const system = `Você é um consultor de YouTube especialista em crescimento de canais. Analise os dados do canal e dê recomendações práticas e acionáveis em português brasileiro. Responda em JSON válido sem markdown.`;

    const prompt = `Analise este canal do YouTube e dê recomendações:

Canal: ${channelName}
Inscritos: ${stats?.subscribers || "N/A"}
Views totais: ${stats?.views || "N/A"}
Total de vídeos: ${stats?.videos || "N/A"}

Últimos vídeos publicados:
${(recentVideos || []).map(v => `- "${v.title}" — ${v.stats?.views} views, ${v.stats?.likes} likes, ${v.stats?.comments} comentários`).join("\n")}

Retorne EXATAMENTE este JSON:
{
  "summary": "resumo de 2-3 frases sobre a saúde do canal",
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "improvements": ["melhoria 1", "melhoria 2", "melhoria 3"],
  "nextVideoIdeas": ["ideia 1", "ideia 2", "ideia 3", "ideia 4", "ideia 5"],
  "bestPostingTime": "melhor horário/dia para postar",
  "engagementTips": ["dica 1", "dica 2", "dica 3"],
  "growthScore": 75
}`;

    const resp = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], temperature: 0.7, max_tokens: 2000 }),
    });

    if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || "";
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      res.json(JSON.parse(cleaned));
    } catch {
      res.status(500).json({ error: "IA retornou formato inválido", raw });
    }
  } catch (err) { next(err); }
});

module.exports = router;
