import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useConfirm } from "../context/ConfirmContext";
import { assetApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Select, Badge, SecTitle, C } from "../components/shared/UI";

const TYPES = {
  thumbnail: { l: "Thumbnails", c: "#F59E0B", i: "🖼️" },
  intro: { l: "Intros", c: "#A855F7", i: "🎬" },
  outro: { l: "Outros", c: "#22C55E", i: "🔚" },
  overlay: { l: "Overlays", c: "#06B6D4", i: "🔲" },
  audio: { l: "Áudio", c: "#EC4899", i: "🎵" },
  transition: { l: "Transições", c: "#3B82F6", i: "✨" },
  graphic: { l: "Gráficos", c: "#14B8A6", i: "📊" },
  font: { l: "Fontes", c: "#EF4444", i: "🔤" },
};

export default function Ativos() {
  const { channels } = useApp();
  const confirm = useConfirm();
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showF, setShowF] = useState(false);
  const [search, setSearch] = useState("");
  const [na, setNa] = useState({ name: "", type: "thumbnail", format: "", size: "", channelId: "", tags: "", notes: "" });

  useEffect(() => { assetApi.list().then(setAssets).catch(() => {}); }, []);

  const filtered = assets.filter(a => {
    const matchType = filter === "all" || a.type === filter;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
      (Array.isArray(a.tags) ? a.tags : (a.tags || "").split(",")).some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const addA = async () => {
    if (!na.name.trim()) return;
    try {
      const asset = await assetApi.create({
        ...na,
        channelId: na.channelId ? Number(na.channelId) : null,
        tags: na.tags.split(",").map(t => t.trim()).filter(Boolean),
      });
      setAssets(p => [asset, ...p]);
      setNa({ name: "", type: "thumbnail", format: "", size: "", channelId: "", tags: "", notes: "" });
      setShowF(false);
    } catch (err) { alert(err.message); }
  };

  const delA = async (id) => {
    const ok = await confirm({ title: "Remover Ativo", message: "Este ativo será removido do banco. Deseja continuar?" });
    if (!ok) return;
    try { await assetApi.del(id); setAssets(p => p.filter(a => a.id !== id)); } catch {}
  };

  // Stats
  const typeCounts = {};
  Object.keys(TYPES).forEach(k => { typeCounts[k] = assets.filter(a => a.type === k).length; });

  return (
    <div className="page-enter">
      <Hdr title="Banco de Ativos" sub={`${assets.length} recursos cadastrados`}
        action={<Btn onClick={() => setShowF(!showF)}>{showF ? "✕ Fechar" : "+ Novo Ativo"}</Btn>} />

      {/* Stats */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
        <Btn vr={filter === "all" ? "primary" : "ghost"} onClick={() => setFilter("all")}
          style={{ padding: "7px 14px", fontSize: 12 }}>
          Todos ({assets.length})
        </Btn>
        {Object.entries(TYPES).map(([k, v]) => {
          const count = typeCounts[k] || 0;
          if (count === 0 && filter !== k) return null;
          return (
            <Btn key={k} vr={filter === k ? "primary" : "ghost"} onClick={() => setFilter(k)}
              style={{ padding: "7px 14px", fontSize: 12, ...(filter === k ? { background: v.c } : {}) }}>
              {v.i} {v.l} ({count})
            </Btn>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <Input placeholder="🔍 Buscar por nome ou tag..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }} />
      </div>

      {/* Add Form */}
      {showF && (
        <Card style={{ marginBottom: 20, borderColor: `${C.cyan}30` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Cadastrar Novo Ativo</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><Label t="Nome do Ativo" /><Input placeholder="Ex: Intro Tech Brasil v3" value={na.name} onChange={e => setNa(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label t="Tipo" /><Select value={na.type} onChange={e => setNa(p => ({ ...p, type: e.target.value }))}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
            <div><Label t="Canal (opcional)" /><Select value={na.channelId} onChange={e => setNa(p => ({ ...p, channelId: e.target.value }))}><option value="">Global (todos)</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
            <div><Label t="Formato" /><Input placeholder="PSD, MP4, MOV, PNG..." value={na.format} onChange={e => setNa(p => ({ ...p, format: e.target.value }))} /></div>
            <div><Label t="Tamanho" /><Input placeholder="12.4 MB" value={na.size} onChange={e => setNa(p => ({ ...p, size: e.target.value }))} /></div>
            <div><Label t="Tags (separadas por vírgula)" /><Input placeholder="intro, animação, clean, dark" value={na.tags} onChange={e => setNa(p => ({ ...p, tags: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
            <div style={{ flex: 1 }}><Label t="Notas / Descrição (opcional)" /><Input placeholder="Onde está salvo, versão, observações..." value={na.notes} onChange={e => setNa(p => ({ ...p, notes: e.target.value }))} /></div>
            <Btn onClick={addA} style={{ height: 38 }}>Cadastrar</Btn>
          </div>
        </Card>
      )}

      {/* Assets Grid */}
      {filtered.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            {search ? `Nenhum resultado para "${search}"` : filter === "all" ? "Nenhum ativo cadastrado" : `Nenhum ativo do tipo ${TYPES[filter]?.l}`}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
            Cadastre seus recursos de produção: thumbnails, intros, músicas, overlays...
          </div>
          <Btn onClick={() => setShowF(true)}>+ Cadastrar Primeiro Ativo</Btn>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map(a => {
            const tp = TYPES[a.type] || { l: a.type, c: C.muted, i: "📁" };
            const ch = a.channel || channels.find(c => c.id === a.channelId);
            const tags = Array.isArray(a.tags) ? a.tags : (a.tags || "").split(",").filter(Boolean);

            return (
              <Card key={a.id} hov color={tp.c}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: `${tp.c}15`, border: `1px solid ${tp.c}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, flexShrink: 0,
                  }}>{tp.i}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 3 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: ch?.color || C.muted }}>
                      {ch?.name || "Global"} · <span style={{ color: tp.c }}>{tp.l}</span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {a.format && (
                    <div style={{ padding: "5px 10px", borderRadius: 6, background: `${tp.c}12`, border: `1px solid ${tp.c}25`, fontSize: 12, fontWeight: 600, color: tp.c }}>
                      {a.format}
                    </div>
                  )}
                  {a.size && (
                    <div style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", fontSize: 12, color: C.muted }}>
                      {a.size}
                    </div>
                  )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {tags.map((t, i) => (
                      <span key={i} style={{
                        fontSize: 11, padding: "3px 8px", borderRadius: 5,
                        background: "rgba(255,255,255,0.05)", color: C.muted, fontWeight: 500,
                      }}>#{t}</span>
                    ))}
                  </div>
                )}

                {/* Date + Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim }}>
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString("pt-BR") : ""}
                  </span>
                  <Btn vr="subtle" onClick={() => delA(a.id)} style={{ fontSize: 10, color: C.red }}>Remover</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
