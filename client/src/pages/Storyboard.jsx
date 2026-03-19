import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { sceneApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Select, Badge, C, ST } from "../components/shared/UI";

export default function Storyboard() {
  const { videos, channels } = useApp();
  const [selV, setSelV] = useState(videos[0]?.id || null);
  const [scenes, setScenes] = useState([]);
  const [selS, setSelS] = useState(null);
  const [showA, setShowA] = useState(false);
  const [ns, setNs] = useState({ type: "content", title: "", duration: "", notes: "", camera: "", audio: "" });
  const tOpts = [{ v: "intro", c: C.purple }, { v: "hook", c: C.red }, { v: "content", c: C.blue }, { v: "demo", c: C.cyan }, { v: "cta", c: C.orange }, { v: "outro", c: C.green }];

  useEffect(() => {
    if (!selV) return;
    sceneApi.listByVideo(selV).then(setScenes).catch(() => setScenes([]));
  }, [selV]);

  const addScene = async () => {
    if (!ns.title.trim()) return;
    const tc = tOpts.find(t => t.v === ns.type);
    try {
      const scene = await sceneApi.create({ ...ns, videoId: selV, color: tc?.c || C.blue });
      setScenes(p => [...p, scene]);
      setNs({ type: "content", title: "", duration: "", notes: "", camera: "", audio: "" });
      setShowA(false);
    } catch (err) { alert(err.message); }
  };

  const delScene = async (id) => {
    try { await sceneApi.del(id); setScenes(p => p.filter(s => s.id !== id)); } catch {}
  };

  const vid = videos.find(v => v.id === selV);
  const ch = vid?.channel || channels.find(c => c.id === vid?.channelId);

  return (
    <div className="page-enter">
      <Hdr title="Storyboard" sub="Planeje visualmente cada cena" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select style={{ width: 200 }} value={selV || ""} onChange={e => setSelV(Number(e.target.value))}>
            {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
          </Select>
          <Btn onClick={() => setShowA(!showA)}>{showA ? "✕" : "+ Cena"}</Btn>
        </div>
      } />

      {vid && (
        <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 18, borderColor: `${ch?.color}25` }} color={ch?.color}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${ch?.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}><Badge color={ch?.color} /></div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16 }}>{vid.title}</div><div style={{ fontSize: 12, color: ch?.color }}>{ch?.name}</div></div>
          <Badge text={ST[vid.status]?.l} color={ST[vid.status]?.c} v="tag" />
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: C.dim }}>CENAS</div><div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 600 }}>{scenes.length}</div></div>
        </Card>
      )}

      {showA && (
        <Card style={{ marginBottom: 18, borderColor: `${C.green}30` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Nova Cena</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div><Label t="Tipo" /><Select value={ns.type} onChange={e => setNs(p => ({ ...p, type: e.target.value }))}>{tOpts.map(t => <option key={t.v} value={t.v}>{t.v}</option>)}</Select></div>
            <div><Label t="Título" /><Input value={ns.title} onChange={e => setNs(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label t="Duração" /><Input placeholder="0:00-0:30" value={ns.duration} onChange={e => setNs(p => ({ ...p, duration: e.target.value }))} /></div>
            <div><Label t="Câmera" /><Input value={ns.camera} onChange={e => setNs(p => ({ ...p, camera: e.target.value }))} /></div>
            <div><Label t="Áudio" /><Input value={ns.audio} onChange={e => setNs(p => ({ ...p, audio: e.target.value }))} /></div>
            <Btn onClick={addScene} style={{ height: 38 }}>Criar</Btn>
          </div>
          <div style={{ marginTop: 10 }}><Label t="Notas" /><Input value={ns.notes} onChange={e => setNs(p => ({ ...p, notes: e.target.value }))} /></div>
        </Card>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 22, overflowX: "auto", padding: "4px 0" }}>
        {scenes.map((sc, i) => (
          <div key={sc.id} style={{ display: "flex", alignItems: "center" }}>
            <div onClick={() => setSelS(selS === sc.id ? null : sc.id)} style={{ width: 38, height: 38, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: selS === sc.id ? sc.color : `${sc.color}18`, color: selS === sc.id ? "#fff" : sc.color, border: `2px solid ${sc.color}${selS === sc.id ? "" : "35"}`, transition: "all 0.25s", transform: selS === sc.id ? "scale(1.12)" : "scale(1)" }}>{i + 1}</div>
            {i < scenes.length - 1 && <div style={{ width: 16, height: 2, background: C.border }} />}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {scenes.map((sc, i) => (
          <Card key={sc.id} hov color={sc.color} onClick={() => setSelS(selS === sc.id ? null : sc.id)}
            style={{ ...(selS === sc.id ? { borderColor: `${sc.color}50` } : {}) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: sc.color, background: `${sc.color}12`, border: `1px solid ${sc.color}25` }}>{i + 1}</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{sc.title}</div><div style={{ fontSize: 10, color: sc.color, textTransform: "uppercase", fontWeight: 600 }}>{sc.type}</div></div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.muted, background: "rgba(255,255,255,0.04)", padding: "4px 10px", borderRadius: 6 }}>{sc.duration}</span>
            </div>
            {sc.notes && <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: "0 0 12px" }}>{sc.notes}</p>}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {sc.camera && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "rgba(255,255,255,0.04)", color: C.muted }}>📷 {sc.camera}</span>}
              {sc.audio && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "rgba(255,255,255,0.04)", color: C.muted }}>🎵 {sc.audio}</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
              <Btn vr="subtle" onClick={() => delScene(sc.id)} style={{ fontSize: 9, color: C.red }}>Remover</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
