const BASE = "/api";

function getToken() {
  return localStorage.getItem("lc_token");
}

async function request(path, opts = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

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
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};

// Auth
export const authApi = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (email, name, password) => api.post("/auth/register", { email, name, password }),
  me: () => api.get("/auth/me"),
};

// Channels
export const channelApi = {
  list: () => api.get("/channels"),
  create: (data) => api.post("/channels", data),
  update: (id, data) => api.put(`/channels/${id}`, data),
  del: (id) => api.del(`/channels/${id}`),
};

// Videos
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

// Scenes
export const sceneApi = {
  listByVideo: (videoId) => api.get(`/scenes/video/${videoId}`),
  create: (data) => api.post("/scenes", data),
  update: (id, data) => api.put(`/scenes/${id}`, data),
  reorder: (videoId, orderedIds) => api.put(`/scenes/reorder/${videoId}`, { orderedIds }),
  del: (id) => api.del(`/scenes/${id}`),
};

// Team
export const teamApi = {
  list: () => api.get("/team"),
  create: (data) => api.post("/team", data),
  update: (id, data) => api.put(`/team/${id}`, data),
  del: (id) => api.del(`/team/${id}`),
};

// Assets
export const assetApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/assets${q ? `?${q}` : ""}`);
  },
  create: (data) => api.post("/assets", data),
  del: (id) => api.del(`/assets/${id}`),
};

// Metas
export const metaApi = {
  list: () => api.get("/metas"),
  create: (data) => api.post("/metas", data),
  updateItem: (id, data) => api.put(`/metas/item/${id}`, data),
  del: (id) => api.del(`/metas/${id}`),
};

// Templates
export const templateApi = {
  list: () => api.get("/templates"),
  create: (data) => api.post("/templates", data),
  del: (id) => api.del(`/templates/${id}`),
};

// Budget
export const budgetApi = {
  list: () => api.get("/budget"),
  create: (data) => api.post("/budget", data),
  del: (id) => api.del(`/budget/${id}`),
};

// Notifications
export const notifApi = {
  list: () => api.get("/notifications"),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
};

// Checklists
export const checklistApi = {
  listByVideo: (videoId) => api.get(`/checklists/video/${videoId}`),
  create: (data) => api.post("/checklists", data),
  update: (id, data) => api.put(`/checklists/${id}`, data),
  del: (id) => api.del(`/checklists/${id}`),
};

export default api;
