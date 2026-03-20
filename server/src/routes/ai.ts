import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import NotifService from "../services/notifications";
import cache from "../services/cache";
const router = Router();
router.use(authenticate);

const LAOZHANG_URL = "https://api.laozhang.ai/v1/chat/completions";

const VIRAL_SYSTEM = `Você é o maior especialista do mundo em produção de vídeos virais para YouTube. Seu conhecimento inclui:
- Algoritmo do YouTube (CTR, AVD, retenção, impressões)
- Psicologia de audiência (curiosity gap, pattern interrupt, open loops)
- Storytelling para vídeos (hook nos primeiros 8 segundos, momentos de retenção a cada 30s)
- SEO avançado (títulos, tags, descrições que rankeiam)
- Thumbnails que convertem (3 elementos: emoção + texto + contraste)
Você SEMPRE responde em português brasileiro. Seja direto, prático e acionável.`;

async function getApiKey(): Promise<string> {
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

async function callAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(LAOZHANG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
    const apiKey = await getApiKey();
    if (!apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const model = await getModel();
    const { title, topic, channelName } = req.body as { title: string; topic?: string; channelName?: string };

    const raw = await callAI(apiKey, model, VIRAL_SYSTEM,
      `Otimize para viralizar no YouTube. Canal: "${channelName}". Vídeo: "${title}". Tópico: "${topic || title}".
Responda APENAS com JSON válido, sem markdown:
{"titles":["5 títulos"],"description":"descrição otimizada","tags":["8-12 tags"],"score":{"seo":0-100,"ctr":0-100,"reach":0-100},"tips":"3 dicas específicas"}`
    );
    await NotifService.aiGenerated(req.userId, "seo");
    res.json(parseJSON(raw));
  } catch (err: any) {
    if (err.message?.includes("JSON")) { res.status(500).json({ error: "IA retornou formato inválido." }); return; }
    next(err);
  }
});

router.post("/script", async (req: any, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const model = await getModel();
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
  } catch (err) { next(err); }
});

router.post("/storyboard", async (req: any, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const model = await getModel();
    const { title, duration, style } = req.body as any;

    const raw = await callAI(apiKey, model,
      "Você é um diretor cinematográfico de Hollywood e Netflix. Cria storyboards profissionais com direção de fotografia, narração, animação, efeitos sonoros e música para cada cena. Responda APENAS JSON válido sem markdown.",
      `Crie um storyboard cinematográfico COMPLETO e DETALHADO para: "${title}"
Duração: ${duration || "10:00"}
Estilo: ${style || "cinematográfico viral com alta retenção"}

Crie 8-12 cenas. RETORNE APENAS um array JSON:
[{"type":"hook","title":"NOME DA CENA","duration":"~5s","notes":"Narração completa que será falada pelo apresentador nesta cena. Escreva 2-3 frases detalhadas.","camera":"Direção de câmera: movimento, enquadramento, transição de entrada. Ex: Extreme close-up -> zoom out lento, corte seco para wide shot","audio":"Trilha + SFX: descreva a música de fundo e efeitos sonoros. Ex: Bass drop + reverse cymbal, trilha tensa em Dm menor","color":"#EF4444"}]

Tipos válidos: hook, intro, problem, content, demo, reveal, transition, cta, outro, broll
Cores sugeridas: hook=#EF4444, intro=#A855F7, problem=#F59E0B, content=#3B82F6, demo=#06B6D4, reveal=#EC4899, transition=#8B5CF6, cta=#F59E0B, outro=#22C55E, broll=#14B8A6

SEJA EXTREMAMENTE DETALHADO na narração (notes), direção de câmera (camera) e trilha/SFX (audio). Cada campo deve ter pelo menos 2 frases. Isso será usado para produção profissional cinematográfica.`
    );
    await NotifService.aiGenerated(req.userId, "storyboard");
    const parsed = parseJSON(raw);
    const scenes = Array.isArray(parsed) ? parsed : (parsed as any).scenes || parsed;
    res.json({ scenes });
  } catch (err: any) {
    if (err.message?.includes("JSON")) { res.status(500).json({ error: "IA retornou formato inválido. Tente novamente." }); return; }
    next(err);
  }
});

router.post("/titles", async (req: any, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const model = await getModel();
    const { topic, channelName } = req.body as { topic: string; channelName?: string };

    const raw = await callAI(apiKey, model, VIRAL_SYSTEM,
      `8 títulos VIRAIS sobre: "${topic}" (Canal: ${channelName || "YouTube"}). APENAS array JSON: ["t1","t2","t3","t4","t5","t6","t7","t8"]`
    );
    try { res.json({ titles: parseJSON<string[]>(raw) }); }
    catch { res.json({ titles: raw.split("\n").filter((l: string) => l.trim()).map((l: string) => l.replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, "")) }); }
  } catch (err) { next(err); }
});

router.post("/analyze-idea", async (req: any, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const model = await getModel();
    const { idea, channelName, niche } = req.body as { idea: string; channelName?: string; niche?: string };

    const raw = await callAI(apiKey, model, VIRAL_SYSTEM,
      `Analise potencial viral: "${idea}" Canal: ${channelName || "N/A"} Nicho: ${niche || "N/A"}
JSON sem markdown: {"viralScore":0-100,"analysis":"2-3 frases","strengths":["3"],"risks":["3"],"suggestions":["3"],"bestTitle":"título","estimatedViews":"estimativa"}`
    );
    res.json(parseJSON(raw));
  } catch (err: any) {
    if (err.message?.includes("JSON")) { res.status(500).json({ error: "IA retornou formato inválido." }); return; }
    next(err);
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
export default router;
