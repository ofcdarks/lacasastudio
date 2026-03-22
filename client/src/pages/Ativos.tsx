// @ts-nocheck
import { useToast } from "../components/shared/Toast";
import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useConfirm } from "../context/ConfirmContext";
import { Card, Btn, Hdr, Label, Input, Select, Badge, C } from "../components/shared/UI";

const BASE = "/api";
function getToken() { return localStorage.getItem("lc_token"); }
async function apiFetch(path, opts = {}) {
  const headers = { Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro");
  return data;
}

const TYPES = {
  thumbnail: { l: "Thumbnails", c: "#F59E0B", i: "🖼️" },
  intro: { l: "Intros/Vídeos", c: "#A855F7", i: "🎬" },
  outro: { l: "Outros", c: "#22C55E", i: "🔚" },
  overlay: { l: "Overlays", c: "#06B6D4", i: "🔲" },
  audio: { l: "Áudio", c: "#EC4899", i: "🎵" },
  transition: { l: "Transições", c: "#3B82F6", i: "✨" },
  graphic: { l: "Gráficos", c: "#14B8A6", i: "📊" },
  font: { l: "Fontes", c: "#EF4444", i: "🔤" },
  other: { l: "Outros", c: "#6B7280", i: "📎" },
};

function formatSize(bytes) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function detectType(ext) {
  const map = { jpg: "thumbnail", jpeg: "thumbnail", png: "thumbnail", webp: "thumbnail", psd: "thumbnail", ai: "graphic", mp4: "intro", mov: "intro", avi: "intro", mkv: "intro", mp3: "audio", wav: "audio", ogg: "audio", flac: "audio", svg: "graphic", eps: "graphic", ttf: "font", otf: "font", woff: "font", woff2: "font", srt: "overlay", vtt: "overlay", json: "other", zip: "other", pdf: "other" };
  return map[(ext || "").toLowerCase()] || "other";
}

/* ─── Folder Tree ─── */
function FolderTree({ folders, currentFolder, onSelect, onCreateFolder }) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  function buildTree(paths) {
    const root = { name: "Todos", path: "/", children: [] };
    const map = { "/": root };
    paths.filter(p => p !== "/").sort().forEach(p => {
      const parts = p.split("/").filter(Boolean);
      let cur = root, built = "";
      parts.forEach(part => {
        built += "/" + part;
        if (!map[built]) { const n = { name: part, path: built, children: [] }; cur.children.push(n); map[built] = n; }
        cur = map[built];
      });
    });
    return root;
  }

  function renderNode(node, depth = 0) {
    const active = currentFolder === node.path;
    return (
      <div key={node.path}>
        <button onClick={() => onSelect(node.path)} aria-current={active ? "true" : undefined}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", paddingLeft: 10 + depth * 16, border: "none", borderRadius: 8, cursor: "pointer", background: active ? `${C.blue}15` : "transparent", color: active ? C.text : C.muted, fontSize: 12, fontWeight: active ? 600 : 400, transition: "all 0.15s", textAlign: "left" }}>
          <span style={{ fontSize: 13 }}>{node.children.length ? "📂" : "📁"}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        </button>
        {node.children.map(c => renderNode(c, depth + 1))}
      </div>
    );
  }

  const tree = buildTree(folders);

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.05em", textTransform: "uppercase", padding: "8px 10px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        📁 Pastas
        <button onClick={() => setCreating(true)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 14, padding: "0 4px" }} title="Nova pasta">+</button>
      </div>
      {creating && (
        <div style={{ display: "flex", gap: 4, padding: "4px 10px", marginBottom: 4 }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && newName.trim()) { onCreateFolder((currentFolder === "/" ? "/" : currentFolder + "/") + newName.trim()); setNewName(""); setCreating(false); } if (e.key === "Escape") { setNewName(""); setCreating(false); } }}
            placeholder="Nome da pasta" style={{ flex: 1, padding: "5px 8px", borderRadius: 6, fontSize: 11, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.text, outline: "none" }} />
          <button onClick={() => { if (newName.trim()) onCreateFolder((currentFolder === "/" ? "/" : currentFolder + "/") + newName.trim()); setNewName(""); setCreating(false); }}
            style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>OK</button>
        </div>
      )}
      {renderNode(tree)}
    </div>
  );
}

