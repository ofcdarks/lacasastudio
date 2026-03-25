// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
const router = Router();
router.use(authenticate);

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: any; exp: number }>();
function cached(key: string, ttl = 300000): any | null {
  const c = cache.get(key);
  if (c && c.exp > Date.now()) return c.data;
  cache.delete(key);
  return null;
}
function setCache(key: string, data: any, ttl = 300000) {
  cache.set(key, { data, exp: Date.now() + ttl });
  // Cleanup old entries
  if (cache.size > 200) { const now = Date.now(); for (const [k, v] of cache) { if (v.exp < now) cache.delete(k); } }
}
const LANG_RULE = "REGRA DE IDIOMA: Toda explicação, análise, dica, feedback, insight, estratégia e comentário deve ser SEMPRE em Português do Brasil (PT-BR), independente do idioma do canal. O conteúdo do canal (títulos, descrições, tags, roteiros, hooks) deve ser no idioma escolhido pelo usuário. APENAS JSON válido sem markdown.";

// AI fetch with 60s timeout
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
    if (e.name === "AbortError") throw new Error("Timeout — IA demorou demais. Tente novamente.");
    if (e instanceof SyntaxError) throw new Error("IA retornou formato inválido. Tente novamente.");
    throw e;
  }
}

async function getYtKey(): Promise<string> {
  const c = cached("ytkey", 60000); if (c) return c;
  const s = await prisma.setting.findUnique({ where: { key: "youtube_api_key" } });
  const v = s?.value || ""; setCache("ytkey", v, 60000); return v;
}

async function getAiKey(): Promise<string> {
  const c = cached("aikey", 60000); if (c) return c;
  const s = await prisma.setting.findUnique({ where: { key: "laozhang_api_key" } });
  const v = s?.value || ""; setCache("aikey", v, 60000); return v;
}

async function getModel(): Promise<string> {
  const c = cached("model", 60000); if (c) return c;
  const s = await prisma.setting.findUnique({ where: { key: "ai_model" } });
  const v = s?.value || "claude-sonnet-4-6"; setCache("model", v, 60000); return v;
}

async function ytFetch(path: string, ytKey: string) {
  const ck = "yt:" + path;
  const c = cached(ck);
  if (c) return c;
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}${sep}key=${ytKey}`);
  if (!res.ok) throw new Error(`YouTube API: ${res.status}`);
  const data = await res.json() as any;
  setCache(ck, data);
  return data;
}

function calcScore(subs: number, views: number, vids: number): number {
  if (!vids) return 0;
  const avgViews = views / vids;
  const viewsPerSub = subs > 0 ? avgViews / subs : 0;
  let s = 0;
  if (avgViews > 1000000) s += 30; else if (avgViews > 100000) s += 25; else if (avgViews > 10000) s += 18; else if (avgViews > 1000) s += 10; else s += 5;
  if (viewsPerSub > 5) s += 25; else if (viewsPerSub > 2) s += 20; else if (viewsPerSub > 1) s += 15; else if (viewsPerSub > 0.5) s += 10; else s += 5;
  if (subs > 1000000) s += 15; else if (subs > 100000) s += 20; else if (subs > 10000) s += 25; else if (subs > 1000) s += 20; else s += 15;
  if (vids > 100) s += 10; else if (vids > 30) s += 15; else s += 10;
  return Math.min(100, Math.max(0, s));
}

function getTier(score: number): string {
  if (score >= 85) return "OURO";
  if (score >= 70) return "PRATA";
  if (score >= 50) return "PROMISSOR";
  return "INICIANTE";
}

// Search channels by niche/keyword
router.post("/search", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure a YouTube API Key" }); return; }
    const { query, maxResults } = req.body as { query: string; maxResults?: number };
    if (!query?.trim()) { res.status(400).json({ error: "Busca vazia" }); return; }

    // Strategy: search VIDEOS first (finds channels making viral content), then channel search as backup
    const vidSearch = await ytFetch(`search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=25&order=viewCount&publishedAfter=${new Date(Date.now() - 365*86400000).toISOString()}`, ytKey);
    const vidChannelIds = [...new Set((vidSearch.items || []).map((i: any) => i.snippet?.channelId).filter(Boolean))] as string[];
    
    // Also do channel search
    const chSearch = await ytFetch(`search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=10&order=relevance`, ytKey);
    const chIds = (chSearch.items || []).map((i: any) => i.snippet?.channelId || i.id?.channelId).filter(Boolean);
    
    const allIds = [...new Set([...vidChannelIds, ...chIds])].slice(0, 20);
    if (!allIds.length) { res.json({ channels: [], totalFound: 0, filtered: 0 }); return; }

    const details = await ytFetch(`channels?part=snippet,statistics,brandingSettings,topicDetails&id=${allIds.join(",")}`, ytKey);
    const channels = (details.items || []).map((ch: any) => {
      const subs = Number(ch.statistics?.subscriberCount || 0);
      const views = Number(ch.statistics?.viewCount || 0);
      const vids = Number(ch.statistics?.videoCount || 0);
      const score = calcScore(subs, views, vids);
      return {
        ytChannelId: ch.id, name: ch.snippet?.title || "", handle: ch.snippet?.customUrl || "",
        thumbnail: ch.snippet?.thumbnails?.medium?.url || "",
        subscribers: Math.min(subs, 2147483647), totalViews: Math.min(views, 2147483647), videoCount: Math.min(vids, 2147483647), country: ch.snippet?.country || "N/A",
        score, tier: getTier(score),
        description: ch.snippet?.description?.slice(0, 200) || "",
        channelAge: ch.snippet?.publishedAt ? Math.floor((Date.now() - new Date(ch.snippet.publishedAt).getTime()) / (86400000 * 30)) : 0,
      };
    });

    const filtered = channels.filter((c: any) => c.score >= 35 && c.videoCount >= 3);
    filtered.sort((a: any, b: any) => b.score - a.score);
    res.json({ channels: filtered, totalFound: channels.length, filtered: channels.length - filtered.length });
  } catch (err) { next(err); }
});


// Deep analyze a single channel
router.post("/analyze", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    const aiKey = await getAiKey();
    if (!ytKey) { res.status(400).json({ error: "Configure a YouTube API Key" }); return; }
    const { channelId } = req.body as { channelId: string };
    if (!channelId) { res.status(400).json({ error: "channelId obrigatório" }); return; }

    // Get channel details
    const chData = await ytFetch(`channels?part=snippet,statistics,brandingSettings,topicDetails,contentDetails&id=${channelId}`, ytKey);
    const ch = chData.items?.[0];
    if (!ch) { res.status(404).json({ error: "Canal não encontrado" }); return; }

    const subs = Number(ch.statistics?.subscriberCount || 0);
    const views = Number(ch.statistics?.viewCount || 0);
    const vids = Number(ch.statistics?.videoCount || 0);
    const score = calcScore(subs, views, vids);
    const country = ch.snippet?.country || "N/A";
    const lang = ch.snippet?.defaultLanguage || ch.brandingSettings?.channel?.defaultLanguage || "en";
    const topics = ch.topicDetails?.topicCategories?.map((t: string) => t.split("/").pop()) || [];
    const channelAge = ch.snippet?.publishedAt ? Math.floor((Date.now() - new Date(ch.snippet.publishedAt).getTime()) / (86400000 * 30)) : 0;

    // Fetch recent videos
    let recentVideos: any[] = [];
    const uploadsPlaylist = ch.contentDetails?.relatedPlaylists?.uploads;
    if (uploadsPlaylist) {
      try {
        const pl = await ytFetch(`playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylist}&maxResults=30`, ytKey);
        const videoIds = (pl.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
        if (videoIds.length) {
          const vData = await ytFetch(`videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}`, ytKey);
          recentVideos = (vData.items || []).map((v: any) => {
            const dur = v.contentDetails?.duration || "PT0S";
            const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            const secs = (Number(m?.[1]||0)*3600) + (Number(m?.[2]||0)*60) + Number(m?.[3]||0);
            return { id: v.id, title: v.snippet?.title, publishedAt: v.snippet?.publishedAt,
              views: Number(v.statistics?.viewCount||0), likes: Number(v.statistics?.likeCount||0),
              comments: Number(v.statistics?.commentCount||0), durationSecs: secs,
              tags: v.snippet?.tags?.slice(0,10) || [],
              thumbnail: v.snippet?.thumbnails?.medium?.url || "" };
          });
        }
      } catch (e: any) { console.error("[Analyze] Video fetch error:", e.message); }
    }

    // Calculate production data
    const dates = recentVideos.map(v => new Date(v.publishedAt)).filter(d => !isNaN(d.getTime())).sort((a,b) => b.getTime()-a.getTime());
    let uploadsPerWeek = 0, bestDay = "N/A", bestHour = "N/A";
    if (dates.length >= 2) {
      const span = (dates[0].getTime()-dates[dates.length-1].getTime()) / (1000*60*60*24*7);
      uploadsPerWeek = span > 0 ? Math.round((dates.length/span)*10)/10 : dates.length;
      const dc: any = {}, hc: any = {};
      const dn = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
      dates.forEach(d => { dc[dn[d.getUTCDay()]] = (dc[dn[d.getUTCDay()]]||0)+1; hc[d.getUTCHours()] = (hc[d.getUTCHours()]||0)+1; });
      bestDay = Object.entries(dc).sort((a:any,b:any)=>b[1]-a[1])[0]?.[0] || "N/A";
      const bh = Object.entries(hc).sort((a:any,b:any)=>b[1]-a[1])[0]?.[0];
      bestHour = bh ? bh + ":00 UTC" : "N/A";
    } else if (dates.length === 1) {
      const dn = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
      bestDay = dn[dates[0].getUTCDay()];
      bestHour = dates[0].getUTCHours() + ":00 UTC";
      uploadsPerWeek = vids > 0 && channelAge > 0 ? Math.round((vids / (channelAge * 4.3)) * 10) / 10 : 1;
    }

    const avgSecs = recentVideos.length ? Math.round(recentVideos.reduce((s,v)=>s+v.durationSecs,0)/recentVideos.length) : 0;
    const avgDuration = avgSecs > 0 ? (avgSecs >= 3600 ? `${Math.floor(avgSecs/3600)}h ${Math.floor((avgSecs%3600)/60)}m` : `${Math.floor(avgSecs/60)}m ${avgSecs%60}s`) : "N/A";
    const topVideos = [...recentVideos].sort((a,b)=>b.views-a.views).slice(0,5);
    const avgViews = recentVideos.length ? Math.round(recentVideos.reduce((s,v)=>s+v.views,0)/recentVideos.length) : (vids > 0 ? Math.round(views/vids) : 0);
    const avgLikes = recentVideos.length ? Math.round(recentVideos.reduce((s,v)=>s+v.likes,0)/recentVideos.length) : 0;
    const engRate = avgViews > 0 ? Math.round((avgLikes/avgViews)*10000)/100 : 0;

    // Base result without AI
    const result: any = {
      ytChannelId: ch.id, name: ch.snippet?.title, handle: ch.snippet?.customUrl || "",
      thumbnail: ch.snippet?.thumbnails?.medium?.url || "", description: ch.snippet?.description || "",
      subscribers: Math.min(subs, 2147483647), totalViews: Math.min(views, 2147483647), videoCount: Math.min(vids, 2147483647), country, language: lang,
      publishedAt: ch.snippet?.publishedAt, channelAge, score, tier: getTier(score), topics,
      uploadsPerWeek, bestDay, bestHour, avgDuration, avgViews, avgLikes, engRate,
      topVideos, recentVideos: recentVideos.slice(0, 10),
      // AI defaults
      niche: "", subNiche: "", microNiche: "", modelable: false, modelableCountries: [],
      recommendation: "", contentType: "", monetization: "", growthPotential: "", competitionLevel: "",
    };

    // AI analysis (non-blocking — if it fails, we still return data)
    if (aiKey) {
      try {
        const model = await getModel();
        console.log(`[Analyze AI] Model: ${model}, Channel: ${ch.snippet?.title}`);
        const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
          body: JSON.stringify({
            model, temperature: 0.3, max_tokens: 1000,
            messages: [
              { role: "system", content: "Analise canais do YouTube. Responda APENAS em JSON válido sem markdown, sem ```." },
              { role: "user", content: `Analise este canal YouTube. Responda SOMENTE JSON puro (sem \`\`\`json):
Canal: "${ch.snippet?.title}" (${subs} inscritos, ${vids} vídeos, ${views} views total)
País: ${country}, Idioma: ${lang}
Descrição: ${(ch.snippet?.description || "").slice(0, 300)}
Tópicos YouTube: ${topics.join(", ") || "não definido"}
Últimos vídeos: ${topVideos.map(v => v.title).join(" | ") || "sem dados"}
Idade do canal: ${channelAge} meses
Views médias: ${avgViews}
Uploads/semana: ${uploadsPerWeek}

Formato JSON:
{"niche":"Nicho","subNiche":"Sub-nicho","microNiche":"Micro-nicho","modelable":true,"modelableCountries":["Brasil","EUA"],"recommendation":"Análise 2-3 frases","contentType":"faceless/talking head/etc","monetization":"estimativa","growthPotential":"alto/médio/baixo","competitionLevel":"alta/média/baixa"}` }
            ]
          })
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json() as any;
          const raw = (aiData.choices?.[0]?.message?.content || "").trim();
          console.log("[Analyze AI] Raw response:", raw.slice(0, 200));
          try {
            const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned);
            Object.assign(result, parsed);
          } catch (parseErr: any) {
            console.error("[Analyze AI] JSON parse failed:", parseErr.message, "Raw:", raw.slice(0, 300));
          }
        } else {
          console.error("[Analyze AI] HTTP error:", aiRes.status, await aiRes.text().catch(() => ""));
        }
      } catch (aiErr: any) {
        console.error("[Analyze AI] Error:", aiErr.message);
      }
    } else {
      console.log("[Analyze] No AI key, skipping AI analysis");
    }

    res.json(result);
  } catch (err) { next(err); }
});

