import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
import { resolveAIConfig, callAIWithConfig } from "../services/ai-resolver";
const router = Router();
router.use(authenticate);

const DEFAULT_SYSTEM = `Você é o assistente IA do LaCasaStudio — expert em YouTube, produção de vídeos, SEO, nichos virais, modelagem de canais, thumbnails e estratégia de conteúdo.
Seja direto, prático e acionável. Use dados quando possível. Responda em português brasileiro.`;

router.post("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const config = await resolveAIConfig(req.userId);
    if (!config.apiKey) { res.status(400).json({ error: "Configure sua API Key nas Configurações" }); return; }
    const { messages, context, maxTokens } = req.body as { messages: any[]; context?: string; maxTokens?: number };

    // If messages include a system message, use IT as system (expert mode)
    // Otherwise use the default LaCasaStudio system prompt
    let systemPrompt = DEFAULT_SYSTEM;
    let userMessages = messages;

    const firstSystem = messages.find(m => m.role === "system");
    if (firstSystem) {
      systemPrompt = firstSystem.content;
      userMessages = messages.filter(m => m.role !== "system");
    } else if (context) {
      systemPrompt += "\nContexto: " + context;
    }

    // Use AI resolver for provider-agnostic calls
    if (config.provider === "anthropic") {
      // Anthropic format
      const r = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: config.model, max_tokens: maxTokens || 4000,
          system: systemPrompt,
          messages: userMessages,
        }),
      });
      if (!r.ok) throw new Error("AI error " + r.status + ": " + await r.text());
      const data = await r.json() as any;
      res.json({ reply: data.content?.[0]?.text || "" });
    } else {
      // OpenAI-compatible (LaoZhang, OpenAI, Google, Groq, DeepSeek)
      const r = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model, temperature: 0.7, max_tokens: maxTokens || 4000,
          messages: [{ role: "system", content: systemPrompt }, ...userMessages],
        }),
      });
      if (!r.ok) throw new Error("AI error " + r.status + ": " + await r.text());
      const data = await r.json() as any;
      res.json({ reply: data.choices?.[0]?.message?.content || "" });
    }
  } catch (err) { next(err); }
});

router.post("/shorts", async (req: any, res: Response, next: NextFunction) => {
  try {
    const config = await resolveAIConfig(req.userId);
    if (!config.apiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { script, count, style } = req.body;

    const systemPrompt = "Expert em Shorts/Reels virais para YouTube. REGRA: Explicações em PT-BR. Conteúdo no idioma do canal. APENAS JSON.";
    const userPrompt = `A partir deste roteiro, gere ${count || 5} Shorts/Reels virais (30-60s cada):

ROTEIRO:
${script}

Estilo: ${style || "dinâmico com cortes rápidos"}

Retorne JSON array:
[{"number":1,"title":"Título viral do Short","hook":"Frase de hook (primeiros 3 segundos)","script":"Roteiro completo do short (~100 palavras)","duration":"30s","textOverlays":["Texto 1 na tela","Texto 2"],"transition":"Tipo de transição","music":"Sugestão de música/som","thumbnailPrompt":"Prompt para thumbnail vertical 9:16","hashtags":["#tag1","#tag2"]}]`;

    const reply = await callAIWithConfig(config, systemPrompt, userPrompt, 3000);
    try { res.json({ shorts: JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()) }); }
    catch { res.json({ shorts: [] }); }
  } catch (err) { next(err); }
});

export default router;
