import { useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { C } from "./UI";

interface NavItem { path: string; label: string; icon: string; }

interface NavGroup { label: string; icon: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    icon: "🏠",
    items: [
      { path: "/", label: "Dashboard", icon: "📊" },
      { path: "/command-center", label: "Command Center", icon: "🎮" },
    ],
  },
  {
    label: "Produção",
    icon: "🎬",
    items: [
      { path: "/planner", label: "Planner", icon: "📋" },
      { path: "/pipeline", label: "Pipeline", icon: "🔄" },
      { path: "/storyboard", label: "Storyboard", icon: "🎞️" },
      { path: "/roteiro", label: "Roteiro", icon: "📝" },
      { path: "/editor", label: "Editor", icon: "✂️" },
      { path: "/checklist", label: "Checklist", icon: "✅" },
      { path: "/thumbs", label: "Thumbnails", icon: "🖼️" },
      { path: "/calendario", label: "Calendário", icon: "📅" },
      { path: "/streak", label: "Streak", icon: "🔥" },
    ],
  },
  {
    label: "SEO & Growth",
    icon: "🚀",
    items: [
      { path: "/seo", label: "Gerador SEO", icon: "🔍" },
      { path: "/keywords", label: "Keywords", icon: "🔑" },
      { path: "/tag-spy", label: "Tag Spy", icon: "🕵️" },
      { path: "/seo-audit", label: "SEO Audit", icon: "📑" },
      { path: "/catalog", label: "Catálogo", icon: "📚" },
      { path: "/hooks", label: "Hooks", icon: "🪝" },
      { path: "/preditor", label: "Viral Predict", icon: "🔮" },
      { path: "/hype", label: "Hype Strategy", icon: "📣" },
    ],
  },
  {
    label: "Analytics",
    icon: "📈",
    items: [
      { path: "/analytics", label: "Analytics", icon: "📈" },
      { path: "/my-analytics", label: "Meus Canais", icon: "📺" },
      { path: "/analyzer", label: "Analyzer", icon: "🔬" },
      { path: "/retention", label: "Retenção", icon: "⏱️" },
      { path: "/ab-testing", label: "A/B Testing", icon: "🧪" },
      { path: "/algoritmo", label: "Algoritmo", icon: "🤖" },
    ],
  },
  {
    label: "Pesquisa",
    icon: "🔎",
    items: [
      { path: "/research", label: "Research", icon: "🔎" },
      { path: "/compare", label: "Comparar", icon: "⚖️" },
      { path: "/ideas", label: "Ideias", icon: "💡" },
      { path: "/daily-ideas", label: "Ideias Diárias", icon: "✨" },
    ],
  },
  {
    label: "Shorts & Multi",
    icon: "📱",
    items: [
      { path: "/shorts", label: "Shorts", icon: "📱" },
      { path: "/shorts-clip", label: "Clipper", icon: "✂️" },
      { path: "/shorts-optimizer", label: "Otimizador", icon: "⚡" },
      { path: "/repurpose", label: "Repurpose", icon: "♻️" },
      { path: "/community", label: "Comunidade", icon: "👥" },
    ],
  },
  {
    label: "Negócios",
    icon: "💰",
    items: [
      { path: "/monetizar", label: "Monetize 360", icon: "💰" },
      { path: "/orcamento", label: "Orçamento", icon: "💳" },
      { path: "/metas", label: "Metas", icon: "🎯" },
    ],
  },
  {
    label: "Workspace",
    icon: "🗂️",
    items: [
      { path: "/ativos", label: "Ativos", icon: "📁" },
      { path: "/templates", label: "Templates", icon: "📐" },
      { path: "/equipe", label: "Equipe", icon: "👤" },
      { path: "/settings", label: "Configurações", icon: "⚙️" },
    ],
  },
];

interface SidebarProps { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("lc_sidebar_collapse") || "{}"); }
    catch { return {}; }
  });

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem("lc_sidebar_collapse", JSON.stringify(next));
      return next;
    });
  }, []);

  const go = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const isActive = useCallback((path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${isOpen ? "show" : ""}`} onClick={onClose} aria-hidden="true" />

      <nav
        className={`sidebar-desktop ${isOpen ? "open" : ""}`}
        role="navigation"
        aria-label="Navegação principal"
        style={{
          width: "var(--sidebar-w)", height: "100vh", position: "fixed", top: 0, left: 0,
          background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)",
          overflowY: "auto", overflowX: "hidden", zIndex: 100,
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "18px 18px 12px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #F04444, #FF6B6B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            🏠
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>LaCasaStudio</div>
            <div style={{ fontSize: 10, color: "var(--dim)" }}>v2.5 • YouTube OS</div>
          </div>
        </div>

        {/* Groups */}
        <div style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <button
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!collapsed[group.label]}
                aria-controls={`nav-group-${group.label}`}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 8px", border: "none", background: "transparent",
                  color: "var(--dim)", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                  textTransform: "uppercase", cursor: "pointer", borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 11 }}>{group.icon}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{group.label}</span>
                <span style={{ fontSize: 8, transform: collapsed[group.label] ? "rotate(-90deg)" : "rotate(0)", transition: "0.15s" }}>▼</span>
              </button>

              <div
                id={`nav-group-${group.label}`}
                role="list"
                style={{
                  overflow: "hidden",
                  maxHeight: collapsed[group.label] ? 0 : `${group.items.length * 34}px`,
                  transition: "max-height 0.25s ease",
                }}
              >
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      role="listitem"
                      onClick={() => go(item.path)}
                      aria-current={active ? "page" : undefined}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 8px 6px 24px", border: "none", borderRadius: 6,
                        background: active ? "var(--red)" + "14" : "transparent",
                        color: active ? "var(--text)" : "var(--muted)",
                        fontSize: 12, fontWeight: active ? 600 : 500,
                        cursor: "pointer", transition: "all 0.15s",
                        borderLeft: active ? `2px solid var(--red)` : "2px solid transparent",
                      }}
                    >
                      <span style={{ fontSize: 13, width: 20, textAlign: "center" }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", gap: 8 }}>
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
            style={{
              flex: 1, padding: "6px", borderRadius: 6, border: "1px solid var(--border)",
              background: "var(--bg-hover)", color: "var(--muted)", cursor: "pointer",
              fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {theme === "dark" ? "☀️ Claro" : "🌙 Escuro"}
          </button>
        </div>
      </nav>
    </>
  );
}
