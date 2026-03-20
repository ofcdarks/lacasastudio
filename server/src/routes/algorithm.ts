// ============================================
// server/src/routes/algorithm.ts
// Features: OAuth, A/B Test, Command Center, 
// Satisfaction, Playlists, Community, Shorts,
// Streaks, End Screens, Hype, Devices, AI Disclosure, Catalog
// ============================================

import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
const router = Router();
router.use(authenticate);

const LANG_RULE = "REGRA DE IDIOMA: Toda resposta em Português BR. APENAS JSON válido sem markdown.";

// ── Helpers (reuse from competitive.ts pattern) ──
const cache = new Map<string, { data: any; exp: number }>();
function cached(k: string, ttl = 300000) { const c = cache.get(k); if (c && c.exp > Date.now()) return c.data; cache.delete(k); return null; }
function setCache(k: string, d: any, ttl = 300000) { cache.set(k, { data: d, exp: Date.now() + ttl }); }

async function getSetting(key: string): Promise<string> {
  const c = cached(`s:${key}`, 60000); if (c) return c;
  const s = await prisma.setting.findUnique({ where: { key } });
  const v = s?.value || ""; setCache(`s:${key}`, v, 60000); return v;
}
const getYtKey = () => getSetting("youtube_api_key");
const getAiKey = () => getSetting("laozhang_api_key");
const getModel = async () => (await getSetting("ai_model")) || "claude-sonnet-4-6";

async function ytFetch(path: string, ytKey: string) {
  const ck = "yta:" + path; const c = cached(ck); if (c) return c;
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}${sep}key=${ytKey}`);
  if (!res.ok) throw new Error(`YouTube API: ${res.status}`);
  const d = await res.json() as any; setCache(ck, d); return d;
}

async function fetchAI(system: string, user: string, maxTokens = 2500): Promise<any> {
  const aiKey = await getAiKey(); const model = await getModel();
  if (!aiKey) throw new Error("Configure API Key");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.5, max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, { role: "user", content: user }] })
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data = await res.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "{}").trim();
    return JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch (e: any) { clearTimeout(timeout); throw e; }
}

const fmt = (n: number) => { if (n >= 1e6) return (n/1e6).toFixed(1)+"M"; if (n >= 1e3) return (n/1e3).toFixed(1)+"K"; return String(n); };


// ═══════════════════════════════════════════
// 1. YOUTUBE OAUTH
// ═══════════════════════════════════════════
const OAUTH_CLIENT_ID = process.env.YT_OAUTH_CLIENT_ID || "";
const OAUTH_CLIENT_SECRET = process.env.YT_OAUTH_CLIENT_SECRET || "";
const OAUTH_REDIRECT = process.env.YT_OAUTH_REDIRECT || "http://localhost:3000/api/algorithm/oauth/callback";

router.get("/oauth/url", async (req: any, res: Response) => {
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
  ].join(" ");
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${req.user.id}`;
  res.json({ url });
});

router.get("/oauth/callback", async (req: any, res: Response) => {
  try {
    const { code, state } = req.query;
    const userId = Number(state);
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: String(code), client_id: OAUTH_CLIENT_ID, client_secret: OAUTH_CLIENT_SECRET, redirect_uri: OAUTH_REDIRECT, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json() as any;
    if (tokens.error) { res.redirect("/?oauth=error"); return; }

    // Get channel info
    const chRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const chData = await chRes.json() as any;
    const ch = chData.items?.[0];

    await (prisma as any).oAuthToken.upsert({
      where: { userId },
      create: { userId, accessToken: tokens.access_token, refreshToken: tokens.refresh_token || "", expiresAt: String(Date.now() + (tokens.expires_in || 3600) * 1000), scope: tokens.scope || "", channelId: ch?.id || "", channelName: ch?.snippet?.title || "" },
      update: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token || undefined, expiresAt: String(Date.now() + (tokens.expires_in || 3600) * 1000), channelId: ch?.id || "", channelName: ch?.snippet?.title || "" },
    });
    res.redirect("/?oauth=success");
  } catch { res.redirect("/?oauth=error"); }
});

