// @ts-nocheck
import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { C } from "./UI";

const ProgressCtx = createContext(null);

export function ProgressProvider({ children }) {
  const [task, setTask] = useState(null);
  const simRef = useRef(null);
  const retryRef = useRef(null);

  const startSim = () => {
    let pct = 0;
    if (simRef.current) clearInterval(simRef.current);
    simRef.current = setInterval(() => {
      if (pct < 30) pct += 3;
      else if (pct < 60) pct += 1.5;
      else if (pct < 85) pct += 0.5;
      else if (pct < 95) pct += 0.08;
      else if (pct < 98) pct += 0.02;
      setTask(p => p ? { ...p, simPct: Math.min(98, Math.round(pct * 10) / 10) } : null);
    }, 300);
  };

  const stopSim = () => { if (simRef.current) { clearInterval(simRef.current); simRef.current = null; } };

  const start = useCallback((title, steps = []) => {
    setTask({
      title, steps, current: 0, total: steps.length || 1,
      status: steps[0] || "Iniciando...", startTime: Date.now(), simPct: 0,
      retryCount: 0, maxRetries: 0, retryFn: null,
    });
    startSim();
  }, []);

  const update = useCallback((stepIndex, status) => {
    setTask(p => p ? { ...p, current: stepIndex, status: status || p.steps[stepIndex] || "Processando..." } : null);
  }, []);

  const retry = useCallback((attempt, maxRetries) => {
    stopSim();
    setTask(p => {
      if (!p) return null;
      return {
        ...p,
        retryCount: attempt,
        maxRetries,
        status: `🔄 Tentativa ${attempt + 1} de ${maxRetries}... Aguarde`,
        simPct: Math.max(20, (p.simPct || 0) * 0.4),
      };
    });
    startSim();
  }, []);

  const done = useCallback(() => {
    stopSim();
    setTask(p => p ? { ...p, current: p.total, simPct: 100, status: "✅ Concluído!" } : null);
    setTimeout(() => setTask(null), 600);
  }, []);

  const fail = useCallback((msg, retryFn) => {
    stopSim();
    setTask(p => p ? { ...p, status: "❌ " + (msg || "Erro"), simPct: 100, retryFn: retryFn || null } : null);
    if (!retryFn) setTimeout(() => setTask(null), 2500);
  }, []);

  const close = useCallback(() => { stopSim(); setTask(null); }, []);

  return (
    <ProgressCtx.Provider value={{ start, update, done, fail, close, retry }}>
      {children}
      {task && <ProgressOverlay task={task} onClose={close} />}
    </ProgressCtx.Provider>
  );
}

export function useProgress() { return useContext(ProgressCtx); }

function ProgressOverlay({ task, onClose }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - task.startTime) / 1000)), 500);
    return () => clearInterval(t);
  }, [task.startTime]);

  const pct = task.simPct ?? 0;
  const isDone = pct >= 100 && !task.status?.startsWith("❌");
  const isFail = task.status?.startsWith("❌");
  const isRetrying = task.retryCount > 0 && !isFail && !isDone;
  const isStuck = elapsed > 60 && pct < 98 && !isDone && !isFail;

  const handleRetry = () => {
    if (task.retryFn) {
      onClose();
      setTimeout(() => task.retryFn(), 100);
    }
  };

  // Format elapsed time nicely
  const fmtTime = (s) => {
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m${sec > 0 ? sec + "s" : ""}`;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 440, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: "28px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{task.title}</div>

        {/* Progress bar */}
        <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.06)", overflow: "hidden", marginBottom: 12 }}>
          <div style={{
            height: "100%", borderRadius: 5, width: `${pct}%`, transition: "width .5s ease",
            background: isFail ? C.red : isDone ? C.green : isRetrying ? `linear-gradient(90deg, ${C.orange}, ${C.purple})` : `linear-gradient(90deg, ${C.red}, ${C.orange})`,
          }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: isFail ? C.red : isDone ? C.green : isRetrying ? C.orange : C.red }}>{Math.round(pct)}%</span>
          <span style={{ fontSize: 12, color: C.dim }}>{fmtTime(elapsed)}</span>
        </div>

        <div style={{ fontSize: 13, color: isFail ? C.red : isRetrying ? C.orange : C.muted, minHeight: 20 }}>{task.status}</div>

        {/* Retry indicator */}
        {isRetrying && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: task.maxRetries }, (_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", transition: "background .3s",
                  background: i < task.retryCount ? C.orange : i === task.retryCount ? C.red : "rgba(255,255,255,.1)",
                }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: C.dim }}>Retry automático</span>
          </div>
        )}

        {/* Steps dots */}
        {task.steps.length > 1 && !isRetrying && <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 14 }}>
          {task.steps.map((s, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < task.current ? C.green : i === task.current ? C.red : "rgba(255,255,255,.1)", transition: "background .3s" }} />)}
        </div>}

        {/* "Taking long" message */}
        {elapsed > 30 && !isDone && !isFail && (
          <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
            {elapsed > 90
              ? "⏳ Prompts complexos podem demorar até 3 minutos. A IA está processando..."
              : elapsed > 60
              ? "⏳ Quase lá... prompts detalhados geram respostas melhores"
              : "⏳ Processando prompt detalhado — isso é normal para análises complexas"
            }
          </div>
        )}

        {/* Retry button on fail */}
        {isFail && task.retryFn && (
          <button onClick={handleRetry} style={{
            marginTop: 14, padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff",
            background: `linear-gradient(135deg, ${C.red}, ${C.orange})`,
          }}>
            🔄 Tentar Novamente
          </button>
        )}

        {/* Cancel button */}
        {(!isFail || !task.retryFn) && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
            {(isStuck || elapsed > 20) && !isDone && !isFail && (
              <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 11 }}>
                ✕ Cancelar
              </button>
            )}
          </div>
        )}

        {isFail && !task.retryFn && (
          <button onClick={onClose} style={{ marginTop: 14, padding: "8px 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 11 }}>
            ✕ Fechar
          </button>
        )}
      </div>
    </div>
  );
}
