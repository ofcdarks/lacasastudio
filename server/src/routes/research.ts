import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
const router = Router();
router.use(authenticate);

async function getYtKey(): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key: "youtube_api_key" } });
  return s?.value || "";
}

async function getAiKey(): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key: "laozhang_api_key" } });
  return s?.value || "";
}

async function ytFetch(path: string, ytKey: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}${sep}key=${ytKey}`);
  if (!res.ok) throw new Error(`YouTube API: ${res.status}`);
  return res.json() as any;
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

    const search = await ytFetch(`search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=${maxResults || 12}&order=relevance`, ytKey);
    const channelIds = (search.items || []).map((i: any) => i.snippet?.channelId || i.id?.channelId).filter(Boolean);
    if (!channelIds.length) { res.json({ channels: [] }); return; }

    const details = await ytFetch(`channels?part=snippet,statistics,brandingSettings,topicDetails&id=${channelIds.join(",")}`, ytKey);
    const channels = (details.items || []).map((ch: any) => {
      const subs = Number(ch.statistics?.subscriberCount || 0);
      const views = Number(ch.statistics?.viewCount || 0);
      const vids = Number(ch.statistics?.videoCount || 0);
      const score = calcScore(subs, views, vids);
      const topics = ch.topicDetails?.topicCategories?.map((t: string) => t.split("/").pop()) || [];
      return {
        ytChannelId: ch.id, name: ch.snippet?.title || "", handle: ch.snippet?.customUrl || "",
        thumbnail: ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url || "",
        subscribers: subs, totalViews: views, videoCount: vids, country: ch.snippet?.country || "N/A",
        score, tier: getTier(score), topics,
        description: ch.snippet?.description?.slice(0, 200) || "",
        publishedAt: ch.snippet?.publishedAt || "",
      };
    });

    channels.sort((a: any, b: any) => b.score - a.score);
    res.json({ channels });
  } catch (err) { next(err); }
});

// Deep analyze a single channel
router.post("/analyze", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    const aiKey = await getAiKey();
    if (!ytKey) { res.status(400).json({ error: "Configure a YouTube API Key" }); return; }
    const { channelId } = req.body as { channelId: string };

    // Get channel details
    const chData = await ytFetch(`channels?part=snippet,statistics,brandingSettings,topicDetails,contentDetails&id=${channelId}`, ytKey);
    const ch = chData.items?.[0];
    if (!ch) { res.status(404).json({ error: "Canal não encontrado" }); return; }

    const uploadsPlaylist = ch.contentDetails?.relatedPlaylists?.uploads;
    let recentVideos: any[] = [];
    if (uploadsPlaylist) {
      const pl = await ytFetch(`playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylist}&maxResults=30`, ytKey);
      const videoIds = (pl.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
      if (videoIds.length) {
        const vids = await ytFetch(`videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}`, ytKey);
        recentVideos = (vids.items || []).map((v: any) => {
          const dur = v.contentDetails?.duration || "PT0S";
          const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          const secs = (Number(match?.[1]||0)*3600) + (Number(match?.[2]||0)*60) + Number(match?.[3]||0);
          return {
            id: v.id, title: v.snippet?.title, publishedAt: v.snippet?.publishedAt,
            views: Number(v.statistics?.viewCount || 0), likes: Number(v.statistics?.likeCount || 0),
            comments: Number(v.statistics?.commentCount || 0), durationSecs: secs,
            tags: v.snippet?.tags?.slice(0, 10) || [],
          };
        });
      }
    }

    // Calculate analytics
    const subs = Number(ch.statistics?.subscriberCount || 0);
    const views = Number(ch.statistics?.viewCount || 0);
    const vids = Number(ch.statistics?.videoCount || 0);
    const score = calcScore(subs, views, vids);
    const topics = ch.topicDetails?.topicCategories?.map((t: string) => t.split("/").pop()) || [];

    // Upload frequency
    const dates = recentVideos.map(v => new Date(v.publishedAt)).sort((a, b) => b.getTime() - a.getTime());
    let uploadsPerWeek = 0;
    let bestDay = "N/A";
    let bestHour = "N/A";
    if (dates.length >= 2) {
      const span = (dates[0].getTime() - dates[dates.length - 1].getTime()) / (1000 * 60 * 60 * 24 * 7);
      uploadsPerWeek = span > 0 ? Math.round((dates.length / span) * 10) / 10 : 0;
      const dayCounts: any = {}; const hourCounts: any = {};
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      dates.forEach(d => { dayCounts[dayNames[d.getUTCDay()]] = (dayCounts[dayNames[d.getUTCDay()]] || 0) + 1; hourCounts[d.getUTCHours()] = (hourCounts[d.getUTCHours()] || 0) + 1; });
      bestDay = Object.entries(dayCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "N/A";
      bestHour = Object.entries(hourCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] + ":00 UTC" || "N/A";
    }

    // Avg duration
    const avgSecs = recentVideos.length ? Math.round(recentVideos.reduce((s, v) => s + v.durationSecs, 0) / recentVideos.length) : 0;
    const avgMin = Math.floor(avgSecs / 60);
    const avgDuration = `${avgMin}:${String(avgSecs % 60).padStart(2, "0")}`;

    // Top videos
    const topVideos = [...recentVideos].sort((a, b) => b.views - a.views).slice(0, 5);
    const avgViews = recentVideos.length ? Math.round(recentVideos.reduce((s, v) => s + v.views, 0) / recentVideos.length) : 0;
    const avgLikes = recentVideos.length ? Math.round(recentVideos.reduce((s, v) => s + v.likes, 0) / recentVideos.length) : 0;
    const engRate = avgViews > 0 ? Math.round((avgLikes / avgViews) * 10000) / 100 : 0;

    // Modelable countries (based on language/niche — simplified)
    const country = ch.snippet?.country || "N/A";
    const lang = ch.snippet?.defaultLanguage || ch.brandingSettings?.channel?.defaultLanguage || "en";

    // AI analysis for niche/subNiche/microNiche
    let aiAnalysis: any = { niche: "", subNiche: "", microNiche: "", modelable: false, modelableCountries: [], recommendation: "" };
    if (aiKey) {
      try {
        const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
          body: JSON.stringify({
            model: "claude-sonnet-4-6", temperature: 0.3, max_tokens: 1000,
            messages: [
              { role: "system", content: "Analise canais do YouTube. Responda APENAS em JSON válido sem markdown." },
              { role: "user", content: `Analise este canal YouTube e responda em JSON:
