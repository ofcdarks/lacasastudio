import type { Video, Channel, Idea, Asset, Meta, Template, BudgetItem, TeamMember, Script, SearchResults, Notification, Scene, ChecklistItem } from "../types";

const BASE = "/api";

function getToken(): string | null { return localStorage.getItem("lc_token"); }
function getRefreshToken(): string | null { return localStorage.getItem("lc_refresh"); }
function setTokens(access: string, refresh?: string) {
  localStorage.setItem("lc_token", access);
  if (refresh) localStorage.setItem("lc_refresh", refresh);
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setTokens(data.token, data.refreshToken);
      return true;
    } catch { return false; }
    finally { isRefreshing = false; refreshPromise = null; }
  })();
  return refreshPromise;
}

async function request<T>(path: string, opts: RequestInit = {}, skipAuthRedirect = false): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as Record<string, string> || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.body instanceof FormData) delete headers["Content-Type"];

  let res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (res.status === 401 && !skipAuthRedirect) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      res = await fetch(`${BASE}${path}`, { ...opts, headers });
    }
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (!res.ok) throw new Error(`Erro ${res.status} — servidor retornou resposta inválida`);
    const text = await res.text();
    try { return JSON.parse(text) as T; } catch { throw new Error("Resposta inválida do servidor"); }
  }

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect) {
      localStorage.removeItem("lc_token");
      localStorage.removeItem("lc_refresh");
      window.location.href = "/login";
    }
    throw new Error(data.error || "Erro na requisição");
  }
  return data as T;
}

const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any, skipAuth = false) => request<T>(path, { method: "POST", body: JSON.stringify(body) }, skipAuth),
  put: <T>(path: string, body?: any) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Helper for paginated responses
function extractData<T>(response: any): T[] {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  return response;
}

// ============================================================
// ALL EXPORTS — original methods preserved + refresh tokens
// ============================================================

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post<{ token: string; refreshToken?: string; user: any }>("/auth/login", { email, password }, true);
    setTokens(res.token, res.refreshToken);
    return res;
  },
  register: async (email: string, name: string, password: string) => {
    const res = await api.post<{ token: string; refreshToken?: string; user: any }>("/auth/register", { email, name, password }, true);
    setTokens(res.token, res.refreshToken);
    return res;
  },
  logout: () => api.post("/auth/logout").catch(() => {}).finally(() => {
    localStorage.removeItem("lc_token"); localStorage.removeItem("lc_refresh");
  }),
  me: () => api.get<{ id: number; name: string; email: string; avatar: string; role: string; isAdmin?: boolean }>("/auth/me"),
};

export const channelApi = {
  list: async () => extractData<Channel>(await api.get("/channels")),
  create: (data: Partial<Channel>) => api.post<Channel>("/channels", data),
  update: (id: number, data: Partial<Channel>) => api.put<Channel>(`/channels/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/channels/${id}`),
};

export const videoApi = {
  list: async (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return extractData<Video>(await api.get(`/videos${q ? `?${q}` : ""}`));
  },
  get: (id: number) => api.get<Video>(`/videos/${id}`),
  create: (data: Partial<Video>) => api.post<Video>("/videos", data),
  update: (id: number, data: Partial<Video>) => api.put<Video>(`/videos/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/videos/${id}`),
};

export const sceneApi = {
  listByVideo: (videoId: number) => api.get<Scene[]>(`/scenes/video/${videoId}`),
  create: (data: Partial<Scene>) => api.post<Scene>("/scenes", data),
  update: (id: number, data: Partial<Scene>) => api.put<Scene>(`/scenes/${id}`, data),
  reorder: (videoId: number, orderedIds: number[]) => api.put<{ ok: boolean }>(`/scenes/reorder/${videoId}`, { orderedIds }),
  del: (id: number) => api.del<{ ok: boolean }>(`/scenes/${id}`),
};

export const teamApi = {
  list: async () => extractData<TeamMember>(await api.get("/team")),
  create: (data: Partial<TeamMember>) => api.post<TeamMember>("/team", data),
  update: (id: number, data: Partial<TeamMember>) => api.put<TeamMember>(`/team/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/team/${id}`),
};

export const assetApi = {
  list: async (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return extractData<Asset>(await api.get(`/assets${q ? `?${q}` : ""}`));
  },
  create: (data: Partial<Asset>) => api.post<Asset>("/assets", data),
  upload: (formData: FormData): Promise<Asset> => {
    const token = getToken();
    return fetch(`${BASE}/assets/upload`, {
      method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error || "Erro no upload"); return data; });
  },
  update: (id: number, data: Partial<Asset>) => api.put<Asset>(`/assets/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/assets/${id}`),
};

