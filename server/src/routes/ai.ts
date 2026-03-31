// @ts-nocheck
import { Router, Response, NextFunction } from "express";
import { ImageFX } from "../services/imagefx";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { decryptValue } from "../middleware/encrypt";
import { upload } from "../middleware/upload";
import NotifService from "../services/notifications";
import cache from "../services/cache";
import { resolveAIConfig, callAIWithConfig } from "../services/ai-resolver";
const router = Router();
router.use(authenticate);

const LAOZHANG_URL = "https://api.laozhang.ai/v1/chat/completions";

const VIRAL_SYSTEM = `Você é o maior especialista do mundo em produção de vídeos virais para YouTube. Seu conhecimento inclui:
- Algoritmo do YouTube (CTR, AVD, retenção, impressões)
- Psicologia de audiência (curiosity gap, pattern interrupt, open loops)
- Storytelling para vídeos (hook nos primeiros 8 segundos, momentos de retenção a cada 30s)
- SEO avançado (títulos, tags, descrições que rankeiam)
- Thumbnails que convertem (3 elementos: emoção + texto + contraste)
Você SEMPRE responde em português brasileiro. Seja direto, prático e acionável.
REGRA DE IDIOMA: Toda explicação, análise, dica, feedback e estratégia SEMPRE em PT-BR. O conteúdo do canal (títulos, descrições, tags, roteiros) deve ser no idioma escolhido pelo usuário.`;

async function getApiKey(userId?: number): Promise<string> {
  if (userId) {
    const config = await resolveAIConfig(userId);
    return config.apiKey;
  }
  const cached = cache.get<string>("api_key");
  if (cached) return cached;
  const s = await prisma.setting.findUnique({ where: { key: "laozhang_api_key" } });
  const key = s?.value || "";
  if (key) cache.set("api_key", key, 60000);
  return key;
}

async function getModel(): Promise<string> {
  const cached = cache.get<string>("ai_model");
  if (cached) return cached;
  const s = await prisma.setting.findUnique({ where: { key: "ai_model" } });
  const model = s?.value || "claude-sonnet-4-6";
  cache.set("ai_model", model, 60000);
  return model;
}

async function callAI(apiKeyOrUserId: string | number, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  // If called with userId (number), use resolver
  if (typeof apiKeyOrUserId === "number") {
    const config = await resolveAIConfig(apiKeyOrUserId);
    return callAIWithConfig(config, systemPrompt, userPrompt);
  }
  // Legacy: called with apiKey string, use LaoZhang
  const res = await fetch(LAOZHANG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKeyOrUserId}` },
    body: JSON.stringify({
      model, temperature: 0.7, max_tokens: 4000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error (${res.status}): ${err}`);
  }
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON<T>(raw: string): T {
  return JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
}

