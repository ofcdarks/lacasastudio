// @ts-nocheck
import { useToast } from "../components/shared/Toast";
import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useConfirm } from "../context/ConfirmContext";
import { assetApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Select, C } from "../components/shared/UI";

const BASE = "/api";
function getToken() { return localStorage.getItem("lc_token"); }

const TYPES = {
  thumbnail: { l: "Thumbnails", c: "#F59E0B", i: "🖼️" },
  intro: { l: "Vídeos", c: "#A855F7", i: "🎬" },
  overlay: { l: "Overlays", c: "#06B6D4", i: "🔲" },
  audio: { l: "Áudio", c: "#EC4899", i: "🎵" },
  graphic: { l: "Gráficos", c: "#14B8A6", i: "📊" },
  font: { l: "Fontes", c: "#EF4444", i: "🔤" },
  other: { l: "Outros", c: "#6B7280", i: "📎" },
};

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function guessType(ext) {
  const map = { jpg:"thumbnail", jpeg:"thumbnail", png:"thumbnail", webp:"thumbnail", psd:"thumbnail", mp4:"intro", mov:"intro", avi:"intro", mkv:"intro", mp3:"audio", wav:"audio", ogg:"audio", flac:"audio", svg:"graphic", ai:"graphic", eps:"graphic", ttf:"font", otf:"font", woff:"font", woff2:"font" };
  return map[(ext||"").toLowerCase()] || "other";
}

/* --- Storage Info --- */
function StoragePanel({ info }) {
  if (!info) return null;
  function fmt(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes >= 1099511627776) return (bytes / 1099511627776).toFixed(1) + " TB";
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
    return bytes + " B";
  }
  const disk = info.disk || {};
  const uploads = info.uploads || {};
  const ram = info.ram || {};
  const db = info.database || {};
  const diskColor = disk.percent > 90 ? "#EF4444" : disk.percent > 70 ? "#F59E0B" : "#22D35E";
  const ramColor = ram.percent > 90 ? "#EF4444" : ram.percent > 70 ? "#F59E0B" : "#22D35E";
  return (
    <div style={{ marginTop: 12, padding: "12px 10px 8px", borderTop: "1px solid rgba(255,255,255,0.055)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em", marginBottom: 10, textTransform: "uppercase" }}>SERVIDOR</div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Disco</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: diskColor }}>{disk.percent || 0}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
          <div style={{ width: (disk.percent || 0) + "%", height: "100%", borderRadius: 3, background: diskColor, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{fmt(disk.used)} usado</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{fmt(disk.free)} livre</span>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>RAM</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: ramColor }}>{ram.percent || 0}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
          <div style={{ width: (ram.percent || 0) + "%", height: "100%", borderRadius: 3, background: ramColor, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{fmt(ram.used)}</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{fmt(ram.total)}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Seus uploads</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#E8E6F0" }}>{fmt(uploads.userSize)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Arquivos</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#E8E6F0" }}>{uploads.userFiles || 0}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Total server</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#E8E6F0" }}>{fmt(uploads.totalSize)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Banco de dados</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#E8E6F0" }}>{fmt(db.size)}</span>
        </div>
        {info.uptime > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.03)" }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Uptime</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{Math.floor(info.uptime / 3600)}h {Math.floor((info.uptime % 3600) / 60)}m</span>
          </div>
        )}
      </div>
    </div>
  );
}