// Save channel
router.post("/save", async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = req.body as any;
    const existing = await prisma.savedChannel.findFirst({ where: { userId: req.userId, ytChannelId: data.ytChannelId } });
    if (existing) { res.status(400).json({ error: "Canal já salvo" }); return; }
    const MAX_INT = 2147483647;
    const safeInt = (v: any) => { const n = Number(v) || 0; return n > MAX_INT ? MAX_INT : n < -MAX_INT ? -MAX_INT : Math.round(n); };
    if (!data.ytChannelId) { res.status(400).json({ error: "ID do canal não encontrado. Tente analisar o canal primeiro." }); return; }
    const saved = await prisma.savedChannel.create({ data: {
      userId: req.userId, ytChannelId: data.ytChannelId || "", name: data.name || "", handle: data.handle || "",
      thumbnail: data.thumbnail || "", subscribers: safeInt(data.subscribers), totalViews: safeInt(data.totalViews),
      videoCount: safeInt(data.videoCount), country: data.country || "", score: safeInt(data.score),
      tier: data.tier || "", niche: data.niche || "", subNiche: data.subNiche || "",
      microNiche: data.microNiche || "", avgDuration: data.avgDuration || "",
      uploadsPerWeek: data.uploadsPerWeek || 0, bestUploadDay: data.bestDay || "",
      bestUploadHour: data.bestHour || "", topCountries: JSON.stringify(data.modelableCountries || []),
      tags: data.tags || "", notes: data.notes || "", modelable: data.modelable || false,
      analysisJson: JSON.stringify(data),
    }});
    res.json(saved);
  } catch (err) { next(err); }
});

// List saved channels
router.get("/saved", async (req: any, res: Response, next: NextFunction) => {
  try {
    const channels = await prisma.savedChannel.findMany({ take: 100, where: { userId: req.userId }, orderBy: { score: "desc" } });
    res.json(channels);
  } catch (err) { next(err); }
});

// Delete saved channel
router.delete("/saved/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    await prisma.savedChannel.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Update notes on saved channel
router.put("/saved/:id", async (req: any, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.savedChannel.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(updated);
  } catch (err) { next(err); }
});


// 🧬 DNA do Vídeo Viral — analyze top videos pattern
router.post("/dna", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure a API Key" }); return; }
    const { channelName, topVideos, avgDuration, subscribers, niche } = req.body;

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: await getModel(), temperature: 0.4, max_tokens: 3000,
        messages: [
          { role: "system", content: "Especialista em DNA viral de canais YouTube. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Analise o DNA viral deste canal e seus top vídeos:
Canal: "${channelName}" (${subscribers} subs, nicho: ${niche})
Duração média: ${avgDuration}
Top vídeos: ${JSON.stringify(topVideos)}

Extraia e retorne JSON:
{
  "hookPattern": "Padrão do hook nos primeiros 8 segundos (3-4 frases detalhando o padrão)",
  "retentionFormula": "Fórmula de retenção: o que mantém as pessoas assistindo (3-4 frases)",
  "titleFormula": "Fórmula dos títulos que funcionam com exemplos de padrões",
  "thumbnailStyle": "Estilo das thumbnails: cores, elementos, texto, emoção",
  "idealDuration": "Duração ideal baseada nos dados",
  "uploadFrequency": "Frequência ideal de upload",
  "contentStructure": ["Intro/Hook (0-8s): descrição", "Problema (8-30s): descrição", "Desenvolvimento: descrição", "Climax: descrição", "CTA: descrição"],
  "viralElements": ["elemento1", "elemento2", "elemento3", "elemento4", "elemento5"],
  "scriptTemplate": "Template completo de roteiro de ~500 palavras seguindo o padrão viral deste canal. Inclua marcações [HOOK], [PROBLEMA], [CONTEÚDO], [REVELAÇÃO], [CTA]. Use o estilo e tom que o canal usa.",
  "musicStyle": "Estilo de música/trilha que o canal usa",
  "editingPace": "Ritmo de edição (cortes por minuto, estilo de transição)",
  "audienceProfile": "Perfil da audiência: idade, gênero, interesses, país principal"
}` }
        ]
      })
    });
    if (!aiRes.ok) throw new Error("AI API error");
    const aiData = await aiRes.json() as any;
    const raw = aiData.choices?.[0]?.message?.content || "";
    try { const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    res.json(parsed); } catch { res.status(500).json({ error: "IA retornou formato inválido" }); return; }
  } catch (err) { next(err); }
});

// 📐 Blueprint de Modelagem
router.post("/blueprint", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure a API Key" }); return; }
    const { channelName, niche, subNiche, microNiche, subscribers, totalViews, videoCount, uploadsPerWeek, avgDuration, country, contentType, topVideos, modelableCountries } = req.body;

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: await getModel(), temperature: 0.3, max_tokens: 4000,
        messages: [
          { role: "system", content: "Consultor expert em blueprints de canais YouTube. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Crie um BLUEPRINT COMPLETO para modelar este canal:
Canal original: "${channelName}" (${subscribers} subs, ${totalViews} views, ${videoCount} vídeos)
Nicho: ${niche} > ${subNiche} > ${microNiche}
Tipo: ${contentType}, País: ${country}
Uploads: ${uploadsPerWeek}/semana, Duração média: ${avgDuration}
Países para modelar: ${JSON.stringify(modelableCountries)}
Top vídeos: ${topVideos?.map(v => v.title).join(" | ")}

Retorne JSON:
{
  "channelSetup": {
    "name": "3 sugestões de nome para o canal modelado",
    "description": "Bio otimizada para SEO",
    "keywords": ["tag1","tag2","tag3","tag4","tag5"],
    "targetCountry": "País mais lucrativo para modelar",
    "language": "Idioma do canal"
  },
  "equipment": {
    "minimum": ["item1 — R$ preço","item2"],
    "recommended": ["item1 — R$ preço","item2"],
    "software": ["software1 (grátis/pago)","software2"]
  },
  "contentStrategy": {
    "videosPerWeek": 3,
    "idealDuration": "10:00-15:00",
    "bestDays": ["Terça","Quinta","Sábado"],
    "bestHours": ["14:00 UTC","18:00 UTC"],
    "contentPillars": ["pilar1","pilar2","pilar3"],
    "first30Videos": "Estratégia detalhada dos primeiros 30 vídeos: temas, progressão, como ganhar tração"
  },
  "editingStyle": {
    "pace": "Cortes por minuto",
    "transitions": "Tipos de transição",
    "effects": "Efeitos visuais",
    "music": "Estilo de trilha",
    "thumbnail": "Estilo de thumbnail detalhado"
  },
  "monetization": {
    "estimatedCPM": "CPM estimado por país",
    "revenueMonth3": "Receita projetada mês 3",
    "revenueMonth6": "Receita projetada mês 6",
    "revenueMonth12": "Receita projetada mês 12",
    "additionalRevenue": "Outras fontes de receita (afiliados, produtos, etc)"
  },
  "growthHacks": ["hack1","hack2","hack3","hack4","hack5"],
  "risks": ["risco1","risco2","risco3"],
  "timeline": [
    {"month":"Mês 1","goal":"Meta","action":"O que fazer"},
    {"month":"Mês 3","goal":"Meta","action":"O que fazer"},
    {"month":"Mês 6","goal":"Meta","action":"O que fazer"},
    {"month":"Mês 12","goal":"Meta","action":"O que fazer"}
  ],
  "differentials": "Como se diferenciar do canal original e agregar valor único (3-4 frases)"
}` }
        ]
      })
    });
    if (!aiRes.ok) throw new Error("AI API error");
    const aiData = await aiRes.json() as any;
    const raw = aiData.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    res.json(parsed);
  } catch (err) { next(err); }
});

