import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { assetApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Select, Badge, C } from "../components/shared/UI";

const TYPES = {
  thumbnail: { l: "Thumbnails", c: "#F59E0B", i: "🖼️" },
  intro: { l: "Intros", c: "#A855F7", i: "🎬" },
  outro: { l: "Outros", c: "#22C55E", i: "🔚" },
  overlay: { l: "Overlays", c: "#06B6D4", i: "🔲" },
  audio: { l: "Áudio", c: "#EC4899", i: "🎵" },
  transition: { l: "Transições", c: "#3B82F6", i: "✨" },
};

export default function Ativos() {
  const { channels } = useApp();
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showF, setShowF] = useState(false);
  const [na, setNa] = useState({ name: "", type: "thumbnail", format: "", size: "", channelId: "", tags: "" });

  useEffect(() => { assetApi.list().then(setAssets).catch(() => {}); }, []);

  const filtered = filter === "all" ? assets : assets.filter(a => a.type === filter);

  const addA = async () => {
    if (!na.name.trim()) return;
    try {
      const asset = await assetApi.create({
        ...na, channelId: na.channelId ? Number(na.channelId) : null,
        tags: na.tags.split(",").map(t => t.trim()).filter(Boolean),
      });
      setAssets(p => [asset, ...p]);
      setNa({ name: "", type: "thumbnail", format: "", size: "", channelId: "", tags: "" });
      setShowF(false);
    } catch (err) { alert(err.message); }
  };

  const delA = async (id) => {
    try { await assetApi.del(id); setAssets(p => p.filter(a => a.id !== id)); } catch {}
  };

  return (
    <div className="page-enter">
      <Hdr title="Banco de Ativos" sub="Gerencie thumbnails, intros, overlays e mais" action={<Btn onClick={() => setShowF(!showF)}>{showF ? "✕ Fechar" : "+ Novo Ativo"}</Btn>} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Btn vr={filter === "all" ? "primary" : "ghost"} onClick={() => setFilter("all")} style={{ padding: "7px 14px", fontSize: 12 }}>Todos ({assets.length})</Btn>
        {Object.entries(TYPES).map(([k, v]) => {
          const count = assets.filter(a => a.type === k).length;
          return (
            <Btn key={k} vr={filter === k ? "primary" : "ghost"} onClick={() => setFilter(k)}
              style={{ padding: "7px 14px", fontSize: 12, ...(filter === k ? { background: v.c } : {}) }}>
              {v.i} {v.l} ({count})
            </Btn>
          );
        })}
      </div>

      {showF && (
        <Card style={{ marginBottom: 20, borderColor: `${C.cyan}30` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Novo Ativo</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 10 }}>
            <div><Label t="Nome" /><Input placeholder="Nome do ativo..." value={na.name} onChange={e => setNa(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label t="Tipo" /><Select value={na.type} onChange={e => setNa(p => ({ ...p, type: e.target.value }))}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</Select></div>
            <div><Label t="Formato" /><Input placeholder="PSD, MP4..." value={na.format} onChange={e => setNa(p => ({ ...p, format: e.target.value }))} /></div>
            <div><Label t="Tamanho" /><Input placeholder="5 MB" value={na.size} onChange={e => setNa(p => ({ ...p, size: e.target.value }))} /></div>
            <div><Label t="Canal" /><Select value={na.channelId} onChange={e => setNa(p => ({ ...p, channelId: e.target.value }))}><option value="">Global</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <Btn onClick={addA} style={{ height: 38 }}>Criar</Btn>
          </div>
          <div><Label t="Tags (vírgula)" /><Input placeholder="intro, animação, clean..." value={na.tags} onChange={e => setNa(p => ({ ...p, tags: e.target.value }))} /></div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            {filter === "all" ? "Nenhum ativo cadastrado" : `Nenhum ativo do tipo ${TYPES[filter]?.l}`}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Organize seus recursos de produção</div>
          <Btn onClick={() => setShowF(true)}>+ Adicionar Ativo</Btn>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {filtered.map(a => {
            const tp = TYPES[a.type] || { l: a.type, c: C.muted, i: "📁" };
            const ch = a.channel || channels.find(c => c.id === a.channelId);
            const tags = Array.isArray(a.tags) ? a.tags : (a.tags || "").split(",").filter(Boolean);
            return (
              <Card key={a.id} hov color={tp.c}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${tp.c}12`, border: `1px solid ${tp.c}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{tp.i}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: ch?.color || C.muted }}>{ch?.name || "Global"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {a.format && <Badge text={a.format} color={tp.c} v="tag" />}
                  {a.size && <Badge text={a.size} color={C.muted} v="tag" />}
                </div>
                {tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    {tags.map((t, i) => <span key={i} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: C.dim }}>#{t}</span>)}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Btn vr="subtle" onClick={() => delA(a.id)} style={{ fontSize: 9, color: C.red }}>Remover</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