router.post("/seo", async (req: any, res: Response, next: NextFunction) => {
  try {
    const config = await resolveAIConfig(req.userId);
    if (!config.apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const apiKey = config.apiKey;
    const model = config.model;
    const { title, topic, channelName, language, competitors } = req.body as any;

    const raw = await callAI(apiKey, model, "Expert em SEO YouTube. REGRA: Toda explicação, análise, dica e feedback em PT-BR. Conteúdo (títulos, descrições, tags) no idioma do canal. APENAS JSON.",
      `RESPONDA EM PORTUGUÊS BR. Crie SEO COMPLETO e SUPERIOR pra este vídeo YouTube. Canal: "${channelName}". Vídeo: "${title}". Tópico: "${topic || title}". Idioma principal: ${language || "pt"}.
${competitors ? `Competidores a SUPERAR: ${competitors}` : ""}

JSON:
{"titles":[{"text":"Título 1 mais viral","hook":"Por que funciona","ctrScore":90},{"text":"T2","hook":"...","ctrScore":85},{"text":"T3","hook":"...","ctrScore":88},{"text":"T4","hook":"...","ctrScore":82},{"text":"T5","hook":"...","ctrScore":87},{"text":"T6","hook":"...","ctrScore":84},{"text":"T7","hook":"...","ctrScore":91},{"text":"T8","hook":"...","ctrScore":86},{"text":"T9","hook":"...","ctrScore":83},{"text":"T10","hook":"...","ctrScore":89}],"description":"Descrição SEO otimizada com timestamps e links (400 palavras)","shortDescription":"Descrição curta 2 linhas pra mobile","tags":["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10","tag11","tag12","tag13","tag14","tag15"],"hashtags":["#hash1","#hash2","#hash3","#hash4","#hash5"],"score":{"seo":90,"ctr":85,"reach":88,"retention":82,"viral":87},"timestamps":["0:00 Introdução","0:30 Tópico 1","2:00 Tópico 2","5:00 Tópico 3","8:00 Conclusão"],"thumbnailIdeas":["Ideia visual 1 pra thumb","Ideia 2","Ideia 3"],"hookScript":"Frase de hook dos primeiros 5 segundos do vídeo","endScreen":"Texto pra end screen / call to action","pinComment":"Comentário fixado sugerido pra engajamento","tips":["Dica específica 1","Dica 2","Dica 3","Dica 4","Dica 5"]}`
    );
    await NotifService.aiGenerated(req.userId, "seo");
    res.json(parseJSON(raw));
  } catch (err: any) {
    if (err.message?.includes("JSON")) { res.status(500).json({ error: "IA retornou formato inválido." }); return; }
    console.error("ai error:", err?.message || err); res.status(500).json({ error: err?.message || "Erro interno" });
  }
});

router.post("/script", async (req: any, res: Response, next: NextFunction) => {
  try {
    const config = await resolveAIConfig(req.userId);
    if (!config.apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const apiKey = config.apiKey;
    const model = config.model;
    const { title, duration, style, topic, currentScript } = req.body as {
      title: string; duration?: string; style?: string; topic?: string; currentScript?: string;
    };

    let prompt: string;
    if (currentScript) {
      prompt = `Melhore este roteiro para MÁXIMA RETENÇÃO: "${title}" (${duration || "10-15 min"})\nROTEIRO ATUAL:\n${currentScript}\nAdicione marcações [B-ROLL], [ZOOM], [SFX], [MÚSICA], [TELA].`;
    } else {
      prompt = `Crie roteiro VIRAL: "${title}" | Tópico: ${topic || title} | Duração: ${duration || "10-15 min"} | Estilo: ${style || "educativo"}\nESTRUTURA: # HOOK → # PROBLEMA → # CONTEXTO → # CONTEÚDO → # DEMONSTRAÇÃO → # REVELAÇÃO → # CTA → # ENCERRAMENTO\nINCLUA marcações: [B-ROLL], [ZOOM], [SFX], [MÚSICA], [TELA]`;
    }
    const content = await callAI(apiKey, model, VIRAL_SYSTEM, prompt);
    await NotifService.aiGenerated(req.userId, "script");
    res.json({ script: content });
  } catch (err: any) { console.error("ai error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/storyboard", async (req: any, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const model = await getModel();
    const { title, duration, style } = req.body as any;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.6, max_tokens: 3000,
        messages: [
          { role: "system", content: "Diretor cinematográfico. APENAS JSON array válido, sem markdown." },
          { role: "user", content: `Storyboard para: "${title}" (${duration || "10:00"}, ${style || "cinematográfico"}).
6 cenas. JSON array:
[{"type":"hook","title":"NOME","notes":"Narração 2 frases","camera":"Câmera: movimento","audio":"Trilha + SFX"},{"type":"intro","title":"...","notes":"...","camera":"...","audio":"..."},{"type":"content","title":"...","notes":"...","camera":"...","audio":"..."},{"type":"reveal","title":"...","notes":"...","camera":"...","audio":"..."},{"type":"content","title":"...","notes":"...","camera":"...","audio":"..."},{"type":"cta","title":"...","notes":"...","camera":"...","audio":"..."}]
Tipos: hook,intro,problem,content,demo,reveal,transition,cta,outro,broll` }
        ]
      })
    });
    clearTimeout(timeout);

    if (!aiRes.ok) {
      res.status(500).json({ error: `IA retornou erro ${aiRes.status}. Tente novamente.` });
      return;
    }

    const data = await aiRes.json() as any;
    const raw = (data.choices?.[0]?.message?.content || "[]").trim();
    await NotifService.aiGenerated(req.userId, "storyboard");

    try {
      const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(clean);
      const scenes = Array.isArray(parsed) ? parsed : parsed.scenes || [parsed];
      res.json({ scenes });
    } catch {
      res.status(500).json({ error: "IA retornou formato inválido. Tente novamente." });
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      res.status(504).json({ error: "Timeout — IA demorou demais. Tente novamente." });
      return;
    }
    if (err.message?.includes("JSON")) { res.status(500).json({ error: "Formato inválido. Tente novamente." }); return; }
    console.error("ai error:", err?.message || err); res.status(500).json({ error: err?.message || "Erro interno" });
  }
});

