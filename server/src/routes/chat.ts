// @ts-nocheck
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
    if (!config.apiKey) {
      res.status(400).json({ error: "API Key não configurada. Vá em Configurações e configure sua chave de IA." });
      return;
    }
    const { messages, context, maxTokens } = req.body as { messages: any[]; context?: string; maxTokens?: number };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Mensagem vazia." });
      return;
    }

    let systemPrompt = DEFAULT_SYSTEM;
    let userMessages = messages;

    const firstSystem = messages.find(m => m.role === "system");
    if (firstSystem) {
      systemPrompt = firstSystem.content;
      userMessages = messages.filter(m => m.role !== "system");
    } else if (context) {
      systemPrompt += "\nContexto: " + context;
    }

    // Timeout 60s
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      if (config.provider === "anthropic") {
        const r = await fetch(config.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: config.model, max_tokens: maxTokens || 4000,
            system: systemPrompt,
            messages: userMessages,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!r.ok) {
          const errText = await r.text().catch(() => "");
          if (r.status === 401) { res.status(401).json({ error: "API Key inválida. Verifique sua chave nas Configurações." }); return; }
          if (r.status === 429) { res.status(429).json({ error: "Limite de requisições atingido. Aguarde 1 minuto e tente novamente." }); return; }
          if (r.status === 402) { res.status(402).json({ error: "Créditos da API esgotados. Recarregue sua conta no provedor." }); return; }
          res.status(500).json({ error: `Erro da IA (${config.provider}): ${r.status}. Tente novamente.` });
          return;
        }
        const data = await r.json() as any;
        res.json({ reply: data.content?.[0]?.text || "" });
      } else {
        const r = await fetch(config.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model: config.model, temperature: 0.7, max_tokens: maxTokens || 4000,
            messages: [{ role: "system", content: systemPrompt }, ...userMessages],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!r.ok) {
          const errText = await r.text().catch(() => "");
          if (r.status === 401) { res.status(401).json({ error: "API Key inválida. Verifique sua chave nas Configurações." }); return; }
          if (r.status === 429) { res.status(429).json({ error: "Limite de requisições atingido. Aguarde 1 minuto." }); return; }
          if (r.status === 402 || errText.includes("insufficient")) { res.status(402).json({ error: "Créditos da API esgotados." }); return; }
          if (r.status === 400 && errText.includes("model")) { res.status(400).json({ error: `Modelo ${config.model} não disponível no seu plano.` }); return; }
          res.status(500).json({ error: `Erro da IA (${r.status}). Tente novamente em alguns segundos.` });
          return;
        }
        const data = await r.json() as any;
        const reply = data.choices?.[0]?.message?.content || "";
        if (!reply) { res.status(500).json({ error: "IA retornou resposta vazia. Tente novamente." }); return; }
        res.json({ reply });
      }
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        res.status(504).json({ error: "IA demorou mais de 60s para responder. Tente com um prompt menor." });
        return;
      }
      if (fetchErr.message?.includes("ECONNREFUSED") || fetchErr.message?.includes("ENOTFOUND")) {
        res.status(503).json({ error: `Não foi possível conectar ao provedor ${config.provider}. Verifique sua conexão.` });
        return;
      }
      throw fetchErr;
    }
  } catch (err: any) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message || "Erro interno. Tente novamente." });
  }
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
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao gerar shorts." });
  }
});

export default router;