/* ─── Folder Sidebar ─── */
function FolderTree({ folders, current, onSelect, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    if (!name.trim()) return;
    const base = current === "/" ? "" : current;
    onCreate(base + "/" + name.trim());
    setName(""); setCreating(false);
  }

  function buildTree(paths) {
    const root = { name: "Todos", path: "/", kids: [] };
    const map = { "/": root };
    paths.filter(p => p !== "/").sort().forEach(p => {
      const parts = p.split("/").filter(Boolean);
      let cur = root, built = "";
      parts.forEach(part => {
        built += "/" + part;
        if (!map[built]) { const n = { name: part, path: built, kids: [] }; cur.kids.push(n); map[built] = n; }
        cur = map[built];
      });
    });
    return root;
  }

  function renderNode(node, depth = 0) {
    const active = current === node.path;
    return (
      <div key={node.path}>
        <button onClick={() => onSelect(node.path)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", paddingLeft: 10 + depth * 16, border: "none", borderRadius: 8, cursor: "pointer", background: active ? `${C.blue}15` : "transparent", color: active ? C.text : C.muted, fontSize: 12, fontWeight: active ? 600 : 400, textAlign: "left" }}>
          <span style={{ fontSize: 13 }}>{node.kids.length ? "📂" : "📁"}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        </button>
        {node.kids.map(c => renderNode(c, depth + 1))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.05em", textTransform: "uppercase", padding: "8px 10px 6px", display: "flex", justifyContent: "space-between" }}>
        📁 Pastas
        <button onClick={() => setCreating(true)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 14, padding: 0 }}>+</button>
      </div>
      {creating && (
        <div style={{ display: "flex", gap: 4, padding: "4px 10px", marginBottom: 4 }}>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setName(""); setCreating(false); } }}
            placeholder="Nome da pasta"
            style={{ flex: 1, padding: "5px 8px", borderRadius: 6, fontSize: 11, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.text, outline: "none" }} />
          <button onClick={submit} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>OK</button>
        </div>
      )}
      {renderNode(buildTree(folders))}
    </div>
  );
}

