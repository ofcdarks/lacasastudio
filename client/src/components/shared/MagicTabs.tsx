// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { C } from "./UI";

const PALETTE = [C.red, C.blue, C.green, C.purple, C.orange, C.pink, C.teal, C.cyan];

interface Tab { key: string; icon: string; label: string; color?: string; }
interface MagicTabsProps { tabs: Tab[]; active: string; onChange: (key: string) => void; }

export default function MagicTabs({ tabs, active, onChange }: MagicTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const idx = tabs.findIndex(t => t.key === active);
    const btns = containerRef.current.querySelectorAll("[data-tab]");
    if (btns[idx]) {
      const btn = btns[idx] as HTMLElement;
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [active, tabs]);

  return (
    <div ref={containerRef} style={{
      display: "inline-flex", gap: 4, padding: 4,
      background: "rgba(255,255,255,0.025)", borderRadius: 14,
      border: `1px solid ${C.border}`, position: "relative",
      marginBottom: 24, overflow: "hidden",
    }}>
      {/* Sliding indicator */}
      <div style={{
        position: "absolute", top: 4, left: indicator.left, width: indicator.width, height: "calc(100% - 8px)",
        borderRadius: 11,
        background: `linear-gradient(135deg, ${tabs.find(t => t.key === active)?.color || C.red}18, ${tabs.find(t => t.key === active)?.color || C.red}08)`,
        border: `1px solid ${tabs.find(t => t.key === active)?.color || C.red}25`,
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 0,
      }} />

      {tabs.map((tab, i) => {
        const isActive = tab.key === active;
        const color = tab.color || PALETTE[i % PALETTE.length];
        return (
          <button key={tab.key} data-tab onClick={() => onChange(tab.key)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 11,
            border: "none", cursor: "pointer",
            background: "transparent",
            color: isActive ? color : C.dim,
            fontSize: 12.5, fontWeight: isActive ? 700 : 500,
            transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
            position: "relative", zIndex: 1,
            letterSpacing: "0.01em",
          }}>
            <span style={{
              fontSize: 15,
              filter: isActive ? "none" : "grayscale(0.6)",
              transition: "filter 0.25s",
            }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {isActive && <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: color, boxShadow: `0 0 8px ${color}60`,
              marginLeft: 2,
            }} />}
          </button>
        );
      })}
    </div>
  );
}
