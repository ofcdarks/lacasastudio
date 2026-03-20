// @ts-nocheck
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { C } from "./UI";

const ProgressCtx = createContext(null);

export function ProgressProvider({ children }) {
  const [task, setTask] = useState(null);

  const start = useCallback((title, steps = []) => {
    setTask({ title, steps, current: 0, total: steps.length || 1, status: steps[0] || "Iniciando...", startTime: Date.now() });
  }, []);

  const update = useCallback((stepIndex, status) => {
    setTask(p => p ? { ...p, current: stepIndex, status: status || p.steps[stepIndex] || "Processando..." } : null);
  }, []);

  const done = useCallback(() => {
    setTask(p => p ? { ...p, current: p.total, status: "Concluído!" } : null);
    setTimeout(() => setTask(null), 600);
  }, []);

  const fail = useCallback((msg) => {
    setTask(p => p ? { ...p, status: "❌ " + (msg || "Erro"), current: p.total } : null);
    setTimeout(() => setTask(null), 2000);
  }, []);

  const close = useCallback(() => setTask(null), []);

  return (
    <ProgressCtx.Provider value={{ start, update, done, fail, close }}>
      {children}
      {task && <ProgressOverlay task={task} onClose={close} />}
    </ProgressCtx.Provider>
  );
}

export function useProgress() { return useContext(ProgressCtx); }

function ProgressOverlay({ task, onClose }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - task.startTime) / 1000)), 200);
    return () => clearInterval(t);
  }, [task.startTime]);

  const pct = Math.min(100, Math.round((task.current / task.total) * 100));
  const isDone = pct >= 100;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: "28px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{task.title}</div>
        
        {/* Progress bar */}
        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.06)", overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", borderRadius: 4, background: isDone ? C.green : `linear-gradient(90deg, ${C.red}, ${C.orange})`, width: `${pct}%`, transition: "width .4s ease" }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: isDone ? C.green : C.red }}>{pct}%</span>
          <span style={{ fontSize: 11, color: C.dim }}>{elapsed}s</span>
        </div>
        
        <div style={{ fontSize: 12, color: C.muted, minHeight: 20 }}>{task.status}</div>
        
        {/* Step indicators */}
        {task.steps.length > 1 && (
          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 12 }}>
            {task.steps.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < task.current ? C.green : i === task.current ? C.red : "rgba(255,255,255,.1)", transition: "background .3s" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
