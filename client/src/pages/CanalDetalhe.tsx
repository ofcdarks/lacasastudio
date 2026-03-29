// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { C, Card, Btn } from "../components/shared/UI";
import { channelApi, videoApi } from "../lib/api";

const STAGES = [
  { key: "planning", label: "Planejamento", icon: "📋", color: C.blue, desc: "Vídeos em fase de ideação" },
  { key: "production", label: "Produção", icon: "🎬", color: C.orange, desc: "Vídeos sendo produzidos" },
  { key: "done", label: "Finalizado", icon: "✅", color: C.green, desc: "Prontos para publicar" },
  { key: "published", label: "Publicado", icon: "🚀", color: C.purple, desc: "Já publicados" },
];

const mapStatus = (s) => {
  if (!s) return "planning";
  const m = { idea: "planning", script: "planning", filming: "production", editing: "production", review: "done", scheduled: "done", published: "published" };
  return m[s] || "planning";
};

const fmt = (n) => { if (!n) return "0"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };

export default function CanalDetalhe() {
  const { id } = useParams();
  const nav = useNavigate();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("lista");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      channelApi.list().then((chs) => {
        const ch = chs.find((c) => String(c.id) === String(id));
        setChannel(ch || null);
      }),
      videoApi.list({ channelId: id }).then((v) => setVideos(Array.isArray(v) ? v : [])).catch(() => setVideos([])),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleCreateVideo = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const v = await videoApi.create({ title: newTitle, channelId: +id, status: "idea" });
      setVideos((p) => [...p, v]);
      setNewTitle("");
      setShowCreate(false);
    } catch (e) { alert(e.message); }
    finally { setCreating(false); }
  };

  const handleDeleteVideo = async (vid) => {
    if (!confirm("Remover este título?")) return;
    try { await videoApi.del(vid); setVideos((p) => p.filter((v) => v.id !== vid)); }
    catch (e) { alert(e.message); }
  };

  const handleStatusChange = async (vid, newStatus) => {
    try {
      await videoApi.update(vid, { status: newStatus });
      setVideos((p) => p.map((v) => v.id === vid ? { ...v, status: newStatus } : v));
    } catch (e) { alert(e.message); }
  };

  const published = videos.filter((v) => v.status === "published" || v.status === "scheduled").length;
  const pending = videos.length - published;

  const filteredVideos = useMemo(() => {
    let list = videos;
    if (filter !== "all") {
      const stageKeys = { planning: ["idea", "script"], production: ["filming", "editing"], done: ["review", "scheduled"], published: ["published"] };
      list = list.filter((v) => (stageKeys[filter] || []).includes(v.status));
    }
    if (search) list = list.filter((v) => v.title?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [videos, filter, search]);

  const kanbanGroups = useMemo(() => {
    const groups = {};
    STAGES.forEach((s) => { groups[s.key] = []; });
    videos.forEach((v) => {
      const stage = mapStatus(v.status);
      if (groups[stage]) groups[stage].push(v);
    });
    return groups;
  }, [videos]);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Carregando...</div>;
  if (!channel) return <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Canal não encontrado. <button onClick={() => nav("/gestao-canais")} style={{ color: C.blue, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Voltar</button></div>;

  return (
    <div>
      {/* Channel Header */}
      <Card style={{ padding: 20, marginBottom: 16, position: "relative" }} color={channel.color || C.blue}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `${channel.color || C.blue}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: channel.color || C.blue }}>
            {channel.icon || channel.name?.[0]?.toUpperCase() || "D"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{channel.name}</div>
            <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 11, color: C.dim }}>
              <span>🌐 Português</span>
              <span>🕐 19:00</span>
              {channel.subs && <span>👥 {channel.subs} inscritos</span>}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowMenu(!showMenu)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 8 }}>⋮</button>
            {showMenu && (
              <div style={{ position: "absolute", right: 0, top: "100%", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 6, minWidth: 160, zIndex: 10 }}>
                <button onClick={() => { nav(`/gestao-canais`); setShowMenu(false); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", textAlign: "left", borderRadius: 6 }}>📺 Todos os Canais</button>
                <button onClick={() => setShowMenu(false)} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: C.red, fontSize: 12, cursor: "pointer", textAlign: "left", borderRadius: 6 }}>🗑️ Excluir Canal</button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Card color={C.cyan} style={{ padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.cyan, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>🎬 TOTAL DE VÍDEOS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.text, marginTop: 4 }}>{videos.length}</div>
        </Card>
        <Card color={C.green} style={{ padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>✅ POSTADOS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.text, marginTop: 4 }}>{published}</div>
        </Card>
        <Card color={C.orange} style={{ padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>📋 PENDENTES</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.text, marginTop: 4 }}>{pending}</div>
        </Card>
        <Card color={C.purple} style={{ padding: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.purple, textTransform: "uppercase" }}>📊 YOUTUBE STATS</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>Vincule ao YouTube para ver</div>
        </Card>
      </div>

      {/* Quick Links Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        <Card style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.blue}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💬</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Prompts do Canal</div>
              <div style={{ fontSize: 11, color: C.dim }}>0 prompts salvos</div>
            </div>
          </div>
          <Btn onClick={() => nav("/prompts")} style={{ background: `${C.blue}12`, color: C.blue, padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 11, border: `1px solid ${C.blue}25` }}>✏️ Gerenciar</Btn>
        </Card>

        <Card style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.red}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Canais de Referência</div>
              <div style={{ fontSize: 11, color: C.dim }}>Nenhuma referência vinculada</div>
            </div>
          </div>
          <Btn onClick={() => nav("/referencias")} style={{ background: `${C.red}12`, color: C.red, padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 11, border: `1px solid ${C.red}25` }}>✏️ Gerenciar</Btn>
        </Card>

        <Card style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.purple}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎤</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Narrador</div>
              <div style={{ fontSize: 11, color: C.dim }}>Não configurado</div>
            </div>
          </div>
          <Btn onClick={() => nav("/settings")} style={{ background: `${C.purple}12`, color: C.purple, padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 11, border: `1px solid ${C.purple}25` }}>⚙️ Configurar</Btn>
        </Card>
      </div>

      {/* Títulos & Vídeos Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Títulos & Vídeos</span>
          <div style={{ display: "flex", background: C.bgCard, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <button onClick={() => setView("lista")} style={{ padding: "6px 14px", border: "none", background: view === "lista" ? C.blue : "transparent", color: view === "lista" ? "#fff" : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>☰ Lista</button>
            <button onClick={() => setView("kanban")} style={{ padding: "6px 14px", border: "none", background: view === "kanban" ? C.blue : "transparent", color: view === "kanban" ? "#fff" : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>🔲 Kanban</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setFilter("all")} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${filter === "all" ? C.cyan : C.border}`, background: filter === "all" ? `${C.cyan}10` : "transparent", color: filter === "all" ? C.cyan : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Todos ({videos.length})</button>
          {STAGES.map((s) => {
            const count = (kanbanGroups[s.key] || []).length;
            return <button key={s.key} onClick={() => setFilter(s.key)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${filter === s.key ? s.color : C.border}`, background: filter === s.key ? `${s.color}10` : "transparent", color: filter === s.key ? s.color : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{s.label} ({count})</button>;
          })}
        </div>
      </div>

      {/* Search + New Title */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.dim }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar títulos..." style={{ width: "100%", padding: "10px 16px 10px 40px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 13, outline: "none" }} />
        </div>
        <Btn onClick={() => setShowCreate(true)} style={{ background: C.blue, color: "#fff", padding: "10px 22px", borderRadius: 10, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>+ Novo Título</Btn>
      </div>

      {/* LIST VIEW */}
      {view === "lista" && (
        filteredVideos.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredVideos.map((v) => {
              const stage = STAGES.find((s) => s.key === mapStatus(v.status));
              return (
                <Card key={v.id} hov style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => nav(`/planner?video=${v.id}`)}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: stage?.color || C.dim, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{v.title}</div>
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{v.date || new Date(v.createdAt).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: stage?.color, background: `${stage?.color}12`, padding: "3px 10px", borderRadius: 6 }}>{stage?.label}</span>
                  <select value={v.status} onChange={(e) => { e.stopPropagation(); handleStatusChange(v.id, e.target.value); }} onClick={(e) => e.stopPropagation()} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.muted, fontSize: 10, outline: "none", cursor: "pointer" }}>
                    <option value="idea">Ideia</option>
                    <option value="script">Roteiro</option>
                    <option value="filming">Gravação</option>
                    <option value="editing">Edição</option>
                    <option value="review">Revisão</option>
                    <option value="scheduled">Agendado</option>
                    <option value="published">Publicado</option>
                  </select>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteVideo(v.id); }} style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 14 }}>🗑️</button>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card style={{ textAlign: "center", padding: "60px 40px" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${C.dim}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>📋</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Nenhum título criado ainda</h2>
            <p style={{ fontSize: 13, color: C.dim, margin: "0 0 24px" }}>Comece criando seu primeiro título</p>
            <Btn onClick={() => setShowCreate(true)} style={{ background: C.blue, color: "#fff", fontWeight: 700, padding: "12px 28px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>+ Criar Primeiro Título</Btn>
          </Card>
        )
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {STAGES.map((stage) => {
            const items = kanbanGroups[stage.key] || [];
            return (
              <div key={stage.key} style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                {/* Column header */}
                <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{stage.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{stage.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: `${stage.color}15`, padding: "2px 8px", borderRadius: 10 }}>{items.length}</span>
                </div>
                <div style={{ fontSize: 10, color: C.dim, padding: "6px 14px" }}>{stage.desc}</div>
                {/* Column body */}
                <div style={{ padding: "8px 10px", minHeight: 200 }}>
                  {items.length > 0 ? items.map((v) => (
                    <div key={v.id} onClick={() => nav(`/planner?video=${v.id}`)} style={{ background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, padding: "10px 12px", marginBottom: 8, cursor: "pointer", transition: "border-color 0.15s" }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: C.text, marginBottom: 4 }}>{v.title}</div>
                      <div style={{ fontSize: 10, color: C.dim }}>{v.date || new Date(v.createdAt).toLocaleDateString("pt-BR")}</div>
                    </div>
                  )) : (
                    <div style={{ textAlign: "center", padding: "30px 10px" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>
                        {stage.key === "planning" ? "💡" : stage.key === "production" ? "🎬" : stage.key === "done" ? "⭐" : "🚀"}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: C.muted, marginBottom: 4 }}>
                        {stage.key === "planning" ? "Nenhuma ideia ainda" : stage.key === "production" ? "Nada em produção" : stage.key === "done" ? "Nenhum vídeo finalizado" : "Nenhuma publicação"}
                      </div>
                      <div style={{ fontSize: 10, color: C.dim }}>
                        {stage.key === "planning" ? "Comece adicionando um novo vídeo" : stage.key === "production" ? "Arraste vídeos do planejamento para cá" : stage.key === "done" ? "Complete a produção de um vídeo" : "Seus vídeos publicados aparecerão aqui"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar Título */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, width: 440, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 20px" }}>Novo Título</h2>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateVideo()} placeholder="Título do vídeo..." autoFocus style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, outline: "none", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setShowCreate(false)} style={{ flex: 1, background: C.bgHover, color: C.muted, padding: "10px", borderRadius: 10, fontWeight: 600 }}>Cancelar</Btn>
              <Btn onClick={handleCreateVideo} disabled={creating || !newTitle.trim()} style={{ flex: 1, background: C.blue, color: "#fff", padding: "10px", borderRadius: 10, fontWeight: 700, opacity: creating ? 0.6 : 1 }}>{creating ? "Criando..." : "Criar Título"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