export const metaApi = {
  list: async () => extractData<Meta>(await api.get("/metas")),
  create: (data: any) => api.post<Meta>("/metas", data),
  updateItem: (id: number, data: Partial<{ current: number; target: number }>) => api.put<any>(`/metas/item/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/metas/${id}`),
};

export const templateApi = {
  list: async () => extractData<Template>(await api.get("/templates")),
  create: (data: Partial<Template>) => api.post<Template>("/templates", data),
  del: (id: number) => api.del<{ ok: boolean }>(`/templates/${id}`),
};

export const budgetApi = {
  list: async () => extractData<BudgetItem>(await api.get("/budget")),
  create: (data: Partial<BudgetItem>) => api.post<BudgetItem>("/budget", data),
  update: (id: number, data: Partial<BudgetItem>) => api.put<BudgetItem>(`/budget/${id}`, data),
  delete: (id: number) => api.del<{ ok: boolean }>(`/budget/${id}`),
  del: (id: number) => api.del<{ ok: boolean }>(`/budget/${id}`),
};

export const notifApi = {
  list: async () => extractData<Notification>(await api.get("/notifications")),
  markRead: (id: number) => api.put<{ ok: boolean }>(`/notifications/${id}/read`),
  markAllRead: () => api.put<{ ok: boolean }>("/notifications/read-all"),
  clearRead: () => api.del<{ ok: boolean }>("/notifications/clear"),
};

export const checklistApi = {
  listByVideo: (videoId: number) => api.get<ChecklistItem[]>(`/checklists/video/${videoId}`),
  create: (data: Partial<ChecklistItem & { videoId: number }>) => api.post<ChecklistItem>("/checklists", data),
  update: (id: number, data: Partial<ChecklistItem>) => api.put<ChecklistItem>(`/checklists/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/checklists/${id}`),
};

export const settingsApi = {
  get: () => api.get<Record<string, string>>("/settings"),
  getRaw: (key: string) => api.get<{ key: string; value: string }>(`/settings/raw/${key}`),
  save: (data: Record<string, string>) => api.put<{ ok: boolean }>("/settings", data),
  getUser: () => api.get<Record<string, string>>("/settings/user"),
  saveUser: (data: Record<string, string>) => api.put<{ ok: boolean }>("/settings/user", data),
  status: () => api.get<Record<string, boolean>>("/settings/status"),
};

export const aiApi = {
  seo: (data: any) => api.post<any>("/ai/seo", data),
  script: (data: any) => api.post<{ script: string }>("/ai/script", data),
  storyboard: (data: any) => api.post<{ scenes: any[] }>("/ai/storyboard", data),
  generateAsset: (data: any) => api.post<{ url: string; b64?: string }>("/ai/generate-asset", data),
  titles: (data: any) => api.post<{ titles: string[] }>("/ai/titles", data),
  analyzeIdea: (data: any) => api.post<any>("/ai/analyze-idea", data),
};

export const youtubeApi = {
  channel: (channelId: string) => api.get<any>(`/youtube/channel/${channelId}`),
  videos: (channelId: string, max = 10) => api.get<any[]>(`/youtube/videos/${channelId}?max=${max}`),
  analyze: (data: any) => api.post<any>("/youtube/analyze", data),
};

export const scriptApi = {
  listByVideo: (videoId: number) => api.get<Script[]>(`/scripts/video/${videoId}`),
  create: (data: { content?: string; videoId: number; label?: string }) => api.post<Script>("/scripts", data),
  update: (id: number, data: Partial<Script>) => api.put<Script>(`/scripts/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/scripts/${id}`),
};

export const seoResultApi = {
  listByVideo: (videoId: number) => api.get<any[]>(`/seo-results/video/${videoId}`),
  create: (data: any) => api.post<any>("/seo-results", data),
  del: (id: number) => api.del<{ ok: boolean }>(`/seo-results/${id}`),
};

export const ideaApi = {
  list: async () => extractData<Idea>(await api.get("/ideas")),
  create: (data: Partial<Idea>) => api.post<Idea>("/ideas", data),
  update: (id: number, data: Partial<Idea>) => api.put<Idea>(`/ideas/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/ideas/${id}`),
};

export const searchApi = {
  search: (q: string) => api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  global: (q: string) => api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
};

export const exportApi = {
  videoCsv: () => `${BASE}/export/videos-csv`,
  budgetCsv: () => `${BASE}/export/budget-csv`,
  scriptTxt: (id: number) => `${BASE}/export/script/${id}`,
};

export default api;

