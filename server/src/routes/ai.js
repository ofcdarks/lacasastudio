const { Router } = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/auth");
const router = Router();
router.use(authenticate);

async function getAIConfig() {
  const settings = await prisma.setting.findMany();
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return {
    apiKey: map["ai_api_key"] || "",
    baseUrl: map["ai_base_url"] || "https://api.laozhang.ai/v1",
    model: map["ai_model"] || "deepseek-v3",
  };
}

async function callAI(messages, config) {
  if (!config.apiKey) throw new Error("API key não configurada. Vá em Configurações para adicionar.");
  
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Generate SEO content
router.post("/seo", async (req, res, next) => {
  try {
    const config = await getAIConfig();
    const { title, topic, channelName } = req.body;

    const prompt = `Você é um especialista em YouTube SEO. Gere conteúdo otimizado para o vídeo "${title}" sobre "${topic || title}" do canal "${channelName || 'meu canal'}".

Responda APENAS em JSON válido, sem markdown, sem \`\`\`, neste formato exato:
{
  "titles": ["título 1", "título 2", "título 3", "título 4", "título 5"],
  "description": "descrição otimizada completa com timestamps e hashtags",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "score": {"seo": 85, "ctr": 72, "reach": 90}
}

Regras:
- Títulos devem ter palavras-chave, números e ganchos emocionais
- Descrição deve ter timestamps, emojis, links placeholder e hashtags
- Tags devem incluir variações long-tail da keyword principal
- Scores devem ser realistas baseados na qualidade do conteúdo`;

    const content = await callAI([{ role: "user", content: prompt }], config);
    
    // Parse JSON from response
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to extract JSON from response
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Não consegui parsear a resposta da IA");
    }

    res.json(parsed);
  } catch (err) { next(err); }
});

// Generate script
router.post("/script", async (req, res, next) => {
  try {
    const config = await getAIConfig();
    const { title, topic, duration, style } = req.body;

    const prompt = `Você é um roteirista profissional de YouTube. Escreva um roteiro completo para o vídeo "${title}" sobre "${topic || title}".

Duração estimada: ${duration || "10-15 minutos"}
Estilo: ${style || "educativo e envolvente"}

O roteiro deve ter:
1. # Abertura - gancho nos primeiros 15 segundos
2. # Introdução - apresentação do tema
3. # Desenvolvimento - conteúdo principal com subtópicos
4. # Demonstração - exemplos práticos
5. # Conclusão - recap e call to action

Use linguagem natural, coloquial mas profissional. Inclua marcações [B-ROLL], [TELA], [ZOOM] onde apropriado.
Escreva o roteiro completo, não um resumo.`;

    const content = await callAI([{ role: "user", content: prompt }], config);
    res.json({ script: content });
  } catch (err) { next(err); }
});

// Generate storyboard scenes
router.post("/storyboard", async (req, res, next) => {
  try {
    const config = await getAIConfig();
    const { title, duration, style } = req.body;

    const prompt = `Você é um diretor de vídeo do YouTube. Crie um storyboard detalhado para o vídeo "${title}" com duração de ${duration || "12:00"}.

Responda APENAS em JSON válido, sem markdown, neste formato:
{
  "scenes": [
    {
      "type": "intro|hook|content|demo|cta|outro|broll|transition",
      "title": "Nome da cena",
      "duration": "0:00-0:15",
      "notes": "Descrição detalhada do que acontece",
      "camera": "Tipo de câmera/ângulo",
      "audio": "Tipo de áudio"
    }
  ]
}

Crie entre 6 e 10 cenas cobrindo toda a duração do vídeo.`;

    const content = await callAI([{ role: "user", content: prompt }], config);
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Não consegui parsear a resposta da IA");
    }
    res.json(parsed);
  } catch (err) { next(err); }
});

// Improve/rewrite text
router.post("/improve", async (req, res, next) => {
  try {
    const config = await getAIConfig();
    const { text, instruction } = req.body;

    const prompt = `${instruction || "Melhore este texto de roteiro de YouTube, tornando-o mais envolvente e natural"}:\n\n${text}`;
    const content = await callAI([{ role: "user", content: prompt }], config);
    res.json({ result: content });
  } catch (err) { next(err); }
});

// Generate video ideas
router.post("/ideas", async (req, res, next) => {
  try {
    const config = await getAIConfig();
    const { channelName, niche, recentTopics } = req.body;

    const prompt = `Você é um estrategista de conteúdo YouTube. Gere 5 ideias de vídeo para o canal "${channelName}" no nicho "${niche || 'tecnologia'}".
${recentTopics ? `Tópicos recentes do canal: ${recentTopics}` : ""}

Responda APENAS em JSON válido:
{
  "ideas": [
    {
      "title": "Título otimizado",
      "description": "Breve descrição do vídeo",
      "priority": "alta|média|baixa",
      "estimatedDuration": "12:00"
    }
  ]
}`;

    const content = await callAI([{ role: "user", content: prompt }], config);
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Erro ao parsear resposta");
    }
    res.json(parsed);
  } catch (err) { next(err); }
});

module.exports = router;