router.post("/titles", async (req: any, res: Response, next: NextFunction) => {
  try {
    const config = await resolveAIConfig(req.userId);
    if (!config.apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const apiKey = config.apiKey;
    const model = config.model;
    const { topic, channelName } = req.body as { topic: string; channelName?: string };

    const raw = await callAI(apiKey, model, VIRAL_SYSTEM,
      `8 títulos VIRAIS sobre: "${topic}" (Canal: ${channelName || "YouTube"}). APENAS array JSON: ["t1","t2","t3","t4","t5","t6","t7","t8"]`
    );
    try { res.json({ titles: parseJSON<string[]>(raw) }); }
    catch { res.json({ titles: raw.split("\n").filter((l: string) => l.trim()).map((l: string) => l.replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, "")) }); }
  } catch (err: any) { console.error("ai error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});

router.post("/analyze-idea", async (req: any, res: Response, next: NextFunction) => {
  try {
    const config = await resolveAIConfig(req.userId);
    if (!config.apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const apiKey = config.apiKey;
    const model = config.model;
    const { idea, channelName, niche } = req.body as { idea: string; channelName?: string; niche?: string };

    const raw = await callAI(apiKey, model, VIRAL_SYSTEM,
      `Analise potencial viral: "${idea}" Canal: ${channelName || "N/A"} Nicho: ${niche || "N/A"}
JSON sem markdown: {"viralScore":0-100,"analysis":"2-3 frases","strengths":["3"],"risks":["3"],"suggestions":["3"],"bestTitle":"título","estimatedViews":"estimativa"}`
    );
    res.json(parseJSON(raw));
  } catch (err: any) {
    if (err.message?.includes("JSON")) { res.status(500).json({ error: "IA retornou formato inválido." }); return; }
    console.error("ai error:", err?.message || err); res.status(500).json({ error: err?.message || "Erro interno" });
  }
});

// Generate visual structure for whiteboard
router.post("/visual-structure", async (req: any, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const model = await getModel();
    const { topic } = req.body as any;
    const raw = await callAI(apiKey, model,
      "Você gera estruturas visuais para whiteboards. Retorne APENAS JSON válido sem markdown.",
      `Crie uma estrutura visual sobre: "${topic}"
Retorne JSON: {"title":"título principal","points":["ponto 1","ponto 2","ponto 3","ponto 4","ponto 5","ponto 6"],"colors":["#EF4444","#F59E0B","#22C55E","#3B82F6","#A855F7","#EC4899"],"layout":"grid"}`
    );
    res.json({ structure: parseJSON(raw) });
  } catch (err: any) {
    res.status(500).json({ error: "IA retornou formato inválido", structure: { title: "Erro", points: ["Tente novamente com outro tema"] } });
  }
});



// Generate image — ImageFX (Imagen 3.5) — checks user cookie first, then admin
router.post("/generate-asset", async (req: any, res: Response, next: NextFunction) => {
  try {
    const { prompt, sceneId } = req.body as { prompt: string; sceneId?: number };
    if (!prompt?.trim()) { res.status(400).json({ error: "Prompt obrigatório" }); return; }

    // 1. Try user's own cookie first
    let cookie = "";
    try {
      const userCookie = await prisma.userSetting.findUnique({
        where: { userId_key: { userId: req.userId, key: "user_imagefx_cookie" } },
      });
      if (userCookie?.value) cookie = userCookie.value;
    } catch {}

    // 2. Fallback to admin cookie
    if (!cookie) {
      const cookieSetting = await prisma.setting.findUnique({ where: { key: "imagefx_cookie" } });
      cookie = decryptValue(cookieSetting?.value || "");
    }

    if (!cookie) {
      res.status(400).json({ error: "Configure seu Cookie do ImageFX em Configurações para gerar imagens." });
      return;
    }

    const ifx = new ImageFX(cookie);
    const results = await ifx.generate(prompt, { aspectRatio: "IMAGE_ASPECT_RATIO_LANDSCAPE", numberOfImages: 1 });

    if (!results?.length || !results[0].base64) {
      res.status(500).json({ error: "Nenhuma imagem retornada pelo ImageFX" });
      return;
    }

    const url = `data:image/png;base64,${results[0].base64}`;
    if (sceneId) await prisma.scene.update({ where: { id: sceneId }, data: { thumbnail: url } });
    await NotifService.aiGenerated(req.userId, "asset");
    res.json({ url });
  } catch (err: any) {
    if (err.message?.includes("Cookie") || err.message?.includes("cookie") || err.message?.includes("autenticação") || err.message?.includes("expirado")) {
      res.status(401).json({ error: "Cookie do ImageFX expirado ou inválido. Atualize em Configurações." });
      return;
    }
    if (err.message?.includes("bloqueado")) { res.status(400).json({ error: err.message }); return; }
    if (err.message?.includes("429") || err.message?.includes("Limite")) { res.status(429).json({ error: "Limite do ImageFX atingido. Aguarde alguns minutos." }); return; }
    console.error("ai error:", err?.message || err); res.status(500).json({ error: err?.message || "Erro interno" });
  }
});

// 🔥 SSE Streaming AI Response
router.post("/stream", async (req: any, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) { res.status(400).json({ error: "Configure sua API Key" }); return; }
    const model = await getModel();
    const { prompt, systemPrompt } = req.body;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, stream: true, max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt || VIRAL_SYSTEM },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!aiRes.ok || !aiRes.body) {
      res.write(`data: {"error":"AI error ${aiRes.status}"}\n\n`);
      res.end();
      return;
    }

    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") { res.write("data: [DONE]\n\n"); continue; }
          try {
            const j = JSON.parse(data);
            const token = j.choices?.[0]?.delta?.content;
            if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
          } catch {}
        }
      }
    }
    res.end();
  } catch (err: any) {
    try { res.write(`data: {"error":"${err.message}"}\n\n`); res.end(); } catch {}
  }
});

