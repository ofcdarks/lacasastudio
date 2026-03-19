import { useConfirm } from "../context/ConfirmContext";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { videoApi, aiApi } from "../lib/api";
import { Card, Badge, Btn, Hdr, Label, Input, Select, C, ST, STATUS_KEYS } from "../components/shared/UI";

function EditModal({ video, channels, onClose, onSave }) {
  const [form, setForm] = useState({ title: video.title, date: video.date, priority: video.priority, duration: video.duration, channelId: video.channelId || video.channel?.id });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await onSave(video.id, form); onClose(); } catch (err) { alert(err.message); } finally { setSaving(false); }
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 500, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Editar Vídeo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><Label t="Título" /><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label t="Canal" /><Select value={form.channelId} onChange={e => setForm(p => ({ ...p, channelId: Number(e.target.value) }))}>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div><Label t="Data" /><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label t="Prioridade" /><Select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}><option value="alta">Alta</option><option value="média">Média</option><option value="baixa">Baixa</option></Select></div>
            <div><Label t="Duração" /><Input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} /></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <Btn vr="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
        </div>
      </div>
    </div>
  );
}

export default function Planner() {
  const { channels, videos, refreshVideos, selChannel, setSelChannel } = useApp();
  const confirmDel = useConfirm();
  const [showF, setShowF] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [nv, setNv] = useState({ title: "", channelId: "", date: "", priority: "média", duration: "" });
  const [fs, setFs] = useState("all");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIdeas, setAiIdeas] = useState(null);

  const filtered = videos.filter(v => {
    const chId = v.channelId || v.channel?.id;
    return (selChannel ? chId === selChannel : true) && (fs === "all" || v.status === fs);
  });

  const addVideo = async () => {
    if (!nv.title.trim() || !nv.channelId) return;
    try { await videoApi.create(nv); refreshVideos(); setNv({ title: "", channelId: "", date: "", priority: "média", duration: "" }); setShowF(false); } catch (err) { alert(err.message); }
  };

  const moveStatus = async (id, dir) => {
    const v = videos.find(x => x.id === id);
    if (!v) return;
    const idx = STATUS_KEYS.indexOf(v.status) + dir;
    if (idx < 0 || idx >= STATUS_KEYS.length) return;
    try { await videoApi.update(id, { status: STATUS_KEYS[idx] }); refreshVideos(); } catch {}
  };

  const saveEdit = async (id, data) => {
    await videoApi.update(id, data);
    refreshVideos();
  };

  const delVideo = async (id) => {
    const ok = await confirmDel({ title: "Remover Vídeo", message: "Tem certeza que deseja remover este vídeo? Esta ação não pode ser desfeita." }); if (!ok) return;
    try { await videoApi.del(id); refreshVideos(); } catch {}
  };

  const generateIdeas = async () => {
    const ch = selChannel ? channels.find(c => c.id === selChannel) : channels[0];
    if (!ch) return;
    setAiLoading(true);
    try {
      const data = await aiApi.ideas({ channelName: ch.name, niche: ch.name, recentTopics: videos.filter(v => (v.channelId || v.channel?.id) === ch.id).slice(0,3).map(v => v.title).join(", ") });
      setAiIdeas(data.ideas || []);
    } catch (err) { alert(err.message); } finally { setAiLoading(false); }
  };

  const addFromIdea = async (idea) => {
    const ch = selChannel ? channels.find(c => c.id === selChannel) : channels[0];
    try { await videoApi.create({ title: idea.title, channelId: ch.id, priority: idea.priority, duration: idea.estimatedDuration, date: "" }); refreshVideos(); setAiIdeas(p => p.filter(i => i.title !== idea.title)); } catch {}
  };

  return (
    <div className="page-enter">
      {editingVideo && <EditModal video={editingVideo} channels={channels} onClose={() => setEditingVideo(null)} onSave={saveEdit} />}

      <Hdr title="Planner Kanban" sub="Organize e acompanhe o progresso" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Btn vr="ghost" onClick={generateIdeas} disabled={aiLoading}>{aiLoading ? "🤖 Pensando..." : "🤖 Ideias IA"}</Btn>
          <Btn onClick={() => setShowF(!showF)}>{showF ? "✕ Fechar" : "+ Novo Vídeo"}</Btn>
        </div>
      } />

      {/* AI Ideas */}
      {aiIdeas && aiIdeas.length > 0 && (
        <Card style={{ marginBottom: 18, borderColor: `${C.purple}30`, background: `${C.purple}05` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><span>🤖</span> Ideias geradas pela IA</div>
            <Btn vr="subtle" onClick={() => setAiIdeas(null)} style={{ fontSize: 11 }}>✕ Fechar</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
            {aiIdeas.map((idea, i) => (
              <div key={i} style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{idea.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{idea.description}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge text={idea.priority} color={idea.priority === "alta" ? C.red : idea.priority === "média" ? C.orange : C.blue} v="tag" />
                  <Btn vr="ghost" onClick={() => addFromIdea(idea)} style={{ fontSize: 11, padding: "4px 10px" }}>+ Adicionar</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <Btn vr={!selChannel ? "primary" : "ghost"} onClick={() => setSelChannel(null)} style={{ padding: "7px 14px", fontSize: 12 }}>Todos</Btn>
        {channels.map(ch => <Btn key={ch.id} vr={selChannel === ch.id ? "primary" : "ghost"} onClick={() => setSelChannel(ch.id)} style={{ padding: "7px 14px", fontSize: 12, ...(selChannel === ch.id ? { background: ch.color } : {}) }}><Badge color={ch.color} /> {ch.name}</Btn>)}
        <div style={{ flex: 1 }} />
        <Select style={{ width: 140 }} value={fs} onChange={e => setFs(e.target.value)}><option value="all">Todos status</option>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</Select>
      </div>

      {/* New Video Form */}
      {showF && (
        <Card style={{ marginBottom: 18, borderColor: `${C.red}30` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Novo Vídeo</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div><Label t="Título" /><Input placeholder="Nome..." value={nv.title} onChange={e => setNv(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label t="Canal" /><Select value={nv.channelId} onChange={e => setNv(p => ({ ...p, channelId: Number(e.target.value) }))}><option value="">Selecione</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div><Label t="Data" /><Input type="date" value={nv.date} onChange={e => setNv(p => ({ ...p, date: e.target.value }))} /></div>
            <div><Label t="Prioridade" /><Select value={nv.priority} onChange={e => setNv(p => ({ ...p, priority: e.target.value }))}><option value="alta">Alta</option><option value="média">Média</option><option value="baixa">Baixa</option></Select></div>
            <div><Label t="Duração" /><Input placeholder="12:00" value={nv.duration} onChange={e => setNv(p => ({ ...p, duration: e.target.value }))} /></div>
            <Btn onClick={addVideo} style={{ height: 38 }}>Criar</Btn>
          </div>
        </Card>
      )}

      {/* Kanban */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUS_KEYS.length}, minmax(150px, 1fr))`, gap: 10, overflowX: "auto" }}>
        {Object.entries(ST).map(([sk, sv]) => {
          const col = filtered.filter(v => v.status === sk);
          return (
            <div key={sk} style={{ background: "rgba(255,255,255,0.015)", borderRadius: 12, padding: 10, border: `1px solid ${C.border}`, minHeight: 240 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, padding: "0 4px" }}>
                <span style={{ fontSize: 12 }}>{sv.i}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: sv.c }}>{sv.l}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim, marginLeft: "auto" }}>{col.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {col.map(v => {
                  const vc = v.channel || channels.find(c => c.id === v.channelId);
                  return (
                    <div key={v.id} style={{ background: C.bgCard, borderRadius: 10, padding: 12, borderLeft: `3px solid ${vc?.color || C.dim}`, border: `1px solid ${C.border}`, borderLeftWidth: 3, borderLeftColor: vc?.color || C.dim }}>
                      <div onClick={() => setEditingVideo(v)} style={{ cursor: "pointer" }}>
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, lineHeight: 1.3 }}>{v.title}</div>
                        <div style={{ fontSize: 10, color: vc?.color, marginBottom: 4 }}>{vc?.name}</div>
                        <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>
                          {v.priority === "alta" ? "🔴" : v.priority === "média" ? "🟡" : "🔵"} {v.priority} · {v.duration || "—"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim }}>{v.date}</span>
                        <div style={{ display: "flex", gap: 3 }}>
                          <Btn vr="subtle" onClick={() => moveStatus(v.id, -1)} style={{ fontSize: 9, padding: "3px 6px" }}>◀</Btn>
                          <Btn vr="subtle" onClick={() => moveStatus(v.id, 1)} style={{ fontSize: 9, padding: "3px 6px" }}>▶</Btn>
                          <Btn vr="subtle" onClick={() => setEditingVideo(v)} style={{ fontSize: 9, padding: "3px 6px" }}>✏️</Btn>
                          <Btn vr="subtle" onClick={() => delVideo(v.id)} style={{ fontSize: 9, padding: "3px 6px", color: C.red }}>✕</Btn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