router.get("/oauth/status", async (req: any, res: Response) => {
  const token = await (prisma as any).oAuthToken.findUnique({ where: { userId: req.user.id } });
  res.json({ connected: !!token, channelName: token?.channelName || "", channelId: token?.channelId || "" });
});

async function getAccessToken(userId: number): Promise<string | null> {
  const token = await (prisma as any).oAuthToken.findUnique({ where: { userId } });
  if (!token) return null;
  if (Date.now() > Number(token.expiresAt) - 60000) {
    // Refresh
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ refresh_token: token.refreshToken, client_id: OAUTH_CLIENT_ID, client_secret: OAUTH_CLIENT_SECRET, grant_type: "refresh_token" }),
      });
      const data = await res.json() as any;
      if (data.access_token) {
        await (prisma as any).oAuthToken.update({ where: { userId }, data: { accessToken: data.access_token, expiresAt: String(Date.now() + (data.expires_in || 3600) * 1000) } });
        return data.access_token;
      }
    } catch {}
    return null;
  }
  return token.accessToken;
}

async function ytAnalytics(accessToken: string, params: string) {
  const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`YT Analytics: ${res.status}`);
  return await res.json() as any;
}


// ═══════════════════════════════════════════
// 2. REAL CHANNEL ANALYTICS (requires OAuth)
// ═══════════════════════════════════════════
router.get("/my-channel/overview", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.user.id);
    if (!at) { res.status(401).json({ error: "Conecte sua conta YouTube nas Configurações" }); return; }
    const days = Number(req.query.days) || 28;
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

    const data = await ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost,annotationClickThroughRate&dimensions=day&sort=day`);

    const rows = data.rows || [];
    const totals = rows.reduce((a: any, r: any) => ({
      views: a.views + r[1], watchTime: a.watchTime + r[2], avgDuration: r[3], avgPct: r[4],
      likes: a.likes + r[5], dislikes: a.dislikes + r[6], comments: a.comments + r[7],
      shares: a.shares + r[8], subsGained: a.subsGained + r[9], subsLost: a.subsLost + r[10],
    }), { views: 0, watchTime: 0, avgDuration: 0, avgPct: 0, likes: 0, dislikes: 0, comments: 0, shares: 0, subsGained: 0, subsLost: 0 });

    totals.avgDuration = rows.length ? rows.reduce((a: number, r: any) => a + r[3], 0) / rows.length : 0;
    totals.avgPct = rows.length ? rows.reduce((a: number, r: any) => a + r[4], 0) / rows.length : 0;
    totals.satisfaction = totals.likes + totals.dislikes > 0 ? Math.round((totals.likes / (totals.likes + totals.dislikes)) * 100) : 0;
    totals.netSubs = totals.subsGained - totals.subsLost;

    const daily = rows.map((r: any) => ({ date: r[0], views: r[1], watchTime: r[2], avgDuration: Math.round(r[3]), likes: r[5], comments: r[7], subsGained: r[9] }));

    res.json({ totals, daily, period: { start, end, days } });
  } catch (err) { next(err); }
});

router.get("/my-channel/videos", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.user.id);
    if (!at) { res.status(401).json({ error: "Conecte sua conta YouTube" }); return; }
    const days = Number(req.query.days) || 28;
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

    const data = await ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,annotationClickThroughRate&dimensions=video&sort=-views&maxResults=50`);

    const videos = (data.rows || []).map((r: any) => ({
      videoId: r[0], views: r[1], watchTimeMin: Math.round(r[2]), avgDuration: Math.round(r[3]),
      avgPct: Math.round(r[4]), likes: r[5], comments: r[6], shares: r[7], subsGained: r[8], ctr: r[9],
      satisfaction: r[5] > 0 ? Math.round((r[5] / (r[5] + 1)) * 100) : 0,
    }));

    // Enrich with titles
    const ytKey = await getYtKey();
    if (ytKey && videos.length) {
      const ids = videos.slice(0, 50).map((v: any) => v.videoId).join(",");
      const vData = await ytFetch(`videos?part=snippet,contentDetails&id=${ids}`, ytKey);
      const titleMap = new Map((vData.items || []).map((v: any) => [v.id, { title: v.snippet?.title, thumbnail: v.snippet?.thumbnails?.medium?.url, publishedAt: v.snippet?.publishedAt, duration: v.contentDetails?.duration }]));
      videos.forEach((v: any) => { const info = titleMap.get(v.videoId); if (info) Object.assign(v, info); });
    }

    res.json({ videos });
  } catch (err) { next(err); }
});

