import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { channelApi } from "../../lib/api";
import { Badge, C } from "./UI";

function SItem({ icon, label, path, badge, bc }) {
  const [h, setH] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const active = loc.pathname === path;
  return (
    <div onClick={() => nav(path)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: active ? 600 : 450, color: active ? C.red : h ? C.text : C.muted, background: active ? `${C.red}15` : h ? C.bgHover : "transparent", transition: "all 0.2s", userSelect: "none" }}>
      <span style={{ fontSize: 14, width: 18, textAlign: "center", opacity: active ? 1 : 0.6 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && <Badge text={String(badge)} color={bc || C.red} v="count" />}
    </div>
  );
}

function Sec({ title }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase", padding: "16px 14px 6px" }}>{title}</div>;
}

function ChDot({ ch, active, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: active ? 700 : 450, color: active ? C.text : C.muted, background: active ? "rgba(255,255,255,0.06)" : h ? C.bgHover : "transparent", transition: "all 0.2s" }}>
      <Badge color={ch.color} />
      <span style={{ flex: 1 }}>{ch.name}</span>
      {(ch._count?.videos || ch.videoCount || 0) > 0 && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.dim }}>{ch._count?.videos || ch.videoCount}</span>}
    </div>
  );
}

export default function Sidebar() {
  const { channels, videos, selChannel, setSelChannel, refreshChannels } = useApp();
  const nav = useNavigate();
  const loc = useLocation();

  const pending = videos.filter(v => v.status !== "published").length;

  const addChannel = async () => {
    const name = prompt("Nome do novo canal:");
    if (!name) return;
    const colors = [C.red, C.purple, C.green, C.blue, C.orange, C.pink];
    try {
      await channelApi.create({ name, color: colors[Math.floor(Math.random() * colors.length)] });
      refreshChannels();
    } catch (err) { alert(err.message); }
  };

  return (
    <aside style={{ width: 220, minWidth: 220, background: C.bgSidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, overflowY: "auto", zIndex: 100 }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.red}, ${C.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff" }}>LC</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em" }}>LaCasaStudio</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: C.dim }}>V2.0 · YOUTUBE OS</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: "4px 8px" }}>
        <Sec title="Produção" />
        <SItem icon="▣" label="Dashboard" path="/" />
        <SItem icon="▦" label="Planner Kanban" path="/planner" badge={pending} />
        <SItem icon="▤" label="Storyboard" path="/storyboard" />
        <SItem icon="¶" label="Editor de Roteiro" path="/editor" />
        <SItem icon="✓" label="Checklist Pub." path="/checklist" badge={null} bc={C.green} />

        <Sec title="Estratégia" />
        <SItem icon="✦" label="Gerador SEO + IA" path="/seo" />
        <SItem icon="◎" label="Metas & OKRs" path="/metas" />
        <SItem icon="◆" label="Templates de Série" path="/templates" />

        <Sec title="Gestão" />
        <SItem icon="▥" label="Calendário" path="/calendario" />
        <SItem icon="▲" label="Analytics" path="/analytics" badge="Beta" bc={C.purple} />
        <SItem icon="$" label="Orçamento" path="/orcamento" />
        <SItem icon="◉" label="Banco de Ativos" path="/ativos" />
        <SItem icon="◑" label="Equipe" path="/equipe" />
        <SItem icon="⚙" label="Configurações" path="/settings" />

        <Sec title="Canais" />
        {channels.map(ch => (
          <ChDot key={ch.id} ch={ch}
            active={selChannel === ch.id && loc.pathname === "/planner"}
            onClick={() => { setSelChannel(selChannel === ch.id ? null : ch.id); nav("/planner"); }} />
        ))}
        <ChDot ch={{ name: "Todos os canais", color: C.dim }}
          active={!selChannel && loc.pathname === "/planner"}
          onClick={() => { setSelChannel(null); nav("/planner"); }} />
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
        <div onClick={addChannel}
          style={{ fontSize: 12, color: C.muted, cursor: "pointer", padding: "6px 0", transition: "color 0.2s" }}
          onMouseEnter={e => e.target.style.color = C.text}
          onMouseLeave={e => e.target.style.color = C.muted}>
          + Novo canal
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim, marginTop: 6 }}>© API LaCasa</div>
      </div>
    </aside>
  );
}
