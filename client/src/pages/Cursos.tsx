// @ts-nocheck
import { useState } from "react";
import { C, Card, Btn } from "../components/shared/UI";

const COURSES = [
  { id: 1, title: "YouTube do Zero ao Monetizado", desc: "Curso completo para criar, crescer e monetizar seu canal do YouTube", icon: "🚀", modules: 12, hours: 24, students: "2.3K", rating: 4.9, instructor: "LaCasaStudio", color: C.red, featured: true },
  { id: 2, title: "SEO YouTube Masterclass", desc: "Tudo sobre otimização de vídeos para o algoritmo do YouTube", icon: "🔍", modules: 8, hours: 16, students: "1.8K", rating: 4.8, instructor: "LaCasaStudio", color: C.blue },
  { id: 3, title: "Edição de Vídeo Profissional", desc: "Técnicas avançadas de edição para vídeos que prendem atenção", icon: "✂️", modules: 10, hours: 20, students: "1.5K", rating: 4.7, instructor: "LaCasaStudio", color: C.purple },
  { id: 4, title: "Copywriting para YouTube", desc: "Escreva títulos, descrições e roteiros que convertem", icon: "✍️", modules: 6, hours: 12, students: "980", rating: 4.8, instructor: "LaCasaStudio", color: C.green },
  { id: 5, title: "Shorts & Reels Strategy", desc: "Estratégias para crescer com vídeos curtos no YouTube Shorts", icon: "📱", modules: 5, hours: 8, students: "1.2K", rating: 4.6, instructor: "LaCasaStudio", color: C.orange },
  { id: 6, title: "Monetização Avançada", desc: "Múltiplas fontes de renda além do AdSense", icon: "💰", modules: 7, hours: 14, students: "890", rating: 4.9, instructor: "LaCasaStudio", color: C.teal },
];

export default function Cursos() {
  const [enrolled, setEnrolled] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lcs_enrolled") || "[]"); } catch { return []; }
  });

  const enroll = (id) => {
    if (enrolled.includes(id)) return;
    const updated = [...enrolled, id];
    setEnrolled(updated);
    localStorage.setItem("lcs_enrolled", JSON.stringify(updated));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📚</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Cursos</h1>
          <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Cursos completos para dominar cada aspecto do YouTube</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
        {COURSES.map((c) => (
          <Card key={c.id} hov style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 8, background: `linear-gradient(90deg, ${c.color}, ${c.color}80)` }} />
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "start", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${c.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{c.title}</div>
                  {c.featured && <span style={{ fontSize: 9, fontWeight: 700, color: C.orange, background: `${C.orange}12`, padding: "2px 6px", borderRadius: 4 }}>⭐ DESTAQUE</span>}
                </div>
              </div>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: "0 0 14px" }}>{c.desc}</p>
              <div style={{ display: "flex", gap: 12, marginBottom: 14, fontSize: 11, color: C.dim }}>
                <span>📦 {c.modules} módulos</span>
                <span>⏱️ {c.hours}h</span>
                <span>👥 {c.students} alunos</span>
                <span>⭐ {c.rating}</span>
              </div>
              <Btn onClick={() => enroll(c.id)} style={{ width: "100%", background: enrolled.includes(c.id) ? `${C.green}12` : c.color, color: enrolled.includes(c.id) ? C.green : "#fff", padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 12, textAlign: "center" }}>
                {enrolled.includes(c.id) ? "✅ Inscrito" : "Inscrever-se"}
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