// 💰 Calculadora de Monetização
router.post("/monetization", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { niche, country, videosPerWeek, avgViews, subscribers } = req.body;
    // CPM data by country/niche (approximate USD)
    const CPM_DATA: any = {
      US: { default: 4.5, finance: 12, tech: 8, education: 6, gaming: 3.5, health: 7, entertainment: 3 },
      GB: { default: 4, finance: 10, tech: 7, education: 5, gaming: 3, health: 6, entertainment: 2.5 },
      CA: { default: 4, finance: 10, tech: 7, education: 5 },
      AU: { default: 4.5, finance: 11, tech: 7.5, education: 5.5 },
      DE: { default: 3.5, finance: 8, tech: 6, education: 4.5 },
      BR: { default: 0.8, finance: 2, tech: 1.5, education: 1, gaming: 0.6, entertainment: 0.5 },
      MX: { default: 0.6, finance: 1.5, tech: 1, education: 0.8 },
      IN: { default: 0.3, finance: 0.8, tech: 0.5, education: 0.3 },
      ES: { default: 2, finance: 5, tech: 3.5, education: 2.5 },
      FR: { default: 3, finance: 7, tech: 5, education: 4 },
      JP: { default: 3.5, finance: 8, tech: 6, education: 4 },
      KR: { default: 2.5, finance: 6, tech: 4.5 },
      PT: { default: 1.5, finance: 3.5, tech: 2.5 },
      IT: { default: 2.5, finance: 6, tech: 4 },
      SA: { default: 2, finance: 5, tech: 3 },
    };
    const nicheKey = (niche || "").toLowerCase().includes("financ") ? "finance" : (niche || "").toLowerCase().includes("tech") ? "tech" : (niche || "").toLowerCase().includes("educ") ? "education" : (niche || "").toLowerCase().includes("gam") ? "gaming" : (niche || "").toLowerCase().includes("saúde") || (niche || "").toLowerCase().includes("health") ? "health" : "default";

    const countries = Object.entries(CPM_DATA).map(([code, cpms]: any) => {
      const cpm = cpms[nicheKey] || cpms.default;
      const monthlyVideos = (videosPerWeek || 3) * 4.3;
      const monthlyViews = monthlyVideos * (avgViews || 10000);
      const monthlyRevenue = (monthlyViews / 1000) * cpm;
      return { country: code, cpm, monthlyViews, monthlyRevenue: Math.round(monthlyRevenue), yearlyRevenue: Math.round(monthlyRevenue * 12) };
    });
    countries.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);

    const selected = countries.find(c => c.country === country) || countries[0];
    const projections = [1, 3, 6, 12].map(m => {
      const growth = 1 + (m * 0.15);
      return { month: m, views: Math.round(selected.monthlyViews * growth), revenue: Math.round(selected.monthlyRevenue * growth) };
    });

    res.json({ countries, selected, projections, nicheKey });
  } catch (err) { next(err); }
});

// 🎯 Gerador de Títulos + Thumbnails
router.post("/generate-titles", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure a API Key" }); return; }
    const { channelName, niche, topVideoTitles, targetCountry, language } = req.body;

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: await getModel(), temperature: 0.7, max_tokens: 3000,
        messages: [
          { role: "system", content: "Expert em títulos virais e thumbnails YouTube. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Baseado neste canal, gere títulos + thumbnails para um canal modelado:
Canal original: "${channelName}" | Nicho: ${niche} | País alvo: ${targetCountry} | Idioma: ${language || "pt-BR"}
Títulos originais que funcionam: ${topVideoTitles?.join(" | ")}

Gere 10 ideias de vídeo com título + prompt de thumbnail. JSON:
[{
  "title": "Título viral otimizado para CTR (no idioma ${language || 'pt-BR'})",
  "hook": "Frase de hook para os primeiros 5 segundos",
  "thumbnailPrompt": "Prompt detalhado para gerar thumbnail no Midjourney/ImageFX: composição, cores, elementos, texto overlay, emoção, estilo",
  "estimatedViews": "Estimativa de views",
  "tags": ["tag1","tag2","tag3"]
}]` }
        ]
      })
    });
    if (!aiRes.ok) throw new Error("AI API error");
    const aiData = await aiRes.json() as any;
    const raw = aiData.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    res.json({ ideas: Array.isArray(parsed) ? parsed : [] });
  } catch (err) { next(err); }
});

// 🔥 Trending/Hype videos
router.post("/trending", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const { period, regionCode } = req.body as { period?: string; regionCode?: string };
    
    // Use search with viewCount order + publishedAfter for fresh viral content
    const day = 86400000;
    const after = period === "day" ? new Date(Date.now() - day) : period === "week" ? new Date(Date.now() - 7*day) : new Date(Date.now() - 30*day);
    
    // Combine: trending chart + fresh viral search
    const [trendData, searchData] = await Promise.all([
      ytFetch(`videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${regionCode || "US"}&maxResults=10`, ytKey),
      ytFetch(`search?part=snippet&type=video&regionCode=${regionCode || "US"}&maxResults=15&order=viewCount&publishedAfter=${after.toISOString()}`, ytKey)
    ]);
    
    // Get video details for search results
    const searchIds = (searchData.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
    let searchVids: any[] = [];
    if (searchIds.length) {
      const vData = await ytFetch(`videos?part=snippet,statistics,contentDetails&id=${searchIds.join(",")}`, ytKey);
      searchVids = vData.items || [];
    }
    
    const allVids = [...(trendData.items || []), ...searchVids];
    const seen = new Set<string>();
    const videos = allVids.filter((v: any) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; }).map((v: any) => {
      const dur = v.contentDetails?.duration || "PT0S";
      const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const secs = (Number(m?.[1]||0)*3600) + (Number(m?.[2]||0)*60) + Number(m?.[3]||0);
      return {
        id: v.id, title: v.snippet?.title, channelTitle: v.snippet?.channelTitle,
        channelId: v.snippet?.channelId,
        thumbnail: v.snippet?.thumbnails?.medium?.url || "",
        views: Number(v.statistics?.viewCount || 0), likes: Number(v.statistics?.likeCount || 0),
        comments: Number(v.statistics?.commentCount || 0), publishedAt: v.snippet?.publishedAt,
        durationSecs: secs,
      };
    }).sort((a: any, b: any) => b.views - a.views);

    res.json({ videos: videos.slice(0, 20) });
  } catch (err) { next(err); }
});


// 🔮 Detector de Tendências Emergentes — cross-country analysis
router.post("/emerging", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    const aiKey = await getAiKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    // Fetch trending from multiple countries
    const regions = ["US","BR","IN","GB","DE","JP","KR","MX"];
    const allTrending: any[] = [];
    for (const r of regions) {
      try {
        const data = await ytFetch(`videos?part=snippet,statistics&chart=mostPopular&regionCode=${r}&maxResults=10`, ytKey);
        (data.items || []).forEach((v: any) => {
          allTrending.push({
            title: v.snippet?.title, channelTitle: v.snippet?.channelTitle,
            views: Number(v.statistics?.viewCount || 0), region: r,
            category: v.snippet?.categoryId, tags: v.snippet?.tags?.slice(0, 5) || [],
          });
        });
      } catch {}
    }

    if (!aiKey) { res.json({ trends: [], raw: allTrending }); return; }

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: await getModel(), temperature: 0.4, max_tokens: 2000,
        messages: [{ role: "system", content: "Analise tendências YouTube cross-country. " + LANG_RULE },
          { role: "user", content: `Analise estes vídeos trending de ${regions.length} países e identifique tendências EMERGENTES (temas que estão viralizando em um país mas ainda não chegaram em outros = OPORTUNIDADE):
${JSON.stringify(allTrending.slice(0, 60))}

Retorne JSON: [{"trend":"Nome da tendência","description":"Explicação","originCountry":"País de origem","opportunityCountries":["País1","País2"],"urgency":"alta/média/baixa","nicheIdea":"Ideia de canal/nicho para modelar","estimatedViews":"Potencial de views","exampleTitles":["título1","título2"]}]` }]
      })
    });
    if (!aiRes.ok) { res.json({ trends: [] }); return; }
    const aiData = await aiRes.json() as any;
    const raw = aiData.choices?.[0]?.message?.content || "[]";
    try { const trends = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); res.json({ trends: Array.isArray(trends) ? trends : [] }); }
    catch { res.json({ trends: [] }); }
  } catch (err) { next(err); }
});

// 🕵️ Spy — compare saved channels activity
router.post("/spy", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const { channelIds } = req.body as { channelIds: string[] };
    if (!channelIds?.length) { res.json({ channels: [] }); return; }

    const results: any[] = [];
    for (const chId of channelIds.slice(0, 10)) {
      try {
        const chData = await ytFetch(`channels?part=snippet,statistics,contentDetails&id=${chId}`, ytKey);
        const ch = chData.items?.[0];
        if (!ch) continue;
        const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
        let recentVids: any[] = [];
        if (uploads) {
          const pl = await ytFetch(`playlistItems?part=snippet,contentDetails&playlistId=${uploads}&maxResults=5`, ytKey);
          const vids = (pl.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
          if (vids.length) {
            const vData = await ytFetch(`videos?part=snippet,statistics,contentDetails&id=${vids.join(",")}`, ytKey);
            recentVids = (vData.items || []).map((v: any) => ({
              id: v.id, title: v.snippet?.title, views: Number(v.statistics?.viewCount || 0),
              likes: Number(v.statistics?.likeCount || 0), publishedAt: v.snippet?.publishedAt,
              thumbnail: v.snippet?.thumbnails?.medium?.url || "",
            }));
          }
        }
        results.push({
          ytChannelId: chId, name: ch.snippet?.title, thumbnail: ch.snippet?.thumbnails?.default?.url,
          subscribers: Math.min(Number(ch.statistics?.subscriberCount || 0), 2147483647),
          totalViews: Math.min(Number(ch.statistics?.viewCount || 0), 2147483647),
          videoCount: Number(ch.statistics?.videoCount || 0),
          recentVideos: recentVids,
        });
      } catch {}
    }
    res.json({ channels: results });
  } catch (err) { next(err); }
});

// 🧪 A/B Test de Títulos
router.post("/ab-test", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { titles, niche, targetAudience } = req.body;

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: await getModel(), temperature: 0.3, max_tokens: 2000,
        messages: [{ role: "system", content: "Expert em CTR e psicologia de títulos YouTube. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Analise estes títulos e dê score de CTR (0-100). Nicho: ${niche}. Público: ${targetAudience || "geral"}.
Títulos: ${JSON.stringify(titles)}

Para CADA título retorne JSON array:
[{"title":"título original","ctrScore":85,"strengths":["ponto forte1","ponto forte2"],"weaknesses":["fraqueza1"],"improvedVersion":"Versão melhorada do título","emotionalTrigger":"Gatilho emocional usado","curiosityGap":"Se tem curiosity gap (sim/não + explicação)"}]
Ordene por ctrScore descendente.` }]
      })
    });
    const aiData = await aiRes.json() as any;
    const raw = aiData.choices?.[0]?.message?.content || "[]";
    res.json({ results: JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()) });
  } catch (err) { next(err); }
});

