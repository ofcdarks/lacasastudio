const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

const LAOZHANG_URL = "https://api.laozhang.ai/v1/chat/completions";

async function getApiKey() {
  const s = await prisma.setting.findUnique({ where: { key: "laozhang_api_key" } });
  return s?.value || "";
}

async function getModel() {
  const s = await prisma.setting.findUnique({ where: { key: "ai_model" } });
  return s?.value || "claude-sonnet-4-6";
}

async function callAI(apiKey, model, systemPrompt, userPrompt) {
  const res = await fetch(LAOZHANG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
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
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(raw) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── SEO ────────────────────────────────────────────────────
router.post("/seo", async (req, res, next) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return res.status(400).json({ error: "Configure sua API Key da LaoZhang nas Configurações" });
    const model = await getModel();
    const { title, topic, channelName } = req.body;

    const raw = await callAI(apiKey, model,
      "Você é um especialista em SEO para YouTube. Responda SEMPRE em JSON válido, sem markdown.",
      `Gere SEO para um vídeo do YouTube.
Canal: ${channelName || "Meu Canal"}
Título: ${title || "Sem título"}
Tópico: ${topic || title}

JSON exato:
{"titles":["t1","t2","t3","t4","t5"],"description":"descrição otimizada com timestamps e hashtags","tags":["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8"],"score":{"seo":85,"ctr":70,"reach":80},"tips":"dicas para melhorar SEO"}`
    );
    res.json(parseJSON(raw));
  } catch (err) {
    if (err.message?.includes("JSON")) return res.status(500).json({ error: "IA retornou formato inválido. Tente novamente." });
    next(err);
  }
});

// ── Script ─────────────────────────────────────────────────
router.post("/script", async (req, res, next) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return res.status(400).json({ error: "Configure sua API Key da LaoZhang nas Configurações" });
    const model = await getModel();
    const { title, duration, style, topic, currentScript } = req.body;

    let prompt;
    if (currentScript) {
      prompt = `Melhore este roteiro para "${title}":
${currentScript}

Melhore ganchos, transições, CTAs. Mantenha # para seções.`;
    } else {
      prompt = `Crie roteiro para: "${title}"
Tópico: ${topic || title}
Duração: ${duration || "10-15 min"}
Estilo: ${style || "educativo"}

Seções com #, linguagem conversacional, ganchos de retenção, CTAs naturais.`;
    }

    const content = await callAI(apiKey, model,
      "Você é roteirista profissional de YouTube. Escreva em português brasileiro, natural e conversacional.", prompt);
    res.json({ script: content });
  } catch (err) { next(err); }
});

// ── Storyboard ─────────────────────────────────────────────
router.post("/storyboard", async (req, res, next) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return res.status(400).json({ error: "Configure sua API Key da LaoZhang nas Configurações" });
    const model = await getModel();
    const { title, duration, style } = req.body;

    const raw = await callAI(apiKey, model,
      "Você é diretor de vídeo. Responda SEMPRE em JSON válido, sem markdown.",
      `Storyboard para: "${title}" (${duration || "12:00"}, ${style || "tutorial"})

Array JSON com 6-8 cenas:
[{"type":"intro","title":"Abertura","duration":"0:00-0:15","notes":"descrição","camera":"Close-up","audio":"Música tema","color":"#A855F7"}]
Types: intro, hook, content, demo, broll, cta, outro
Cores: #A855F7, #EF4444, #3B82F6, #06B6D4, #14B8A6, #F59E0B, #22C55E`
    );
    res.json({ scenes: parseJSON(raw) });
  } catch (err) {
    if (err.message?.includes("JSON")) return res.status(500).json({ error: "IA retornou formato inválido. Tente novamente." });
    next(err);
  }
});

// ── Titles ─────────────────────────────────────────────────
router.post("/titles", async (req, res, next) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return res.status(400).json({ error: "Configure sua API Key da LaoZhang nas Configurações" });
    const model = await getModel();
    const { topic, channelName } = req.body;

    const raw = await callAI(apiKey, model,
      "Especialista em títulos virais YouTube. Responda APENAS array JSON de strings.",
      `8 títulos para: ${topic}. Canal: ${channelName || ""}. Mix: curiosidade, urgência, números, polêmico. APENAS array JSON: ["t1","t2",...]`
    );
    try {
      res.json({ titles: parseJSON(raw) });
    } catch {
      res.json({ titles: raw.split("\n").filter(l => l.trim()).map(l => l.replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, "")) });
    }
  } catch (err) { next(err); }
});

module.exports = router;
