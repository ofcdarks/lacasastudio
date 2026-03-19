import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { teamApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Select, Badge, C } from "../components/shared/UI";

const ROLES = { admin: { l: "Admin", c: "#EF4444" }, editor: { l: "Editor", c: "#3B82F6" }, designer: { l: "Designer", c: "#A855F7" }, roteirista: { l: "Roteirista", c: "#22C55E" }, camera: { l: "Câmera", c: "#F59E0B" } };
const STC = { online: "#22C55E", away: "#F59E0B", offline: "rgba(255,255,255,0.22)" };

export default function Equipe() {
  const { channels } = useApp();
  const [team, setTeam] = useState([]);
  const [showF, setShowF] = useState(false);
  const [nm, setNm] = useState({ name: "", role: "editor", email: "" });

  useEffect(() => { teamApi.list().then(setTeam).catch(() => {}); }, []);

  const addM = async () => {
    if (!nm.name.trim()) return;
    try {
      const m = await teamApi.create(nm);
      setTeam(p => [...p, m]);
      setNm({ name: "", role: "editor", email: "" });
      setShowF(false);
    } catch (err) { alert(err.message); }
  };

  const delM = async (id) => {
    try { await teamApi.del(id); setTeam(p => p.filter(m => m.id !== id)); } catch {}
  };

  return (
    <div className="page-enter">
      <Hdr title="Equipe" sub="Editores, designers e colaboradores" action={<Btn onClick={() => setShowF(!showF)}>{showF ? "✕" : "+ Novo Membro"}</Btn>} />
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {Object.entries(ROLES).map(([k, v]) => {
          const c = team.filter(m => m.role === k).length;
          return <Card key={k} style={{ flex: 1, padding: "14px 12px", textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: v.c }}>{c}</div><div style={{ fontSize: 10, color: C.muted }}>{v.l}{c !== 1 ? "s" : ""}</div></Card>;
        })}
      </div>
      {showF && (
        <Card style={{ marginBottom: 20, borderColor: `${C.blue}30` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Novo Membro</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto", gap: 10, alignItems: "end" }}>
            <div><Label t="Nome" /><Input value={nm.name} onChange={e => setNm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label t="Função" /><Select value={nm.role} onChange={e => setNm(p => ({ ...p, role: e.target.value }))}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</Select></div>
            <div><Label t="Email" /><Input value={nm.email} onChange={e => setNm(p => ({ ...p, email: e.target.value }))} /></div>
            <Btn onClick={addM} style={{ height: 38 }}>Adicionar</Btn>
          </div>
        </Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {team.map(m => {
          const rl = ROLES[m.role] || { l: m.role, c: C.muted };
          const chs = m.channels || [];
          return (
            <Card key={m.id} hov color={m.color || rl.c}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${rl.c}15`, border: `2px solid ${rl.c}40`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: rl.c }}>{m.avatar}</div>
                  <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: STC[m.status] || STC.offline, border: `2px solid ${C.bgCard}` }} />
                </div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div><div style={{ fontSize: 12, color: rl.c }}>{rl.l}</div></div>
                <Badge text={m.status === "online" ? "Online" : m.status === "away" ? "Ausente" : "Offline"} color={STC[m.status] || STC.offline} v="tag" />
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{m.email}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ fontSize: 11, color: C.dim }}>Canais atribuídos</span><span style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.muted }}>{m.tasks} tarefas</span></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {chs.map(c => <span key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${c.color}10`, color: c.color, fontWeight: 600 }}><Badge color={c.color} /> {c.name}</span>)}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><Btn vr="subtle" onClick={() => delM(m.id)} style={{ fontSize: 10, color: C.red }}>Remover</Btn></div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