// 🗓️ Calendário 30 dias
router.post("/calendar", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { niche, subNiche, videosPerWeek, style, targetCountry, language } = req.body;

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: await getModel(), temperature: 0.6, max_tokens: 4000,
        messages: [{ role: "system", content: "Expert em estratégia de conteúdo YouTube. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Crie calendário de 30 dias para canal YouTube modelado:
Nicho: ${niche} > ${subNiche || "geral"}
Vídeos/semana: ${videosPerWeek || 3}
Estilo: ${style || "faceless"}
País: ${targetCountry || "US"}, Idioma: ${language || "en"}

Retorne JSON array com ${(videosPerWeek || 3) * 4} vídeos:
[{"day":1,"weekday":"Segunda","title":"Título viral otimizado","hook":"Hook dos primeiros 5 segundos","description":"Descrição do vídeo em 2 frases","tags":["tag1","tag2","tag3"],"thumbnailPrompt":"Prompt detalhado para thumbnail","duration":"10:00","uploadTime":"14:00 UTC","priority":"alta/média","seriesName":"Nome da série se aplicável"}]` }]
      })
    });
    const aiData = await aiRes.json() as any;
    const raw = aiData.choices?.[0]?.message?.content || "[]";
    try { res.json({ calendar: JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()) }); } catch { res.status(500).json({ error: "Formato inválido da IA. Tente novamente." }); }
  } catch (err) { next(err); }
});

// 📺 Channel Preview/Mockup — generate full channel identity
router.post("/channel-mockup", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { channelName, niche, subNiche, style, targetCountry, language, originalChannel, analysisData } = req.body;

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: await getModel(), temperature: 0.7, max_tokens: 3500,
        messages: [{ role: "system", content: `Você é um DIRETOR CRIATIVO de canais YouTube de elite. Sua missão: analisar um canal existente e criar uma versão MUITO SUPERIOR.

REGRA CRÍTICA DE IDIOMA:
- Os campos "whatsBetter", "weaknessesFixed", "strategyEdge", "tagline" e "description" DEVEM ser escritos em PORTUGUÊS DO BRASIL (PT-BR), pois o USUÁRIO é brasileiro.
- Os campos "title" dos vídeos, "channelName" e "keywords" devem ser no idioma do canal alvo.
- NUNCA escreva explicações em inglês. O usuário NÃO fala inglês.

REGRAS:
- NÃO copie o canal original. SUPERE ele.
- Identifique as FRAQUEZAS do original e corrija todas
- Identifique as FORÇAS e amplifique 10x
- Nome ORIGINAL e criativo (não parecido com o original)
- Títulos MAIS impactantes, com hooks MELHORES
- Thumbnails com conceitos visuais SUPERIORES
- APENAS JSON válido sem markdown` },
          { role: "user", content: `Analise o canal "${originalChannel || "referência"}" e crie um canal SUPERIOR:

CANAL ORIGINAL: "${originalChannel}"
Nicho: ${niche} > ${subNiche || ""}
Estilo: ${style || "faceless"} | País: ${targetCountry || "US"} | Idioma conteúdo: ${language || "en"}
${analysisData ? `Dados: ${analysisData.subscribers || ""} subs, ${analysisData.totalViews || ""} views, ${analysisData.videoCount || ""} vídeos, Score: ${analysisData.score || ""}` : ""}
${analysisData?.topVideos ? `Top vídeos do original: ${analysisData.topVideos.slice(0,5).map(v => v.title).join(" | ")}` : ""}

SUPERE este canal. Crie algo MELHOR em TODOS os aspectos.

IMPORTANTE: Os campos whatsBetter, weaknessesFixed, strategyEdge, tagline e description OBRIGATORIAMENTE em PORTUGUÊS BR.
Os títulos dos vídeos e channelName no idioma: ${language || "en"}.

JSON:
{
  "channelName": "Nome criativo no idioma ${language || "en"}",
  "tagline": "Slogan em PORTUGUÊS BR",
  "description": "Descrição em PORTUGUÊS BR explicando o canal (200 palavras)",
  "whatsBetter": "3 frases em PORTUGUÊS BR explicando POR QUE este canal é superior",
  "weaknessesFixed": ["Fraqueza do original corrigida em PT-BR", "Fraqueza 2 em PT-BR", "Fraqueza 3 em PT-BR"],
  "logoPrompt": "Prompt ImageFX em inglês: circular logo, professional...",
  "bannerPrompt": "Prompt ImageFX em inglês: YouTube banner 2560x1440...",
  "videos": [
    {"title": "Título no idioma ${language || "en"}", "thumbnailPrompt": "Prompt em inglês", "views": "Estimativa", "duration": "MM:SS"},
    {"title": "Vídeo 2", "thumbnailPrompt": "...", "views": "...", "duration": "..."},
    {"title": "Vídeo 3", "thumbnailPrompt": "...", "views": "...", "duration": "..."},
    {"title": "Vídeo 4", "thumbnailPrompt": "...", "views": "...", "duration": "..."}
  ],
  "colors": {"primary": "#hex", "secondary": "#hex", "accent": "#hex"},
  "fonts": "Fontes recomendadas",
  "keywords": ["kw no idioma ${language || "en"}"],
  "strategyEdge": "Em PORTUGUÊS BR: Por que este canal vai VENCER o original em 6 meses"
}` }]
      })
    });
    if (!aiRes.ok) { res.status(500).json({ error: "Erro na IA: " + aiRes.status }); return; }
    const aiData = await aiRes.json() as any;
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    try { res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())); }
    catch { res.status(500).json({ error: "IA retornou formato inválido. Tente novamente." }); }
  } catch (err) { next(err); }
});


// 📸 Analyze screenshots - MUST use vision model (gpt-4o), resize images
router.post("/analyze-screenshots", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { images, context } = req.body as { images: string[]; context?: string };
    if (!images?.length) { res.status(400).json({ error: "Envie pelo menos 1 print" }); return; }

    // IMPORTANT: Force vision-capable model (gpt-4o) — DeepSeek/Gemini don't support images via this API
    const visionModel = "gpt-4o";
    
    // Resize images to max 512px to reduce payload (keep only what's needed for analysis)
    const resizedImages: string[] = [];
    for (const img of images.slice(0, 4)) { // max 4 images
      // Just trim the base64 if too long (>500KB per image)
      const b64 = img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;
      resizedImages.push(b64);
    }

    const content: any[] = [];
    resizedImages.forEach(img => {
      content.push({ type: "image_url", image_url: { url: img, detail: "low" } }); // "low" = 512px, cheaper + faster
    });
    content.push({ type: "text", text: `RESPONDA TUDO EM PORTUGUÊS DO BRASIL. Analise ${resizedImages.length} prints de canais YouTube. ${context || ""}

RESPONDA APENAS JSON (sem \`\`\`):
{"channelsDetected":[{"name":"Canal","subscribers":"Subs","niche":"Nicho"}],"titlePatterns":{"patterns":["Padrão 1","Padrão 2","Padrão 3"],"strengths":["Forte 1"],"weaknesses":["Fraco 1"],"ctrEstimate":"alta/média/baixa"},"thumbnailAnalysis":{"style":"Estilo","colors":"Cores","elements":["Elem1","Elem2"],"textUsage":"Uso de texto","emotionalTrigger":"Gatilho","strengths":["Forte 1"],"weaknesses":["Fraco 1"]},"optimizedTitles":[{"title":"Título 1","improvement":"Melhoria","ctrScore":85},{"title":"Título 2","improvement":"...","ctrScore":90},{"title":"Título 3","improvement":"...","ctrScore":88},{"title":"Título 4","improvement":"...","ctrScore":82},{"title":"Título 5","improvement":"...","ctrScore":87},{"title":"Título 6","improvement":"...","ctrScore":84},{"title":"Título 7","improvement":"...","ctrScore":91},{"title":"Título 8","improvement":"...","ctrScore":86},{"title":"Título 9","improvement":"...","ctrScore":89},{"title":"Título 10","improvement":"...","ctrScore":83}],"thumbnailPrompts":[{"description":"Prompt thumb 1","style":"Estilo"},{"description":"Prompt 2","style":"..."},{"description":"Prompt 3","style":"..."},{"description":"Prompt 4","style":"..."},{"description":"Prompt 5","style":"..."}],"insights":[{"insight":"Oportunidade ESPECÍFICA que ninguém faz","impact":"alto","actionable":"Passo a passo CONCRETO: 1) fazer X, 2) usar Y, 3) publicar Z","examples":["Título de vídeo REAL exemplo 1 que funcionaria HOJE","Título exemplo 2 pronto pra usar","Título exemplo 3 viral"]},{"insight":"2","impact":"alto","actionable":"Passo concreto","examples":["Título real 1","Título real 2","Título real 3"]},{"insight":"3","impact":"alto","actionable":"...","examples":["ex1","ex2","ex3"]},{"insight":"4","impact":"médio","actionable":"...","examples":["ex1","ex2","ex3"]},{"insight":"5","impact":"alto","actionable":"...","examples":["ex1","ex2","ex3"]}],"strategy":"Estratégia completa em 3-4 frases"}` });

    console.log(`[Screenshots] Sending ${resizedImages.length} images to ${visionModel}`);
    
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: visionModel, temperature: 0.4, max_tokens: 4000,
        messages: [
          { role: "system", content: "Expert em YouTube. Analise screenshots de canais. " + LANG_RULE },
          { role: "user", content }
        ]
      })
    });
    
    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      console.error(`[Screenshots] API error ${aiRes.status}:`, errText.slice(0, 300));
      res.status(500).json({ error: `Erro na IA (${aiRes.status}). Tente com menos imagens ou imagens menores.` });
      return;
    }
    
    const data = await aiRes.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "{}").trim();
    console.log("[Screenshots] Raw response:", raw.slice(0, 200));
    
    try {
      res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()));
    } catch {
      console.error("[Screenshots] JSON parse failed:", raw.slice(0, 500));
      res.status(500).json({ error: "IA retornou formato inválido. Tente com menos imagens." });
    }
  } catch (err: any) {
    console.error("[Screenshots] Error:", err.message);
    next(err);
  }
});


