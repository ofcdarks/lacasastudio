import { createContext, useContext, useState, useCallback, useRef } from "react";
import { C } from "./UI";

const ToastContext = createContext(null);

const ICONS = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
const COLORS = { success: C.green, error: C.red, warning: C.orange, info: C.blue };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type, removing: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, duration);
  }, []);

  const toast = useCallback({
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    warning: (msg) => addToast(msg, "warning"),
    info: (msg) => addToast(msg, "info"),
  }, [addToast]);

  // Make it callable as toast.success() etc
  const api = { success: (m) => addToast(m, "success"), error: (m) => addToast(m, "error"), warning: (m) => addToast(m, "warning"), info: (m) => addToast(m, "info") };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 99999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 18px", borderRadius: 12,
            background: C.bgCard, border: `1px solid ${COLORS[t.type]}30`,
            boxShadow: `0 8px 30px rgba(0,0,0,0.4), inset 0 0 0 1px ${COLORS[t.type]}15`,
            animation: t.removing ? "toastOut 0.3s ease forwards" : "toastIn 0.3s ease",
            cursor: "pointer",
          }}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          >
            <span style={{ fontSize: 16 }}>{ICONS[t.type]}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.text, flex: 1 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