export const researchApi = {
  search: (query: string) => api.post<{ channels: any[] }>("/research/search", { query, maxResults: 16 }),
  analyze: (channelId: string) => api.post<any>("/research/analyze", { channelId }),
  save: (data: any) => api.post<any>("/research/save", data),
  listSaved: () => api.get<any[]>("/research/saved"),
  deleteSaved: (id: number) => api.del<{ ok: boolean }>(`/research/saved/${id}`),
  dna: (data: any) => api.post<any>("/research/dna", data),
  blueprint: (data: any) => api.post<any>("/research/blueprint", data),
  monetization: (data: any) => api.post<any>("/research/monetization", data),
  generateTitles: (data: any) => api.post<any>("/research/generate-titles", data),
  trending: (data: any) => api.post<any>("/research/trending", data),
  emerging: () => api.post<any>("/research/emerging", {}),
  spy: (channelIds: string[]) => api.post<any>("/research/spy", { channelIds }),
  abTest: (data: any) => api.post<any>("/research/ab-test", data),
  calendar: (data: any) => api.post<any>("/research/calendar", data),
  channelMockup: (data: any) => api.post<any>("/research/channel-mockup", data),
  smartCompare: (channels: any[]) => api.post<any>("/research/smart-compare", { channels }),
  analyzeScreenshots: (images: string[], context?: string) => api.post<any>("/research/analyze-screenshots", { images, context }),
  prePublishScore: (data: any) => api.post<any>("/research/pre-publish-score", data),
  multiLanguage: (data: any) => api.post<any>("/research/multi-language", data),
  pipeline: (data: any) => api.post<any>("/research/pipeline", data),
  trendingNiches: () => api.post<any>("/research/trending-niches", {}),
  fullScript: (data: any) => api.post<any>("/research/full-script", data),
  predictViral: (data: any) => api.post<any>("/research/predict-viral", data),
  monetize360: (data: any) => api.post<any>("/research/monetize-360", data),
  repurpose: (data: any) => api.post<any>("/research/repurpose", data),
  quickAnalyze: (query: string) => api.post<any>("/research/quick-analyze", { query }),
  saveScriptVersion: (data: any) => api.post<any>("/research/save-script-version", data),
  getScriptVersions: (videoId: number) => api.get<any>(`/research/script-versions/${videoId}`),
  exportChannel: (channelId: number) => api.post<any>("/research/export-channel", { channelId }),
  spyAlerts: () => api.post<any>("/research/spy-alerts", {}),
  bestTime: (data: any) => api.post<any>("/research/best-time", data),
  trendDetector: (data: any) => api.post<any>("/research/trend-detector", data),
  engagementGen: (data: any) => api.post<any>("/research/engagement-gen", data),
  updateSaved: (id: number, data: any) => api.put<any>(`/research/saved/${id}`, data),
};

export const competitiveApi = {
  keywordSearch: (data: any) => api.post<any>("/competitive/keywords/search", data),
  keywordHistory: () => api.get<any[]>("/competitive/keywords/history"),
  tagSpy: (data: any) => api.post<any>("/competitive/tag-spy", data),
  tagSpyBulk: (data: any) => api.post<any>("/competitive/tag-spy/bulk", data),
  seoAudit: (data: any) => api.post<any>("/competitive/seo-audit", data),
  seoAuditPrePub: (data: any) => api.post<any>("/competitive/seo-audit/pre-publish", data),
  dailyIdeasGenerate: () => api.post<any>("/competitive/daily-ideas/generate", {}),
  dailyIdeasList: () => api.get<any[]>("/competitive/daily-ideas"),
  dailyIdeaUse: (id: number) => api.put<any>(`/competitive/daily-ideas/${id}/use`, {}),
  compare: (data: any) => api.post<any>("/competitive/compare", data),
  velocityCheck: () => api.post<any>("/competitive/velocity/check", {}),
  velocityHistory: (videoId: string) => api.get<any[]>(`/competitive/velocity/history/${videoId}`),
  retentionAnalyze: (data: any) => api.post<any>("/competitive/retention-analyze", data),
  shortsClip: (data: any) => api.post<any>("/competitive/shorts-clip", data),
  snapshotsCollect: () => api.post<any>("/competitive/snapshots/collect", {}),
  snapshotsList: (channelId: number) => api.get<any[]>(`/competitive/snapshots/${channelId}`),
};