// 📊 Smart Compare with AI gap analysis
router.post("/smart-compare", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { channels } = req.body;
    const model = await getModel();
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model, temperature: 0.5, max_tokens: 2500,
        messages: [{ role: "system", content: "Expert em análise competitiva YouTube. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Compare estes canais e encontre lacunas:
${JSON.stringify(channels.map((c: any) => ({ name: c.name, subs: c.subscribers, views: c.totalViews, vids: c.videoCount, recentTitles: c.recentVideos?.slice(0,3).map((v: any) => v.title) })))}
JSON: {"winner":"Canal","comparison":[{"metric":"M","analysis":"Quem ganha"}],"gaps":["Lacuna 1","2","3"],"unexploredThemes":["Tema 1","2","3"],"titlesToExplore":[{"title":"T1","reason":"R1"},{"title":"T2","reason":"R2"},{"title":"T3","reason":"R3"},{"title":"T4","reason":"R4"},{"title":"T5","reason":"R5"}],"recommendation":"Estratégia"}` }]
      })
    });
    if (!aiRes.ok) { res.status(500).json({ error: "AI error" }); return; }
    const data = await aiRes.json() as any;
    const raw = data.choices?.[0]?.message?.content || "{}";
    try { res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())); }
    catch { res.status(500).json({ error: "Formato inválido" }); }
  } catch (err) { next(err); }
});


// 💎 Score Pré-Publicação
router.post("/pre-publish-score", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { title, description, tags, thumbnailPrompt, niche } = req.body;
    const model = await getModel();
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.3, max_tokens: 1500,
        messages: [{ role: "system", content: "Expert em SEO YouTube. Pontue vídeos antes de publicar. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Analise este vídeo ANTES de publicar. Nicho: ${niche||"geral"}
Título: "${title}"
Descrição: "${description||""}"
Tags: ${tags||""}
Thumb: ${thumbnailPrompt||"não fornecido"}

JSON: {"overallScore":85,"titleScore":{"score":90,"feedback":"Feedback","improved":"Versão melhorada"},"descriptionScore":{"score":70,"feedback":"Feedback","improved":"Versão otimizada SEO com links"},"tagsScore":{"score":80,"feedback":"Feedback","suggested":["tag1","tag2","tag3","tag4","tag5"]},"thumbnailScore":{"score":75,"feedback":"Feedback do conceito"},"seoChecklist":[{"item":"Check 1","pass":true,"tip":"Dica"},{"item":"Check 2","pass":false,"tip":"Como corrigir"}],"improvements":["Melhoria 1 específica","Melhoria 2","Melhoria 3"],"viralPotential":"alto/médio/baixo","estimatedCTR":"3-5%"}` }]
      })
    });
    if (!aiRes.ok) { res.status(500).json({ error: "AI error" }); return; }
    const data = await aiRes.json() as any;
    const raw = data.choices?.[0]?.message?.content || "{}";
    try { res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())); }
    catch { res.status(500).json({ error: "Formato inválido" }); }
  } catch (err) { next(err); }
});

// 🌐 Multi-Idioma
router.post("/multi-language", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { title, description, tags, languages } = req.body;
    const model = await getModel();
    const langs = languages || ["en","es","pt","fr","de"];
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.3, max_tokens: 2500,
        messages: [{ role: "system", content: "Tradutor expert em SEO YouTube para múltiplos idiomas. " + LANG_RULE },
          { role: "user", content: `Traduza e OTIMIZE para SEO YouTube em ${langs.length} idiomas:
Título: "${title}"
Descrição: "${description||""}"
Tags: ${tags||""}

Para CADA idioma, otimize pra viralizar naquele mercado. JSON:
{${langs.map(l => `"${l}":{"title":"Título otimizado","description":"Descrição SEO","tags":["tag1","tag2","tag3","tag4","tag5"],"hashtags":["#hash1","#hash2"]}`).join(",")}}` }]
      })
    });
    if (!aiRes.ok) { res.status(500).json({ error: "AI error" }); return; }
    const data = await aiRes.json() as any;
    const raw = data.choices?.[0]?.message?.content || "{}";
    try { res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())); }
    catch { res.status(500).json({ error: "Formato inválido" }); }
  } catch (err) { next(err); }
});

// 🎬 Pipeline Wizard
router.post("/pipeline", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { niche, subNiche, style, country, language, step, context } = req.body;
    const model = await getModel();
    
    const prompts: any = {
      identity: `Crie identidade de canal YouTube: Nicho: ${niche}>${subNiche}, Estilo: ${style}, País: ${country}, Idioma: ${language}. JSON: {"channelName":"Nome","tagline":"Slogan","description":"Bio SEO 200 palavras","logoPrompt":"Prompt ImageFX logo circular","bannerPrompt":"Prompt ImageFX banner 2560x1440","colors":{"primary":"#hex","secondary":"#hex"},"keywords":["k1","k2","k3","k4","k5"]}`,
      scripts: `Crie EXATAMENTE 5 roteiros completos para o canal "${context?.channelName}" no nicho ${niche}>${subNiche}, estilo ${style}. RESPONDA APENAS com JSON array de 5 objetos: [{"number":1,"title":"Título viral com hook","hook":"Frase dos primeiros 5 segundos","outline":["Intro: gancho emocional","Desenvolvimento: conteúdo principal","Clímax: revelação ou virada","CTA: chamada pra ação"],"duration":"10:00","thumbnailPrompt":"Descrição visual detalhada da thumbnail 16:9","tags":["tag1","tag2","tag3"]},{"number":2,"title":"...","hook":"...","outline":["..."],"duration":"...","thumbnailPrompt":"...","tags":["..."]},{"number":3,"title":"...","hook":"...","outline":["..."],"duration":"...","thumbnailPrompt":"...","tags":["..."]},{"number":4,"title":"...","hook":"...","outline":["..."],"duration":"...","thumbnailPrompt":"...","tags":["..."]},{"number":5,"title":"...","hook":"...","outline":["..."],"duration":"...","thumbnailPrompt":"...","tags":["..."]}]`,
      calendar: `Crie calendário 30 dias para "${context?.channelName}" (${niche}, ${style}, ${country}). 3 vídeos/semana. JSON array: [{"day":1,"weekday":"Seg","title":"Título","hook":"Hook","uploadTime":"14:00","thumbnailPrompt":"Prompt"}]`,
    };
    
    const prompt = prompts[step] || prompts.identity;
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.6, max_tokens: 4000,
        messages: [{ role: "system", content: "Expert em criação de canais YouTube do zero. " + LANG_RULE },
          { role: "user", content: prompt }]
      })
    });
    if (!aiRes.ok) { const err = await aiRes.text().catch(()=>""); console.error(`[Pipeline] AI error ${aiRes.status}:`, err.slice(0,300)); res.status(500).json({ error: `AI error ${aiRes.status}` }); return; }
    const data = await aiRes.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "{}").trim();
    console.log(`[Pipeline] Step: ${step}, Raw length: ${raw.length}, Preview: ${raw.slice(0,150)}`);
    try { res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())); }
    catch(e) { console.error("[Pipeline] JSON parse failed:", raw.slice(0,500)); res.status(500).json({ error: "Formato inválido. Tente novamente." }); }
  } catch (err) { next(err); }
});


