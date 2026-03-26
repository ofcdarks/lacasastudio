// @ts-nocheck
// ============================================
// server/src/routes/algorithm.ts
// Features: OAuth, A/B Test, Command Center, 
// Satisfaction, Playlists, Community, Shorts,
// Streaks, End Screens, Hype, Devices, AI Disclosure, Catalog
// ============================================

import { Router, Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
const router = Router();
// NOTE: do NOT use router.use(authenticate) here — callback needs to be public

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
  const timeout = setTimeout(() => controller.abort(), 90000); // 90s
  try {
    const res = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, temperature: 0.5, max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, { role: "user", content: user }] })
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Limite de requisições da IA atingido. Aguarde 1 minuto.");
      if (res.status === 401) throw new Error("API Key inválida ou expirada.");
      throw new Error(`Erro da IA (${res.status}). Tente novamente.`);
    }
    const data = await res.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "{}").trim();
    return JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("IA demorou mais de 90s. Tente novamente com menos dados.");
    throw e;
  }
}

const fmt = (n: number) => { if (n >= 1e6) return (n/1e6).toFixed(1)+"M"; if (n >= 1e3) return (n/1e3).toFixed(1)+"K"; return String(n); };


// ═══════════════════════════════════════════
// 1. YOUTUBE OAUTH
// ═══════════════════════════════════════════
const OAUTH_CLIENT_ID = process.env.YT_OAUTH_CLIENT_ID || "";
const OAUTH_CLIENT_SECRET = process.env.YT_OAUTH_CLIENT_SECRET || "";
const OAUTH_REDIRECT = process.env.YT_OAUTH_REDIRECT || "http://localhost:3000/api/algorithm/oauth/callback";

// ── OAuth callback MUST be public (Google redirects here without JWT) ──
router.get("/oauth/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const userId = Number(state);
    if (!code || !userId) { res.redirect("/?oauth=error"); return; }
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: String(code), client_id: OAUTH_CLIENT_ID, client_secret: OAUTH_CLIENT_SECRET, redirect_uri: OAUTH_REDIRECT, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json() as any;
    if (tokens.error) { res.redirect("/?oauth=error&reason=" + encodeURIComponent(tokens.error)); return; }
    const at = tokens.access_token;

    // Get ALL channels this Google account has access to (includes Brand Accounts)
    const allChannels: any[] = [];

    // 1. Primary channel (mine=true)
    const myRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", { headers: { Authorization: `Bearer ${at}` } });
    const myData = await myRes.json() as any;
    if (myData.items?.length) allChannels.push(...myData.items);

    // 2. Brand accounts / managed channels (listByHandle doesn't work, but we can check managedByMe)
    try {
      const managedRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&managedByMe=true&maxResults=50", { headers: { Authorization: `Bearer ${at}` } });
      const managedData = await managedRes.json() as any;
      if (managedData.items?.length) {
        for (const ch of managedData.items) {
          if (!allChannels.find((c: any) => c.id === ch.id)) allChannels.push(ch);
        }
      }
    } catch {} // managedByMe may not be available for all account types

    // Save each channel
    let savedCount = 0;
    for (const ch of allChannels) {
      const chId = ch.id || "";
      if (!chId) continue;
      const existing = await (prisma as any).oAuthToken.findFirst({ where: { userId, channelId: chId } });
      if (existing) {
        await (prisma as any).oAuthToken.update({ where: { id: existing.id }, data: { accessToken: at, refreshToken: tokens.refresh_token || existing.refreshToken, expiresAt: String(Date.now() + (tokens.expires_in || 3600) * 1000), channelName: ch.snippet?.title || "", thumbnail: ch.snippet?.thumbnails?.default?.url || "", subscribers: String(ch.statistics?.subscriberCount || "0") } });
      } else {
        await (prisma as any).oAuthToken.create({ data: { userId, accessToken: at, refreshToken: tokens.refresh_token || "", expiresAt: String(Date.now() + (tokens.expires_in || 3600) * 1000), scope: tokens.scope || "", channelId: chId, channelName: ch.snippet?.title || "", thumbnail: ch.snippet?.thumbnails?.default?.url || "", subscribers: String(ch.statistics?.subscriberCount || "0") } });
      }
      savedCount++;

      // Auto-create platform channel if not exists
      try {
        const existingPlatformCh = await prisma.channel.findFirst({ where: { userId, name: ch.snippet?.title || "" } });
        if (!existingPlatformCh && ch.snippet?.title) {
          await prisma.channel.create({
            data: {
              userId,
              name: ch.snippet.title,
              icon: "📺",
              subs: String(ch.statistics?.subscriberCount || "0"),
              views: String(ch.statistics?.viewCount || "0"),
              videoCount: Number(ch.statistics?.videoCount || 0),
            }
          });
        }
      } catch {} // non-fatal
    }
    res.redirect(`/my-analytics?oauth=success&channels=${savedCount}`);
  } catch (e: any) { res.redirect("/?oauth=error&reason=" + encodeURIComponent(e.message || "unknown")); }
});

// ── All routes below require authentication ──
router.use(authenticate);

