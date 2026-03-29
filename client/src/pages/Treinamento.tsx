// @ts-nocheck
import { useState } from "react";
import { C, Card, Btn } from "../components/shared/UI";

const MODULES = [
  { id: 1, title: "Fundamentos do YouTube", desc: "Aprenda o básico sobre como o YouTube funciona, algoritmo e métricas essenciais", icon: "🎓", lessons: 8, duration: "2h 30min", level: "Iniciante", color: C.blue },
  { id: 2, title: "SEO para YouTube", desc: "Domine as técnicas de SEO específicas para vídeos do YouTube", icon: "🔍", lessons: 12, duration: "3h 45min", level: "Intermediário", color: C.green },
  { id: 3, title: "Thumbnails que Convertem", desc: "Crie thumbnails que maximizam o CTR dos seus vídeos", icon: "🖼️", lessons: 6, duration: "1h 50min", level: "Intermediário", color: C.purple },
  { id: 4, title: "Roteiros Virais", desc: "Estruturas de roteiro comprovadas para reter audiência", icon: "📝", lessons: 10, duration: "3h 15min", level: "Avançado", color: C.red },
  { id: 5, title: "Monetização Avançada", desc: "Estratégias de monetização além do AdSense", icon: "💰", lessons: 8, duration: "2h 20min", level: "Avançado", color: C.orange },
  { id: 6, title: "Analytics & Dados", desc: "Interprete dados para tomar decisões estratégicas", icon: "📊", lessons: 7, duration: "2h 10min", level: "Intermediário", color: C.cyan },
  { id: 7, title: "Shorts & Formatos Curtos", desc: "Domine o formato de vídeos curtos para crescer rápido", icon: "📱", lessons: 6, duration: "1h 40min", level: "Iniciante", color: C.pink },
  { id: 8, title: "Produção Profissional", desc: "Equipamentos, iluminação, áudio e edição profissional", icon: "🎬", lessons: 14, duration: "4h 30min", level: "Avançado", color: C.teal },
];

const LEVELS = { "Iniciante": C.green, "Intermediário": C.orange, "Avançado": C.red };

export default function Treinamento() {
  const [filter, setFilter] = useState("Todos");
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lcs_training_progress") || "{}"); } catch { return {}; }
  });

  const markProgress = (moduleId, lessonIdx) => {
    const key = `${moduleId}`;
    const updated = { ...progress, [key]: Math.max(progress[key] || 0, lessonIdx + 1) };
    setProgress(updated);
    localStorage.setItem("lcs_training_progress", JSON.stringify(updated));
  };

  const filtered = MODULES.filter((m) => filter === "Todos" || m.level === filter);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.blue}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎓</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Treinamento</h1>
          <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Aprenda a dominar o YouTube com módulos práticos e diretos</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Todos", "Iniciante", "Intermediário", "Avançado"].map((l) => (
          <button key={l} onClick={() => setFilter(l)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${filter === l ? C.blue : C.border}`, background: filter === l ? `${C.blue}12` : "transparent", color: filter === l ? C.blue : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {filtered.map((m) => {
          const done = progress[m.id] || 0;
          const pct = Math.round((done / m.lessons) * 100);
          return (
            <Card key={m.id} hov style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "start", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${m.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{m.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{m.title}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: LEVELS[m.level], background: `${LEVELS[m.level]}12`, padding: "2px 8px", borderRadius: 4 }}>{m.level}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: "0 0 14px" }}>{m.desc}</p>
              <div style={{ display: "flex", gap: 14, marginBottom: 12, fontSize: 11, color: C.dim }}>
                <span>📚 {m.lessons} aulas</span>
                <span>⏱️ {m.duration}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, marginBottom: 4 }}>
                  <span>{done}/{m.lessons} aulas</span>
                  <span>{pct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: `${C.dim}15`, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: m.color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>
              <Btn onClick={() => markProgress(m.id, done)} style={{ width: "100%", background: `${m.color}12`, color: m.color, padding: "9px", borderRadius: 8, fontWeight: 600, fontSize: 11, textAlign: "center" }}>
                {done >= m.lessons ? "✅ Concluído" : done > 0 ? "▶️ Continuar" : "▶️ Começar"}
              </Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
