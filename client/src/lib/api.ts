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
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // Auto-refresh on 401
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

// Helper to extract data from paginated responses
function extractData<T>(response: any): T[] {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  return response;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post<{ token: string; refreshToken: string; user: any }>("/auth/login", { email, password }, true);
    setTokens(res.token, res.refreshToken);
    return res;
  },
  register: async (email: string, name: string, password: string) => {
    const res = await api.post<{ token: string; refreshToken: string; user: any }>("/auth/register", { email, name, password }, true);
    setTokens(res.token, res.refreshToken);
    return res;
  },
  logout: () => api.post("/auth/logout").catch(() => {}).finally(() => {
    localStorage.removeItem("lc_token");
    localStorage.removeItem("lc_refresh");
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
  list: async () => extractData<Asset>(await api.get("/assets")),
  create: (data: Partial<Asset>) => api.post<Asset>("/assets", data),
  upload: async (formData: FormData) => request<Asset>("/assets/upload", { method: "POST", body: formData }),
  del: (id: number) => api.del<{ ok: boolean }>(`/assets/${id}`),
};

export const metaApi = {
  list: async () => extractData<Meta>(await api.get("/metas")),
  create: (data: any) => api.post<Meta>("/metas", data),
  update: (id: number, data: any) => api.put<Meta>(`/metas/${id}`, data),
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
  del: (id: number) => api.del<{ ok: boolean }>(`/budget/${id}`),
};

export const notifApi = {
  list: async () => extractData<Notification>(await api.get("/notifications")),
  markRead: (id: number) => api.put<Notification>(`/notifications/${id}`, { read: true }),
  markAllRead: () => api.put<{ ok: boolean }>("/notifications/read-all"),
};

export const ideaApi = {
  list: async () => extractData<Idea>(await api.get("/ideas")),
  create: (data: Partial<Idea>) => api.post<Idea>("/ideas", data),
  update: (id: number, data: Partial<Idea>) => api.put<Idea>(`/ideas/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/ideas/${id}`),
};

export const scriptApi = {
  listByVideo: (videoId: number) => api.get<Script[]>(`/scripts/video/${videoId}`),
  create: (data: Partial<Script>) => api.post<Script>("/scripts", data),
  update: (id: number, data: Partial<Script>) => api.put<Script>(`/scripts/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/scripts/${id}`),
};

export const checklistApi = {
  listByVideo: (videoId: number) => api.get<ChecklistItem[]>(`/checklists/video/${videoId}`),
  create: (data: Partial<ChecklistItem>) => api.post<ChecklistItem>("/checklists", data),
  update: (id: number, data: Partial<ChecklistItem>) => api.put<ChecklistItem>(`/checklists/${id}`, data),
  del: (id: number) => api.del<{ ok: boolean }>(`/checklists/${id}`),
};

export const searchApi = {
  global: (q: string) => api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
};

export const aiApi = {
  seo: (data: any) => api.post<any>("/ai/seo", data),
  script: (data: any) => api.post<any>("/ai/script", data),
  storyboard: (data: any) => api.post<any>("/ai/storyboard", data),
  titles: (data: any) => api.post<any>("/ai/titles", data),
  analyzeIdea: (data: any) => api.post<any>("/ai/analyze-idea", data),
};

export const settingsApi = {
  get: (key: string) => api.get<{ value: string }>(`/settings/${key}`),
  set: (key: string, value: string) => api.post<{ ok: boolean }>("/settings", { key, value }),
};

export default api;
