import prisma from "../db/prisma";
import cache from "./cache";
import logger from "./logger";

// Provider endpoints (all OpenAI-compatible format)
const PROVIDERS: Record<string, { url: string; name: string }> = {
  openai:    { url: "https://api.openai.com/v1/chat/completions",    name: "OpenAI" },
  google:    { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", name: "Google Gemini" },
  anthropic: { url: "https://api.anthropic.com/v1/messages",         name: "Anthropic" },
  laozhang:  { url: "https://api.laozhang.ai/v1/chat/completions",  name: "LaoZhang" },
  groq:      { url: "https://api.groq.com/openai/v1/chat/completions", name: "Groq" },
  deepseek:  { url: "https://api.deepseek.com/v1/chat/completions", name: "DeepSeek" },
  custom:    { url: "",                                               name: "Custom" },
};

// Default models per provider
const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash",
  anthropic: "claude-sonnet-4-6",
  laozhang: "claude-sonnet-4-6",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
};

export interface AIConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  provider: string;
  isUserKey: boolean; // true = user's own key, false = admin's LaoZhang
}

/**
 * Resolve which AI API to use for a given user:
 * 1. Check if user has their own API key → use it
 * 2. Fallback to admin's LaoZhang API
 */
export async function resolveAIConfig(userId: number): Promise<AIConfig> {
  // 1. Check user's own settings
  try {
    const userSettings = await prisma.userSetting.findMany({
      where: { userId, key: { in: ["user_api_key", "user_api_provider", "user_api_model", "user_api_url"] } },
    });
    const uMap: Record<string, string> = {};
    userSettings.forEach((s: any) => { uMap[s.key] = s.value; });

    if (uMap.user_api_key) {
      const provider = uMap.user_api_provider || "openai";
      const providerInfo = PROVIDERS[provider] || PROVIDERS.openai;
      const apiUrl = provider === "custom" ? (uMap.user_api_url || "") : providerInfo.url;
      const model = uMap.user_api_model || DEFAULT_MODELS[provider] || "gpt-4o-mini";

      logger.debug("Using user API key", { userId, provider });
      return { apiKey: uMap.user_api_key, apiUrl, model, provider, isUserKey: true };
    }
  } catch (err: any) {
    // UserSetting table might not exist yet - that's ok
    if (!err.message?.includes("UserSetting") && err.code !== "P2021") {
      logger.warn("Error reading user settings", { error: err.message });
    }
  }

  // 2. Fallback to admin's LaoZhang
  const ck = "admin_ai_config";
  const cached = cache.get<AIConfig>(ck);
  if (cached) return cached;

  const [keySetting, modelSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "laozhang_api_key" } }),
    prisma.setting.findUnique({ where: { key: "ai_model" } }),
  ]);

  const config: AIConfig = {
    apiKey: keySetting?.value || "",
    apiUrl: PROVIDERS.laozhang.url,
    model: modelSetting?.value || "claude-sonnet-4-6",
    provider: "laozhang",
    isUserKey: false,
  };

  if (config.apiKey) cache.set(ck, config, 60000);
  return config;
}

/**
 * Call AI API with the resolved config
 * Handles both OpenAI-compatible and Anthropic formats
 */
export async function callAIWithConfig(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4000
): Promise<string> {
  if (!config.apiKey) throw new Error("Configure sua API Key nas Configurações");

  // Anthropic uses a different format
  if (config.provider === "anthropic") {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      if (res.status === 401) throw new Error("API Key Anthropic inválida. Verifique nas Configurações.");
      if (res.status === 429) throw new Error("Limite de requisições Anthropic atingido. Aguarde 1 min.");
      if (res.status === 402) throw new Error("Créditos Anthropic esgotados.");
      throw new Error(`Erro Anthropic (${res.status}). Tente novamente.`);
    }
    const data = await res.json() as any;
    return data.content?.[0]?.text || "";
  }

  // OpenAI-compatible format (OpenAI, Google, LaoZhang, Groq, DeepSeek)
  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) throw new Error("API Key inválida. Verifique nas Configurações.");
    if (res.status === 429) throw new Error("Limite de requisições atingido. Aguarde 1 min.");
    if (res.status === 402 || err.includes("insufficient")) throw new Error("Créditos da API esgotados.");
    throw new Error(`Erro IA (${res.status}). Tente novamente.`);
  }

  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || "";
}

export { PROVIDERS, DEFAULT_MODELS };