/* ─── Drag & Drop Upload ─── */
function DropZone({ folder, channels, onUploaded }) {
  const toast = useToast();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [channelId, setChannelId] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const inputRef = useRef(null);

  const handleFiles = useCallback((fl) => {
    const arr = Array.from(fl);
    if (arr.length) { setFiles(arr); setType(detectType(arr[0].name.split(".").pop())); if (!name) setName(arr[0].name.replace(/\.[^/.]+$/, "")); }
  }, [name]);

  const prevent = e => { e.preventDefault(); e.stopPropagation(); };

  const doUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", files.length === 1 ? (name || file.name.replace(/\.[^/.]+$/, "")) : file.name.replace(/\.[^/.]+$/, ""));
        fd.append("type", type || detectType(file.name.split(".").pop()));
        fd.append("folder", folder);
        fd.append("tags", tags);
        fd.append("notes", notes);
        if (channelId) fd.append("channelId", channelId);
        const res = await fetch(`${BASE}/assets/upload`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onUploaded(data);
      }
      setFiles([]); setName(""); setType(""); setTags(""); setNotes("");
      toast?.success(`${files.length} arquivo(s) enviado(s)`);
    } catch (err) { toast?.error(err.message); } finally { setUploading(false); }
  };

  return (
    <Card style={{ marginBottom: 20, borderColor: `${C.cyan}30` }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        📤 Upload de Arquivo
        <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>para <span style={{ color: C.blue, fontWeight: 600 }}>{folder === "/" ? "raiz" : folder}</span></span>
      </div>

      <div onDragEnter={e => { prevent(e); setDragging(true); }} onDragLeave={e => { prevent(e); setDragging(false); }} onDragOver={prevent}
        onDrop={e => { prevent(e); setDragging(false); handleFiles(e.dataTransfer.files); }} onClick={() => inputRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? C.blue : C.border}`, borderRadius: 14, padding: files.length ? "14px 20px" : "36px 20px", textAlign: "center", cursor: "pointer", background: dragging ? `${C.blue}08` : "rgba(255,255,255,0.01)", transition: "all 0.25s", marginBottom: 14 }}>
        <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={e => e.target.files && handleFiles(e.target.files)} />

        {!files.length ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Arraste arquivos aqui ou clique para selecionar</div>
            <div style={{ fontSize: 12, color: C.dim }}>Formato e tamanho são detectados automaticamente</div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {files.map((f, i) => {
              const ext = (f.name.split(".").pop() || "").toUpperCase();
              const tp = TYPES[detectType(ext)] || TYPES.other;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "left" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tp.c}15`, border: `1px solid ${tp.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{tp.i}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: tp.c, fontWeight: 600 }}>{ext}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{formatSize(f.size)}</span>
                      <span style={{ fontSize: 11, color: C.dim }}>{tp.l}</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {files.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><Label t="Nome" /><Input value={name} onChange={e => setName(e.target.value)} placeholder={files[0]?.name.replace(/\.[^/.]+$/, "")} /></div>
            <div><Label t="Tipo" /><Select value={type} onChange={e => setType(e.target.value)}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
            <div><Label t="Canal" /><Select value={channelId} onChange={e => setChannelId(e.target.value)}><option value="">Global</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><Label t="Tags (vírgula)" /><Input placeholder="intro, clean, dark" value={tags} onChange={e => setTags(e.target.value)} /></div>
            <div><Label t="Notas" /><Input placeholder="Versão, observações..." value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", background: "rgba(75,141,248,0.06)", borderRadius: 10, border: `1px solid ${C.blue}15`, marginBottom: 14 }}>
            <span style={{ fontSize: 13 }}>⚡</span>
            <div style={{ flex: 1, fontSize: 11, color: C.muted }}>
              <strong style={{ color: C.text }}>Auto-detectado:</strong>{" "}
              {files.map((f, i) => { const ext = (f.name.split(".").pop() || "").toUpperCase(); return <span key={i}>{i > 0 && ", "}<span style={{ color: C.blue, fontWeight: 600 }}>{ext}</span> · {formatSize(f.size)}</span>; })}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn vr="ghost" onClick={() => { setFiles([]); setName(""); }}>Cancelar</Btn>
            <Btn onClick={doUpload} disabled={uploading}>{uploading ? "Enviando..." : `📤 Upload${files.length > 1 ? ` (${files.length})` : ""}`}</Btn>
          </div>
        </>
      )}
    </Card>
  );
}

/* ─── Link Form ─── */
function LinkForm({ folder, channels, onCreated }) {
  const toast = useToast();
  const [na, setNa] = useState({ name: "", type: "thumbnail", channelId: "", tags: "", fileUrl: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!na.name.trim()) return;
    setSaving(true);
    try {
      const asset = await apiFetch("/assets", { method: "POST", body: JSON.stringify({ ...na, folder, channelId: na.channelId ? Number(na.channelId) : null, tags: na.tags.split(",").map(t => t.trim()).filter(Boolean) }) });
      onCreated(asset); setNa({ name: "", type: "thumbnail", channelId: "", tags: "", fileUrl: "", notes: "" });
    } catch (err) { toast?.error(err.message); } finally { setSaving(false); }
  };
  return (
    <Card style={{ marginBottom: 20, borderColor: `${C.purple}25` }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>🔗 Cadastrar por Link <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>em <span style={{ color: C.blue, fontWeight: 600 }}>{folder === "/" ? "raiz" : folder}</span></span></div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><Label t="Nome" /><Input placeholder="Ex: Intro Tech Brasil v3" value={na.name} onChange={e => setNa(p => ({ ...p, name: e.target.value }))} /></div>
        <div><Label t="Tipo" /><Select value={na.type} onChange={e => setNa(p => ({ ...p, type: e.target.value }))}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
        <div><Label t="Canal" /><Select value={na.channelId} onChange={e => setNa(p => ({ ...p, channelId: e.target.value }))}><option value="">Global</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
      </div>
      <div style={{ marginBottom: 12 }}><Label t="🔗 Link (Google Drive, Dropbox, URL)" /><Input placeholder="https://drive.google.com/file/d/..." value={na.fileUrl} onChange={e => setNa(p => ({ ...p, fileUrl: e.target.value }))} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><Label t="Tags" /><Input placeholder="intro, clean, dark" value={na.tags} onChange={e => setNa(p => ({ ...p, tags: e.target.value }))} /></div>
        <div><Label t="Notas" /><Input placeholder="Versão, obs..." value={na.notes} onChange={e => setNa(p => ({ ...p, notes: e.target.value }))} /></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn onClick={add} disabled={saving || !na.name.trim()}>{saving ? "Salvando..." : "Cadastrar"}</Btn></div>
    </Card>
  );
}

/* ─── Edit Modal ─── */
function EditModal({ asset, channels, folders, onClose, onSave }) {
  const [f, setF] = useState({ name: asset.name, type: asset.type, folder: asset.folder || "/", channelId: asset.channelId || asset.channel?.id || "", tags: Array.isArray(asset.tags) ? asset.tags.join(", ") : (asset.tags || ""), fileUrl: asset.fileUrl || "", notes: asset.notes || "" });
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await onSave(asset.id, { ...f, channelId: f.channelId ? Number(f.channelId) : null, tags: f.tags.split(",").map(t => t.trim()).filter(Boolean) }); onClose(); } catch {} finally { setSaving(false); } };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, background: C.bgCard, borderRadius: 18, border: `1px solid ${C.border}`, padding: 28, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Editar Ativo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div><Label t="Nome" /><Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label t="Tipo" /><Select value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label t="📁 Pasta" /><Select value={f.folder} onChange={e => setF(p => ({ ...p, folder: e.target.value }))}>{folders.map(fo => <option key={fo} value={fo}>{fo === "/" ? "/ (raiz)" : fo}</option>)}</Select></div>
            <div><Label t="Canal" /><Select value={f.channelId} onChange={e => setF(p => ({ ...p, channelId: e.target.value }))}><option value="">Global</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          </div>
          {(asset.format || asset.size) && (
            <div style={{ display: "flex", gap: 16, padding: "10px 14px", background: "rgba(255,255,255,0.025)", borderRadius: 8 }}>
              {asset.format && <span style={{ fontSize: 12, color: C.muted }}>Formato: <strong style={{ color: C.text }}>{asset.format}</strong></span>}
              {asset.size && <span style={{ fontSize: 12, color: C.muted }}>Tamanho: <strong style={{ color: C.text }}>{asset.size}</strong></span>}
            </div>
          )}
          <div><Label t="🔗 Link" /><Input value={f.fileUrl} onChange={e => setF(p => ({ ...p, fileUrl: e.target.value }))} /></div>
          <div><Label t="Tags" /><Input value={f.tags} onChange={e => setF(p => ({ ...p, tags: e.target.value }))} /></div>
          <div><Label t="Notas" /><Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <Btn vr="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Ativos() {
  const { channels } = useApp();
  const confirm = useConfirm();
  const [assets, setAssets] = useState([]);
  const [folders, setFolders] = useState(["/"]);
  const [currentFolder, setCurrentFolder] = useState("/");
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState("none");
  const [editAsset, setEditAsset] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/assets?limit=100").then(r => setAssets(r.data || r)).catch(() => {});
    apiFetch("/assets/folders").then(setFolders).catch(() => setFolders(["/"]));
  }, []);

  const filtered = assets.filter(a => {
    const af = a.folder || "/";
    const matchFolder = currentFolder === "/" || af === currentFolder || af.startsWith(currentFolder + "/");
    const matchType = filter === "all" || a.type === filter;
    const q = search.toLowerCase();
    const tgs = Array.isArray(a.tags) ? a.tags : (a.tags || "").split(",");
    const matchSearch = !q || a.name.toLowerCase().includes(q) || tgs.some(t => t.toLowerCase().includes(q));
    return matchFolder && matchType && matchSearch;
  });

  const onUploaded = asset => { setAssets(p => [asset, ...p]); if (asset.folder && !folders.includes(asset.folder)) setFolders(p => [...p, asset.folder].sort()); };
  const onCreated = asset => { onUploaded(asset); setMode("none"); };
  const createFolder = path => { const clean = path.replace(/\/+/g, "/").replace(/\/$/, "") || "/"; if (!folders.includes(clean)) setFolders(p => [...p, clean].sort()); setCurrentFolder(clean); };
  const saveEdit = async (id, data) => { const u = await apiFetch(`/assets/${id}`, { method: "PUT", body: JSON.stringify(data) }); setAssets(p => p.map(a => a.id === id ? { ...a, ...u } : a)); if (u.folder && !folders.includes(u.folder)) setFolders(p => [...p, u.folder].sort()); };
  const delA = async id => { if (!await confirm({ title: "Remover Ativo", message: "Deseja continuar?" })) return; try { await apiFetch(`/assets/${id}`, { method: "DELETE" }); setAssets(p => p.filter(a => a.id !== id)); } catch {} };

  const typeCounts = {};
  Object.keys(TYPES).forEach(k => { typeCounts[k] = filtered.filter(a => a.type === k).length; });

  return (
    <div className="page-enter" role="main" aria-label="Banco de Ativos">
      {editAsset && <EditModal asset={editAsset} channels={channels} folders={folders} onClose={() => setEditAsset(null)} onSave={saveEdit} />}

      <Hdr title="Banco de Ativos" sub={`${assets.length} recursos · ${folders.length - 1} pastas`}
        action={<div style={{ display: "flex", gap: 6 }}>
          <Btn vr={mode === "upload" ? "primary" : "ghost"} onClick={() => setMode(mode === "upload" ? "none" : "upload")}>{mode === "upload" ? "✕ Fechar" : "📤 Upload"}</Btn>
          <Btn vr={mode === "link" ? "primary" : "ghost"} onClick={() => setMode(mode === "link" ? "none" : "link")}>{mode === "link" ? "✕ Fechar" : "🔗 Link"}</Btn>
        </div>} />

      <div style={{ display: "flex", gap: 20 }}>
        {/* Sidebar - Pastas */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <Card style={{ padding: 12, position: "sticky", top: 80 }}>
            <FolderTree folders={folders} currentFolder={currentFolder} onSelect={setCurrentFolder} onCreateFolder={createFolder} />
            <div style={{ marginTop: 12, padding: "10px 10px 4px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>Por tipo</div>
              {Object.entries(TYPES).map(([k, v]) => { const c = typeCounts[k] || 0; if (!c) return null; return (
                <div key={k} onClick={() => setFilter(filter === k ? "all" : k)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: filter === k ? `${v.c}12` : "transparent", marginBottom: 2 }}>
                  <span style={{ fontSize: 12 }}>{v.i}</span><span style={{ fontSize: 11, color: filter === k ? C.text : C.muted, flex: 1 }}>{v.l}</span><span style={{ fontSize: 10, color: v.c, fontWeight: 700, fontFamily: "var(--mono)" }}>{c}</span>
                </div>); })}
            </div>
          </Card>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {currentFolder !== "/" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 12, color: C.muted, flexWrap: "wrap" }}>
              <span onClick={() => setCurrentFolder("/")} style={{ cursor: "pointer", color: C.blue }}>📁 Raiz</span>
              {currentFolder.split("/").filter(Boolean).map((part, i, arr) => {
                const path = "/" + arr.slice(0, i + 1).join("/");
                return <span key={path} style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: C.dim }}>/</span><span onClick={() => setCurrentFolder(path)} style={{ cursor: "pointer", color: i === arr.length - 1 ? C.text : C.blue, fontWeight: i === arr.length - 1 ? 600 : 400 }}>{part}</span></span>;
              })}
              <span style={{ color: C.dim, marginLeft: 4 }}>({filtered.length})</span>
            </div>
          )}

          <Input placeholder="🔍 Buscar por nome ou tag..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400, marginBottom: 16 }} />

          {mode === "upload" && <DropZone folder={currentFolder} channels={channels} onUploaded={onUploaded} />}
          {mode === "link" && <LinkForm folder={currentFolder} channels={channels} onCreated={onCreated} />}

          {!filtered.length ? (
            <Card style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{search ? `Nenhum resultado para "${search}"` : currentFolder !== "/" ? `Pasta "${currentFolder}" vazia` : "Nenhum ativo cadastrado"}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Arraste arquivos ou cadastre por link</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}><Btn onClick={() => setMode("upload")}>📤 Upload</Btn><Btn vr="ghost" onClick={() => setMode("link")}>🔗 Link</Btn></div>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {filtered.map(a => {
                const tp = TYPES[a.type] || TYPES.other;
                const ch = a.channel || channels.find(c => c.id === a.channelId);
                const tags = Array.isArray(a.tags) ? a.tags : (a.tags || "").split(",").filter(Boolean);
                return (
                  <Card key={a.id} hov color={tp.c} onClick={() => setEditAsset(a)} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${tp.c}15`, border: `1px solid ${tp.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{tp.i}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: ch?.color || C.muted }}>{ch?.name || "Global"} · <span style={{ color: tp.c }}>{tp.l}</span>{a.folder && a.folder !== "/" && <span style={{ color: C.dim }}> · {a.folder}</span>}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      {a.format && <div style={{ padding: "5px 10px", borderRadius: 6, background: `${tp.c}12`, border: `1px solid ${tp.c}25`, fontSize: 12, fontWeight: 600, color: tp.c }}>{a.format}</div>}
                      {a.size && <div style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", fontSize: 12, color: C.muted }}>{a.size}</div>}
                    </div>
                    {a.fileUrl && (
                      <div onClick={e => { e.stopPropagation(); window.open(a.fileUrl.startsWith("/") ? a.fileUrl : a.fileUrl, "_blank"); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: `${C.blue}08`, border: `1px solid ${C.blue}20`, marginBottom: 10, cursor: "pointer" }}>
                        <span style={{ fontSize: 14 }}>🔗</span>
                        <span style={{ fontSize: 12, color: C.blue, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.fileUrl.startsWith("/uploads") ? "Abrir Arquivo" : a.fileUrl.includes("drive.google") ? "Google Drive" : a.fileUrl.includes("dropbox") ? "Dropbox" : "Abrir Link"}</span>
                        <span style={{ fontSize: 11, color: C.dim }}>↗</span>
                      </div>
                    )}
                    {a.notes && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>{a.notes}</div>}
                    {tags.length > 0 && <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>{tags.map((t, i) => <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "rgba(255,255,255,0.05)", color: C.muted }}>#{t}</span>)}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString("pt-BR") : ""}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn vr="subtle" onClick={() => setEditAsset(a)} style={{ fontSize: 10, padding: "4px 8px" }}>✎ Editar</Btn>
                        <Btn vr="subtle" onClick={() => delA(a.id)} style={{ fontSize: 10, color: C.red, padding: "4px 8px" }}>✕</Btn>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