// Traffic sources & devices for a specific video
router.get("/my-channel/video/:videoId/details", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.user.id);
    if (!at) { res.status(401).json({ error: "Conecte sua conta YouTube" }); return; }
    const { videoId } = req.params;
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];

    const [traffic, devices, countries] = await Promise.all([
      ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views&dimensions=insightTrafficSourceType&filters=video==${videoId}&sort=-views`),
      ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views,estimatedMinutesWatched&dimensions=deviceType&filters=video==${videoId}&sort=-views`),
      ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views&dimensions=country&filters=video==${videoId}&sort=-views&maxResults=10`),
    ]);

    res.json({
      trafficSources: (traffic.rows || []).map((r: any) => ({ source: r[0], views: r[1] })),
      devices: (devices.rows || []).map((r: any) => ({ device: r[0], views: r[1], watchTime: Math.round(r[2]) })),
      countries: (countries.rows || []).map((r: any) => ({ country: r[0], views: r[1] })),
    });
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 3. THUMBNAIL/TITLE A/B TESTING
// ═══════════════════════════════════════════
router.post("/ab-test/create", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.user.id);
    if (!at) { res.status(401).json({ error: "Conecte sua conta YouTube" }); return; }
    const { videoId, type, variants, rotationHrs } = req.body;
    if (!videoId || !variants?.length) { res.status(400).json({ error: "videoId e variants obrigatórios" }); return; }

    const test = await (prisma as any).aBTest.create({
      data: { videoId, type: type || "thumbnail", variants: JSON.stringify(variants.map((v: any, i: number) => ({ ...v, id: i, impressions: 0, clicks: 0, ctr: 0, watchTime: 0 }))), rotationHrs: rotationHrs || 1, userId: req.user.id }
    });
    res.json(test);
  } catch (err) { next(err); }
});

router.get("/ab-test/list", async (req: any, res: Response, next: NextFunction) => {
  try {
    const tests = await (prisma as any).aBTest.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 20 });
    res.json(tests.map((t: any) => ({ ...t, variants: JSON.parse(t.variants || "[]") })));
  } catch (err) { next(err); }
});

router.post("/ab-test/:id/rotate", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.user.id);
    if (!at) { res.status(401).json({ error: "Conecte YouTube" }); return; }
    const test = await (prisma as any).aBTest.findUnique({ where: { id: Number(req.params.id) } });
    if (!test || test.status !== "running") { res.status(404).json({ error: "Test not found or not running" }); return; }

    const variants = JSON.parse(test.variants);
    const { nextVariantId } = req.body;
    const variant = variants.find((v: any) => v.id === nextVariantId);
    if (!variant) { res.status(400).json({ error: "Variant not found" }); return; }

    // Update video via YouTube API
    if (test.type === "thumbnail" && variant.thumbnailUrl) {
      // Note: YouTube API requires resumable upload for thumbnails
      // For titles/descriptions, use videos.update
      res.json({ rotated: true, variant: variant.label, note: "Thumbnail rotation requires YouTube API thumbnail upload" });
    } else if (test.type === "title" && variant.value) {
      const updateRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${at}` },
        body: JSON.stringify({ id: test.videoId, snippet: { title: variant.value, categoryId: "22" } })
      });
      if (!updateRes.ok) throw new Error("Failed to update title");
      res.json({ rotated: true, variant: variant.label });
    } else {
      res.json({ rotated: false, note: "Unsupported variant type" });
    }
  } catch (err) { next(err); }
});

