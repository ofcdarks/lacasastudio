import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { C, Badge } from "./UI";

export default function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const nav = useNavigate();
  const { videos, channels } = useApp();

  useEffect(() => {
    if (open && ref.current) { ref.current.focus(); setQ(""); }
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); }
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const ql = q.toLowerCase();
  const results = [];
  if (ql.length > 0) {
    videos.filter(v => v.title.toLowerCase().includes(ql)).slice(0, 6).forEach(v => {
      const ch = v.channel || channels.find(c => c.id === v.channelId);
      results.push({ name: v.title, sub: ch?.name, color: ch?.color || C.muted, path: "/planner", icon: "🎬", type: "Vídeo" });
    });
    channels.filter(c => c.name.toLowerCase().includes(ql)).forEach(c => {
      results.push({ name: c.name, sub: `${c.subs} inscritos`, color: c.color, path: "/", icon: "📺", type: "Canal" });
    });
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", justifyContent: "center", paddingTop: 120 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, maxHeight: "60vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.bgCard, borderRadius: "14px 14px 0 0", border: `1px solid ${C.border}`, padding: "14px 18px" }}>
          <span style={{ fontSize: 18, color: C.muted }}>⌕</span>
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar vídeos, canais..." style={{ flex: 1, background: "transparent", border: "none", color: C.text, fontSize: 15, outline: "none" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim, background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>ESC</span>
        </div>
        <div style={{ background: C.bgCard, borderRadius: "0 0 14px 14px", border: `1px solid ${C.border}`, borderTop: "none", overflow: "auto", maxHeight: "50vh" }}>
          {ql.length === 0
            ? <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: C.dim }}>Digite para buscar em todo o sistema</div>
            : results.length === 0
              ? <div style={{ padding: 30, textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div><div style={{ fontSize: 13, color: C.dim }}>Nenhum resultado</div></div>
              : results.map((r, i) => (
                <div key={i} onClick={() => { nav(r.path); onClose(); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 16 }}>{r.icon}</span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div><div style={{ fontSize: 11, color: r.color }}>{r.sub}</div></div>
                  <Badge text={r.type} color={r.color} v="tag" />
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