export const algorithmApi = {
  oauthUrl: () => api.get<{ url: string }>("/algorithm/oauth/url"),
  oauthStatus: () => api.get<any>("/algorithm/oauth/status"),
  overview: (days = 28) => api.get<any>(`/algorithm/my-channel/overview?days=${days}`),
  videos: (days = 28) => api.get<any>(`/algorithm/my-channel/videos?days=${days}`),
  videoDetails: (videoId: string) => api.get<any>(`/algorithm/my-channel/video/${videoId}/details`),
  abTestCreate: (data: any) => api.post<any>("/algorithm/ab-test/create", data),
  abTestList: () => api.get<any[]>("/algorithm/ab-test/list"),
  abTestRotate: (id: number, data: any) => api.post<any>(`/algorithm/ab-test/${id}/rotate`, data),
  abTestComplete: (id: number, data: any) => api.post<any>(`/algorithm/ab-test/${id}/complete`, data),
  commandCenter: (data: any) => api.post<any>("/algorithm/command-center", data),
  satisfaction: () => api.get<any>("/algorithm/satisfaction"),
  playlistOptimize: (data: any) => api.post<any>("/algorithm/playlist-optimize", data),
  communityGenerate: (data: any) => api.post<any>("/algorithm/community/generate", data),
  communityList: () => api.get<any[]>("/algorithm/community/list"),
  communitySave: (data: any) => api.post<any>("/algorithm/community/save", data),
  shortsOptimize: (data: any) => api.post<any>("/algorithm/shorts-optimize", data),
  streakLog: (data: any) => api.post<any>("/algorithm/streak/log", data),
  streakData: () => api.get<any>("/algorithm/streak/data"),
  endScreenSuggest: (data: any) => api.post<any>("/algorithm/end-screen/suggest", data),
  hypeStrategy: (data: any) => api.post<any>("/algorithm/hype-strategy", data),
  aiDisclosureCheck: (data: any) => api.post<any>("/algorithm/ai-disclosure/check", data),
  catalogScan: () => api.post<any>("/algorithm/catalog/scan", {}),
  catalogFix: (data: any) => api.post<any>("/algorithm/catalog/fix", data),
  devices: () => api.get<any>("/algorithm/devices"),
};

// Retry wrapper for AI calls — retries automatically on timeout/5xx with exponential backoff
async function chatWithRetry(
  messages: any[],
  context?: string,
  opts?: { maxRetries?: number; timeout?: number; maxTokens?: number; onRetry?: (attempt: number, maxRetries: number) => void }
): Promise<{ reply: string }> {
  const maxRetries = opts?.maxRetries ?? 3;
  const timeout = opts?.timeout ?? 180000; // 3 min default
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await api.post<{ reply: string }>("/chat", {
        messages,
        context,
        timeout,
        maxTokens: opts?.maxTokens,
      });
      return result;
    } catch (err: any) {
      lastError = err.message || "Erro desconhecido";
      const isRetryable =
        lastError.includes("demorou") ||
        lastError.includes("504") ||
        lastError.includes("503") ||
        lastError.includes("529") ||
        lastError.includes("sobrecarregado") ||
        lastError.includes("indisponível") ||
        lastError.includes("vazia") ||
        lastError.includes("Tente novamente");

      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }

      // Notify caller about retry
      if (opts?.onRetry) opts.onRetry(attempt, maxRetries);

      // Exponential backoff: 2s, 4s, 8s...
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(lastError);
}

// Combo IA — two-model pipeline with retry
async function comboWithRetry(
  data: {
    analysisModel: string;
    promptModel: string;
    analysisSystem: string;
    analysisUser: string;
    promptSystem: string;
    promptTemplate: string;
    maxTokens?: number;
  },
  opts?: { maxRetries?: number; onRetry?: (attempt: number, maxRetries: number) => void }
): Promise<{ reply: string; analysis: string; models: { analysis: string; prompt: string } }> {
  const maxRetries = opts?.maxRetries ?? 2;
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await api.post<{ reply: string; analysis: string; models: { analysis: string; prompt: string } }>("/chat/combo", data);
    } catch (err: any) {
      lastError = err.message || "Erro combo";
      const isRetryable = lastError.includes("demorou") || lastError.includes("504") || lastError.includes("503") || lastError.includes("vazia") || lastError.includes("Tente novamente");
      if (!isRetryable || attempt >= maxRetries) throw err;
      if (opts?.onRetry) opts.onRetry(attempt, maxRetries);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  throw new Error(lastError);
}

export const chatApi = {
  send: (messages: any[], context?: string) => chatWithRetry(messages, context),
  sendWithRetry: chatWithRetry,
  combo: comboWithRetry,
  shorts: (data: any) => api.post<{ shorts: any[] }>("/chat/shorts", data),
};

export async function streamAI(prompt: string, onToken: (t: string) => void, systemPrompt?: string): Promise<void> {
  const token = getToken();
  const res = await fetch("/api/ai/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ prompt, systemPrompt })
  });
  if (!res.ok || !res.body) throw new Error("Stream failed");
  const reader = res.body.getReader();
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
        if (data === "[DONE]") return;
        try { const j = JSON.parse(data); if (j.token) onToken(j.token); if (j.error) throw new Error(j.error); } catch {}
      }
    }
  }
}
