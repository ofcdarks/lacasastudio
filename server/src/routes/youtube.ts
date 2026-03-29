// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import cache from "../services/cache";
const router = Router();
router.use(authenticate);

const YT_API = "https://www.googleapis.com/youtube/v3";

async function getYtKey(): Promise<string> {
  const cached = cache.get<string>("yt_key");
  if (cached) return cached;
  const s = await prisma.setting.findUnique({ where: { key: "youtube_api_key" } });
  const key = s?.value || "";
  if (key) cache.set("yt_key", key, 60000);
  return key;
}

async function getAiKey(): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key: "laozhang_api_key" } });
  return s?.value || "";
}

async function getModel(): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key: "ai_model" } });
  return s?.value || "claude-sonnet-4-6";
}

router.get("/channel/:channelId", async (req: any, res: Response, next: NextFunction) => {
  try {
    const key = await getYtKey();
    if (!key) { res.status(400).json({ error: "Configure sua YouTube API Key nas Configurações" }); return; }

    const { channelId } = req.params;
    const url = channelId.startsWith("UC")
      ? `${YT_API}/channels?part=statistics,snippet,contentDetails&id=${channelId}&key=${key}`
      : `${YT_API}/channels?part=statistics,snippet,contentDetails&forHandle=${channelId}&key=${key}`;

    const resp = await fetch(url);
    if (!resp.ok) { const err = await resp.text(); res.status(resp.status).json({ error: `YouTube API: ${err}` }); return; }
    const data = await resp.json() as any;
    if (!data.items?.length) { res.status(404).json({ error: "Canal não encontrado" }); return; }

    const ch = data.items[0];
    res.json({
      id: ch.id, title: ch.snippet.title, description: ch.snippet.description,
      thumbnail: ch.snippet.thumbnails?.medium?.url, customUrl: ch.snippet.customUrl,
      publishedAt: ch.snippet.publishedAt,
      stats: { subscribers: Number(ch.statistics.subscriberCount), views: Number(ch.statistics.viewCount), videos: Number(ch.statistics.videoCount) },
      uploadsPlaylist: ch.contentDetails?.relatedPlaylists?.uploads,
    });
  } catch (err: any) { console.error("youtube error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.get("/videos/:channelId", async (req: any, res: Response, next: NextFunction) => {
  try {
    const key = await getYtKey();
    if (!key) { res.status(400).json({ error: "Configure sua YouTube API Key nas Configurações" }); return; }

    const { channelId } = req.params;
    const max = req.query.max || 10;

    const chResp = await fetch(`${YT_API}/channels?part=contentDetails&id=${channelId}&key=${key}`);
    const chData = await chResp.json() as any;
    const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) { res.status(404).json({ error: "Playlist de uploads não encontrada" }); return; }

    const plResp = await fetch(`${YT_API}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${max}&key=${key}`);
    const plData = await plResp.json() as any;
    const videoIds = (plData.items || []).map((i: any) => i.contentDetails.videoId).join(",");
    if (!videoIds) { res.json([]); return; }

    const vResp = await fetch(`${YT_API}/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${key}`);
    const vData = await vResp.json() as any;

    const videos = (vData.items || []).map((v: any) => ({
      id: v.id, title: v.snippet.title, thumbnail: v.snippet.thumbnails?.medium?.url,
      publishedAt: v.snippet.publishedAt, duration: v.contentDetails.duration,
      stats: { views: Number(v.statistics.viewCount || 0), likes: Number(v.statistics.likeCount || 0), comments: Number(v.statistics.commentCount || 0) },
    }));
    res.json(videos);
  } catch (err: any) { console.error("youtube error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/analyze", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const model = await getModel();
    const { channelName, stats, recentVideos } = req.body as any;

    const system = `Você é um consultor de YouTube especialista em crescimento de canais. Responda em JSON válido sem markdown.`;
    const prompt = `Analise este canal: ${channelName}\nInscritos: ${stats?.subscribers || "N/A"}\nViews: ${stats?.views || "N/A"}\nVídeos: ${stats?.videos || "N/A"}\n\nÚltimos vídeos:\n${(recentVideos || []).map((v: any) => `- "${v.title}" — ${v.stats?.views} views`).join("\n")}\n\nJSON: {"summary":"","strengths":["","",""],"improvements":["","",""],"nextVideoIdeas":["","","","",""],"bestPostingTime":"","engagementTips":["","",""],"growthScore":75}`;

    const resp = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], temperature: 0.7, max_tokens: 2000 }),
    });

    if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
    const data = await resp.json() as any;
    const raw = data.choices?.[0]?.message?.content || "";
    try {
      res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()));
    } catch {
      res.status(500).json({ error: "IA retornou formato inválido", raw });
    }
  } catch (err: any) { console.error("youtube error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

// Search viral videos with filters
router.post("/search-viral", async (req: any, res: Response, next: NextFunction) => {
  try {
    const key = await getYtKey();
    if (!key) { res.status(400).json({ error: "Configure sua YouTube API Key nas Configurações" }); return; }

    const { query, minDuration, minViews, publishedAfter, publishedBefore, datePreset } = req.body as any;
    if (!query) { res.status(400).json({ error: "Query obrigatória" }); return; }

    // Build publishedAfter from datePreset
    let afterDate = publishedAfter || "";
    if (!afterDate && datePreset) {
      const now = Date.now();
      const day = 86400000;
      if (datePreset === "Última semana") afterDate = new Date(now - 7 * day).toISOString();
      else if (datePreset === "Último mês") afterDate = new Date(now - 30 * day).toISOString();
      else if (datePreset === "Últimos 3 meses") afterDate = new Date(now - 90 * day).toISOString();
      else if (datePreset === "Último ano") afterDate = new Date(now - 365 * day).toISOString();
    }

    let url = `${YT_API}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=50&order=viewCount&key=${key}`;
    if (afterDate) url += `&publishedAfter=${new Date(afterDate).toISOString()}`;
    if (publishedBefore) url += `&publishedBefore=${new Date(publishedBefore).toISOString()}`;
    if (minDuration && minDuration > 240) url += `&videoDuration=long`;
    else if (minDuration && minDuration > 60) url += `&videoDuration=medium`;

    const searchResp = await fetch(url);
    if (!searchResp.ok) { const e = await searchResp.text(); res.status(searchResp.status).json({ error: `YouTube API: ${e}` }); return; }
    const searchData = await searchResp.json() as any;

    const videoIds = (searchData.items || []).map((i: any) => i.id?.videoId).filter(Boolean).join(",");
    if (!videoIds) { res.json({ videos: [] }); return; }

    const vResp = await fetch(`${YT_API}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${key}`);
    const vData = await vResp.json() as any;

    let videos = (vData.items || []).map((v: any) => {
      const dur = v.contentDetails?.duration || "PT0S";
      const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const secs = (Number(m?.[1]||0)*3600) + (Number(m?.[2]||0)*60) + Number(m?.[3]||0);
      return {
        videoId: v.id, title: v.snippet?.title, channelTitle: v.snippet?.channelTitle,
        channelId: v.snippet?.channelId,
        thumbnail: v.snippet?.thumbnails?.medium?.url || "",
        viewCount: Number(v.statistics?.viewCount || 0),
        likeCount: Number(v.statistics?.likeCount || 0),
        commentCount: Number(v.statistics?.commentCount || 0),
        publishedAt: v.snippet?.publishedAt, durationSecs: secs,
      };
    });

    // Apply client-side filters
    if (minDuration) videos = videos.filter((v: any) => v.durationSecs >= Number(minDuration));
    if (minViews) videos = videos.filter((v: any) => v.viewCount >= Number(minViews));

    videos.sort((a: any, b: any) => b.viewCount - a.viewCount);
    res.json({ videos: videos.slice(0, 50) });
  } catch (err: any) { console.error("youtube search-viral error:", err.message); res.status(500).json({ error: err.message || "Erro interno" }); }
});

export default router;

// YouTube Analytics OAuth foundation (requires Google Cloud Console setup)
// Step 1: User goes to /api/youtube/auth-url -> redirects to Google
// Step 2: Google redirects back with code -> /api/youtube/callback
// Step 3: Token saved -> can fetch real analytics

router.get("/auth-status", async (req: any, res) => {
  try {
    const s = await prisma.setting.findUnique({ where: { key: "youtube_oauth_token" } });
    res.json({ connected: !!s?.value, expiresAt: s?.value ? JSON.parse(s.value).expiry_date : null });
  } catch { res.json({ connected: false }); }
});

router.get("/auth-url", async (req: any, res) => {
  const clientId = await prisma.setting.findUnique({ where: { key: "google_client_id" } });
  const redirectUri = await prisma.setting.findUnique({ where: { key: "google_redirect_uri" } });
  if (!clientId?.value) { res.status(400).json({ error: "Configure Google Client ID nas Configurações" }); return; }
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId.value}&redirect_uri=${encodeURIComponent(redirectUri?.value || "http://localhost:3000/api/youtube/callback")}&response_type=code&scope=https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.readonly&access_type=offline&prompt=consent`;
  res.json({ url });
});

router.get("/callback", async (req: any, res) => {
  const { code } = req.query;
  if (!code) { res.status(400).send("Código não recebido"); return; }
  try {
    const clientId = await prisma.setting.findUnique({ where: { key: "google_client_id" } });
    const clientSecret = await prisma.setting.findUnique({ where: { key: "google_client_secret" } });
    const redirectUri = await prisma.setting.findUnique({ where: { key: "google_redirect_uri" } });
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `code=${code}&client_id=${clientId?.value}&client_secret=${clientSecret?.value}&redirect_uri=${encodeURIComponent(redirectUri?.value || "")}&grant_type=authorization_code`
    });
    const token = await tokenRes.json() as any;
    if (token.access_token) {
      await prisma.setting.upsert({ where: { key: "youtube_oauth_token" }, create: { key: "youtube_oauth_token", value: JSON.stringify(token) }, update: { value: JSON.stringify(token) } });
      res.redirect("/?youtube=connected");
    } else { res.status(400).json({ error: "Token inválido" }); }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