// Deep video DNA analysis — frames base64 + transcription + visual analysis
router.post("/analyze-visual", async (req: any, res: Response, next: NextFunction) => {
  const { frames, videoTitle, duration, frameCount, transcription } = req.body;
  if (!frames || !Array.isArray(frames) || frames.length === 0) return res.status(400).json({ error: "Frames obrigatórios" });

  try {
    const config = await resolveAIConfig(req.userId);
    if (!config.apiKey) return res.status(400).json({ error: "Configure sua API Key nas Configurações" });

    // Build frame timeline description
    const frameTimeline = frames.map((f: any, i: number) => {
      const m = Math.floor(f.time / 60), s = Math.floor(f.time % 60);
      return `[${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}] Frame ${i+1}/${frames.length}`;
    }).join("\n");

    // Build messages array — use vision API if provider supports it
    const isVisionCapable = config.provider === "openai" || config.provider === "google" || config.provider === "laozhang";

    let messages: any[];

    if (isVisionCapable && frames[0].base64) {
      // Vision mode — send actual images
      const imageContent: any[] = [
        { type: "text", text: `Analise PROFUNDAMENTE este vídeo do YouTube. Você está vendo ${frames.length} frames extraídos uniformemente do vídeo inteiro.

TÍTULO: ${videoTitle || "Desconhecido"}
DURAÇÃO: ${duration ? Math.floor(duration/60) + "min " + Math.floor(duration%60) + "s" : "?"}

${transcription ? "TRANSCRIÇÃO (primeiras linhas):\n" + transcription.slice(0, 3000) + "\n" : ""}

Analise CADA frame com atenção a:
- Movimentos de câmera (zoom, pan, tilt, tracking, estático)
- Transições entre cenas (corte seco, fade, dissolve, wipe, zoom transition)
- Efeitos visuais (motion graphics, partículas, glitch, chromatic aberration)
- Textos na tela (lower thirds, títulos, subtítulos, callouts)
- Estilo de iluminação e cor grading
- Tipo de conteúdo visual (animação, live-action, screencast, stock footage)
- SFX visuais (flashes, shakes, zooms rápidos)
- Composição e enquadramento

Responda em JSON:
{
  "nicho": "Nicho principal do canal",
  "subnicho": "Subnicho específico",
  "micronicho": "Micronicho (se identificável)",
  "estilo": "Estilo visual detalhado",
  "formato": "Formato do vídeo",
  "cameras": ["Lista de movimentos de câmera identificados"],
  "transicoes": ["Lista de tipos de transição usados"],
  "efeitosVisuais": ["Efeitos visuais observados"],
  "sfx": ["Sound effects visuais identificados (flashes, shakes, zooms)"],
  "musicaEstilo": "Estilo provável da música de fundo baseado no ritmo visual",
  "textosNaTela": "Descrição dos textos/gráficos sobrepostos",
  "colorGrading": "Estilo de color grading (cinematográfico, vibrante, dessaturado, etc)",
  "cores": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "paleta": "Nome/descrição da paleta",
  "iluminacao": "Estilo de iluminação",
  "ritmoEdicao": "Lento/Médio/Rápido + cortes por minuto estimado",
  "estrutura": ["Intro", "Hook", "Desenvolvimento", "CTA", "Outro"],
  "audiencia": "Público-alvo",
  "qualidade": 8,
  "ferramentas": ["Softwares provavelmente usados (After Effects, Premiere, DaVinci, etc)"],
  "destaques": ["3-5 pontos fortes da produção"],
  "melhorias": ["3-5 sugestões de melhoria"],
  "canaisSimilares": ["3-5 canais com estilo parecido"],
  "dnaResumo": "Resumo completo de 3-5 frases descrevendo o DNA visual deste canal",
  "comoReplicar": "Passo a passo de como replicar este estilo de produção"
}` }
      ];

      // Add frame images (max 10 to stay within token limits)
      const step = Math.max(1, Math.floor(frames.length / 10));
      for (let i = 0; i < frames.length; i += step) {
        const f = frames[i];
        if (f.base64) {
          imageContent.push({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${f.base64}`, detail: "low" }
          });
        }
      }

      messages = [
        { role: "system", content: VIRAL_SYSTEM },
        { role: "user", content: imageContent }
      ];
    } else {
      // Text-only mode — describe frames
      const prompt = `Analise PROFUNDAMENTE este vídeo do YouTube baseado nos frames e transcrição.

TÍTULO: ${videoTitle || "Desconhecido"}
DURAÇÃO: ${duration ? Math.floor(duration/60) + "min " + Math.floor(duration%60) + "s" : "?"}
FRAMES: ${frameCount || frames.length} frames uniformes extraídos

TIMELINE DOS FRAMES:
${frameTimeline}

${transcription ? "TRANSCRIÇÃO:\n" + transcription.slice(0, 4000) + "\n" : ""}

Baseado no título, duração, quantidade de cortes (${frames.length} frames = ~${frames.length} cenas) e transcrição, identifique o DNA completo do vídeo.

Responda em JSON:
{
  "nicho": "Nicho principal",
  "subnicho": "Subnicho",
  "micronicho": "Micronicho",
  "estilo": "Estilo visual provável",
  "formato": "Formato do vídeo",
  "cameras": ["Movimentos de câmera prováveis"],
  "transicoes": ["Transições prováveis"],
  "efeitosVisuais": ["Efeitos prováveis"],
  "sfx": ["SFX visuais prováveis"],
  "musicaEstilo": "Estilo musical provável",
  "textosNaTela": "Uso de textos na tela",
  "colorGrading": "Color grading provável",
  "cores": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "paleta": "Paleta provável",
  "iluminacao": "Iluminação",
  "ritmoEdicao": "Ritmo de edição",
  "estrutura": ["Partes do vídeo"],
  "audiencia": "Público-alvo",
  "qualidade": 7,
  "ferramentas": ["Ferramentas prováveis"],
  "destaques": ["Pontos fortes"],
  "melhorias": ["Sugestões"],
  "canaisSimilares": ["Canais similares"],
  "dnaResumo": "DNA completo em 3-5 frases",
  "comoReplicar": "Como replicar este estilo"
}`;

      messages = [
        { role: "system", content: VIRAL_SYSTEM },
        { role: "user", content: prompt }
      ];
    }

    // Call AI with vision or text
    const apiUrl = config.apiUrl;
    const headers: any = { "Content-Type": "application/json" };
    if (config.provider === "anthropic") {
      headers["x-api-key"] = config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const body: any = { model: config.model, messages, temperature: 0.7, max_tokens: 4000 };

    const aiRes = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(body) });
    const aiData = await aiRes.json();

    let resultText = "";
    if (config.provider === "anthropic") {
      resultText = aiData.content?.[0]?.text || "";
    } else {
      resultText = aiData.choices?.[0]?.message?.content || "";
    }

    if (!resultText && aiData.error) {
      return res.status(400).json({ error: aiData.error.message || "Erro na API de IA" });
    }

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { dnaResumo: resultText };
    } catch {
      analysis = { dnaResumo: resultText };
    }

    res.json({ analysis });
  } catch (err: any) {
    if (err.message?.includes("API Key") || err.message?.includes("Configure") || err.message?.includes("créditos") || err.message?.includes("limite")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Erro na análise visual: " + (err.message || "") });
  }
});

export default router;

// Remove background from uploaded image using canvas (simple but effective)
router.post("/remove-bg", upload.single("image"), async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.file) { res.status(400).json({ error: "Imagem obrigatória" }); return; }

    // Use AI to describe a cutout prompt
    const config = await resolveAIConfig(req.userId);
    if (!config.apiKey) { res.status(400).json({ error: "Configure sua API Key" }); return; }

    // For now, return the uploaded image path - client will use Canvas API for basic bg removal
    // In production, integrate with remove.bg API or rembg Python service
    res.json({
      originalUrl: `/uploads/${req.userId}/${req.file.filename}`,
      message: "Use o editor do canvas para posicionar a imagem sobre o background",
      tip: "Para remover fundo profissional, use remove.bg ou Canva"
    });
  } catch (err: any) { console.error("ai error:", err.message); if (err.message?.includes("API Key") || err.message?.includes("Limite") || err.message?.includes("Configure") || err.message?.includes("Tente")) { res.status(400).json({ error: err.message }); return; } res.status(500).json({ error: err.message || "Erro interno. Tente novamente." }); }
});
