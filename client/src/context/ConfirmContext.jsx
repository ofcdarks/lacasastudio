import { createContext, useContext, useState, useCallback } from "react";
import { C, Btn } from "../components/shared/UI";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: "", message: "", variant: "danger", resolve: null });

  const confirm = useCallback(({ title, message, variant = "danger" } = {}) => {
    return new Promise((resolve) => {
      setState({ open: true, title: title || "Confirmar", message: message || "Tem certeza?", variant, resolve });
    });
  }, []);

  const handleClose = (result) => {
    state.resolve?.(result);
    setState(p => ({ ...p, open: false }));
  };

  const variantConfig = {
    danger: { color: C.red, icon: "⚠️", confirmLabel: "Remover", confirmBg: C.red },
    warning: { color: C.orange, icon: "⚡", confirmLabel: "Confirmar", confirmBg: C.orange },
    info: { color: C.blue, icon: "ℹ️", confirmLabel: "OK", confirmBg: C.blue },
  };

  const v = variantConfig[state.variant] || variantConfig.danger;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state.open && (
        <div onClick={() => handleClose(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.15s ease-out",
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              width: 400, background: C.bgCard, borderRadius: 20,
              border: `1px solid ${C.border}`, overflow: "hidden",
              boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${v.color}15`,
              animation: "modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
            {/* Top accent */}
            <div style={{ height: 3, background: `linear-gradient(90deg, ${v.color}, ${v.color}40)` }} />

            <div style={{ padding: "28px 28px 24px" }}>
              {/* Icon + Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: `${v.color}12`, border: `1px solid ${v.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, flexShrink: 0,
                }}>{v.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 17, color: C.text, letterSpacing: "-0.01em" }}>
                  {state.title}
                </div>
              </div>

              {/* Message */}
              <div style={{
                fontSize: 14, color: C.muted, lineHeight: 1.6,
                padding: "12px 0 20px", marginLeft: 58,
              }}>
                {state.message}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => handleClose(false)}
                  style={{
                    padding: "10px 22px", borderRadius: 10, border: `1px solid ${C.border}`,
                    background: "rgba(255,255,255,0.04)", color: C.muted,
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "var(--font)", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.08)"; e.target.style.color = C.text; }}
                  onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.color = C.muted; }}>
                  Cancelar
                </button>
                <button onClick={() => handleClose(true)}
                  style={{
                    padding: "10px 22px", borderRadius: 10, border: "none",
                    background: v.confirmBg, color: "#fff",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "var(--font)", transition: "all 0.2s",
                    boxShadow: `0 4px 16px ${v.color}30`,
                  }}
                  onMouseEnter={e => e.target.style.boxShadow = `0 6px 24px ${v.color}50`}
                  onMouseLeave={e => e.target.style.boxShadow = `0 4px 16px ${v.color}30`}>
                  {v.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
