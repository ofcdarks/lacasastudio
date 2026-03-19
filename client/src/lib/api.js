const BASE = "/api";

function getToken() { return localStorage.getItem("lc_token"); }

async function request(path, opts = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Remove Content-Type for FormData
  if (opts.body instanceof FormData) delete headers["Content-Type"];

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (res.status === 401) {
    localStorage.removeItem("lc_token");
    window.location.href = "/login";
    throw new Error("Sessão expirada");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: (path) => request(path, { method: "DELETE" }),
  upload: (path, formData) => request(path, { method: "POST", body: formData }),
};

export const authApi = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (email, name, password) => api.post("/auth/register", { email, name, password }),
  me: () => api.get("/auth/me"),
};

export const channelApi = {
  list: () => api.get("/channels"),
  create: (data) => api.post("/channels", data),
  update: (id, data) => api.put(`/channels/${id}`, data),
  del: (id) => api.del(`/channels/${id}`),
};

export const videoApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/videos${q ? `?${q}` : ""}`);
  },
  get: (id) => api.get(`/videos/${id}`),
  create: (data) => api.post("/videos", data),
  update: (id, data) => api.put(`/videos/${id}`, data),
  del: (id) => api.del(`/videos/${id}`),
};

export const sceneApi = {
  listByVideo: (videoId) => api.get(`/scenes/video/${videoId}`),
  create: (data) => api.post("/scenes", data),
  update: (id, data) => api.put(`/scenes/${id}`, data),
  reorder: (videoId, orderedIds) => api.put(`/scenes/reorder/${videoId}`, { orderedIds }),
  del: (id) => api.del(`/scenes/${id}`),
};

export const teamApi = {
  list: () => api.get("/team"),
  create: (data) => api.post("/team", data),
  update: (id, data) => api.put(`/team/${id}`, data),
  del: (id) => api.del(`/team/${id}`),
};

export const assetApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/assets${q ? `?${q}` : ""}`);
  },
  create: (data) => api.post("/assets", data),
  upload: (formData) => {
    const token = getToken();
    return fetch(`${BASE}/assets/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no upload");
      return data;
    });
  },
  update: (id, data) => api.put(`/assets/${id}`, data),
  del: (id) => api.del(`/assets/${id}`),
};

export const metaApi = {
  list: () => api.get("/metas"),
  create: (data) => api.post("/metas", data),
  updateItem: (id, data) => api.put(`/metas/item/${id}`, data),
  del: (id) => api.del(`/metas/${id}`),
};

export const templateApi = {
  list: () => api.get("/templates"),
  create: (data) => api.post("/templates", data),
  del: (id) => api.del(`/templates/${id}`),
};

export const budgetApi = {
  list: () => api.get("/budget"),
  create: (data) => api.post("/budget", data),
  update: (id, data) => api.put(`/budget/${id}`, data),
  del: (id) => api.del(`/budget/${id}`),
};

export const notifApi = {
  list: () => api.get("/notifications"),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  clearRead: () => api.del("/notifications/clear"),
};

export const checklistApi = {
  listByVideo: (videoId) => api.get(`/checklists/video/${videoId}`),
  create: (data) => api.post("/checklists", data),
  update: (id, data) => api.put(`/checklists/${id}`, data),
  del: (id) => api.del(`/checklists/${id}`),
};

export const settingsApi = {
  get: () => api.get("/settings"),
  getRaw: (key) => api.get(`/settings/raw/${key}`),
  save: (data) => api.put("/settings", data),
};

export const aiApi = {
  seo: (data) => api.post("/ai/seo", data),
  script: (data) => api.post("/ai/script", data),
  storyboard: (data) => api.post("/ai/storyboard", data),
  titles: (data) => api.post("/ai/titles", data),
  analyzeIdea: (data) => api.post("/ai/analyze-idea", data),
};

export const youtubeApi = {
  channel: (channelId) => api.get(`/youtube/channel/${channelId}`),
  videos: (channelId, max = 10) => api.get(`/youtube/videos/${channelId}?max=${max}`),
  analyze: (data) => api.post("/youtube/analyze", data),
};

export const scriptApi = {
  listByVideo: (videoId) => api.get(`/scripts/video/${videoId}`),
  create: (data) => api.post("/scripts", data),
  update: (id, data) => api.put(`/scripts/${id}`, data),
  del: (id) => api.del(`/scripts/${id}`),
};

export const seoResultApi = {
  listByVideo: (videoId) => api.get(`/seo-results/video/${videoId}`),
  create: (data) => api.post("/seo-results", data),
  del: (id) => api.del(`/seo-results/${id}`),
};

export const ideaApi = {
  list: () => api.get("/ideas"),
  create: (data) => api.post("/ideas", data),
  update: (id, data) => api.put(`/ideas/${id}`, data),
  del: (id) => api.del(`/ideas/${id}`),
};

// NEW: Search
export const searchApi = {
  search: (q) => api.get(`/search?q=${encodeURIComponent(q)}`),
};

// NEW: Export
export const exportApi = {
  videoJson: (id) => api.get(`/export/video/${id}`),
  videoCsv: () => `${BASE}/export/videos-csv`,
  budgetCsv: () => `${BASE}/export/budget-csv`,
  scriptTxt: (id) => `${BASE}/export/script/${id}`,
};

export default api;
