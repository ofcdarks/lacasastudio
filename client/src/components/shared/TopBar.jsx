import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { notifApi } from "../../lib/api";
import { C, Badge } from "./UI";
import SearchOverlay from "./SearchOverlay";
import NotifPanel from "./NotifPanel";

export default function TopBar() {
  const { user, logout } = useAuth();
  const { notifs, setNotifs } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = async () => {
    try {
      await notifApi.markAllRead();
      setNotifs(p => p.map(n => ({ ...n, read: true })));
    } catch {}
  };

  return (
    <>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotifPanel open={notifOpen} onClose={() => setNotifOpen(false)} markAllRead={markAllRead} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 32px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: `${C.bg}ee`, backdropFilter: "blur(12px)", zIndex: 50 }}>
        {/* Search */}
        <div onClick={() => setSearchOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 400, padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer", transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.borderH}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
          <span style={{ fontSize: 14, color: C.dim }}>⌕</span>
          <span style={{ fontSize: 13, color: C.dim }}>Buscar...</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim, marginLeft: "auto", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>⌘K</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Notifications */}
        <div onClick={() => setNotifOpen(!notifOpen)}
          style={{ position: "relative", cursor: "pointer", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
          🔔
          {unread > 0 && <div style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "#fff", border: `2px solid ${C.bg}` }}>{unread}</div>}
        </div>

        {/* User */}
        <div onClick={logout} title="Sair"
          style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.red}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", cursor: "pointer" }}>
          {user?.avatar || "U"}
        </div>
      </div>
    </>
  );
}
