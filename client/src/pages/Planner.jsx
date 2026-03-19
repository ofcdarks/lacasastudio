import { useState } from "react";
import { useApp } from "../context/AppContext";
import { videoApi } from "../lib/api";
import { Card, Badge, Btn, Hdr, Label, Input, Select, C, ST, STATUS_KEYS, SecTitle } from "../components/shared/UI";

export default function Planner() {
  const { channels, videos, refreshVideos, selChannel, setSelChannel } = useApp();
  const [showF, setShowF] = useState(false);
  const [nv, setNv] = useState({ title: "", channelId: "", date: "", priority: "média", duration: "" });
  const [fs, setFs] = useState("all");

  const filtered = videos.filter(v => {
    const chId = v.channelId || v.channel?.id;
    return (selChannel ? chId === selChannel : true) && (fs === "all" || v.status === fs);
  });

  const addVideo = async () => {
    if (!nv.title.trim() || !nv.channelId) return;
    try {
      await videoApi.create(nv);
      refreshVideos();
      setNv({ title: "", channelId: "", date: "", priority: "média", duration: "" });
      setShowF(false);
    } catch (err) { alert(err.message); }
  };

  const moveStatus = async (id, dir) => {
    const v = videos.find(x => x.id === id);
    if (!v) return;
    const idx = STATUS_KEYS.indexOf(v.status) + dir;
    if (idx < 0 || idx >= STATUS_KEYS.length) return;
    try {
      await videoApi.update(id, { status: STATUS_KEYS[idx] });
      refreshVideos();
    } catch {}
  };

  const delVideo = async (id) => {
    try { await videoApi.del(id); refreshVideos(); } catch {}
  };

  return (
    <div className="page-enter">
      <Hdr title="Planner Kanban" sub="Organize e acompanhe o progresso" action={<Btn onClick={() => setShowF(!showF)}>{showF ? "✕ Fechar" : "+ Novo Vídeo"}</Btn>} />

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <Btn vr={!selChannel ? "primary" : "ghost"} onClick={() => setSelChannel(null)} style={{ padding: "7px 14px", fontSize: 12 }}>Todos</Btn>
        {channels.map(ch => (
          <Btn key={ch.id} vr={selChannel === ch.id ? "primary" : "ghost"} onClick={() => setSelChannel(ch.id)}
            style={{ padding: "7px 14px", fontSize: 12, ...(selChannel === ch.id ? { background: ch.color } : {}) }}>
            <Badge color={ch.color} /> {ch.name}
          </Btn>
        ))}
        <div style={{ flex: 1 }} />
        <Select style={{ width: 140 }} value={fs} onChange={e => setFs(e.target.value)}>
          <option value="all">Todos status</option>
          {Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </Select>
      </div>

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
                  const ch = v.channel || channels.find(c => c.id === v.channelId);
                  return (
                    <div key={v.id} style={{ background: C.bgCard, borderRadius: 10, padding: 12, borderLeft: `3px solid ${ch?.color || C.dim}`, border: `1px solid ${C.border}`, borderLeftWidth: 3, borderLeftColor: ch?.color || C.dim }}>
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, lineHeight: 1.3 }}>{v.title}</div>
                      <div style={{ fontSize: 10, color: ch?.color, marginBottom: 8 }}>{ch?.name}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim }}>{v.date}</span>
                        <div style={{ display: "flex", gap: 3 }}>
                          <Btn vr="subtle" onClick={() => moveStatus(v.id, -1)} style={{ fontSize: 9, padding: "3px 6px" }}>◀</Btn>
                          <Btn vr="subtle" onClick={() => moveStatus(v.id, 1)} style={{ fontSize: 9, padding: "3px 6px" }}>▶</Btn>
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
