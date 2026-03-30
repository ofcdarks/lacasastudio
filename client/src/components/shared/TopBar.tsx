import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { C, Badge } from "./UI";
import NotifPanel from "./NotifPanel";
import SearchOverlay from "./SearchOverlay";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/gestao-canais": "Gestão de Canais",
  "/research": "Research",
  "/videos-virais": "Vídeos Virais",
  "/nichos-virais": "Nichos Virais",
  "/insights-canal": "Insights de Canal",
  "/compare": "Comparar Canais",
  "/canais-removidos": "Canais Removidos",
  "/daily-ideas": "Ideias Diárias",
  "/ideas": "Quadro de Ideias",
  "/planner": "Planner",
  "/roteiro": "Roteiro",
  "/storyboard": "Storyboard",
  "/editor": "Editor",
  "/thumbs": "Thumbnails",
  "/framecut": "FrameCut",
  "/checklist": "Checklist",
  "/text-tools": "Ferramentas de Texto",
  "/seo": "Gerador SEO",
  "/keywords": "Keywords",
  "/tag-spy": "Tag Spy",
  "/seo-audit": "SEO Audit",
  "/hooks": "Hooks",
  "/preditor": "Viral Predict",
  "/catalog": "Catálogo",
  "/hype": "Hype Strategy",
  "/pipeline": "Pipeline",
  "/calendario": "Calendário",
  "/command-center": "Command Center",
  "/streak": "Streak",
  "/my-analytics": "Meu Canal",
  "/analytics": "Analytics Geral",
  "/analyzer": "Analyzer",
  "/retention": "Retenção",
  "/ab-testing": "A/B Testing",
  "/algoritmo": "Algoritmo",
  "/shorts": "Gerador Shorts",
  "/shorts-clip": "Clipper",
  "/shorts-optimizer": "Otimizador",
  "/repurpose": "Repurpose",
  "/community": "Comunidade",
  "/monetizar": "Monetize 360",
  "/orcamento": "Orçamento",
  "/metas": "Metas",
  "/equipe": "Equipe",
  "/referencias": "Referências",
  "/templates": "Templates",
  "/ativos": "Ativos",
  "/settings": "Configurações",
};

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const { notifs } = useApp();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const unread = notifs.filter((n: any) => !n.read).length;

  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (PAGE_TITLES[path]) return PAGE_TITLES[path];
    // Try prefix match for dynamic routes like /canal/:id
    const prefix = Object.keys(PAGE_TITLES).find(k => k !== "/" && path.startsWith(k));
    return prefix ? PAGE_TITLES[prefix] : "";
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowSearch(true); }
      if (e.key === "Escape") { setShowSearch(false); setShowNotifs(false); setShowUser(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!showUser) return;
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUser]);

  return (
    <>
      <header style={{
        height: "var(--topbar-h, 56px)", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", padding: "0 24px", gap: 16,
        background: C.bg, position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      }}>
        {/* Mobile menu */}
        <button className="mobile-menu-btn" onClick={onMenuClick}
          style={{
            display: "none", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
            color: C.text, cursor: "pointer", fontSize: 16, flexShrink: 0,
          }}>☰</button>

        {/* Page title */}
        {pageTitle && (
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-0.01em", flexShrink: 0 }}>
            {pageTitle}
          </div>
        )}

        {/* Divider */}
        {pageTitle && <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />}

        {/* Search */}
        <div
          className="topbar-search"
          onClick={() => setShowSearch(true)}
          style={{
            flex: 1, maxWidth: 380, height: 36, borderRadius: 10,
            background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", padding: "0 14px", gap: 10,
            cursor: "pointer", color: C.dim, fontSize: 13,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
        >
          <span style={{ fontSize: 13, opacity: 0.5 }}>🔍</span>
          <span style={{ flex: 1, opacity: 0.6 }}>Buscar...</span>
          <kbd style={{
            fontSize: 10, fontFamily: "var(--mono)", fontWeight: 600,
            background: "rgba(255,255,255,0.06)", padding: "2px 7px",
            borderRadius: 5, color: C.dim, border: `1px solid ${C.border}`,
          }}>⌘K</kbd>
        </div>

        <div style={{ flex: 1 }} />

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: showNotifs ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${showNotifs ? C.borderH : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative", transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 15 }}>🔔</span>
            {unread > 0 && (
              <div style={{
                position: "absolute", top: -5, right: -5,
                minWidth: 18, height: 18, borderRadius: 9,
                background: C.red, color: "#fff", fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 5px", boxShadow: "0 2px 8px rgba(240,68,68,0.4)",
                fontFamily: "var(--mono)",
              }}>
                {unread > 99 ? "99+" : unread}
              </div>
            )}
          </button>
          {showNotifs && <NotifPanel onClose={() => setShowNotifs(false)} />}
        </div>

        {/* User */}
        <div ref={userRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setShowUser(!showUser); setShowNotifs(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 4px 4px",
              borderRadius: 10, border: `1px solid ${showUser ? C.borderH : "transparent"}`,
              background: showUser ? "rgba(255,255,255,0.04)" : "transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: `linear-gradient(135deg, ${C.red}, ${C.orange})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 12, color: "#fff",
              boxShadow: "0 2px 8px rgba(240,68,68,0.2)",
            }}>
              {user?.avatar || user?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{user?.name || "Usuário"}</span>
              <span style={{ fontSize: 10, color: C.dim, lineHeight: 1.2 }}>{user?.role || "Creator"}</span>
            </div>
            <span style={{ fontSize: 10, color: C.dim, marginLeft: 2, transition: "transform 0.2s", transform: showUser ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
          </button>

          {showUser && (
            <div className="dropdown-menu animate-dropdown" style={{ top: 48, right: 0, width: 220, padding: 6 }}>
              <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{user?.email}</div>
              </div>
              <div
                className="dropdown-item"
                onClick={() => { setShowUser(false); }}
                style={{ color: C.muted }}
              >
                <span style={{ fontSize: 14 }}>⚙</span>
                Configurações
              </div>
              <div
                className="dropdown-item"
                onClick={() => { logout(); setShowUser(false); }}
                style={{ color: C.red }}
              >
                <span style={{ fontSize: 14 }}>↩</span>
                Sair da conta
              </div>
            </div>
          )}
        </div>
      </header>
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
    </>
  );
}