// 🔥 Dynamic trending niches
router.post("/trending-niches", async (req: any, res: Response, next: NextFunction) => {
  // Hardcoded fallback niches (always works, even if AI fails)
  const FALLBACK = {
    trending:[
      {name:"Faceless Dark History",emoji:"🏛️",query:"dark history faceless",growth:"alta",description:"Canais de história sombria sem aparecer na câmera. Alto CPM e engajamento.",tip:"Use IA pra gerar imagens cinematográficas"},
      {name:"AI Tools Review",emoji:"🤖",query:"AI tools review 2025",growth:"alta",description:"Reviews de ferramentas IA novas que surgem toda semana.",tip:"Faça comparativos lado a lado"},
      {name:"True Crime Documentário",emoji:"🔍",query:"true crime documentary",growth:"alta",description:"Documentários sobre crimes reais com narração envolvente.",tip:"Use fontes públicas e construa tensão"},
      {name:"Satisfying Factory Process",emoji:"🏭",query:"factory process satisfying",growth:"alta",description:"Vídeos satisfatórios de processos industriais. Viral orgânico.",tip:"Compile clips royalty-free + adicione ASMR"},
      {name:"Finance for GenZ",emoji:"💰",query:"finance investing genz",growth:"alta",description:"Educação financeira com linguagem jovem e memes.",tip:"Use analogias com jogos e cultura pop"},
      {name:"Storytelling Animated",emoji:"📖",query:"storytelling animated channel",growth:"alta",description:"Histórias animadas com IA. Custo baixo, views altos.",tip:"Use Midjourney + narração emocional"},
      {name:"Shorts Compilation",emoji:"📱",query:"shorts compilation millions views",growth:"alta",description:"Compilações de shorts virais. Fácil de produzir.",tip:"Foco em hooks de 1 segundo"},
      {name:"Tech Unboxing Faceless",emoji:"📦",query:"tech unboxing faceless",growth:"alta",description:"Unboxing de tech sem mostrar o rosto. Só mãos e produto.",tip:"Invista em iluminação e close-ups"}
    ],
    emerging:[
      {name:"AI Music Generation",emoji:"🎵",query:"AI music generation tutorial",growth:"explosiva",description:"Tutoriais de como criar música com IA. Suno, Udio.",tip:"Ensine leigos a criar hits"},
      {name:"Longevity & Biohacking",emoji:"🧬",query:"longevity biohacking science",growth:"explosiva",description:"Ciência de longevidade e biohacking acessível.",tip:"Traduza papers científicos em linguagem simples"},
      {name:"Prompt Engineering",emoji:"⚡",query:"prompt engineering AI tutorials",growth:"explosiva",description:"Como escrever prompts eficientes pra IA.",tip:"Mostre antes/depois com resultados reais"},
      {name:"Geo Politics Explained",emoji:"🌍",query:"geopolitics explained simple",growth:"explosiva",description:"Geopolítica explicada de forma simples com mapas.",tip:"Use animações de mapas e dados visuais"},
      {name:"Retro Gaming Revival",emoji:"🕹️",query:"retro gaming nostalgia",growth:"explosiva",description:"Nostalgia de jogos antigos voltando com força.",tip:"Combine gameplay + storytelling pessoal"},
      {name:"Solo Travel Budget",emoji:"✈️",query:"solo travel budget tips",growth:"explosiva",description:"Viagem solo com orçamento baixo. Público enorme.",tip:"Documente experiências reais com custos"}
    ],
    microNiches:[
      {name:"Receitas Históricas Antigas",emoji:"🍖",query:"ancient historical recipes cooking",competition:"baixa",description:"Recriar receitas de civilizações antigas (Roma, Egito, Maia). Pouquíssima concorrência.",howToStart:"Pesquise receitas em livros históricos, grave cozinhando",contentIdeas:["Como os Romanos faziam pão","Cerveja do Egito Antigo","Banquete Viking"]},
      {name:"ASMR de Profissões Raras",emoji:"🔧",query:"ASMR unusual jobs rare professions",competition:"baixa",description:"Sons de profissões incomuns: relojoeiro, encadernador, ferreiro.",howToStart:"Visite artesãos locais e grave os sons",contentIdeas:["ASMR Relojoeiro","Sons de Encadernação","Ferreiro Medieval"]},
      {name:"Exercícios pra Quem Trabalha Sentado",emoji:"🪑",query:"exercises desk workers stretching",competition:"baixa",description:"Alongamentos e exercícios pra programadores e office workers.",howToStart:"Grave rotinas de 5-10 min no escritório",contentIdeas:["5min Desk Stretch","Postura pra Devs","Yoga na Cadeira"]},
      {name:"Mapas e Fronteiras Bizarras",emoji:"🗺️",query:"weird borders maps geography",competition:"baixa",description:"Fronteiras estranhas, enclaves, mapas bizarros. Público curioso.",howToStart:"Use Google Earth + dados de Wikipedia",contentIdeas:["País Dentro de País","Fronteira Mais Estranha","Cidades Divididas"]},
      {name:"Matemática Visual com Animação",emoji:"📐",query:"math visual animation explained",competition:"baixa",description:"Conceitos matemáticos complexos explicados visualmente.",howToStart:"Use Manim ou After Effects pra animações",contentIdeas:["Fractais Explicados","Infinito Visual","Fibonacci na Natureza"]},
      {name:"Abandonados do Mundo",emoji:"🏚️",query:"abandoned places exploration world",competition:"baixa",description:"Documentar lugares abandonados com história por trás.",howToStart:"Pesquise locais + conte a história do abandono",contentIdeas:["Hospital Abandonado","Parque Fantasma","Cidade Nuclear"]},
      {name:"Psicologia dos Vilões de Filmes",emoji:"🎭",query:"psychology movie villains analysis",competition:"baixa",description:"Análise psicológica de vilões icônicos do cinema.",howToStart:"Combine cenas do filme + teoria psicológica",contentIdeas:["Joker: Diagnóstico Real","Thanos Era Racional?","Psicopatia em Hannibal"]},
      {name:"Bugs e Glitches Explicados",emoji:"🐛",query:"game bugs glitches explained how",competition:"baixa",description:"Como bugs famosos de jogos acontecem tecnicamente.",howToStart:"Pesquise o código-fonte e explique visualmente",contentIdeas:["MissingNo Explicado","Glitch do Minecraft","Bug que Virou Feature"]}
    ]
  };

  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.json(FALLBACK); return; }
    const model = await getModel();
    const ck = "niches:" + new Date().toISOString().slice(0, 13);
    const c = cached(ck, 3600000);
    if (c) { res.json(c); return; }

    try {
      const parsed = await fetchAI(aiKey, model, "Expert em nichos YouTube. " + LANG_RULE,
        `8 nichos em alta + 6 emergentes + 8 micro-nichos (ultra-específicos, pouca concorrência).
JSON: {"trending":[{"name":"N","emoji":"e","query":"q","growth":"alta","description":"curto","tip":"Dica"}],"emerging":[{"name":"N","emoji":"e","query":"q","growth":"explosiva","description":"curto","tip":"Dica"}],"microNiches":[{"name":"Micro ultra-específico","emoji":"e","query":"q","competition":"baixa","description":"curto","howToStart":"Como começar","contentIdeas":["V1","V2","V3"]}]}`, 2000);
      setCache(ck, parsed, 3600000);
      res.json(parsed);
    } catch {
      // AI failed? Return hardcoded fallback
      res.json(FALLBACK);
    }
  } catch (err: any) {
    res.json(FALLBACK); // Always return something
  }
});


// 📜 Full Script Generator
router.post("/full-script", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey(); if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { title, niche, duration, style, language, hook } = req.body;
    const model = await getModel();
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.7, max_tokens: 4000,
        messages: [{ role: "system", content: "Roteirista profissional de YouTube. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Roteiro COMPLETO palavra-por-palavra para: "${title}"
Nicho: ${niche||"geral"}, Duração: ${duration||"10:00"}, Estilo: ${style||"educativo"}, Idioma: ${language||"pt"}
${hook ? `Hook sugerido: ${hook}` : ""}

JSON:
{"title":"${title}","totalDuration":"${duration||"10:00"}","sections":[{"timestamp":"0:00","duration":"0:30","type":"hook","title":"Gancho","narration":"TEXTO COMPLETO da narração palavra por palavra que o narrador vai ler","visualCue":"Descrição do que aparece na tela","broll":"Sugestão de B-roll ou imagem","music":"Tipo de música de fundo","editNote":"Nota de edição (corte, zoom, efeito)"},{"timestamp":"0:30","duration":"1:30","type":"intro","title":"Introdução","narration":"...","visualCue":"...","broll":"...","music":"...","editNote":"..."},{"timestamp":"2:00","duration":"3:00","type":"content","title":"Desenvolvimento 1","narration":"...","visualCue":"...","broll":"...","music":"...","editNote":"..."},{"timestamp":"5:00","duration":"3:00","type":"content","title":"Desenvolvimento 2","narration":"...","visualCue":"...","broll":"...","music":"...","editNote":"..."},{"timestamp":"8:00","duration":"1:30","type":"climax","title":"Clímax/Revelação","narration":"...","visualCue":"...","broll":"...","music":"...","editNote":"..."},{"timestamp":"9:30","duration":"0:30","type":"cta","title":"CTA","narration":"...","visualCue":"...","broll":"...","music":"...","editNote":"..."}],"retentionTips":["Dica 1 pra manter retenção alta","Dica 2","Dica 3"],"thumbnailPrompt":"Prompt detalhado pra thumbnail","seoTitle":"Título SEO otimizado","wordCount":1500}` }]
      })
    });
    if (!aiRes.ok) { res.status(500).json({ error: "AI error " + aiRes.status }); return; }
    const data = await aiRes.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "{}").trim();
    try { res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())); }
    catch { res.status(500).json({ error: "Formato inválido" }); }
  } catch (err) { next(err); }
});

// 🔮 Viral Predictor
router.post("/predict-viral", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey(); if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { title, thumbnailConcept, niche, uploadTime, tags, subscribers } = req.body;
    const model = await getModel();
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.3, max_tokens: 1500,
        messages: [{ role: "system", content: "Analista de dados YouTube. Preveja performance de vídeos. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Preveja a performance deste vídeo ANTES de publicar:
Título: "${title}", Thumb: "${thumbnailConcept||""}", Nicho: ${niche||"geral"}
Horário: ${uploadTime||"não definido"}, Tags: ${tags||""}, Inscritos: ${subscribers||"novo canal"}

JSON: {"viralScore":85,"views":{"pessimist":"1K-5K","realistic":"10K-50K","optimist":"100K-500K"},"ctr":{"score":80,"analysis":"Por que esse CTR"},"retention":{"score":75,"analysis":"Previsão de retenção"},"timing":{"bestDay":"Terça","bestHour":"14:00 BRT","reason":"Por que esse horário"},"strengths":["Ponto forte 1","2","3"],"weaknesses":["Fraqueza 1","2"],"improvements":["Melhoria 1 pra aumentar views","2","3"],"similarSuccesses":["Vídeo similar que viralizou 1","2"],"estimatedRevenue":{"cpm":"$2-5","revenue30d":"$50-200","revenue90d":"$200-800"},"verdict":"Publicar/Ajustar/Repensar — com explicação"}` }]
      })
    });
    if (!aiRes.ok) { res.status(500).json({ error: "AI error" }); return; }
    const data = await aiRes.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "{}").trim();
    try { res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())); }
    catch { res.status(500).json({ error: "Formato inválido" }); }
  } catch (err) { next(err); }
});