router.post("/ab-test/:id/complete", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { winnerId } = req.body;
    await (prisma as any).aBTest.update({ where: { id: Number(req.params.id) }, data: { status: "completed", winnerId, endedAt: new Date().toISOString() } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 4. POST-PUBLISH COMMAND CENTER (48h)
// ═══════════════════════════════════════════
router.post("/command-center", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.user.id);
    if (!at) { res.status(401).json({ error: "Conecte YouTube" }); return; }
    const { videoId } = req.body;
    if (!videoId) { res.status(400).json({ error: "videoId obrigatório" }); return; }

    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];

    // Get hourly data for this video
    const [hourly, overall] = await Promise.all([
      ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views,estimatedMinutesWatched,likes,comments,subscribersGained&dimensions=day&filters=video==${videoId}&sort=day`),
      ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost&filters=video==${videoId}`),
    ]);

    const totals = overall.rows?.[0] || [];
    const views = totals[0] || 0;
    const likes = totals[4] || 0;
    const dislikes = totals[5] || 0;

    // Determine algorithm layer
    let layer = "testing";
    if (views > 100000) layer = "viral";
    else if (views > 10000) layer = "adjacent";
    else if (views > 1000) layer = "topic";
    else if (views > 100) layer = "recent";
    else if (views > 10) layer = "core";

    // Save performance snapshot
    await (prisma as any).videoPerformance.create({
      data: {
        ytVideoId: videoId, views, likes, dislikes, comments: totals[6] || 0, shares: totals[7] || 0,
        subsGained: totals[8] || 0, subsLost: totals[9] || 0, avgViewDuration: totals[2] || 0,
        avgViewPct: totals[3] || 0, watchTimeMin: totals[1] || 0,
        satisfaction: likes + dislikes > 0 ? Math.round((likes / (likes + dislikes)) * 100) : 0,
        layer, userId: req.user.id,
      }
    });

    // Get channel averages for comparison
    const chAvg = await ytAnalytics(at, `ids=channel==MINE&startDate=${new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]}&endDate=${end}&metrics=views,averageViewDuration,averageViewPercentage&dimensions=video&sort=-views&maxResults=20`);
    const avgViews = chAvg.rows?.length ? Math.round(chAvg.rows.reduce((a: number, r: any) => a + r[1], 0) / chAvg.rows.length) : 0;
    const avgDuration = chAvg.rows?.length ? Math.round(chAvg.rows.reduce((a: number, r: any) => a + r[2], 0) / chAvg.rows.length) : 0;

    res.json({
      video: { id: videoId, views, watchTime: Math.round(totals[1] || 0), avgDuration: Math.round(totals[2] || 0), avgPct: Math.round(totals[3] || 0), likes, dislikes, comments: totals[6] || 0, shares: totals[7] || 0, subsGained: totals[8] || 0, subsLost: totals[9] || 0, satisfaction: likes + dislikes > 0 ? Math.round((likes / (likes + dislikes)) * 100) : 0 },
      layer,
      layerLabel: { testing: "Testando", core: "Audiência Core", recent: "Viewers Recentes", topic: "Match de Tópico", adjacent: "Audiência Adjacente", viral: "Viral" }[layer],
      vsChannel: { avgViews, avgDuration, viewsVsAvg: avgViews > 0 ? Math.round((views / avgViews) * 100) : 0, durationVsAvg: avgDuration > 0 ? Math.round(((totals[2] || 0) / avgDuration) * 100) : 0 },
      daily: (hourly.rows || []).map((r: any) => ({ date: r[0], views: r[1], watchTime: Math.round(r[2]), likes: r[3], comments: r[4], subs: r[5] })),
    });
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 5. SATISFACTION SCORE
// ═══════════════════════════════════════════
router.get("/satisfaction", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.user.id);
    if (!at) { res.status(401).json({ error: "Conecte YouTube" }); return; }
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

    const data = await ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=likes,dislikes,comments,shares,subscribersGained&dimensions=day&sort=day`);

    const daily = (data.rows || []).map((r: any) => {
      const likes = r[1]; const dislikes = r[2];
      return { date: r[0], likes, dislikes, comments: r[3], shares: r[4], subs: r[5], satisfaction: likes + dislikes > 0 ? Math.round((likes / (likes + dislikes)) * 100) : 100 };
    });

    const totalLikes = daily.reduce((a: number, d: any) => a + d.likes, 0);
    const totalDislikes = daily.reduce((a: number, d: any) => a + d.dislikes, 0);

    res.json({
      overall: totalLikes + totalDislikes > 0 ? Math.round((totalLikes / (totalLikes + totalDislikes)) * 100) : 100,
      trend: daily.length >= 14 ? (daily.slice(-7).reduce((a: number, d: any) => a + d.satisfaction, 0) / 7 > daily.slice(-14, -7).reduce((a: number, d: any) => a + d.satisfaction, 0) / 7 ? "up" : "down") : "stable",
      daily,
    });
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 6. PLAYLIST OPTIMIZER
// ═══════════════════════════════════════════
router.post("/playlist-optimize", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { videos, niche } = req.body;
    if (!videos?.length) { res.status(400).json({ error: "Videos obrigatórios" }); return; }

    const result = await fetchAI(
      "Expert em session duration e playlists YouTube. " + LANG_RULE,
      `Otimize a ordem desta playlist para MÁXIMA session duration:
Videos: ${JSON.stringify(videos.map((v: any) => ({ title: v.title, views: v.views, avgDuration: v.avgDuration })))}
Nicho: ${niche || "geral"}

JSON: {"optimizedOrder":[{"videoId":"id","title":"título","reason":"por que nesta posição"}],"strategy":"Estratégia geral de 2-3 frases","estimatedSessionMin":25,"tips":["Dica 1","Dica 2"],"endScreenSuggestions":[{"fromVideo":"título","toVideo":"título","reason":"por que linkar estes"}]}`,
      2000
    );
    res.json(result);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 7. COMMUNITY POST PLANNER
// ═══════════════════════════════════════════
router.post("/community/generate", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { videoTitle, niche, type } = req.body;
    const result = await fetchAI(
      "Expert em community posts YouTube que aumentam engagement. " + LANG_RULE,
      `Gere 5 community posts para este canal YouTube:
Próximo vídeo: "${videoTitle || "N/A"}"
Nicho: ${niche || "geral"}
Tipos preferidos: ${type || "mix"}

JSON: {"posts":[{"type":"poll|text|teaser|behind","content":"Texto do post","options":["Opção 1","Opção 2"],"timing":"2 dias antes do vídeo","why":"Por que funciona"}],"schedule":"Estratégia de quando postar cada um","commentTemplates":[{"type":"elogio","template":"Resposta template"},{"type":"pergunta","template":"..."},{"type":"critica","template":"..."}]}`,
      2000
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.post("/community/save", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { type, content, options, scheduledAt, videoId, channelId } = req.body;
    const post = await (prisma as any).communityPost.create({
      data: { type, content, options: JSON.stringify(options || []), scheduledAt: scheduledAt || "", videoId, channelId, userId: req.user.id }
    });
    res.json(post);
  } catch (err) { next(err); }
});

router.get("/community/list", async (req: any, res: Response, next: NextFunction) => {
  try {
    const posts = await (prisma as any).communityPost.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 30 });
    res.json(posts.map((p: any) => ({ ...p, options: JSON.parse(p.options || "[]") })));
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 8. SHORTS OPTIMIZATION SUITE
// ═══════════════════════════════════════════
router.post("/shorts-optimize", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { title, script, niche, duration } = req.body;
    const result = await fetchAI(
      "Expert em YouTube Shorts com foco no algoritmo 2026 (200B views/dia, SEO-filtro, viewed-vs-swiped). " + LANG_RULE,
      `Otimize este Short para o algoritmo de Shorts 2026:
Título: "${title || ""}"
Roteiro: "${(script || "").slice(0, 500)}"
Nicho: ${niche || "geral"}
Duração: ${duration || "30s"}

JSON: {"optimizedTitle":"Título otimizado para Shorts Search","seoKeywords":["keyword1","keyword2"],"hookAnalysis":{"score":85,"firstSecond":"Análise do primeiro segundo","improvement":"Como melhorar o hook"},"loopScore":80,"loopTip":"Como criar loop perfeito","optimalDuration":"15-20s","viewedVsSwipedPrediction":75,"swipeRisk":"Momento de maior risco de swipe","retentionTips":["Tip 1","Tip 2"],"hashtags":["#tag1","#tag2"],"thumbnailTip":"Dica de thumbnail para Shorts Search","postingStrategy":"Quando postar (Shorts tem timing diferente)"}`,
      2000
    );
    res.json(result);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 9. UPLOAD STREAK TRACKER
// ═══════════════════════════════════════════
router.post("/streak/log", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { date, videoTitle, type, channelId } = req.body;
    const d = date || new Date().toISOString().split("T")[0];
    await (prisma as any).uploadStreak.create({ data: { userId: req.user.id, channelId, date: d, videoTitle: videoTitle || "", type: type || "long" } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get("/streak/data", async (req: any, res: Response, next: NextFunction) => {
  try {
    const entries = await (prisma as any).uploadStreak.findMany({
      where: { userId: req.user.id }, orderBy: { date: "desc" }, take: 365,
    });
    const dates = entries.map((e: any) => e.date as string);
    const uniqueDates: string[] = [...new Set(dates)].sort();

    // Calculate streaks
    let currentStreak = 0; let longestStreak = 0; let tempStreak = 0;
    const today = new Date().toISOString().split("T")[0];
    const dateSet = new Set(uniqueDates);

    // Current streak (counting back from today)
    let checkDate = new Date();
    while (dateSet.has(checkDate.toISOString().split("T")[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 7); // Weekly streak
    }

    // Longest streak
    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) { tempStreak = 1; continue; }
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
      if (diffDays <= 7) tempStreak++;
      else tempStreak = 1;
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    const thisWeek = entries.filter((e: any) => { const d = new Date(e.date); const now = new Date(); return (now.getTime() - d.getTime()) < 7 * 86400000; }).length;
    const thisMonth = entries.filter((e: any) => { const d = new Date(e.date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;

    // Heatmap data (last 52 weeks)
    const heatmap: Record<string, number> = {};
    entries.forEach((e: any) => { heatmap[e.date] = (heatmap[e.date] || 0) + 1; });

    res.json({
      currentStreak, longestStreak, thisWeek, thisMonth,
      totalUploads: entries.length,
      consistencyScore: Math.min(100, Math.round((thisMonth / 12) * 100)), // Assuming 3x/week target
      heatmap, entries: entries.slice(0, 50),
    });
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 10. END SCREEN OPTIMIZER
// ═══════════════════════════════════════════
router.post("/end-screen/suggest", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { currentVideo, channelVideos, niche } = req.body;
    const result = await fetchAI(
      "Expert em end screens e session duration YouTube. " + LANG_RULE,
      `Sugira os melhores vídeos para end screen:
Vídeo atual: "${currentVideo || ""}"
Outros vídeos do canal: ${JSON.stringify((channelVideos || []).slice(0, 15).map((v: any) => v.title))}
Nicho: ${niche || "geral"}

JSON: {"bestNext":{"title":"Título do melhor próximo vídeo","reason":"Por que este funciona como next"},"bestPlaylist":{"title":"Nome da playlist","reason":"..."},"endScreenTemplate":"subscribe+video+playlist","timing":"Mostrar nos últimos 20 segundos","tips":["Dica 1","Dica 2"],"ctaScript":"O que falar no vídeo pra direcionar pro end screen"}`,
      1500
    );
    res.json(result);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 11. HYPE STRATEGY (500-500K subs)
// ═══════════════════════════════════════════
router.post("/hype-strategy", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { videoTitle, subscribers, niche } = req.body;
    const result = await fetchAI(
      "Expert na feature Hype do YouTube 2026. " + LANG_RULE,
      `Crie estratégia de Hype para este vídeo:
Título: "${videoTitle || ""}"
Inscritos: ${subscribers || "?"}
Nicho: ${niche || "geral"}

A feature Hype do YouTube permite que fãs "hypem" vídeos nos primeiros 7 dias, dando boost no Explore. Funciona para canais de 500-500K subs.

JSON: {"eligible":true,"strategy":"Estratégia completa para maximizar Hypes","ctaScript":"Texto exato pra pedir Hype no vídeo","communityPost":"Post pra community tab pedindo Hype","pinnedComment":"Comentário fixado pedindo Hype","socialPosts":["Post Twitter","Post Instagram"],"timeline":[{"day":"Dia 1","action":"O que fazer"},{"day":"Dia 3","action":"..."},{"day":"Dia 7","action":"..."}],"estimatedBoost":"2-5x nas impressões"}`,
      2000
    );
    res.json(result);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 12. AI DISCLOSURE CHECKER
// ═══════════════════════════════════════════
router.post("/ai-disclosure/check", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { title, description, isAiVoice, isAiVideo, isAiScript } = req.body;
    const checks = [];
    let score = 100;

    if (isAiVoice && !/(ai|artificial|generated|sintetizada|sintética)/i.test(description || "")) {
      checks.push({ pass: false, label: "Disclosure de voz IA na descrição", fix: "Adicione: 'Este vídeo utiliza narração gerada por IA'" });
      score -= 25;
    }
    if (isAiVideo && !/(ai|artificial|generated|gerado por ia)/i.test(description || "")) {
      checks.push({ pass: false, label: "Disclosure de vídeo IA", fix: "Marque como 'altered content' no YouTube Studio" });
      score -= 25;
    }
    if (isAiScript) {
      checks.push({ pass: true, label: "Script IA", fix: "Scripts IA não precisam disclosure obrigatório" });
    }
    if (!/(#ai|#ia|inteligência artificial)/i.test(description || "")) {
      checks.push({ pass: false, label: "Tag/hashtag AI", fix: "Adicione #AI ou #IA nas hashtags" });
      score -= 10;
    }

    const hasYTLabel = /(altered|synthetic|ai generated)/i.test(description || "");
    checks.push({ pass: hasYTLabel, label: "Label YouTube Studio", fix: hasYTLabel ? "OK" : "No YouTube Studio, marque 'Altered or synthetic content' antes de publicar" });
    if (!hasYTLabel) score -= 20;

    res.json({ score: Math.max(0, score), compliant: score >= 80, checks, recommendation: score >= 80 ? "Compliance OK — pode publicar" : "Corrija os itens antes de publicar para evitar supressão algorítmica" });
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 13. CATALOG RE-OPTIMIZATION
// ═══════════════════════════════════════════
router.post("/catalog/scan", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const at = await getAccessToken(req.user.id);
    const oauthToken = await (prisma as any).oAuthToken.findUnique({ where: { userId: req.user.id } });
    const channelId = oauthToken?.channelId;
    if (!channelId) { res.status(400).json({ error: "Conecte YouTube primeiro" }); return; }

    // Get channel's uploads playlist
    const chData = await ytFetch(`channels?part=contentDetails&id=${channelId}`, ytKey);
    const uploads = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) { res.status(400).json({ error: "Canal não encontrado" }); return; }

    // Get last 50 videos
    const pl = await ytFetch(`playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=50`, ytKey);
    const videoIds = (pl.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
    if (!videoIds.length) { res.json({ videos: [] }); return; }

    const vData = await ytFetch(`videos?part=snippet,statistics&id=${videoIds.join(",")}`, ytKey);
    const results = [];

    for (const v of (vData.items || [])) {
      const title = v.snippet?.title || "";
      const desc = v.snippet?.description || "";
      const tags = v.snippet?.tags || [];
      const views = Number(v.statistics?.viewCount || 0);
      const issues = [];

      if (title.length < 30) issues.push("Título muito curto (<30 chars)");
      if (title.length > 70) issues.push("Título muito longo (>70 chars)");
      if (desc.split(/\s+/).length < 50) issues.push("Descrição muito curta (<50 palavras)");
      if (tags.length < 3) issues.push("Poucas tags (<3)");
      if (!/\d{1,2}:\d{2}/.test(desc)) issues.push("Sem timestamps");
      if (!/#\w+/.test(desc)) issues.push("Sem hashtags");
      if (!/https?:\/\//.test(desc)) issues.push("Sem links");

      const seoScore = Math.max(0, 100 - issues.length * 15);

      if (issues.length > 0) {
        results.push({
          videoId: v.id, title, views, tagCount: tags.length, descWordCount: desc.split(/\s+/).length,
          seoScore, issues, thumbnail: v.snippet?.thumbnails?.medium?.url,
        });

        await (prisma as any).catalogAudit.upsert({
          where: { id: 0 }, // Dummy — will create
          create: { ytVideoId: v.id, title, seoScore, issues: JSON.stringify(issues), userId: req.user.id },
          update: {},
        }).catch(() => {
          (prisma as any).catalogAudit.create({ data: { ytVideoId: v.id, title, seoScore, issues: JSON.stringify(issues), userId: req.user.id } });
        });
      }
    }

    results.sort((a, b) => a.seoScore - b.seoScore);
    res.json({ totalScanned: vData.items?.length || 0, needsWork: results.length, videos: results });
  } catch (err) { next(err); }
});

router.post("/catalog/fix", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { videoId, issues } = req.body;
    const result = await fetchAI(
      "Expert em YouTube SEO. Corrija os problemas deste vídeo. " + LANG_RULE,
      `Corrija estes problemas de SEO do vídeo "${videoId}":
Problemas: ${JSON.stringify(issues)}

JSON: {"newTitle":"Título otimizado","newDescription":"Descrição otimizada com timestamps, hashtags, links e CTAs","newTags":["tag1","tag2","tag3"],"changes":["O que mudou e por quê"]}`,
      2000
    );
    res.json(result);
  } catch (err) { next(err); }
});


// ═══════════════════════════════════════════
// 14. DEVICE PATTERN ANALYZER  
// ═══════════════════════════════════════════
router.get("/devices", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.user.id);
    if (!at) { res.status(401).json({ error: "Conecte YouTube" }); return; }
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];

    const data = await ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views,estimatedMinutesWatched,averageViewDuration&dimensions=deviceType&sort=-views`);

    const devices = (data.rows || []).map((r: any) => ({
      device: r[0], views: r[1], watchTimeMin: Math.round(r[2]), avgDuration: Math.round(r[3]),
      pct: 0,
    }));
    const totalViews = devices.reduce((a: any, d: any) => a + d.views, 0);
    devices.forEach((d: any) => d.pct = totalViews > 0 ? Math.round((d.views / totalViews) * 100) : 0);

    // Recommendations based on device split
    const recs = [];
    const mobileShare = devices.find((d: any) => d.device === "MOBILE")?.pct || 0;
    const tvShare = devices.find((d: any) => d.device === "TV")?.pct || 0;
    if (mobileShare > 60) recs.push("Audiência majoritariamente mobile — priorize Shorts e vídeos de 8-12 min");
    if (tvShare > 30) recs.push("Audiência TV significativa — vídeos longos (20-40 min) performam melhor em TVs");
    if (mobileShare > 40 && tvShare > 20) recs.push("Mix mobile+TV — crie versão curta (mobile) e longa (TV) do mesmo conteúdo");

    res.json({ devices, recommendations: recs });
  } catch (err) { next(err); }
});


export default router;
