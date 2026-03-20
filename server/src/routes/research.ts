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

async function getModel(): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key: "ai_model" } });
  return s?.value || "claude-sonnet-4-6";
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
        channelAge: ch.snippet?.publishedAt ? Math.floor((Date.now() - new Date(ch.snippet.publishedAt).getTime()) / (86400000 * 30)) : 0,
      };
    });

    // Filter: only show channels worth modeling (score >= 40, min 5 videos)
    const filtered = channels.filter((c: any) => c.score >= 40 && c.videoCount >= 5);
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
      subscribers: subs, totalViews: views, videoCount: vids, country, language: lang,
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
        model: await getModel(), temperature: 0.7, max_tokens: 3000,
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

// 🔥 Trending/Hype videos
router.post("/trending", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure a YouTube API Key" }); return; }
    const { period, regionCode } = req.body as { period?: string; regionCode?: string };
    // Get trending videos
    const data = await ytFetch(`videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${regionCode || "US"}&maxResults=20`, ytKey);
    const videos = (data.items || []).map((v: any) => {
      const dur = v.contentDetails?.duration || "PT0S";
      const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const secs = (Number(match?.[1]||0)*3600) + (Number(match?.[2]||0)*60) + Number(match?.[3]||0);
      return {
        id: v.id, title: v.snippet?.title, channelTitle: v.snippet?.channelTitle,
        channelId: v.snippet?.channelId,
        thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || "",
        views: Number(v.statistics?.viewCount || 0),
        likes: Number(v.statistics?.likeCount || 0),
        comments: Number(v.statistics?.commentCount || 0),
        publishedAt: v.snippet?.publishedAt,
        durationSecs: secs,
        category: v.snippet?.categoryId,
      };
    });

    // Filter by period
    const now = Date.now();
    const filtered = videos.filter((v: any) => {
      if (!v.publishedAt) return true;
      const age = now - new Date(v.publishedAt).getTime();
      const day = 86400000;
      if (period === "day") return age < day;
      if (period === "week") return age < day * 7;
      if (period === "month") return age < day * 30;
      return true;
    });

    res.json({ videos: filtered.length > 0 ? filtered : videos });
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
        messages: [{ role: "system", content: "Analise tendências de YouTube cross-country. APENAS JSON." },
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
          subscribers: Number(ch.statistics?.subscriberCount || 0),
          totalViews: Number(ch.statistics?.viewCount || 0),
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
        messages: [{ role: "system", content: "Expert em CTR e psicologia de títulos YouTube. APENAS JSON." },
          { role: "user", content: `Analise estes títulos e dê score de CTR (0-100). Nicho: ${niche}. Público: ${targetAudience || "geral"}.
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
        messages: [{ role: "system", content: "Expert em estratégia de conteúdo YouTube. Crie calendários editoriais detalhados. APENAS JSON." },
          { role: "user", content: `Crie calendário de 30 dias para canal YouTube modelado:
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
    const { channelName, niche, subNiche, style, targetCountry, language, originalChannel } = req.body;

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: await getModel(), temperature: 0.6, max_tokens: 3000,
        messages: [{ role: "system", content: "Expert em branding de canais YouTube. Crie identidades visuais completas. APENAS JSON." },
          { role: "user", content: `Crie identidade visual completa para um canal YouTube modelado:
Canal modelado de: "${originalChannel || "canal de referência"}"
Nicho: ${niche} > ${subNiche || ""}
Estilo: ${style || "faceless/2D"}
País: ${targetCountry || "US"}, Idioma: ${language || "en"}
Nome sugerido: ${channelName || "gerar"}

Retorne JSON:
{
  "channelName": "Nome final do canal",
  "tagline": "Slogan curto",
  "description": "Descrição completa do canal (sobre)",
  "logoPrompt": "Prompt DETALHADO para gerar logo no ImageFX: estilo, cores, elementos, formato circular, fundo transparente",
  "bannerPrompt": "Prompt DETALHADO para gerar banner 2560x1440 no ImageFX: composição, cores, texto, elementos, estilo",
  "videos": [
    {"title": "Título do vídeo 1", "thumbnailPrompt": "Prompt DETALHADO para thumbnail: composição, cores, texto overlay, elementos visuais, estilo 16:9", "views": "Estimativa", "duration": "10:00"},
    {"title": "Título do vídeo 2", "thumbnailPrompt": "...", "views": "...", "duration": "..."},
    {"title": "Título do vídeo 3", "thumbnailPrompt": "...", "views": "...", "duration": "..."},
    {"title": "Título do vídeo 4", "thumbnailPrompt": "...", "views": "...", "duration": "..."}
  ],
  "colors": {"primary": "#hex", "secondary": "#hex", "accent": "#hex"},
  "fonts": "Fontes recomendadas",
  "keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"]
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

export default router;

// Comparador side-by-side (reuse spy but structured for comparison)
// Already handled by /spy endpoint - frontend will format as comparison