router.get("/oauth/url", async (req: any, res: Response) => {
  if (!OAUTH_CLIENT_ID) { res.status(400).json({ error: "YT_OAUTH_CLIENT_ID não configurado no .env do servidor" }); return; }
  if (!OAUTH_CLIENT_SECRET) { res.status(400).json({ error: "YT_OAUTH_CLIENT_SECRET não configurado no .env do servidor" }); return; }
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
  ].join(" ");
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${req.userId}`;
  res.json({ url });
});

router.get("/oauth/status", async (req: any, res: Response) => {
  const channels = await (prisma as any).oAuthToken.findMany({ take: 100, where: { userId: req.userId } });
  const first = channels[0];
  res.json({ connected: channels.length > 0, channelCount: channels.length, channelName: first?.channelName || "", channelId: first?.channelId || "", channels: channels.map((c: any) => ({ id: c.id, channelId: c.channelId, channelName: c.channelName, thumbnail: c.thumbnail || "", subscribers: c.subscribers || "0" })) });
});

// List all connected channels
router.get("/oauth/channels", async (req: any, res: Response) => {
  const channels = await (prisma as any).oAuthToken.findMany({ take: 100, where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
  res.json(channels.map((c: any) => ({ id: c.id, channelId: c.channelId, channelName: c.channelName, thumbnail: c.thumbnail || "", subscribers: c.subscribers || "0" })));
});

// Remove a connected channel
router.delete("/oauth/channel/:id", async (req: any, res: Response) => {
  await (prisma as any).oAuthToken.deleteMany({ where: { id: Number(req.params.id), userId: req.userId } });
  res.json({ ok: true });
});

async function getAccessToken(userId: number, channelId?: string): Promise<string | null> {
  let token: any;
  if (channelId) {
    token = await (prisma as any).oAuthToken.findFirst({ where: { userId, channelId } });
  } else {
    token = await (prisma as any).oAuthToken.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  }
  if (!token) return null;
  if (Date.now() > Number(token.expiresAt) - 60000) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ refresh_token: token.refreshToken, client_id: OAUTH_CLIENT_ID, client_secret: OAUTH_CLIENT_SECRET, grant_type: "refresh_token" }),
      });
      const data = await res.json() as any;
      if (data.access_token) {
        await (prisma as any).oAuthToken.update({ where: { id: token.id }, data: { accessToken: data.access_token, expiresAt: String(Date.now() + (data.expires_in || 3600) * 1000) } });
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
// AI-POWERED INSIGHTS — DEEP ANALYSIS
// ═══════════════════════════════════════════
router.post("/ai-insights", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { totals, growth, traffic, devices, countries, searches, revenue, videos, channelName, period } = req.body;
    if (!totals) { res.status(400).json({ error: "Dados obrigatórios" }); return; }
    const result = await fetchAI(
      `Você é o ESTRATEGISTA #1 de YouTube do Brasil. Você analisa dados REAIS do YouTube Analytics e dá um plano de guerra que coloca o canal à frente de TODOS os concorrentes. 

REGRAS ABSOLUTAS:
- NUNCA recomende ferramentas externas (TubeBuddy, vidIQ, Canva, Google Trends, etc)
- APENAS referencie ferramentas do LaCasaStudio: "Keywords" (pesquisa palavras-chave), "Tag Spy" (espiar tags), "SEO Audit" (auditoria), "Retenção" (análise por cena), "Shorts Optimizer" (otimizar shorts), "Command Center 48h" (monitorar pós-publish), "A/B Testing" (testar thumbs/títulos), "Community Planner" (posts comunidade), "Hype Strategy" (boost 7 dias), "Re-Otimizar Catálogo" (SEO vídeos antigos), "Upload Streak" (consistência), "Comparador" (comparar concorrentes), "Ideias do Dia" (ideias personalizadas), "DNA Viral" (extrair fórmula), "Blueprint" (plano de canal), "Pipeline" (criar canal do zero), "Roteiro Completo" (scripts), "Preditor Viral" (prever viralização), "Repurpose" (repost multi-plataforma), "Meu Canal" (dados reais OAuth), "Shorts Clipper" (cortar shorts de roteiros)
- Cada conselho DEVE citar um número real dos dados
- Diga coisas que concorrentes NÃO sabem
- Seja AGRESSIVO nas recomendações — o objetivo é DOMINAR o nicho
` + LANG_RULE,
      `DADOS REAIS DO CANAL "${channelName}" (últimos ${period || 28} dias):

═══ MÉTRICAS CORE ═══
Views: ${totals.views||0} | Watch Time: ${Math.round(totals.watchTime||0)} min | AVD: ${totals.avgDuration||0}s
Retenção: ${totals.avgPct||0}% | Satisfaction: ${totals.satisfaction||0}%
NOTA: CTR de impressões (thumbnail) NÃO está disponível via YouTube Analytics API — use a taxa de engajamento (${totals.engagementRate||0}%) e views/dia (${totals.viewsPerDay||0}) como indicadores de performance.
Likes: ${totals.likes||0} | Dislikes: ${totals.dislikes||0} | Comments: ${totals.comments||0}
Shares: ${totals.shares||0} | Subs+: ${totals.subsGained||0} | Subs-: ${totals.subsLost||0}
Engagement Rate: ${totals.engagementRate||0}% | Views/dia: ${totals.viewsPerDay||0}

${growth ? `═══ VS PERÍODO ANTERIOR ═══
Views: ${growth.viewsChange>0?"+":""}${growth.viewsChange}% | WatchTime: ${growth.watchTimeChange>0?"+":""}${growth.watchTimeChange}%
Likes: ${growth.likesChange>0?"+":""}${growth.likesChange}% | Subs: ${growth.subsChange>0?"+":""}${growth.subsChange}%` : ""}

${traffic?.length ? `═══ FONTES DE TRÁFEGO ═══\n${traffic.slice(0,8).map((t:any)=>`${t.source}: ${t.views} views (${t.pct}%) — ${t.watchTime}min`).join("\n")}` : ""}

${devices?.length ? `═══ DISPOSITIVOS ═══\n${devices.map((d:any)=>`${d.device}: ${d.pct}% (${d.views} views, AVD ${d.avgDuration}s)`).join("\n")}` : ""}

${countries?.length ? `═══ PAÍSES (top 10) ═══\n${countries.slice(0,10).map((c:any)=>`${c.country}: ${c.views} views, +${c.subsGained} subs`).join("\n")}` : ""}

${searches?.length ? `═══ TERMOS DE BUSCA QUE TRAZEM VIEWERS ═══\n${searches.slice(0,15).map((s:any)=>`"${s.term}": ${s.views} views`).join("\n")}` : ""}

${revenue ? `═══ RECEITA ═══\nEstimada: $${revenue.estimated?.toFixed(2)} | CPM: $${revenue.cpm?.toFixed(2)} | Playbacks monetizados: ${revenue.monetizedPlaybacks}` : "Canal não monetizado ou sem dados de receita"}

${videos?.length ? `═══ TOP VÍDEOS ═══\n${videos.slice(0,8).map((v:any,i:number)=>`${i+1}. "${v.title}" — ${v.views} views, ${v.avgPct||0}% ret, ${v.avgDuration||0}s AVD, ${v.likes} likes, +${v.subsGained} subs`).join("\n")}` : ""}

RETORNE JSON (sem markdown, sem backticks):
{
  "healthScore": 0-100,
  "healthLabel": "Frase curta tipo 'Canal forte com oportunidade explosiva em Shorts'",
  "diagnosis": "Parágrafo de 4-5 frases CITANDO NÚMEROS REAIS. Ex: 'Sua taxa de engajamento de X% mostra audiência ativa, a retenção de Y% indica que viewers ficam até o final. Os termos de busca mostram que Z é seu tópico mais forte...' NUNCA mencione CTR=0% — essa métrica não está disponível via API.",
  
  "urgentActions": [
    {"action": "Ação ultra-específica", "why": "Explicação citando números reais do canal", "impact": "alto", "metric": "Qual métrica melhora e em quanto", "tool": "Nome exato da ferramenta no LaCasaStudio", "steps": "Passo 1 → Passo 2 → Passo 3"},
    {"action": "...", "why": "...", "impact": "alto/medio", "metric": "...", "tool": "...", "steps": "..."},
    {"action": "...", "why": "...", "impact": "medio", "metric": "...", "tool": "...", "steps": "..."}
  ],
  
  "weeklyPlan": [
    {"day": "Segunda", "task": "Tarefa específica com detalhes", "time": "Xmin", "tool": "Ferramenta LaCasaStudio exata", "why": "Por que neste dia"},
    {"day": "Terça", "task": "...", "time": "...", "tool": "...", "why": "..."},
    {"day": "Quarta", "task": "...", "time": "...", "tool": "...", "why": "..."},
    {"day": "Quinta", "task": "...", "time": "...", "tool": "...", "why": "..."},
    {"day": "Sexta", "task": "...", "time": "...", "tool": "...", "why": "..."},
    {"day": "Sábado", "task": "...", "time": "...", "tool": "...", "why": "..."},
    {"day": "Domingo", "task": "...", "time": "...", "tool": "...", "why": "..."}
  ],

  "trafficInsights": "Análise de 3-4 frases das fontes de tráfego citando os números. Ex: 'YT_SEARCH traz X% mas SUGGESTED só Y% — isso significa que seu SEO é bom mas o algoritmo não está recomendando. Use Tag Spy e Keywords para...'",

  "deviceStrategy": "2-3 frases sobre como adaptar conteúdo baseado nos devices. Ex: 'Com X% mobile e Y% TV, crie versões curtas (8min) e longas (25min) do mesmo tema...'",

  "searchTermGold": [
    {"term": "termo de busca real que aparece nos dados", "views": 123, "opportunity": "Por que este termo é ouro e o que fazer com ele", "action": "Ação específica usando qual ferramenta do LaCasaStudio"}
  ],

  "contentStrategy": "Parágrafo de 5-6 frases: que tipo de vídeo fazer, duração ideal BASEADA nos dados de AVD, frequência, formato (long/short/mix), tom, estilo de thumbnail. Tudo citando números.",

  "algorithmSecrets": [
    "Insight profundo #1 que concorrentes não sabem — baseado nos SEUS dados reais",
    "Insight #2 com ação específica",
    "Insight #3 sobre timing/formato"
  ],

  "nextVideo": {
    "titleIdea": "Título otimizado baseado nos termos de busca reais",
    "whyThisTitle": "Explicação de por que este título vai funcionar baseado nos dados",
    "optimalDuration": "X-Y min (baseado no AVD real)",
    "bestDay": "Dia da semana",
    "bestHour": "Horário estimado",
    "format": "long/short/both",
    "hook": "Sugestão de hook para os primeiros 5 segundos",
    "seoKeywords": ["keyword1", "keyword2", "keyword3"],
    "thumbnailTip": "Dica específica de thumbnail para este vídeo"
  },

  "shortsStrategy": "3-4 frases sobre estratégia de Shorts baseada nos dados (200B views/dia em Shorts 2026)",

  "warnings": ["Alerta crítico citando dados reais", "Segundo alerta se houver"],
  
  "competitiveEdge": "2-3 frases sobre o que te diferencia e como usar o LaCasaStudio para sair na frente. Ex: 'Seus concorrentes não têm dados de search terms — use Keywords + Tag Spy para dominar esses termos antes deles'",

  "growth30d": "Previsão detalhada com números: 'Se seguir este plano, estimo +X% views, +Y subs, e Z receita baseado na tendência atual de +W% do período anterior'",
  
  "monetization": "Conselho de monetização baseado nos dados de receita (se disponível) ou como alcançar monetização"
}`,
      3500
    );
    res.json(result);
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

// AI insights for Command Center (post-publish)
router.post("/command-center/insights", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { video, layer, vsChannel, channelName, isMonetized } = req.body;
    const v = video || {};
    const totalViews = v.totalViews || v.views || 0;
    const totalLikes = v.totalLikes || v.likes || 0;
    const totalComments = v.totalComments || v.comments || 0;
    const engRate = totalViews > 0 ? ((totalLikes + totalComments + (v.shares||0)) / totalViews * 100).toFixed(1) : "0";
    const likesRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : "0";
    const isRecent = v.daysSincePublish !== null && v.daysSincePublish <= 7;

    // Check channel info
    const channel = await prisma.channel.findFirst({ where: { userId: req.userId }, select: { subs: true, views: true, videoCount: true } });
    const subsCount = channel?.subs ? parseInt(channel.subs) : 0;
    const isChannelMonetized = isMonetized || subsCount >= 1000;

    const result = await fetchAI(
      `Voce e o EXPERT #1 em otimizacao de videos YouTube pos-publicacao. Voce analisa dados REAIS e gera acoes ESPECIFICAS E COPIAVEIS — o usuario so precisa copiar e colar.
REGRAS ABSOLUTAS:
- NUNCA sugira ferramentas externas. APENAS ferramentas do LaCasaStudio.
- NUNCA sugira "monetizar" se o canal JA E MONETIZADO.
- Cada acao DEVE ter um texto EXATO para copiar (titulo novo, descricao, tags, comentario fixado).
- Responda em portugues brasileiro. ` + LANG_RULE,
      `DADOS REAIS DO VIDEO "${v.title || ""}":
Canal: "${channelName}" (${subsCount > 0 ? subsCount + " subs" : "subs desconhecido"})
Status monetizacao: ${isChannelMonetized ? "JA MONETIZADO — nao sugerir monetizacao" : "Nao monetizado ainda"}
Views totais: ${totalViews} (Data API, tempo real)
Likes: ${totalLikes} | Comments: ${totalComments} | Shares: ${v.shares||0}
Taxa de engajamento: ${engRate}% | Likes/views: ${likesRate}%
AVD: ${Math.round(v.avgDuration||0)}s (avg canal: ${vsChannel?.avgDuration||0}s)
Views vs Canal: ${vsChannel?.viewsVsAvg||0}%
Satisfaction: ${v.satisfaction||0}%
Camada atual: ${layer||"testing"}
Publicado ha: ${v.daysSincePublish !== null ? v.daysSincePublish + " dias" : "desconhecido"}
Velocidade: ${v.velocity || 0} views/dia
Tags: ${v.tagCount||0}
Titulo atual: "${v.title || ""}"
${v.avgDuration === 0 && isRecent ? "NOTA: AVD/WatchTime ainda indisponiveis (delay 48-72h)" : ""}

GERE ACOES COM TEXTOS PRONTOS PARA COPIAR. JSON:
{
  "status": "🟢 Performando bem / 🟡 Precisa ajustes / 🔴 Baixo desempenho + motivo especifico",
  "diagnosis": "3-4 frases analisando dados reais. ${isChannelMonetized ? "Canal ja monetizado, focar em otimizar receita e CTR." : ""}",
  "immediateActions": [
    {"action": "Acao especifica", "priority": "urgente", "timeNeeded": "5min", "copyText": "Texto exato para copiar e colar (titulo, descricao, tag, comentario fixado)"},
    {"action": "Segunda acao", "priority": "importante", "timeNeeded": "10min", "copyText": "Texto para copiar"},
    {"action": "Terceira acao", "priority": "recomendado", "timeNeeded": "30min", "copyText": "Texto para copiar"}
  ],
  "thumbChange": true/false,
  "thumbReason": "Motivo baseado nos dados",
  "titleChange": true/false,
  "titleSuggestion": "Novo titulo COMPLETO pronto para copiar e colar no YouTube Studio",
  "newDescription": "Descricao nova COMPLETA (5-10 linhas) otimizada para SEO, pronta para copiar e colar. Inclui hashtags.",
  "newTags": "lista,de,tags,separadas,por,virgula,prontas,para,colar,no,youtube,studio",
  "pinnedComment": "Texto do comentario fixado que aumenta engajamento — pronto para copiar",
  "layerPrediction": "Previsao de quando muda de camada",
  "whatToPost": "Conteudo complementar pra postar AGORA",
  "nextCheckIn": "Quando checar novamente",
  "seoQuickFix": "Usar SEO Audit ou Catalog Optimizer do LaCasaStudio",
  "engagementTip": "Como aumentar engajamento"
}`,
      3000
    );
    res.json(result);
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

// Get latest video from connected channel
router.get("/my-channel/latest-video", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "YouTube API Key não configurada" }); return; }
    const oauthToken = await (prisma as any).oAuthToken.findFirst({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
    if (!oauthToken?.channelId) { res.status(400).json({ error: "Conecte YouTube primeiro" }); return; }
    const chData = await ytFetch(`channels?part=contentDetails&id=${oauthToken.channelId}`, ytKey);
    const uploads = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) { res.json({ video: null }); return; }
    const pl = await ytFetch(`playlistItems?part=contentDetails,snippet&playlistId=${uploads}&maxResults=5`, ytKey);
    const items = (pl.items || []).map((i: any) => ({ videoId: i.contentDetails?.videoId, title: i.snippet?.title, thumbnail: i.snippet?.thumbnails?.medium?.url, publishedAt: i.snippet?.publishedAt }));
    res.json({ videos: items, latest: items[0] || null, channelName: oauthToken.channelName });
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

// AI Fix for SEO Audit — generates corrected title/description/tags
router.post("/seo-ai-fix", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { title, description, tags, checks, niche, views, channelTitle } = req.body;
    const failedChecks = (checks || []).filter((c: any) => !c.pass);
    const result = await fetchAI(
      "Expert em YouTube SEO. Corrija TODOS os problemas e gere título, descrição e tags PRONTOS PARA COLAR. " + LANG_RULE,
      `Vídeo: "${title}" do canal "${channelTitle}" (${views} views). Nicho: ${niche || "geral"}

PROBLEMAS ENCONTRADOS NO AUDIT:
${failedChecks.map((c: any) => `❌ ${c.label}: ${c.tip}`).join("\n")}

TÍTULO ATUAL: ${title}
DESCRIÇÃO ATUAL: ${(description||"").slice(0,500)}
TAGS ATUAIS: ${(tags||[]).join(", ")}

GERE VERSÕES CORRIGIDAS COMPLETAS (prontas pra copiar e colar no YouTube):
JSON: {
  "newTitle": "Título corrigido (40-65 chars, com gatilho emocional e número)",
  "titleScore": 85,
  "titleChanges": ["O que mudou e por quê"],
  "newDescription": "Descrição COMPLETA com 200+ palavras, timestamps, hashtags, links placeholder, CTA, keywords naturais. Pronta pra colar.",
  "descScore": 90,
  "descChanges": ["O que mudou e por quê"],
  "newTags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10","tag11","tag12","tag13","tag14","tag15"],
  "tagScore": 95,
  "tagChanges": ["O que mudou e por quê"],
  "estimatedScoreAfter": 85,
  "estimatedCTRBoost": "+15-25%"
}`,
      3000
    );
    res.json(result);
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});


// ═══════════════════════════════════════════
// 2. REAL CHANNEL ANALYTICS — FULL DATA PULL
// ═══════════════════════════════════════════
router.get("/my-channel/overview", async (req: any, res: Response, next: NextFunction) => {
  try {
    const chId = req.query.channelId as string | undefined;
    const at = await getAccessToken(req.userId, chId);
    if (!at) { res.status(401).json({ error: "Conecte sua conta YouTube" }); return; }
    const days = Number(req.query.days) || 28;
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    const prevStart = new Date(Date.now() - days * 2 * 86400000).toISOString().split("T")[0];
    const prevEnd = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    const base = `ids=channel==MINE&startDate=${start}&endDate=${end}`;
    const prevBase = `ids=channel==MINE&startDate=${prevStart}&endDate=${prevEnd}`;

    // Pull ALL available metrics in parallel — ONLY metrics that work together
    const [daily, trafficSrc, deviceData, countryData, searchTerms, playbackLoc, prevPeriod, revenueData, channelStats] = await Promise.allSettled([
      // 1. Daily core metrics (NO card/annotation metrics — they break index alignment)
      ytAnalytics(at, `${base}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost&dimensions=day&sort=day`),
      // 2. Traffic sources
      ytAnalytics(at, `${base}&metrics=views,estimatedMinutesWatched&dimensions=insightTrafficSourceType&sort=-views`),
      // 3. Device breakdown
      ytAnalytics(at, `${base}&metrics=views,estimatedMinutesWatched,averageViewDuration&dimensions=deviceType&sort=-views`),
      // 4. Country breakdown (top 15)
      ytAnalytics(at, `${base}&metrics=views,estimatedMinutesWatched,subscribersGained&dimensions=country&sort=-views&maxResults=15`),
      // 5. Search terms
      ytAnalytics(at, `${base}&metrics=views&dimensions=insightTrafficSourceDetail&filters=insightTrafficSourceType==YT_SEARCH&sort=-views&maxResults=25`),
      // 6. Playback locations
      ytAnalytics(at, `${base}&metrics=views,estimatedMinutesWatched&dimensions=insightPlaybackLocationType&sort=-views`),
      // 7. Previous period
      ytAnalytics(at, `${prevBase}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost`),
      // 8. Revenue (if monetized) — separate call, may fail
      ytAnalytics(at, `${base}&metrics=estimatedRevenue,estimatedAdRevenue,grossRevenue,monetizedPlaybacks,playbackBasedCpm,adImpressions`).catch(() => null),
      // 9. Channel stats from YouTube Data API (subscribers, total views, video count)
      fetch("https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true", { headers: { Authorization: `Bearer ${at}` } }).then(r => r.json()),
    ]);

    // Parse channel stats (subscribers, total views)
    const chStatsRaw = channelStats.status === "fulfilled" ? (channelStats.value as any) : null;
    const chStats = chStatsRaw?.items?.[0];
    const channelInfo = {
      subscribers: Number(chStats?.statistics?.subscriberCount || 0),
      totalViews: Number(chStats?.statistics?.viewCount || 0),
      videoCount: Number(chStats?.statistics?.videoCount || 0),
      channelName: chStats?.snippet?.title || "",
      thumbnail: chStats?.snippet?.thumbnails?.default?.url || "",
    };

    // Also update the OAuth record with fresh subscriber count
    if (channelInfo.subscribers > 0) {
      const oauthRecord = await (prisma as any).oAuthToken.findFirst({ where: { userId: req.userId, ...(chId ? { channelId: chId } : {}) }, orderBy: { createdAt: "desc" } });
      if (oauthRecord) {
        await (prisma as any).oAuthToken.update({ where: { id: oauthRecord.id }, data: { subscribers: String(channelInfo.subscribers), channelName: channelInfo.channelName || oauthRecord.channelName, thumbnail: channelInfo.thumbnail || oauthRecord.thumbnail } }).catch(() => {});
      }
    }

    // Daily metrics: indices are now correct (0=date, 1=views, 2=watchTime, 3=avgDuration, 4=avgPct, 5=likes, 6=dislikes, 7=comments, 8=shares, 9=subsGained, 10=subsLost)
    const rows = daily.status === "fulfilled" ? (daily.value.rows || []) : [];
    const totals = rows.reduce((a: any, r: any) => ({
      views: a.views + (r[1]||0), watchTime: a.watchTime + (r[2]||0),
      likes: a.likes + (r[5]||0), dislikes: a.dislikes + (r[6]||0), comments: a.comments + (r[7]||0),
      shares: a.shares + (r[8]||0), subsGained: a.subsGained + (r[9]||0), subsLost: a.subsLost + (r[10]||0),
    }), { views: 0, watchTime: 0, likes: 0, dislikes: 0, comments: 0, shares: 0, subsGained: 0, subsLost: 0 });

    totals.avgDuration = rows.length ? Math.round(rows.reduce((a: number, r: any) => a + (r[3]||0), 0) / rows.length) : 0;
    totals.avgPct = rows.length ? Math.round(rows.reduce((a: number, r: any) => a + (r[4]||0), 0) / rows.length) : 0;
    totals.satisfaction = totals.likes + totals.dislikes > 0 ? Math.round((totals.likes / (totals.likes + totals.dislikes)) * 100) : 0;
    totals.netSubs = totals.subsGained - totals.subsLost;
    totals.engagementRate = totals.views > 0 ? +((totals.likes + totals.comments + totals.shares) / totals.views * 100).toFixed(2) : 0;
    totals.viewsPerDay = rows.length ? Math.round(totals.views / rows.length) : 0;
    totals.likesPerView = totals.views > 0 ? +((totals.likes / totals.views) * 100).toFixed(2) : 0;
    totals.commentsPerView = totals.views > 0 ? +((totals.comments / totals.views) * 100).toFixed(2) : 0;
    totals.sharesPerView = totals.views > 0 ? +((totals.shares / totals.views) * 100).toFixed(2) : 0;

    // Previous period comparison
    const prevRows = prevPeriod.status === "fulfilled" ? (prevPeriod.value.rows || []) : [];
    const prev = prevRows.length ? { views: prevRows.reduce((a: number, r: any) => a + (r[1]||0), 0), watchTime: prevRows.reduce((a: number, r: any) => a + (r[2]||0), 0), likes: prevRows.reduce((a: number, r: any) => a + (r[5]||0), 0), subsGained: prevRows.reduce((a: number, r: any) => a + (r[9]||0), 0) } : null;
    const growth = prev ? {
      viewsChange: prev.views > 0 ? Math.round(((totals.views - prev.views) / prev.views) * 100) : 0,
      watchTimeChange: prev.watchTime > 0 ? Math.round(((totals.watchTime - prev.watchTime) / prev.watchTime) * 100) : 0,
      likesChange: prev.likes > 0 ? Math.round(((totals.likes - prev.likes) / prev.likes) * 100) : 0,
      subsChange: prev.subsGained > 0 ? Math.round(((totals.subsGained - prev.subsGained) / prev.subsGained) * 100) : 0,
    } : null;

    // Traffic sources
    const traffic = trafficSrc.status === "fulfilled" ? (trafficSrc.value.rows || []).map((r: any) => ({ source: r[0], views: r[1], watchTime: Math.round(r[2]) })) : [];
    const totalTrafficViews = traffic.reduce((a: any, t: any) => a + t.views, 0) || 1;
    traffic.forEach((t: any) => t.pct = Math.round((t.views / totalTrafficViews) * 100));

    // Devices
    const devices = deviceData.status === "fulfilled" ? (deviceData.value.rows || []).map((r: any) => ({ device: r[0], views: r[1], watchTime: Math.round(r[2]), avgDuration: Math.round(r[3]) })) : [];
    const totalDevViews = devices.reduce((a: any, d: any) => a + d.views, 0) || 1;
    devices.forEach((d: any) => d.pct = Math.round((d.views / totalDevViews) * 100));

    // Countries
    const countries = countryData.status === "fulfilled" ? (countryData.value.rows || []).map((r: any) => ({ country: r[0], views: r[1], watchTime: Math.round(r[2]), subsGained: r[3] })) : [];

    // Search terms (what people search to find your videos)
    const searches = searchTerms.status === "fulfilled" ? (searchTerms.value.rows || []).map((r: any) => ({ term: r[0], views: r[1] })) : [];

    // Playback locations
    const playback = playbackLoc.status === "fulfilled" ? (playbackLoc.value.rows || []).map((r: any) => ({ location: r[0], views: r[1], watchTime: Math.round(r[2]) })) : [];

    // Revenue (if available)
    const revenue = revenueData.status === "fulfilled" && revenueData.value ? {
      estimated: revenueData.value.rows?.[0]?.[1] || 0,
      adRevenue: revenueData.value.rows?.[0]?.[2] || 0,
      gross: revenueData.value.rows?.[0]?.[3] || 0,
      monetizedPlaybacks: revenueData.value.rows?.[0]?.[4] || 0,
      cpm: revenueData.value.rows?.[0]?.[5] || 0,
      adImpressions: revenueData.value.rows?.[0]?.[6] || 0,
    } : null;

    const dailyChart = rows.map((r: any) => ({ date: r[0], views: r[1], watchTime: Math.round(r[2]), avgDuration: Math.round(r[3]||0), avgPct: Math.round(r[4]||0), likes: r[5], comments: r[7], subsGained: r[9] }));

    res.json({ totals, growth, traffic, devices, countries, searches, playback, revenue, channelInfo, daily: dailyChart, period: { start, end, days } });
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.get("/my-channel/videos", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.userId);
    if (!at) { res.status(401).json({ error: "Conecte sua conta YouTube" }); return; }
    const days = Number(req.query.days) || 28;
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

    const data = await ytAnalytics(at, `ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained&dimensions=video&sort=-views&maxResults=50`);

    const videos = (data.rows || []).map((r: any) => ({
      videoId: r[0], views: r[1], watchTimeMin: Math.round(r[2]), avgDuration: Math.round(r[3]),
      avgPct: Math.round(r[4]), likes: r[5], comments: r[6], shares: r[7], subsGained: r[8],
      satisfaction: r[5] > 0 ? Math.round((r[5] / (r[5] + 1)) * 100) : 0,
      engagementRate: r[1] > 0 ? +((r[5] + r[6] + r[7]) / r[1] * 100).toFixed(1) : 0,
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

// Traffic sources & devices for a specific video
router.get("/my-channel/video/:videoId/details", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.userId);
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});


// ═══════════════════════════════════════════
// 3. THUMBNAIL/TITLE A/B TESTING
// ═══════════════════════════════════════════
router.post("/ab-test/create", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.userId);
    if (!at) { res.status(401).json({ error: "Conecte sua conta YouTube" }); return; }
    const { videoId, type, variants, rotationHrs } = req.body;
    if (!videoId || !variants?.length) { res.status(400).json({ error: "videoId e variants obrigatórios" }); return; }

    const test = await (prisma as any).aBTest.create({
      data: { videoId, type: type || "thumbnail", variants: JSON.stringify(variants.map((v: any, i: number) => ({ ...v, id: i, impressions: 0, clicks: 0, ctr: 0, watchTime: 0 }))), rotationHrs: rotationHrs || 1, userId: req.userId }
    });
    res.json(test);
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.get("/ab-test/list", async (req: any, res: Response, next: NextFunction) => {
  try {
    const tests = await (prisma as any).aBTest.findMany({ take: 100, where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 20 });
    res.json(tests.map((t: any) => ({ ...t, variants: JSON.parse(t.variants || "[]") })));
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/ab-test/:id/rotate", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.userId);
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/ab-test/:id/complete", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { winnerId } = req.body;
    await (prisma as any).aBTest.update({ where: { id: Number(req.params.id) }, data: { status: "completed", winnerId, endedAt: new Date().toISOString() } });
    res.json({ ok: true });
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});


// ═══════════════════════════════════════════
// 4. POST-PUBLISH COMMAND CENTER (48h)
// ═══════════════════════════════════════════
router.post("/command-center", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.userId);
    if (!at) { res.status(401).json({ error: "Conecte YouTube" }); return; }
    const { videoId } = req.body;
    if (!videoId) { res.status(400).json({ error: "videoId obrigatório" }); return; }
    const ytKey = await getYtKey();

    const end = new Date().toISOString().split("T")[0];
    const start28 = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];
    const start7 = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // Pull BOTH: lifetime stats (Data API) + recent analytics (Analytics API)
    const [dataApiRes, analytics28, analytics7, dailyData, chAvgRes] = await Promise.allSettled([
      // 1. LIFETIME stats from YouTube Data API (total views, likes, comments)
      ytKey ? ytFetch(`videos?part=snippet,statistics,contentDetails&id=${videoId}`, ytKey) : Promise.resolve(null),
      // 2. 28-day analytics from YouTube Analytics API
      ytAnalytics(at, `ids=channel==MINE&startDate=${start28}&endDate=${end}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost&filters=video==${videoId}`),
      // 3. 7-day analytics (more recent trend)
      ytAnalytics(at, `ids=channel==MINE&startDate=${start7}&endDate=${end}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost&filters=video==${videoId}`),
      // 4. Daily breakdown (28 days)
      ytAnalytics(at, `ids=channel==MINE&startDate=${start28}&endDate=${end}&metrics=views,estimatedMinutesWatched,likes,comments,subscribersGained&dimensions=day&filters=video==${videoId}&sort=day`),
      // 5. Channel averages (90 days, top 20 videos)
      ytAnalytics(at, `ids=channel==MINE&startDate=${new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]}&endDate=${end}&metrics=views,averageViewDuration,averageViewPercentage&dimensions=video&sort=-views&maxResults=20`),
    ]);

    // Parse lifetime stats from Data API
    const videoData = dataApiRes.status === "fulfilled" ? (dataApiRes.value as any)?.items?.[0] : null;
    const lifetime = {
      title: videoData?.snippet?.title || "",
      thumbnail: videoData?.snippet?.thumbnails?.medium?.url || "",
      publishedAt: videoData?.snippet?.publishedAt || "",
      duration: videoData?.contentDetails?.duration || "",
      totalViews: Number(videoData?.statistics?.viewCount || 0),
      totalLikes: Number(videoData?.statistics?.likeCount || 0),
      totalComments: Number(videoData?.statistics?.commentCount || 0),
      tags: videoData?.snippet?.tags || [],
      description: videoData?.snippet?.description || "",
    };

    // Parse recent analytics (28 days)
    const a28 = analytics28.status === "fulfilled" ? (analytics28.value.rows?.[0] || []) : [];
    const a7 = analytics7.status === "fulfilled" ? (analytics7.value.rows?.[0] || []) : [];

    // Use BEST available data: lifetime from Data API, recent from Analytics API
    const views = lifetime.totalViews || a28[0] || 0;
    const likes = lifetime.totalLikes || a28[4] || 0;
    const dislikes = a28[5] || 0;
    const comments = lifetime.totalComments || a28[6] || 0;
    const shares = a28[7] || 0;
    const subsGained = a28[8] || 0;
    const subsLost = a28[9] || 0;
    const avgDuration = a28[2] || 0;
    const avgPct = a28[3] || 0;
    const watchTime = a28[1] || 0;

    // Recent 7-day views for velocity
    const views7d = a7[0] || 0;
    const velocity = views7d > 0 ? Math.round(views7d / 7) : 0; // views per day recently

    // Determine algorithm layer based on TOTAL views + recent velocity
    let layer = "testing";
    if (views > 100000 || velocity > 5000) layer = "viral";
    else if (views > 10000 || velocity > 1000) layer = "adjacent";
    else if (views > 1000 || velocity > 100) layer = "topic";
    else if (views > 100 || velocity > 10) layer = "recent";
    else if (views > 10) layer = "core";

    const satisfaction = likes + dislikes > 0 ? Math.round((likes / (likes + dislikes)) * 100) : 0;

    // Days since publish
    const publishDate = lifetime.publishedAt ? new Date(lifetime.publishedAt) : null;
    const daysSincePublish = publishDate ? Math.floor((Date.now() - publishDate.getTime()) / 86400000) : null;
    const isFirst48h = daysSincePublish !== null && daysSincePublish <= 2;

    // Channel averages
    const chAvg = chAvgRes.status === "fulfilled" ? chAvgRes.value : { rows: [] };
    const avgViews = chAvg.rows?.length ? Math.round(chAvg.rows.reduce((a: number, r: any) => a + r[1], 0) / chAvg.rows.length) : 0;
    const avgChannelDuration = chAvg.rows?.length ? Math.round(chAvg.rows.reduce((a: number, r: any) => a + r[2], 0) / chAvg.rows.length) : 0;

    // Save snapshot
    await (prisma as any).videoPerformance.create({
      data: { ytVideoId: videoId, views, likes, dislikes, comments, shares, subsGained, subsLost, avgViewDuration: avgDuration, avgViewPct: avgPct, watchTimeMin: watchTime, satisfaction, layer, userId: req.userId }
    }).catch(() => {});

    // Daily chart
    const daily = dailyData.status === "fulfilled" ? (dailyData.value.rows || []).map((r: any) => ({ date: r[0], views: r[1], watchTime: Math.round(r[2]), likes: r[3], comments: r[4], subs: r[5] })) : [];

    res.json({
      video: {
        id: videoId, title: lifetime.title, thumbnail: lifetime.thumbnail, publishedAt: lifetime.publishedAt,
        views, watchTime: Math.round(watchTime), avgDuration: Math.round(avgDuration), avgPct: Math.round(avgPct),
        likes, dislikes, comments, shares, subsGained, subsLost, satisfaction,
        totalViews: lifetime.totalViews, totalLikes: lifetime.totalLikes, totalComments: lifetime.totalComments,
        views7d, velocity, daysSincePublish, isFirst48h, tagCount: lifetime.tags.length,
      },
      layer,
      layerLabel: { testing: "Testando", core: "Audiência Core", recent: "Viewers Recentes", topic: "Match de Tópico", adjacent: "Audiência Adjacente", viral: "Viral" }[layer],
      vsChannel: {
        avgViews, avgDuration: avgChannelDuration,
        viewsVsAvg: avgViews > 0 ? Math.round((views / avgViews) * 100) : 0,
        durationVsAvg: avgChannelDuration > 0 ? Math.round((avgDuration / avgChannelDuration) * 100) : 0,
      },
      daily,
    });
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});


// ═══════════════════════════════════════════
// 5. SATISFACTION SCORE
// ═══════════════════════════════════════════
router.get("/satisfaction", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.userId);
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/community/save", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { type, content, options, scheduledAt, videoId, channelId } = req.body;
    const post = await (prisma as any).communityPost.create({
      data: { type, content, options: JSON.stringify(options || []), scheduledAt: scheduledAt || "", videoId, channelId, userId: req.userId }
    });
    res.json(post);
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.get("/community/list", async (req: any, res: Response, next: NextFunction) => {
  try {
    const posts = await (prisma as any).communityPost.findMany({ take: 100, where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 30 });
    res.json(posts.map((p: any) => ({ ...p, options: JSON.parse(p.options || "[]") })));
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});


// ═══════════════════════════════════════════
// 9. UPLOAD STREAK TRACKER
// ═══════════════════════════════════════════
router.post("/streak/log", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { date, videoTitle, type, channelId } = req.body;
    const d = date || new Date().toISOString().split("T")[0];
    await (prisma as any).uploadStreak.create({ data: { userId: req.userId, channelId, date: d, videoTitle: videoTitle || "", type: type || "long" } });
    res.json({ ok: true });
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.get("/streak/data", async (req: any, res: Response, next: NextFunction) => {
  try {
    // Auto-sync: pull actual uploads from YouTube API
    const ytKey = await getYtKey();
    const oauthToken = await (prisma as any).oAuthToken.findFirst({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
    if (ytKey && oauthToken?.channelId) {
      try {
        const chData = await ytFetch(`channels?part=contentDetails&id=${oauthToken.channelId}`, ytKey);
        const uploads = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (uploads) {
          const pl = await ytFetch(`playlistItems?part=snippet&playlistId=${uploads}&maxResults=50`, ytKey);
          for (const item of (pl.items || [])) {
            const pubDate = item.snippet?.publishedAt?.split("T")[0];
            const title = item.snippet?.title || "";
            if (pubDate && title) {
              const exists = await (prisma as any).uploadStreak.findFirst({ where: { userId: req.userId, date: pubDate, videoTitle: title } });
              if (!exists) {
                await (prisma as any).uploadStreak.create({ data: { userId: req.userId, date: pubDate, videoTitle: title, type: "long" } }).catch(() => {});
              }
            }
          }
        }
      } catch {} // Don't fail if sync fails
    }

    const entries = await (prisma as any).uploadStreak.findMany({ take: 100,
      where: { userId: req.userId }, orderBy: { date: "desc" }, take: 365,
    });
    const dates: string[] = entries.map((e: any) => String(e.date));
    const uniqueDates = Array.from(new Set(dates)).sort();

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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});


// ═══════════════════════════════════════════
// 13. CATALOG RE-OPTIMIZATION
// ═══════════════════════════════════════════
router.post("/catalog/scan", async (req: any, res: Response, next: NextFunction) => {
  try {
    const ytKey = await getYtKey();
    if (!ytKey) { res.status(400).json({ error: "Configure YouTube API Key" }); return; }
    const oauthToken = await (prisma as any).oAuthToken.findFirst({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
    const channelId = oauthToken?.channelId;
    if (!channelId) { res.status(400).json({ error: "Conecte YouTube primeiro" }); return; }

    const chData = await ytFetch(`channels?part=contentDetails&id=${channelId}`, ytKey);
    const uploads = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) { res.status(400).json({ error: "Canal não encontrado" }); return; }

    const pl = await ytFetch(`playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=50`, ytKey);
    const videoIds = (pl.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
    if (!videoIds.length) { res.json({ videos: [], totalScanned: 0, needsWork: 0 }); return; }

    const vData = await ytFetch(`videos?part=snippet,statistics&id=${videoIds.join(",")}`, ytKey);
    const results: any[] = [];

    for (const v of (vData.items || [])) {
      const title = v.snippet?.title || "";
      const desc = v.snippet?.description || "";
      const tags = v.snippet?.tags || [];
      const views = Number(v.statistics?.viewCount || 0);
      const likes = Number(v.statistics?.likeCount || 0);
      const comments = Number(v.statistics?.commentCount || 0);
      const issues: string[] = [];

      if (title.length < 30) issues.push("Título muito curto (<30 chars)");
      if (title.length > 70) issues.push("Título muito longo (>70 chars)");
      if (desc.split(/\s+/).length < 50) issues.push("Descrição curta (<50 palavras)");
      if (tags.length < 3) issues.push("Poucas tags (<3)");
      if (tags.length > 0 && tags.length < 8) issues.push("Poucas tags (ideal: 8-15)");
      if (!/\d{1,2}:\d{2}/.test(desc)) issues.push("Sem timestamps");
      if (!/#\w+/.test(desc)) issues.push("Sem hashtags");
      if (!/https?:\/\//.test(desc)) issues.push("Sem links");
      if (!/inscreva|subscribe|suscri/i.test(desc)) issues.push("Sem CTA na descrição");

      const seoScore = Math.max(0, 100 - issues.length * 12);

      results.push({
        videoId: v.id, title, views, likes, comments, tagCount: tags.length,
        descWordCount: desc.split(/\s+/).length, seoScore, issues,
        thumbnail: v.snippet?.thumbnails?.medium?.url,
        publishedAt: v.snippet?.publishedAt,
      });

      // Save audit (simple create, ignore duplicates)
      await (prisma as any).catalogAudit.create({
        data: { ytVideoId: v.id, title, seoScore, issues: JSON.stringify(issues), userId: req.userId }
      }).catch(() => {});
    }

    results.sort((a: any, b: any) => a.seoScore - b.seoScore);
    res.json({ totalScanned: vData.items?.length || 0, needsWork: results.filter((r: any) => r.seoScore < 70).length, videos: results });
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/catalog/fix", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { videoId, issues, title } = req.body;
    if (!videoId) { res.status(400).json({ error: "videoId obrigatório" }); return; }

    // Fetch REAL video data from YouTube API
    const ytKey = await getYtKey();
    let realTitle = title || videoId;
    let realDesc = "";
    let realTags: string[] = [];
    let channelTitle = "";
    let views = 0;

    if (ytKey) {
      try {
        // Bust cache to get fresh data
        for (const [k] of cache) { if (k.includes(videoId)) cache.delete(k); }
        const vData = await ytFetch(`videos?part=snippet,statistics&id=${videoId}`, ytKey);
        const v = vData.items?.[0];
        if (v) {
          realTitle = v.snippet?.title || title || videoId;
          realDesc = v.snippet?.description || "";
          realTags = v.snippet?.tags || [];
          channelTitle = v.snippet?.channelTitle || "";
          views = Number(v.statistics?.viewCount || 0);
        }
      } catch {}
    }

    const result = await fetchAI(
      `Expert #1 em YouTube SEO. Você recebe dados REAIS de um vídeo e deve corrigir TODOS os problemas mantendo a essência do conteúdo original. NUNCA mude o tema do vídeo. O título corrigido deve ser sobre o MESMO assunto. As tags devem ser do MESMO nicho. A descrição deve falar do MESMO conteúdo. ` + LANG_RULE,
      `DADOS REAIS DO VÍDEO:
Título atual: "${realTitle}"
Canal: "${channelTitle}"
Views: ${views}
Tags atuais (${realTags.length}): ${realTags.join(", ")}
Descrição atual (${realDesc.split(/\s+/).length} palavras): "${realDesc.slice(0, 800)}"

PROBLEMAS ENCONTRADOS: ${JSON.stringify(issues)}

CORRIJA mantendo o MESMO tema/assunto do vídeo. JSON:
{
  "newTitle": "Título corrigido (40-65 chars, mesmo assunto, com gatilho emocional + número se possível)",
  "newDescription": "Descrição COMPLETA com 200+ palavras sobre o MESMO tema. Incluir: resumo do vídeo em 2-3 frases, timestamps (00:00 Intro, 01:30 etc), 3-5 hashtags relevantes ao tema, links placeholder (🔗 Inscreva-se: [link]), CTA. Pronta pra COPIAR e COLAR no YouTube.",
  "newTags": ["15 tags relevantes ao tema do vídeo", "mix de curtas e longas", "inclui keyword do título"],
  "changes": ["Explicação de cada mudança feita e por quê"]
}`,
      3000
    );
    res.json(result);
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});


