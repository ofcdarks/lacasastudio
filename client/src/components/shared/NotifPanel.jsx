import { useApp } from "../../context/AppContext";
import { notifApi } from "../../lib/api";
import { C, Btn } from "./UI";

const typeIcon = { deadline: "⏰", team: "👤", meta: "🎯", publish: "📊", info: "ℹ️" };
const typeColor = { deadline: C.red, team: C.purple, meta: C.orange, publish: C.green, info: C.blue };

export default function NotifPanel({ open, onClose, markAllRead }) {
  const { notifs, setNotifs } = useApp();

  if (!open) return null;

  const markOne = async (id) => {
    try {
      await notifApi.markRead(id);
      setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const timeSince = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 56, right: 32, width: 380, background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Notificações</span>
          <Btn vr="subtle" onClick={markAllRead} style={{ fontSize: 11 }}>Marcar todas lidas</Btn>
        </div>
        <div style={{ maxHeight: 380, overflow: "auto" }}>
          {notifs.length === 0
            ? <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: C.dim }}>Sem notificações</div>
            : notifs.map(n => {
              const tc = typeColor[n.type] || C.blue;
              return (
                <div key={n.id} onClick={() => markOne(n.id)}
                  style={{ display: "flex", gap: 12, padding: "13px 18px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: n.read ? "transparent" : `${tc}05` }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : `${tc}05`}>
                  <span style={{ fontSize: 18 }}>{typeIcon[n.type] || "ℹ️"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: n.read ? C.muted : C.text, fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim, marginTop: 4 }}>{timeSince(n.createdAt)}</div>
                  </div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: tc, marginTop: 6 }} />}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
