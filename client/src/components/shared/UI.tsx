import { useState, ReactNode, CSSProperties } from "react";

export const C = {
  bg: "#08090E", bgCard: "#0F1017", bgCardElevated: "#13141D", bgSidebar: "#0B0C13",
  bgHover: "rgba(255,255,255,0.025)", bgGlass: "rgba(255,255,255,0.015)",
  border: "rgba(255,255,255,0.055)", borderH: "rgba(255,255,255,0.10)", borderAccent: "rgba(255,255,255,0.08)",
  text: "#E8E6F0", muted: "rgba(255,255,255,0.50)", dim: "rgba(255,255,255,0.25)",
  red: "#F04444", green: "#22D35E", blue: "#4B8DF8", purple: "#A855F7",
  orange: "#F5A623", pink: "#EC4899", cyan: "#06B6D4", teal: "#14B8A6",
};

export const ST: Record<string, { l: string; c: string; i: string }> = {
  idea: { l: "Ideia", c: C.orange, i: "💡" },
  script: { l: "Roteiro", c: C.purple, i: "📝" },
  filming: { l: "Gravação", c: C.cyan, i: "🎥" },
  editing: { l: "Edição", c: C.red, i: "✂️" },
  review: { l: "Revisão", c: C.teal, i: "🔍" },
  scheduled: { l: "Agendado", c: C.blue, i: "📅" },
  published: { l: "Publicado", c: C.green, i: "✅" },
};
export const STATUS_KEYS = Object.keys(ST);

/* ─── Progress Bar ─── */
interface PBarProps { current: number; target: number; color: string; h?: number; }
export function PBar({ current, target, color, h = 5 }: PBarProps) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div style={{ width: "100%", height: h, borderRadius: h, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: h, background: `linear-gradient(90deg, ${color}, ${color}cc)`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

/* ─── Badge ─── */
interface BadgeProps { text?: string; color?: string; v?: string; }
export function Badge({ text, color = C.red, v = "dot" }: BadgeProps) {
  if (v === "count") return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "#fff",
      background: color, borderRadius: 10, padding: "2px 7px", lineHeight: "16px",
      letterSpacing: "0.02em", boxShadow: `0 2px 6px ${color}30`,
    }}>{text}</span>
  );
  if (v === "tag") return (
    <span style={{
      fontSize: 10, fontWeight: 600, color, background: `${color}12`,
      borderRadius: 6, padding: "3px 9px", border: `1px solid ${color}18`,
      letterSpacing: "0.01em",
    }}>{text}</span>
  );
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block", boxShadow: `0 0 6px ${color}40` }} />;
}

/* ─── Card ─── */
interface CardProps { children: ReactNode; style?: CSSProperties; color?: string; onClick?: () => void; hov?: boolean; }
export function Card({ children, style: s = {}, color, onClick, hov = false }: CardProps) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hov && setH(true)}
      onMouseLeave={() => hov && setH(false)}
      style={{
        background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 22,
        position: "relative", overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        ...(hov && h ? { borderColor: C.borderH, transform: "translateY(-2px)", boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)" } : {}),
        ...(onClick ? { cursor: "pointer" } : {}), ...s,
      }}>
      {color && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, ${color}60)` }} />}
      {children}
    </div>
  );
}

/* ─── Button ─── */
interface BtnProps { children: ReactNode; onClick?: () => void; vr?: string; style?: CSSProperties; disabled?: boolean; }
export function Btn({ children, onClick, vr = "primary", style: s = {}, disabled = false }: BtnProps) {
  const [h, setH] = useState(false);
  const base: CSSProperties = {
    border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600, fontSize: 12.5, borderRadius: 10,
    display: "inline-flex", alignItems: "center", gap: 7,
    transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
    padding: "10px 20px", letterSpacing: "0.01em",
    opacity: disabled ? 0.4 : 1, ...s,
  };
  const vs: Record<string, CSSProperties> = {
    primary: {
      background: h && !disabled ? "#E03838" : C.red, color: "#fff",
      boxShadow: h && !disabled ? `0 4px 20px ${C.red}30` : "0 2px 8px rgba(240,68,68,0.15)",
      transform: h && !disabled ? "translateY(-1px)" : "none",
    },
    ghost: {
      background: h ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)", color: C.muted,
      border: `1px solid ${h ? C.borderH : C.border}`,
    },
    subtle: { background: "transparent", color: C.muted, padding: "6px 12px" },
    danger: {
      background: h && !disabled ? "rgba(240,68,68,0.15)" : "rgba(240,68,68,0.08)", color: C.red,
      border: `1px solid ${h ? "rgba(240,68,68,0.25)" : "rgba(240,68,68,0.12)"}`,
    },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ ...base, ...(vs[vr] || vs.primary) }}>{children}</button>
  );
}

/* ─── Page Header ─── */
interface HdrProps { title: string; sub?: string; action?: ReactNode; }
export function Hdr({ title, sub, action }: HdrProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: C.dim, margin: "6px 0 0", lineHeight: 1.5, letterSpacing: "0.01em" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── Label ─── */
export function Label({ t }: { t: string }) {
  return <div style={{ fontSize: 10, color: C.dim, marginBottom: 6, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}>{t}</div>;
}

/* ─── Section Title ─── */
export function SecTitle({ t }: { t: string }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>{t}</div>;
}

/* ─── Input ─── */
export function Input(props: any) {
  return <input {...props} style={{
    background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%",
    transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
    ...props.style
  }}
  onFocus={e => { e.target.style.borderColor = "rgba(75,141,248,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(75,141,248,0.06)"; e.target.style.background = "rgba(255,255,255,0.04)"; props.onFocus?.(e); }}
  onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; e.target.style.background = "rgba(255,255,255,0.03)"; props.onBlur?.(e); }}
  />;
}

/* ─── Select ─── */
export function Select({ children, ...props }: any) {
  return <select {...props} style={{
    background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%",
    appearance: "none" as const, cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23555' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
    transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
    ...props.style
  }}>{children}</select>;
}

/* ─── Spinner ─── */
export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{
        width: 28, height: 28,
        border: `2.5px solid rgba(255,255,255,0.06)`,
        borderTopColor: C.red, borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
    </div>
  );
}

/* ─── Empty State ─── */
export function Empty({ icon = "📭", title = "Nada aqui ainda", sub = "" }) {
  return (
    <div style={{ textAlign: "center", padding: 56, color: C.dim }}>
      <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: C.muted }}>{title}</div>
      {sub && <div style={{ fontSize: 13, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}