// 💸 Monetization 360
router.post("/monetize-360", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey(); if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { niche, subscribers, avgViews, country, style } = req.body;
    const model = await getModel();
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.5, max_tokens: 3000,
        messages: [{ role: "system", content: "Consultor de monetização YouTube expert. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Estratégia COMPLETA de monetização para canal YouTube:
Nicho: ${niche}, Inscritos: ${subscribers||"1K"}, Views médias: ${avgViews||"10K"}, País: ${country||"BR"}, Estilo: ${style||"faceless"}

JSON: {"totalPotential":"R$X-Y/mês","streams":[{"name":"AdSense","icon":"💰","monthlyMin":100,"monthlyMax":500,"difficulty":"fácil","timeToStart":"imediato","howTo":"Passo a passo","tips":["Dica 1","2"]},{"name":"Marketing de Afiliados","icon":"🔗","monthlyMin":200,"monthlyMax":2000,"difficulty":"médio","timeToStart":"1 mês","howTo":"...","tips":["..."],"platforms":["Hotmart","Amazon","Eduzz"]},{"name":"Produtos Digitais (Cursos/Ebooks)","icon":"📚","monthlyMin":500,"monthlyMax":5000,"difficulty":"médio","timeToStart":"2 meses","howTo":"...","tips":["..."]},{"name":"Patrocínios","icon":"🤝","monthlyMin":300,"monthlyMax":3000,"difficulty":"médio","timeToStart":"3 meses","howTo":"...","tips":["..."],"emailTemplate":"Template de email pra marcas"},{"name":"Membership/Canal Exclusivo","icon":"⭐","monthlyMin":100,"monthlyMax":1000,"difficulty":"fácil","timeToStart":"1 mês","howTo":"...","tips":["..."]},{"name":"Merchandise","icon":"👕","monthlyMin":50,"monthlyMax":500,"difficulty":"difícil","timeToStart":"6 meses","howTo":"...","tips":["..."]}],"timeline":[{"month":"Mês 1-3","focus":"Foco","revenue":"R$X","actions":["Ação 1","2"]},{"month":"Mês 4-6","focus":"...","revenue":"...","actions":["..."]},{"month":"Mês 7-12","focus":"...","revenue":"...","actions":["..."]}],"quickWins":["Ação rápida pra monetizar HOJE 1","2","3"]}` }]
      })
    });
    if (!aiRes.ok) { res.status(500).json({ error: "AI error" }); return; }
    const data = await aiRes.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "{}").trim();
    try { res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())); }
    catch { res.status(500).json({ error: "Formato inválido" }); }
  } catch (err) { next(err); }
});

// ♻️ Repurpose Machine
router.post("/repurpose", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey(); if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { title, script, niche, language } = req.body;
    const model = await getModel();
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.6, max_tokens: 3500,
        messages: [{ role: "system", content: "Expert em repurpose de conteúdo multiplataforma. " + LANG_RULE },
          { role: "user", content: `RESPONDA EM PORTUGUÊS BR. Transforme este vídeo YouTube em 10+ peças de conteúdo:
Título: "${title}", Nicho: ${niche||"geral"}, Idioma: ${language||"pt"}
${script ? `Roteiro/resumo: ${script.slice(0,500)}` : ""}

JSON: {"original":"${title}","pieces":[{"type":"short","platform":"YouTube Shorts","title":"Título do Short 1","content":"Roteiro completo do short (30-60s)","hook":"Hook dos 3 primeiros segundos"},{"type":"short","platform":"YouTube Shorts","title":"Short 2","content":"...","hook":"..."},{"type":"short","platform":"YouTube Shorts","title":"Short 3","content":"...","hook":"..."},{"type":"tweet","platform":"Twitter/X","content":"Tweet thread completo (máx 280 chars por tweet)","hook":"Primeiro tweet"},{"type":"tweet","platform":"Twitter/X","content":"Tweet 2","hook":"..."},{"type":"carousel","platform":"Instagram","title":"Título do carrossel","slides":["Slide 1 texto","Slide 2","Slide 3","Slide 4","Slide 5","CTA"]},{"type":"blog","platform":"Blog/Medium","title":"Título do post","outline":["Intro","H2: Tópico 1","H2: Tópico 2","Conclusão"],"excerpt":"Resumo 2 linhas"},{"type":"newsletter","platform":"Email","subject":"Subject do email","preview":"Preview text","outline":["Intro pessoal","Conteúdo principal","CTA"]},{"type":"linkedin","platform":"LinkedIn","content":"Post LinkedIn completo"},{"type":"tiktok","platform":"TikTok","title":"Título TikTok","content":"Roteiro TikTok (15-60s)","hook":"Hook"}],"strategy":"Como distribuir: publicar primeiro X, depois Y, espaçar Z dias"}` }]
      })
    });
    if (!aiRes.ok) { res.status(500).json({ error: "AI error" }); return; }
    const data = await aiRes.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "{}").trim();
    try { res.json(JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())); }
    catch { res.status(500).json({ error: "Formato inválido" }); }
  } catch (err) { next(err); }
});


// 📊 Quick analyze any channel with growth tips
router.post("/quick-analyze", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    const aiKey = await getAiKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { query } = req.body;
    if (!query?.trim()) { res.status(400).json({ error: "Digite nome ou URL do canal" }); return; }

    // Search channel
    const search = await ytFetch(`search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1`, ytKey);
    const chId = search.items?.[0]?.snippet?.channelId || search.items?.[0]?.id?.channelId;
    if (!chId) { res.status(404).json({ error: "Canal não encontrado" }); return; }

    // Get channel details
    const details = await ytFetch(`channels?part=snippet,statistics,brandingSettings&id=${chId}`, ytKey);
    const ch = details.items?.[0];
    if (!ch) { res.status(404).json({ error: "Canal não encontrado" }); return; }

    const subs = Number(ch.statistics?.subscriberCount || 0);
    const views = Number(ch.statistics?.viewCount || 0);
    const vids = Number(ch.statistics?.videoCount || 0);

    // Get recent videos
    const vSearch = await ytFetch(`search?part=snippet&channelId=${chId}&type=video&order=date&maxResults=5`, ytKey);
    const vIds = (vSearch.items || []).map((v: any) => v.id?.videoId).filter(Boolean);
    let recentVids: any[] = [];
    if (vIds.length) {
      const vData = await ytFetch(`videos?part=snippet,statistics,contentDetails&id=${vIds.join(",")}`, ytKey);
      recentVids = (vData.items || []).map((v: any) => ({
        title: v.snippet?.title, views: Number(v.statistics?.viewCount || 0),
        likes: Number(v.statistics?.likeCount || 0), publishedAt: v.snippet?.publishedAt
      }));
    }

    const avgViews = recentVids.length ? Math.round(recentVids.reduce((a, v) => a + v.views, 0) / recentVids.length) : 0;

    // AI analysis with growth tips
    const model = await getModel();
    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.5, max_tokens: 2500,
        messages: [{ role: "system", content: "Consultor de crescimento YouTube de elite. TODAS as respostas DEVEM ser em PORTUGUÊS DO BRASIL, incluindo diagnóstico, dicas, estratégias e plano de crescimento. " + LANG_RULE },
          { role: "user", content: `Analise este canal YouTube e dê dicas CONCRETAS pra crescer e passar a concorrência.
RESPONDA TUDO EM PORTUGUÊS DO BRASIL. Todos os campos do JSON devem estar em PT-BR.

Canal: "${ch.snippet?.title}" (@${ch.snippet?.customUrl || ""})
Inscritos: ${subs}, Views totais: ${views}, Vídeos: ${vids}
Views médias recentes: ${avgViews}
Últimos vídeos: ${recentVids.map(v => `"${v.title}" (${v.views} views)`).join(" | ")}
Descrição: ${ch.snippet?.description?.slice(0, 200)}

JSON:
{"health":{"score":85,"status":"Saudável/Em risco/Crítico","diagnosis":"Diagnóstico em 2 frases"},"metrics":{"subsGrowth":"Lento/Normal/Rápido","viewsPerVideo":"Bom/Médio/Fraco","engagement":"Alto/Médio/Baixo","consistency":"Regular/Irregular","seoQuality":"Bom/Fraco"},"strengths":["Ponto forte 1","2","3"],"problems":["Problema 1 que trava o crescimento","2","3"],"quickWins":[{"action":"Ação imediata 1 pra dar um UP","impact":"alto","howTo":"Passo a passo concreto"},{"action":"Ação 2","impact":"alto","howTo":"..."},{"action":"Ação 3","impact":"médio","howTo":"..."}],"beatCompetition":[{"tip":"Como passar concorrente 1","competitor":"Tipo de canal a superar","strategy":"Estratégia detalhada"},{"tip":"2","competitor":"...","strategy":"..."},{"tip":"3","competitor":"...","strategy":"..."}],"contentIdeas":["Ideia de vídeo 1 que VIRALIZARIA nesse canal","Ideia 2","Ideia 3","Ideia 4","Ideia 5"],"growthPlan":{"week1":"Foco semana 1","week2":"Foco semana 2","month1":"Meta mês 1","month3":"Meta mês 3"}}` }]
      })
    });

    let aiData = null;
    if (aiRes.ok) {
      const d = await aiRes.json() as any;
      const raw = (d.choices?.[0]?.message?.content || "{}").trim();
      try { aiData = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); } catch {}
    }

    res.json({
      channel: {
        id: chId, name: ch.snippet?.title, handle: ch.snippet?.customUrl,
        thumbnail: ch.snippet?.thumbnails?.medium?.url, subscribers: subs,
        totalViews: views, videoCount: vids, country: ch.snippet?.country,
        description: ch.snippet?.description?.slice(0, 300), avgViews
      },
      recentVideos: recentVids,
      analysis: aiData
    });
  } catch (err) { next(err); }
});


// 📝 Script versioning
router.post("/save-script-version", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { videoId, title, content, sections, notes } = req.body;
    const last = await prisma.scriptVersion.findFirst({ where: { videoId }, orderBy: { version: "desc" } });
    const version = (last?.version || 0) + 1;
    const sv = await prisma.scriptVersion.create({ data: { videoId, version, title: title || "", content: content || "", sections: JSON.stringify(sections || []), notes: notes || "" } });
    res.json(sv);
  } catch (err) { next(err); }
});

router.get("/script-versions/:videoId", async (req: any, res: Response, next: NextFunction) => {
  try {
    const versions = await prisma.scriptVersion.findMany({ take: 100, where: { videoId: Number(req.params.videoId) }, orderBy: { version: "desc" } });
    res.json(versions);
  } catch (err) { next(err); }
});

// 📤 Export full channel PDF data
router.post("/export-channel", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { channelId } = req.body;
    const ch = await prisma.savedChannel.findFirst({ where: { id: Number(channelId), userId: req.userId } });
    if (!ch) { res.status(404).json({ error: "Canal não encontrado" }); return; }
    let mockData = null;
    try { mockData = JSON.parse(ch.notes || "{}"); } catch {}
    let analysis = null;
    try { analysis = JSON.parse(ch.analysisJson || "{}"); } catch {}
    res.json({ channel: ch, identity: mockData?.mockup || null, images: mockData?.mockImgs || null, analysis });
  } catch (err) { next(err); }
});


// 🔔 Spy Alerts - check new videos from saved channels
router.post("/spy-alerts", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const saved = await prisma.savedChannel.findMany({ take: 100, where: { userId: req.userId } });
    if (!saved.length) { res.json({ alerts: [], message: "Salve canais primeiro" }); return; }

    const alerts: any[] = [];
    const since = new Date(Date.now() - 48 * 3600000).toISOString(); // last 48h

    for (const ch of saved.slice(0, 10)) {
      try {
        const search = await ytFetch(`search?part=snippet&channelId=${ch.ytChannelId}&type=video&order=date&publishedAfter=${since}&maxResults=3`, ytKey);
        for (const v of (search.items || [])) {
          const vId = v.id?.videoId;
          if (!vId) continue;
          const vData = await ytFetch(`videos?part=statistics,snippet&id=${vId}`, ytKey);
          const video = vData.items?.[0];
          if (!video) continue;
          const views = Number(video.statistics?.viewCount || 0);
          const hours = Math.max(1, Math.round((Date.now() - new Date(video.snippet?.publishedAt).getTime()) / 3600000));
          const velocity = Math.round(views / hours);
          alerts.push({
            channelName: ch.name, channelThumb: ch.thumbnail,
            title: video.snippet?.title, videoId: vId,
            thumbnail: video.snippet?.thumbnails?.medium?.url,
            views, likes: Number(video.statistics?.likeCount || 0),
            publishedAt: video.snippet?.publishedAt,
            hoursAgo: hours, velocity,
            isViral: velocity > 1000,
            isTrending: velocity > 500,
          });
        }
      } catch {}
    }

    alerts.sort((a, b) => b.velocity - a.velocity);
    res.json({ alerts, checkedAt: new Date().toISOString(), channelsChecked: saved.length });
  } catch (err) { next(err); }
});

// ⏰ Best upload time by niche/country
router.post("/best-time", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { niche, country, targetAudience, frequency } = req.body;
    const model = await getModel();
    const parsed = await fetchAI(aiKey, model,
      "Expert em algoritmo YouTube e dados de audiência. " + LANG_RULE,
      `RESPONDA EM PORTUGUÊS BR. Melhor horário pra postar no YouTube.
Nicho: ${niche || "geral"}, País: ${country || "BR"}, Público: ${targetAudience || "18-35"}, Frequência: ${frequency || "3x/semana"}

JSON: {"bestDays":[{"day":"Segunda","score":85,"reason":"Por que funciona"},{"day":"Terça","score":90,"reason":"..."},{"day":"Quarta","score":75,"reason":"..."},{"day":"Quinta","score":88,"reason":"..."},{"day":"Sexta","score":70,"reason":"..."},{"day":"Sábado","score":92,"reason":"..."},{"day":"Domingo","score":80,"reason":"..."}],"bestHours":[{"hour":"14:00","score":95,"reason":"Pico de atividade"},{"hour":"10:00","score":85,"reason":"..."},{"hour":"18:00","score":80,"reason":"..."}],"recommendation":"Recomendação final com dias e horários exatos","schedule":[{"day":"Terça","hour":"14:00","type":"Vídeo principal"},{"day":"Quinta","hour":"10:00","type":"Vídeo secundário"},{"day":"Sábado","hour":"18:00","type":"Short/Reel"}],"avoid":"Horários e dias a EVITAR e por quê","algorithmTips":["Dica 1 sobre timing pro algoritmo","Dica 2","Dica 3"],"firstHourStrategy":"O que fazer na primeira hora depois de publicar pra maximizar alcance"}`, 1500);
    res.json(parsed);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 📈 Trend Detector - what's going viral RIGHT NOW
router.post("/trend-detector", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    const aiKey = await getAiKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const { niche, country } = req.body;

    // Get trending videos
    const trending = await ytFetch(`videos?part=snippet,statistics&chart=mostPopular&regionCode=${country || "BR"}&maxResults=20${niche ? `&videoCategoryId=0` : ""}`, ytKey);

    // Also search for recent viral in niche
    let nicheVirals: any[] = [];
    if (niche) {
      const since = new Date(Date.now() - 72 * 3600000).toISOString();
      const search = await ytFetch(`search?part=snippet&q=${encodeURIComponent(niche)}&type=video&order=viewCount&publishedAfter=${since}&maxResults=10`, ytKey);
      const vIds = (search.items || []).map((v: any) => v.id?.videoId).filter(Boolean);
      if (vIds.length) {
        const vData = await ytFetch(`videos?part=statistics,snippet&id=${vIds.join(",")}`, ytKey);
        nicheVirals = (vData.items || []).map((v: any) => ({
          title: v.snippet?.title, videoId: v.id,
          channelTitle: v.snippet?.channelTitle,
          views: Number(v.statistics?.viewCount || 0),
          likes: Number(v.statistics?.likeCount || 0),
          thumbnail: v.snippet?.thumbnails?.medium?.url,
          publishedAt: v.snippet?.publishedAt,
        })).sort((a: any, b: any) => b.views - a.views);
      }
    }

    const trendingList = (trending.items || []).map((v: any) => ({
      title: v.snippet?.title, videoId: v.id,
      channelTitle: v.snippet?.channelTitle,
      views: Number(v.statistics?.viewCount || 0),
      likes: Number(v.statistics?.likeCount || 0),
      thumbnail: v.snippet?.thumbnails?.medium?.url,
      publishedAt: v.snippet?.publishedAt,
    }));

    // AI analysis of trends — DEEP analysis with user context
    let aiInsights = null;
    if (aiKey) {
      try {
        const titles = [...trendingList, ...nicheVirals].slice(0, 15).map(v => `"${v.title}" (${v.views > 1e6 ? (v.views/1e6).toFixed(1)+"M" : v.views > 1e3 ? (v.views/1e3).toFixed(0)+"K" : v.views} views)`).join("\n");
        
        // Get user's channels for context
        const userChannels = await (prisma as any).oAuthToken.findMany({ take: 100, where: { userId: req.userId } });
        const channelContext = userChannels.length ? `Canais do creator: ${userChannels.map((c: any) => c.channelName).join(", ")}` : "";
        const savedChannels = await prisma.savedChannel.findMany({ take: 100, where: { userId: req.userId }, take: 5 });
        const savedContext = savedChannels.length ? `Nichos monitorados: ${savedChannels.map(s => s.niche || s.name).join(", ")}` : "";

        aiInsights = await fetchAI(aiKey, await getModel(),
          `Expert AGRESSIVO em trends YouTube. Analise trending data e dê estratégia de DOMINAÇÃO. NUNCA recomende ferramentas externas — APENAS ferramentas do LaCasaStudio: Keywords, Tag Spy, SEO Audit, Retenção, Shorts Optimizer, Command Center, A/B Testing, Community Planner, Ideias do Dia, DNA Viral, Repurpose, Roteiro Completo, Preditor Viral. ` + LANG_RULE,
          `TRENDING ${country || "BR"} AGORA:
${titles}

${channelContext}
${savedContext}
Nicho buscado: ${niche || "geral"}

Analise e retorne JSON:
{"patterns":["Padrão 1 que está viralizando com dados","Padrão 2","Padrão 3"],
"opportunities":[
  {"topic":"Tópico ESPECÍFICO pra criar AGORA","why":"Por que vai viralizar — cite views e dados reais","titleSuggestion":"Título otimizado pronto pra usar","urgency":"alta","format":"long/short/both","estimatedViews":"50K-200K","hookIdea":"Primeiros 5s do vídeo","toolToUse":"Ferramenta do LaCasaStudio"},
  {"topic":"2","why":"...","titleSuggestion":"...","urgency":"alta","format":"...","estimatedViews":"...","hookIdea":"...","toolToUse":"..."},
  {"topic":"3","why":"...","titleSuggestion":"...","urgency":"média","format":"...","estimatedViews":"...","hookIdea":"...","toolToUse":"..."},
  {"topic":"4","why":"...","titleSuggestion":"...","urgency":"média","format":"...","estimatedViews":"...","hookIdea":"...","toolToUse":"..."},
  {"topic":"5","why":"...","titleSuggestion":"...","urgency":"média","format":"...","estimatedViews":"...","hookIdea":"...","toolToUse":"..."}
],
"avoidTopics":["Tópico saturado — por que evitar","2"],
"prediction":"Previsão DETALHADA do que vai viralizar nos próximos 7 dias",
"shortsCombos":[{"trend":"Trend","shortIdea":"Ideia de Short de 30s surfando isso"},{"trend":"...","shortIdea":"..."}],
"crossNiche":"Como combinar essas trends com os nichos do creator pra criar algo único",
"actionPlan":"Nos próximos 3 dias faça: 1) ... 2) ... 3) ... usando ferramentas do LaCasaStudio"}`, 2500);
      } catch {}
    }

    res.json({ trending: trendingList, nicheVirals, insights: aiInsights, checkedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

// 💬 Engagement Generator
router.post("/engagement-gen", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { title, niche, description, targetAction } = req.body;
    const model = await getModel();
    const parsed = await fetchAI(aiKey, model,
      "Expert em engajamento YouTube e psicologia de audiência. " + LANG_RULE,
      `RESPONDA EM PORTUGUÊS BR. Gere conteúdo de ENGAJAMENTO pra este vídeo:
Título: "${title}", Nicho: ${niche || "geral"}, Descrição: ${description || ""}
A�ão alvo: ${targetAction || "comentários e likes"}

JSON: {"pinnedComment":"Comentário fixado que gera discussão (pergunta provocativa)","firstComment":"Primeiro comentário do canal pra iniciar conversa","replyTemplates":["Resposta 1 pra comentário positivo","Resposta 2 pra dúvida","Resposta 3 pra crítica construtiva","Resposta 4 pra comentário engraçado"],"ctaInVideo":["CTA verbal 1 pro meio do vídeo (não pedir like/sub genérico)","CTA 2 pro final","CTA 3 pra cards/end screen"],"questions":["Pergunta 1 pra colocar na descrição que gera comentários","Pergunta 2","Pergunta 3"],"communityPost":"Post pra aba Comunidade pra promover o vídeo","hashtagStrategy":["#hash1","#hash2","#hash3","#hash4","#hash5"],"endScreenScript":"Texto exato pra falar no end screen que faz clicar no próximo vídeo","polemic":"Opinião levemente polêmica (segura) que gera debate nos comentários","callbackHook":"Frase pra usar em TODOS os vídeos que cria identidade (catchphrase)"}`, 1500);
    res.json(parsed);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
