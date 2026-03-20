// @ts-nocheck
import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { C } from "./UI";

const ProgressCtx = createContext(null);

export function ProgressProvider({ children }) {
  const [task, setTask] = useState(null);
  const simRef = useRef(null);

  const startSim = (total) => {
    // Simulate progress: fast to 30%, slow to 70%, crawl to 90%
    let pct = 0;
    if (simRef.current) clearInterval(simRef.current);
    simRef.current = setInterval(() => {
      if (pct < 30) pct += 3;
      else if (pct < 60) pct += 1.5;
      else if (pct < 85) pct += 0.5;
      else if (pct < 92) pct += 0.1;
      setTask(p => p ? { ...p, simPct: Math.min(92, Math.round(pct)) } : null);
    }, 300);
  };

  const stopSim = () => { if (simRef.current) { clearInterval(simRef.current); simRef.current = null; } };

  const start = useCallback((title, steps = []) => {
    setTask({ title, steps, current: 0, total: steps.length || 1, status: steps[0] || "Iniciando...", startTime: Date.now(), simPct: 0 });
    startSim(steps.length);
  }, []);

  const update = useCallback((stepIndex, status) => {
    setTask(p => p ? { ...p, current: stepIndex, status: status || p.steps[stepIndex] || "Processando..." } : null);
  }, []);

  const done = useCallback(() => {
    stopSim();
    setTask(p => p ? { ...p, current: p.total, simPct: 100, status: "✅ Concluído!" } : null);
    setTimeout(() => setTask(null), 800);
  }, []);

  const fail = useCallback((msg) => {
    stopSim();
    setTask(p => p ? { ...p, status: "❌ " + (msg || "Erro"), simPct: 100 } : null);
    setTimeout(() => setTask(null), 2500);
  }, []);

  const close = useCallback(() => { stopSim(); setTask(null); }, []);

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
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - task.startTime) / 1000)), 500);
    return () => clearInterval(t);
  }, [task.startTime]);

  const pct = task.simPct ?? 0;
  const isDone = pct >= 100;
  const isFail = task.status?.startsWith("❌");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 420, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: "28px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{task.title}</div>
        <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.06)", overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", borderRadius: 5, background: isFail ? C.red : isDone ? C.green : `linear-gradient(90deg, ${C.red}, ${C.orange})`, width: `${pct}%`, transition: "width .5s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: isFail ? C.red : isDone ? C.green : C.red }}>{pct}%</span>
          <span style={{ fontSize: 12, color: C.dim }}>{elapsed}s</span>
        </div>
        <div style={{ fontSize: 13, color: isFail ? C.red : C.muted, minHeight: 20 }}>{task.status}</div>
        {task.steps.length > 1 && <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 14 }}>
          {task.steps.map((s, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < task.current ? C.green : i === task.current ? C.red : "rgba(255,255,255,.1)", transition: "background .3s" }} />)}
        </div>}
      </div>
    </div>
  );
}
