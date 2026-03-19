const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

const LAOZHANG_URL = "https://api.laozhang.ai/v1/chat/completions";

const VIRAL_SYSTEM = `Você é o maior especialista do mundo em produção de vídeos virais para YouTube. Seu conhecimento inclui:
- Algoritmo do YouTube (CTR, AVD, retenção, impressões)
- Psicologia de audiência (curiosity gap, pattern interrupt, open loops)
- Storytelling para vídeos (hook nos primeiros 8 segundos, momentos de retenção a cada 30s)
- SEO avançado (títulos, tags, descrições que rankeiam)
- Thumbnails que convertem (3 elementos: emoção + texto + contraste)
- Estratégias de MrBeast, Veritasium, Ali Abdaal, Mark Rober
- Técnicas de edição para máxima retenção (jump cuts, b-roll, zoom, sound design)

Você SEMPRE responde em português brasileiro. Seja direto, prático e acionável.`;

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
  return JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
}

// ── SEO ────────────────────────────────────────────────────
router.post("/seo", async (req, res, next) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return res.status(400).json({ error: "Configure sua API Key da LaoZhang nas Configurações" });
    const model = await getModel();
    const { title, topic, channelName } = req.body;

    const raw = await callAI(apiKey, model, VIRAL_SYSTEM,
      `Otimize para viralizar no YouTube. Canal: "${channelName}". Vídeo: "${title}". Tópico: "${topic || title}".

REGRAS:
- Títulos devem usar curiosity gap, números, palavras de poder (NUNCA, SEGREDO, REVELADO, CHOCANTE)
- Descrição deve ter timestamps, 3 hashtags no final, CTA para se inscrever
- Tags misture exatas + long tail + trending
- Score baseado no potencial REAL de viralizar

Responda APENAS com JSON válido, sem markdown:
{"titles":["5 títulos progressivamente mais clickbait"],"description":"descrição completa otimizada","tags":["8-12 tags"],"score":{"seo":0-100,"ctr":0-100,"reach":0-100},"tips":"3 dicas específicas para este vídeo viralizar"}`
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
      prompt = `Melhore este roteiro para MÁXIMA RETENÇÃO no YouTube:

"${title}" (${duration || "10-15 min"})

ROTEIRO ATUAL:
${currentScript}

APLIQUE:
1. Hook mais forte nos primeiros 8 segundos (pattern interrupt)
2. Open loops a cada 2-3 minutos ("mas antes disso...")
3. Momentos de retenção a cada 30s (zoom, b-roll cue, sound effect)
4. CTAs naturais (não forçados)
5. Callback do hook no final
6. Linguagem mais conversacional e energética

Mantenha as seções com # e adicione marcações [B-ROLL], [ZOOM], [SFX], [MÚSICA], [TELA] onde apropriado.`;
    } else {
      prompt = `Crie um roteiro VIRAL para YouTube com alta retenção:

"${title}" | Tópico: ${topic || title} | Duração: ${duration || "10-15 min"} | Estilo: ${style || "educativo engajante"}

ESTRUTURA OBRIGATÓRIA:
# HOOK (0:00-0:08) - Pattern interrupt, promessa forte
# PROBLEMA (0:08-0:30) - Por que o viewer deve se importar
# CONTEXTO (0:30-2:00) - Setup com open loop
# CONTEÚDO (2:00-8:00) - Valor principal, 3-5 pontos com exemplos
# DEMONSTRAÇÃO (8:00-10:00) - Prova prática
# REVELAÇÃO (10:00-11:00) - Payoff do open loop
# CTA (11:00-11:30) - Call to action natural
# ENCERRAMENTO (11:30-12:00) - Callback do hook + próximo vídeo

INCLUA marcações: [B-ROLL], [ZOOM], [SFX], [MÚSICA], [TELA], [LOWER-THIRD]
Linguagem natural, brasileira, como se estivesse falando com um amigo.`;
    }

    const content = await callAI(apiKey, model, VIRAL_SYSTEM, prompt);
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

    const raw = await callAI(apiKey, model, VIRAL_SYSTEM,
      `Storyboard detalhado para vídeo viral: "${title}" (${duration || "12:00"}, ${style || "tutorial"})

Crie 8-12 cenas com foco em RETENÇÃO. Cada cena deve ter propósito claro de manter o viewer assistindo.

Array JSON (sem markdown):
[{"type":"hook","title":"Nome da Cena","duration":"0:00-0:08","notes":"Descrição detalhada do que acontece, incluindo texto na tela, expressão facial, movimento de câmera","camera":"Tipo de shot","audio":"Música/SFX/Narração","color":"#EF4444","retention":"Técnica de retenção usada (open loop, curiosity gap, pattern interrupt, etc)"}]

Types: hook, intro, problem, content, demo, broll, transition, reveal, cta, outro
Cores: #EF4444(hook), #A855F7(intro), #3B82F6(content), #06B6D4(demo), #14B8A6(broll), #F59E0B(cta), #22C55E(outro), #EC4899(reveal)`
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

    const raw = await callAI(apiKey, model, VIRAL_SYSTEM,
      `8 títulos VIRAIS para YouTube sobre: "${topic}" (Canal: ${channelName || "YouTube"}).
      
Mix obrigatório:
- 2 com números (Top 5, 7 Segredos...)
- 2 com curiosity gap (O que NINGUÉM te conta sobre...)
- 2 com urgência (PARE de fazer isso AGORA!)
- 2 polêmicos/contrários (Por que X está ERRADO)

APENAS array JSON: ["t1","t2","t3","t4","t5","t6","t7","t8"]`
    );
    try { res.json({ titles: parseJSON(raw) }); }
    catch { res.json({ titles: raw.split("\n").filter(l => l.trim()).map(l => l.replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, "")) }); }
  } catch (err) { next(err); }
});

// ── Analyze idea for viral potential ───────────────────────
router.post("/analyze-idea", async (req, res, next) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return res.status(400).json({ error: "Configure sua API Key da LaoZhang nas Configurações" });
    const model = await getModel();
    const { idea, channelName, niche } = req.body;

    const raw = await callAI(apiKey, model, VIRAL_SYSTEM,
      `Analise o potencial viral desta ideia de vídeo:

Ideia: "${idea}"
Canal: ${channelName || "N/A"}
Nicho: ${niche || "N/A"}

JSON (sem markdown):
{"viralScore":0-100,"analysis":"análise de 2-3 frases","strengths":["3 pontos fortes"],"risks":["3 riscos"],"suggestions":["3 sugestões para melhorar"],"bestTitle":"melhor título sugerido","estimatedViews":"estimativa de views no primeiro mês"}`
    );
    res.json(parseJSON(raw));
  } catch (err) {
    if (err.message?.includes("JSON")) return res.status(500).json({ error: "IA retornou formato inválido." });
    next(err);
  }
});

module.exports = router;
