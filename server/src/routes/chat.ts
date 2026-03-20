import { Router, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";
const router = Router();
router.use(authenticate);

async function getAiKey(): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key: "laozhang_api_key" } });
  return s?.value || "";
}

router.post("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure a API Key" }); return; }
    const { messages, context } = req.body as { messages: any[]; context?: string };

    const systemPrompt = `Você é o assistente IA do LaCasaStudio — expert em YouTube, produção de vídeos, SEO, nichos virais, modelagem de canais, thumbnails e estratégia de conteúdo.
${context ? "Contexto do usuário: " + context : ""}
Seja direto, prático e acionável. Use dados quando possível. Responda em português brasileiro.`;

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", temperature: 0.6, max_tokens: 2000,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      })
    });
    if (!aiRes.ok) throw new Error("AI error " + aiRes.status);
    const data = await aiRes.json() as any;
    res.json({ reply: data.choices?.[0]?.message?.content || "" });
  } catch (err) { next(err); }
});

// Shorts generator
router.post("/shorts", async (req: any, res: Response, next: NextFunction) => {
  try {
    const aiKey = await getAiKey();
    if (!aiKey) { res.status(400).json({ error: "Configure API Key" }); return; }
    const { script, count, style } = req.body;

    const aiRes = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", temperature: 0.7, max_tokens: 3000,
        messages: [{ role: "system", content: "Expert em Shorts/Reels virais. APENAS JSON." },
          { role: "user", content: `A partir deste roteiro, gere ${count || 5} Shorts/Reels virais (30-60s cada):

ROTEIRO:
${script}

Estilo: ${style || "dinâmico com cortes rápidos"}

Retorne JSON array:
[{"number":1,"title":"Título viral do Short","hook":"Frase de hook (primeiros 3 segundos)","script":"Roteiro completo do short (~100 palavras)","duration":"30s","textOverlays":["Texto 1 na tela","Texto 2"],"transition":"Tipo de transição","music":"Sugestão de música/som","thumbnailPrompt":"Prompt para thumbnail vertical 9:16","hashtags":["#tag1","#tag2"]}]` }]
      })
    });
    if (!aiRes.ok) throw new Error("AI error");
    const data = await aiRes.json() as any;
    const raw = data.choices?.[0]?.message?.content || "[]";
    res.json({ shorts: JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()) });
  } catch (err) { next(err); }
});

export default router;
