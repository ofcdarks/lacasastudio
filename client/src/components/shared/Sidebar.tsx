import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

interface NavItem { path: string; label: string; icon: string; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  {
    label: "Início",
    items: [
      { path: "/", label: "Dashboard", icon: "⊞" },
      { path: "/gestao-canais", label: "Gestão de Canais", icon: "◎" },
    ],
  },
  {
    label: "Pesquisa",
    items: [
      { path: "/research", label: "Research", icon: "◉" },
      { path: "/videos-virais", label: "Vídeos Virais", icon: "▲" },
      { path: "/nichos-virais", label: "Nichos Virais", icon: "◆" },
      { path: "/insights-canal", label: "Insights de Canal", icon: "◫" },
      { path: "/compare", label: "Comparar Canais", icon: "⇄" },
      { path: "/canais-removidos", label: "Canais Removidos", icon: "△" },
      { path: "/daily-ideas", label: "Ideias Diárias", icon: "✦" },
    ],
  },
  {
    label: "Produção",
    items: [
      { path: "/ideas", label: "Quadro de Ideias", icon: "◈" },
      { path: "/planner", label: "Planner", icon: "▦" },
      { path: "/roteiro", label: "Roteiro", icon: "≡" },
      { path: "/storyboard", label: "Storyboard", icon: "▣" },
      { path: "/editor", label: "Editor", icon: "⊟" },
      { path: "/thumbs", label: "Thumbnails", icon: "▧" },
      { path: "/framecut", label: "FrameCut", icon: "🎬" },
      { path: "/script-agents", label: "Agentes de Roteiro", icon: "🤖" },
      { path: "/checklist", label: "Checklist", icon: "☑" },
      { path: "/text-tools", label: "Ferramentas de Texto", icon: "¶" },
    ],
  },
  {
    label: "SEO & Otimização",
    items: [
      { path: "/seo", label: "Gerador SEO", icon: "⊕" },
      { path: "/keywords", label: "Keywords", icon: "⌗" },
      { path: "/tag-spy", label: "Tag Spy", icon: "◉" },
      { path: "/seo-audit", label: "SEO Audit", icon: "⊘" },
      { path: "/hooks", label: "Hooks", icon: "↪" },
      { path: "/preditor", label: "Viral Predict", icon: "◎" },
      { path: "/catalog", label: "Catálogo", icon: "▤" },
      { path: "/hype", label: "Hype Strategy", icon: "⚡" },
    ],
  },
  {
    label: "Pipeline & Agenda",
    items: [
      { path: "/pipeline", label: "Pipeline", icon: "▶" },
      { path: "/calendario", label: "Calendário", icon: "◧" },
      { path: "/command-center", label: "Command Center", icon: "⊡" },
      { path: "/streak", label: "Streak", icon: "⬥" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { path: "/my-analytics", label: "Meu Canal", icon: "◩" },
      { path: "/analytics", label: "Analytics Geral", icon: "▥" },
      { path: "/analyzer", label: "Analyzer", icon: "⊙" },
      { path: "/retention", label: "Retenção", icon: "◔" },
      { path: "/ab-testing", label: "A/B Testing", icon: "⇔" },
      { path: "/algoritmo", label: "Algoritmo", icon: "⬡" },
    ],
  },
  {
    label: "Shorts",
    items: [
      { path: "/shorts", label: "Gerador Shorts", icon: "▮" },
      { path: "/shorts-clip", label: "Clipper", icon: "⊟" },
      { path: "/shorts-optimizer", label: "Otimizador", icon: "◈" },
      { path: "/repurpose", label: "Repurpose", icon: "↻" },
      { path: "/community", label: "Comunidade", icon: "◎" },
    ],
  },
  {
    label: "Negócios",
    items: [
      { path: "/monetizar", label: "Monetize 360", icon: "◉" },
      { path: "/orcamento", label: "Orçamento", icon: "▧" },
      { path: "/metas", label: "Metas", icon: "◎" },
      { path: "/equipe", label: "Equipe", icon: "◔" },
    ],
  },
  {
    label: "Biblioteca",
    items: [
      { path: "/referencias", label: "Referências", icon: "⊞" },
      { path: "/templates", label: "Templates", icon: "▦" },
      { path: "/ativos", label: "Ativos", icon: "▣" },
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

  const go = useCallback((path: string) => { navigate(path); onClose(); }, [navigate, onClose]);

  const isActive = useCallback((path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  }, [location.pathname]);

  return (
    <>
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
        <div
          onClick={() => go("/")}
          style={{
            padding: "22px 20px 18px", display: "flex", alignItems: "center", gap: 14,
            flexShrink: 0, cursor: "pointer", borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #F04444, #FF6B6B)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "#fff",
            boxShadow: "0 2px 12px rgba(240,68,68,0.25)",
          }}>
            L
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>LaCasaStudio</div>
            <div style={{ fontSize: 12, color: "var(--dim)", letterSpacing: "0.04em", fontWeight: 500 }}>YouTube Production OS</div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: "12px 8px 80px", overflowY: "auto" }}>
          {NAV.map((group) => (
            <div key={group.label} style={{ marginBottom: 6 }}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!collapsed[group.label]}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  padding: "9px 10px 5px", border: "none", background: "transparent",
                  cursor: "pointer", borderRadius: 8,
                }}
              >
                <span style={{
                  flex: 1, textAlign: "left",
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--dim)",
                }}>
                  {group.label}
                </span>
                <span style={{
                  fontSize: 9, color: "var(--dim)", opacity: 0.5,
                  transform: collapsed[group.label] ? "rotate(-90deg)" : "rotate(0)",
                  transition: "transform 0.2s",
                }}>▼</span>
              </button>

              {/* Group items */}
              <div
                role="list"
                style={{
                  overflow: "hidden",
                  maxHeight: collapsed[group.label] ? 0 : `${group.items.length * 44}px`,
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
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", border: "none", borderRadius: 10,
                        background: active ? "rgba(240,68,68,0.08)" : "transparent",
                        color: active ? "var(--text)" : "var(--muted)",
                        fontSize: 14, fontWeight: active ? 600 : 450,
                        cursor: "pointer", transition: "all 0.12s",
                        letterSpacing: "-0.01em", position: "relative",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.035)"; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      {active && (
                        <div style={{
                          position: "absolute", left: 0, top: "18%", bottom: "18%", width: 3,
                          borderRadius: "0 3px 3px 0",
                          background: "linear-gradient(180deg, #F04444, #FF6B6B)",
                        }} />
                      )}
                      <span style={{
                        width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, color: active ? "#F04444" : "var(--dim)",
                        background: active ? "rgba(240,68,68,0.10)" : "transparent",
                        borderRadius: 7, flexShrink: 0, transition: "all 0.12s",
                      }}>
                        {item.icon}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 16px", borderTop: "1px solid var(--border)",
          flexShrink: 0, display: "flex", gap: 8,
        }}>
          <button
            onClick={() => go("/settings")}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--muted)", cursor: "pointer",
              fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            ⚙ Configurações
          </button>
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
            style={{
              width: 42, height: 42, borderRadius: 10,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--muted)", cursor: "pointer", fontSize: 17,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </nav>
    </>
  );
}