// ═══════════════════════════════════════════
// 14. DEVICE PATTERN ANALYZER  
// ═══════════════════════════════════════════
router.get("/devices", async (req: any, res: Response, next: NextFunction) => {
  try {
    const at = await getAccessToken(req.userId);
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
  } catch (err: any) { console.error("algorithm error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});


export default router;

// ═══ Action Log / Command Center Checklist ═══

// Save actions from AI analysis
router.post("/actions", authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { videoId, videoTitle, actions } = req.body;
    if (!videoId || !actions?.length) { res.status(400).json({ error: "Dados insuficientes" }); return; }
    const created = [];
    for (const a of actions) {
      try {
        const log = await (prisma as any).actionLog.create({ data: {
          userId: req.userId, videoId, videoTitle: videoTitle || "",
          action: a.action || "", category: a.category || "geral",
          priority: a.priority || "media", aiSuggestion: a.aiSuggestion || a.action || "",
        }});
        created.push(log);
      } catch {}
    }
    res.json({ created: created.length, actions: created });
  } catch (err: any) {
    if (err.code === "P2021") res.json({ created: 0, actions: [] });
    else console.error("algorithm error:", err?.message || err); res.status(500).json({ error: err?.message || "Erro interno" });
  }
});

// Toggle action completed
router.put("/actions/:id/toggle", authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const log = await (prisma as any).actionLog.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!log) { res.status(404).json({ error: "Ação não encontrada" }); return; }
    const updated = await (prisma as any).actionLog.update({
      where: { id: log.id },
      data: { completed: !log.completed, completedAt: !log.completed ? new Date() : null, userNote: req.body.note || log.userNote },
    });
    res.json(updated);
  } catch (err: any) {
    if (err.code === "P2021") res.json({ ok: true });
    else console.error("algorithm error:", err?.message || err); res.status(500).json({ error: err?.message || "Erro interno" });
  }
});

// Get actions for a video
router.get("/actions/:videoId", authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const actions = await (prisma as any).actionLog.findMany({
      where: { userId: req.userId, videoId: req.params.videoId },
      orderBy: { createdAt: "desc" },
    });
    res.json(actions);
  } catch (err: any) {
    if (err.code === "P2021") res.json([]);
    else console.error("algorithm error:", err?.message || err); res.status(500).json({ error: err?.message || "Erro interno" });
  }
});

// Get all user action history
router.get("/actions-history", authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const actions = await (prisma as any).actionLog.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    // Group by video
    const grouped = {};
    for (const a of actions) {
      if (!grouped[a.videoId]) grouped[a.videoId] = { videoId: a.videoId, videoTitle: a.videoTitle, actions: [], completed: 0, total: 0 };
      grouped[a.videoId].actions.push(a);
      grouped[a.videoId].total++;
      if (a.completed) grouped[a.videoId].completed++;
    }
    res.json(Object.values(grouped));
  } catch (err: any) {
    if (err.code === "P2021") res.json([]);
    else console.error("algorithm error:", err?.message || err); res.status(500).json({ error: err?.message || "Erro interno" });
  }
});