/* ─── Upload Zone ─── */
function UploadZone({ folder, channels, onDone }) {
  const toast = useToast();
  const [drag, setDrag] = useState(false);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [channelId, setChannelId] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const ref = useRef(null);

  function onFiles(fl) {
    const arr = Array.from(fl);
    if (!arr.length) return;
    setFiles(arr); setError("");
    const ext = arr[0].name.split(".").pop() || "";
    setType(guessType(ext));
    if (!name) setName(arr[0].name.replace(/\.[^/.]+$/, ""));
  }

  async function doUpload() {
    if (!files.length) return;
    setBusy(true); setError("");
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", files.length === 1 ? (name || file.name.replace(/\.[^/.]+$/, "")) : file.name.replace(/\.[^/.]+$/, ""));
        fd.append("type", type || guessType(file.name.split(".").pop()));
        fd.append("folder", folder);
        if (tags) fd.append("tags", tags);
        if (notes) fd.append("notes", notes);
        if (channelId) fd.append("channelId", channelId);

        const res = await fetch(`${BASE}/assets/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
        onDone(data);
      }
      toast?.success(`${files.length} arquivo(s) enviado(s)!`);
      setFiles([]); setName(""); setType(""); setTags(""); setNotes("");
    } catch (err) {
      const msg = err.message || "Erro no upload";
      setError(msg);
      toast?.error(msg);
    } finally { setBusy(false); }
  }

  const stop = e => { e.preventDefault(); e.stopPropagation(); };

  return (
    <Card style={{ marginBottom: 20, borderColor: `${C.cyan}30` }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
        📤 Upload de Arquivo <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>para <span style={{ color: C.blue, fontWeight: 600 }}>{folder === "/" ? "raiz" : folder}</span></span>
      </div>

      {/* Drop area */}
      <div
        onDragEnter={e => { stop(e); setDrag(true); }}
        onDragLeave={e => { stop(e); setDrag(false); }}
        onDragOver={stop}
        onDrop={e => { stop(e); setDrag(false); onFiles(e.dataTransfer.files); }}
        onClick={() => ref.current?.click()}
        style={{ border: `2px dashed ${drag ? C.blue : C.border}`, borderRadius: 14, padding: files.length ? "14px 20px" : "36px 20px", textAlign: "center", cursor: "pointer", background: drag ? `${C.blue}08` : "rgba(255,255,255,0.01)", transition: "0.25s", marginBottom: 14 }}>
        <input ref={ref} type="file" multiple style={{ display: "none" }} onChange={e => e.target.files && onFiles(e.target.files)} />

        {!files.length ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Arraste arquivos aqui ou clique para selecionar</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Formato e tamanho detectados automaticamente · Até 500 MB</div>
          </>
        ) : (
          files.map((f, i) => {
            const ext = (f.name.split(".").pop() || "").toUpperCase();
            const tp = TYPES[guessType(ext)] || TYPES.other;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "left", marginBottom: 4 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tp.c}15`, border: `1px solid ${tp.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{tp.i}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}><span style={{ color: tp.c, fontWeight: 600 }}>{ext}</span> · {fmtSize(f.size)} · {tp.l}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            );
          })
        )}
      </div>

      {error && <div style={{ padding: "8px 14px", background: "rgba(240,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(240,68,68,0.2)", fontSize: 12, color: C.red, marginBottom: 12 }}>❌ {error}</div>}

      {files.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><Label t="Nome" /><Input value={name} onChange={e => setName(e.target.value)} placeholder={files[0]?.name.replace(/\.[^/.]+$/, "")} /></div>
            <div><Label t="Tipo" /><Select value={type} onChange={e => setType(e.target.value)}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
            <div><Label t="Canal" /><Select value={channelId} onChange={e => setChannelId(e.target.value)}><option value="">Global</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><Label t="Tags (vírgula)" /><Input placeholder="intro, clean, dark" value={tags} onChange={e => setTags(e.target.value)} /></div>
            <div><Label t="Notas" /><Input placeholder="Versão, observações..." value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn vr="ghost" onClick={() => { setFiles([]); setName(""); setError(""); }}>Cancelar</Btn>
            <Btn onClick={doUpload} disabled={busy}>{busy ? "Enviando..." : `📤 Upload${files.length > 1 ? ` (${files.length})` : ""}`}</Btn>
          </div>
        </>
      )}
    </Card>
  );
}

/* ─── Link Form ─── */
function LinkForm({ folder, channels, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", type: "other", channelId: "", tags: "", fileUrl: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!f.name.trim()) return;
    setBusy(true);
    try {
      const asset = await assetApi.create({ ...f, folder, channelId: f.channelId ? Number(f.channelId) : null, tags: f.tags.split(",").map(t => t.trim()).filter(Boolean) });
      onDone(asset); setF({ name: "", type: "other", channelId: "", tags: "", fileUrl: "", notes: "" });
      toast?.success("Ativo cadastrado!");
    } catch (err) { toast?.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Card style={{ marginBottom: 20, borderColor: `${C.purple}25` }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>🔗 Cadastrar por Link</div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><Label t="Nome" /><Input placeholder="Ex: Intro Tech v3" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></div>
        <div><Label t="Tipo" /><Select value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
        <div><Label t="Canal" /><Select value={f.channelId} onChange={e => setF(p => ({ ...p, channelId: e.target.value }))}><option value="">Global</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
      </div>
      <div style={{ marginBottom: 12 }}><Label t="🔗 Link" /><Input placeholder="https://drive.google.com/file/d/..." value={f.fileUrl} onChange={e => setF(p => ({ ...p, fileUrl: e.target.value }))} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div><Label t="Tags" /><Input placeholder="intro, clean" value={f.tags} onChange={e => setF(p => ({ ...p, tags: e.target.value }))} /></div>
        <div><Label t="Notas" /><Input placeholder="Versão, obs..." value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn onClick={add} disabled={busy || !f.name.trim()}>{busy ? "Salvando..." : "Cadastrar"}</Btn></div>
    </Card>
  );
}

/* ─── Asset Card ─── */
function AssetCard({ asset, channels, onEdit, onDelete, onDownload }) {
  const tp = TYPES[asset.type] || TYPES.other;
  const ch = asset.channel || channels.find(c => c.id === asset.channelId);
  const tags = Array.isArray(asset.tags) ? asset.tags : (asset.tags || "").split(",").filter(Boolean);
  const hasFile = asset.filePath || (asset.fileUrl && asset.fileUrl.startsWith("/uploads"));

  return (
    <Card hov color={tp.c} style={{ cursor: "pointer" }} onClick={() => onEdit(asset)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${tp.c}15`, border: `1px solid ${tp.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{tp.i}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {ch?.name || "Global"} · <span style={{ color: tp.c }}>{tp.l}</span>
            {asset.folder && asset.folder !== "/" && <span style={{ color: C.dim }}> · {asset.folder}</span>}
          </div>
        </div>
      </div>

      {/* Format + Size badges */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {asset.format && <div style={{ padding: "5px 10px", borderRadius: 6, background: `${tp.c}12`, border: `1px solid ${tp.c}25`, fontSize: 12, fontWeight: 600, color: tp.c }}>{asset.format}</div>}
        {asset.size && <div style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", fontSize: 12, color: C.muted }}>{asset.size}</div>}
      </div>

      {/* Notes */}
      {asset.notes && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>{asset.notes}</div>}

      {/* Tags */}
      {tags.length > 0 && <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>{tags.map((t, i) => <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "rgba(255,255,255,0.05)", color: C.muted }}>#{t}</span>)}</div>}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim }}>{asset.createdAt ? new Date(asset.createdAt).toLocaleDateString("pt-BR") : ""}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {/* DOWNLOAD BUTTON - triggers browser "Save As" */}
          {hasFile && (
            <Btn vr="subtle" onClick={() => onDownload(asset)} style={{ fontSize: 10, padding: "4px 10px", color: C.green }}>
              💾 Baixar
            </Btn>
          )}
          {/* External link */}
          {asset.fileUrl && !asset.fileUrl.startsWith("/uploads") && (
            <Btn vr="subtle" onClick={() => window.open(asset.fileUrl, "_blank")} style={{ fontSize: 10, padding: "4px 10px", color: C.blue }}>
              🔗 Abrir
            </Btn>
          )}
          <Btn vr="subtle" onClick={() => onEdit(asset)} style={{ fontSize: 10, padding: "4px 8px" }}>✎</Btn>
          <Btn vr="subtle" onClick={() => onDelete(asset.id)} style={{ fontSize: 10, color: C.red, padding: "4px 8px" }}>✕</Btn>
        </div>
      </div>
    </Card>
  );
}

/* ─── Edit Modal ─── */
function EditModal({ asset, channels, folders, onClose, onSave }) {
  const [f, setF] = useState({ name: asset.name, type: asset.type, folder: asset.folder || "/", channelId: asset.channelId || "", tags: Array.isArray(asset.tags) ? asset.tags.join(", ") : (asset.tags || ""), fileUrl: asset.fileUrl || "", notes: asset.notes || "" });
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await onSave(asset.id, { ...f, channelId: f.channelId ? Number(f.channelId) : null, tags: f.tags.split(",").map(t => t.trim()).filter(Boolean) }); onClose(); } catch {} finally { setBusy(false); } };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, background: C.bgCard, borderRadius: 18, border: `1px solid ${C.border}`, padding: 28, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Editar Ativo</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
          <div><Label t="Nome" /><Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></div>
          <div><Label t="Tipo" /><Select value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div><Label t="📁 Pasta" /><Select value={f.folder} onChange={e => setF(p => ({ ...p, folder: e.target.value }))}>{folders.map(fo => <option key={fo} value={fo}>{fo === "/" ? "/ (raiz)" : fo}</option>)}</Select></div>
          <div><Label t="Canal" /><Select value={f.channelId} onChange={e => setF(p => ({ ...p, channelId: e.target.value }))}><option value="">Global</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
        </div>
        {(asset.format || asset.size) && (
          <div style={{ display: "flex", gap: 16, padding: "10px 14px", background: "rgba(255,255,255,0.025)", borderRadius: 8, marginBottom: 14 }}>
            {asset.format && <span style={{ fontSize: 12, color: C.muted }}>Formato: <strong style={{ color: C.text }}>{asset.format}</strong></span>}
            {asset.size && <span style={{ fontSize: 12, color: C.muted }}>Tamanho: <strong style={{ color: C.text }}>{asset.size}</strong></span>}
          </div>
        )}
        <div style={{ marginBottom: 14 }}><Label t="🔗 Link" /><Input value={f.fileUrl} onChange={e => setF(p => ({ ...p, fileUrl: e.target.value }))} /></div>
        <div style={{ marginBottom: 14 }}><Label t="Tags" /><Input value={f.tags} onChange={e => setF(p => ({ ...p, tags: e.target.value }))} /></div>
        <div style={{ marginBottom: 14 }}><Label t="Notas" /><Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn vr="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Ativos() {
  const { channels } = useApp();
  const confirm = useConfirm();
  const toast = useToast();
  const [assets, setAssets] = useState([]);
  const [folders, setFolders] = useState(["/"]);
  const [curFolder, setCurFolder] = useState("/");
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState("none");
  const [editAsset, setEditAsset] = useState(null);
  const [search, setSearch] = useState("");
  const [diskInfo, setDiskInfo] = useState(null);

  // Load assets + folders
  useEffect(() => {
    assetApi.list().then(data => {
      const arr = Array.isArray(data) ? data : (data?.data || []);
      setAssets(arr);
    }).catch(() => {});
    fetch(`${BASE}/assets/folders`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : ["/"])
      .then(setFolders)
      .catch(() => setFolders(["/"]));
    fetch(`${BASE}/assets/disk-usage`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null).then(setDiskInfo).catch(() => {});
  }, []);

  // Filter
  const filtered = assets.filter(a => {
    const af = a.folder || "/";
    const ok1 = curFolder === "/" || af === curFolder || af.startsWith(curFolder + "/");
    const ok2 = filter === "all" || a.type === filter;
    const q = search.toLowerCase();
    const tgs = Array.isArray(a.tags) ? a.tags : (a.tags || "").split(",");
    const ok3 = !q || a.name.toLowerCase().includes(q) || tgs.some(t => t.toLowerCase().includes(q));
    return ok1 && ok2 && ok3;
  });

  // Actions
  const onUploaded = (asset) => {
    setAssets(p => [asset, ...p]);
    if (asset.folder && !folders.includes(asset.folder)) setFolders(p => [...p, asset.folder].sort());
    fetch(`${BASE}/assets/disk-usage`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.ok ? r.json() : null).then(setDiskInfo).catch(() => {});
  };
  const createFolder = (path) => {
    const clean = path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
    if (!folders.includes(clean)) setFolders(p => [...p, clean].sort());
    setCurFolder(clean);
  };
  const saveEdit = async (id, data) => {
    const u = await assetApi.update(id, data);
    setAssets(p => p.map(a => a.id === id ? { ...a, ...u } : a));
  };
  const delAsset = async (id) => {
    if (!await confirm({ title: "Remover Ativo", message: "Deseja continuar?" })) return;
    try { await assetApi.del(id); setAssets(p => p.filter(a => a.id !== id)); } catch {}
  };

  // DOWNLOAD - opens browser "Save As" dialog
  const downloadAsset = (asset) => {
    const url = `${BASE}/assets/${asset.id}/download`;
    const a = document.createElement("a");
    a.href = url;
    a.download = asset.name + (asset.format ? `.${asset.format.toLowerCase()}` : "");
    // Add auth token via fetch + blob for authenticated download
    fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => {
        if (!r.ok) throw new Error("Download failed");
        return r.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = asset.name + (asset.format ? `.${asset.format.toLowerCase()}` : "");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        toast?.success("Download iniciado!");
      })
      .catch(() => toast?.error("Erro no download"));
  };

  const typeCounts = {};
  Object.keys(TYPES).forEach(k => { typeCounts[k] = filtered.filter(a => a.type === k).length; });

  return (
    <div className="page-enter" role="main" aria-label="Ativos">
      {editAsset && <EditModal asset={editAsset} channels={channels} folders={folders} onClose={() => setEditAsset(null)} onSave={saveEdit} />}

      <Hdr title="Banco de Ativos" sub={`${assets.length} recursos · ${folders.length - 1} pastas`}
        action={<div style={{ display: "flex", gap: 6 }}>
          <Btn vr={mode === "upload" ? "primary" : "ghost"} onClick={() => setMode(mode === "upload" ? "none" : "upload")}>{mode === "upload" ? "✕ Fechar" : "📤 Upload"}</Btn>
          <Btn vr={mode === "link" ? "primary" : "ghost"} onClick={() => setMode(mode === "link" ? "none" : "link")}>{mode === "link" ? "✕ Fechar" : "🔗 Link"}</Btn>
        </div>} />

      <div style={{ display: "flex", gap: 20 }}>
        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <Card style={{ padding: 12, position: "sticky", top: 80 }}>
            <FolderTree folders={folders} current={curFolder} onSelect={setCurFolder} onCreate={createFolder} />
            <div style={{ marginTop: 12, padding: "10px 10px 4px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>Por tipo</div>
              {Object.entries(TYPES).map(([k, v]) => { const c = typeCounts[k] || 0; if (!c) return null; return (
                <div key={k} onClick={() => setFilter(filter === k ? "all" : k)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: filter === k ? `${v.c}12` : "transparent", marginBottom: 2 }}>
                  <span style={{ fontSize: 12 }}>{v.i}</span><span style={{ fontSize: 11, color: filter === k ? C.text : C.muted, flex: 1 }}>{v.l}</span><span style={{ fontSize: 10, color: v.c, fontWeight: 700 }}>{c}</span>
                </div>); })}
            </div>
            <StoragePanel info={diskInfo} />
          </Card>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Breadcrumb */}
          {curFolder !== "/" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 12, color: C.muted }}>
              <span onClick={() => setCurFolder("/")} style={{ cursor: "pointer", color: C.blue }}>📁 Raiz</span>
              {curFolder.split("/").filter(Boolean).map((part, i, arr) => {
                const p = "/" + arr.slice(0, i + 1).join("/");
                return <span key={p}><span style={{ color: C.dim }}> / </span><span onClick={() => setCurFolder(p)} style={{ cursor: "pointer", color: i === arr.length - 1 ? C.text : C.blue, fontWeight: i === arr.length - 1 ? 600 : 400 }}>{part}</span></span>;
              })}
            </div>
          )}

          <Input placeholder="🔍 Buscar por nome ou tag..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400, marginBottom: 16 }} />

          {mode === "upload" && <UploadZone folder={curFolder} channels={channels} onDone={onUploaded} />}
          {mode === "link" && <LinkForm folder={curFolder} channels={channels} onDone={(a) => { onUploaded(a); setMode("none"); }} />}

          {!filtered.length ? (
            <Card style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{search ? `Nenhum resultado para "${search}"` : curFolder !== "/" ? `Pasta "${curFolder}" vazia` : "Nenhum ativo cadastrado"}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Arraste arquivos ou cadastre por link</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <Btn onClick={() => setMode("upload")}>📤 Upload</Btn>
                <Btn vr="ghost" onClick={() => setMode("link")}>🔗 Link</Btn>
              </div>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {filtered.map(a => (
                <AssetCard key={a.id} asset={a} channels={channels}
                  onEdit={setEditAsset} onDelete={delAsset} onDownload={downloadAsset} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