Canal: "${ch.snippet?.title}" (${subs} inscritos, ${vids} vídeos, ${views} views)
País: ${country}, Idioma: ${lang}
Tópicos: ${topics.join(", ")}
Descrição: ${ch.snippet?.description?.slice(0, 300)}
Top vídeos: ${topVideos.map(v => v.title).join(" | ")}
Tags frequentes: ${topVideos.flatMap(v => v.tags).slice(0, 20).join(", ")}

JSON formato:
{"niche":"Nicho principal","subNiche":"Sub-nicho","microNiche":"Micro-nicho específico","modelable":true/false,"modelableCountries":["País1","País2"],"recommendation":"Análise de 2-3 frases se vale modelar, pontos fortes/fracos, oportunidade","contentType":"Tipo de conteúdo (faceless, talking head, tutorial, etc)","monetization":"Estimativa de monetização","growthPotential":"alto/médio/baixo","competitionLevel":"alta/média/baixa"}` }
            ]
          })
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json() as any;
          const raw = aiData.choices?.[0]?.message?.content || "";
          try { aiAnalysis = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); } catch {}
        }
      } catch {}
    }

    const result = {
      ytChannelId: ch.id, name: ch.snippet?.title, handle: ch.snippet?.customUrl || "",
      thumbnail: ch.snippet?.thumbnails?.medium?.url || "", description: ch.snippet?.description || "",
      subscribers: subs, totalViews: views, videoCount: vids, country, language: lang,
      publishedAt: ch.snippet?.publishedAt, score, tier: getTier(score), topics,
      uploadsPerWeek, bestDay, bestHour, avgDuration, avgViews, avgLikes, engRate,
      topVideos, recentVideos: recentVideos.slice(0, 10),
      ...aiAnalysis,
    };

    res.json(result);
  } catch (err) { next(err); }
});

// Save channel
router.post("/save", async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = req.body as any;
    const existing = await prisma.savedChannel.findFirst({ where: { userId: req.userId, ytChannelId: data.ytChannelId } });
    if (existing) { res.status(400).json({ error: "Canal já salvo" }); return; }
    const saved = await prisma.savedChannel.create({ data: {
      userId: req.userId, ytChannelId: data.ytChannelId, name: data.name || "", handle: data.handle || "",
      thumbnail: data.thumbnail || "", subscribers: data.subscribers || 0, totalViews: data.totalViews || 0,
      videoCount: data.videoCount || 0, country: data.country || "", score: data.score || 0,
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
    const channels = await prisma.savedChannel.findMany({ where: { userId: req.userId }, orderBy: { score: "desc" } });
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

export default router;

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
        model: "claude-sonnet-4-6", temperature: 0.4, max_tokens: 3000,
        messages: [
          { role: "system", content: "Você é o maior especialista em análise de vídeos virais do YouTube. Analise padrões e extraia o DNA viral. Responda APENAS JSON válido." },
          { role: "user", content: `Analise o DNA viral deste canal e seus top vídeos:
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
    const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    res.json(parsed);
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
        model: "claude-sonnet-4-6", temperature: 0.3, max_tokens: 4000,
        messages: [
          { role: "system", content: "Você é consultor expert em criação de canais YouTube modelados. Crie blueprints detalhados e acionáveis. Responda APENAS JSON válido." },
          { role: "user", content: `Crie um BLUEPRINT COMPLETO para modelar este canal:
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
        model: "claude-sonnet-4-6", temperature: 0.7, max_tokens: 3000,
        messages: [
          { role: "system", content: "Expert em títulos virais e thumbnails para YouTube. Gere títulos otimizados para CTR e prompts de thumbnail. APENAS JSON." },
          { role: "user", content: `Baseado neste canal de referência, gere títulos + thumbnails para um canal modelado:
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
