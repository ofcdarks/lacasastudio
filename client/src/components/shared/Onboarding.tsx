// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn } from "./UI";

const STEPS = [
  { icon: "👋", title: "Bem-vindo ao LaCasaStudio!", desc: "Sua máquina completa de criar e monetizar canais YouTube.", tip: "Vamos fazer um tour rápido pelas ferramentas principais." },
  { icon: "🎬", title: "Pipeline: Crie um Canal do Zero", desc: "Em 4 passos: escolha nicho → gere identidade (logo+banner) → 5 roteiros → calendário 30 dias.", tip: "Acesse pelo sidebar: CRIAÇÃO → Pipeline", path: "/pipeline" },
  { icon: "🔍", title: "Pesquisa de Mercado", desc: "Busque qualquer nicho, analise canais, compare concorrentes, encontre micro-nichos com pouca competição.", tip: "Acesse: INTELIGÊNCIA → Pesquisa de Mercado", path: "/research" },
  { icon: "📜", title: "Roteiro Completo", desc: "Gere roteiros palavra-por-palavra com narração, cues de câmera, B-roll, música e edição.", tip: "Acesse: CRIAÇÃO → Roteiro Completo", path: "/roteiro" },
  { icon: "🚀", title: "SEO Viral", desc: "10 títulos com CTR score, 15 tags, timestamps, hook dos 5s, comentário fixado, multi-idioma.", tip: "Acesse: OTIMIZAÇÃO → SEO Viral", path: "/seo" },
  { icon: "💸", title: "Monetização 360°", desc: "6 fontes de receita detalhadas: AdSense, afiliados, cursos, patrocínios, membership, merch.", tip: "Acesse: OTIMIZAÇÃO → Monetização 360°", path: "/monetizar" },
  { icon: "📊", title: "Analytics", desc: "Analise QUALQUER canal do YouTube. Receba diagnóstico, dicas de crescimento e como superar concorrentes.", tip: "Acesse: PRINCIPAL → Analytics", path: "/analytics" },
  { icon: "🎯", title: "Comece Agora!", desc: "Configure sua API Key nas Configurações e comece a criar.", tip: "Dica: comece pelo Pipeline pra criar seu primeiro canal!", path: "/settings" },
];

export default function Onboarding({ onClose }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 480, background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, padding: 32, textAlign: "center" }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 3, marginBottom: 24 }}>
          {STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? C.red : "rgba(255,255,255,.06)", transition: "background .3s" }} />)}
        </div>

        <div style={{ fontSize: 56, marginBottom: 16 }}>{s.icon}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{s.title}</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{s.desc}</p>
        <div style={{ background: `${C.blue}08`, borderRadius: 10, padding: 12, border: `1px solid ${C.blue}15`, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: C.blue }}>💡 {s.tip}</div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {step > 0 && <Btn onClick={() => setStep(p => p - 1)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.dim, fontSize: 12 }}>← Anterior</Btn>}
          {step < STEPS.length - 1 ? (
            <Btn onClick={() => setStep(p => p + 1)} style={{ fontSize: 12, flex: 1, maxWidth: 200 }}>Próximo →</Btn>
          ) : (
            <Btn onClick={onClose} style={{ fontSize: 12, flex: 1, maxWidth: 200 }}>🚀 Começar!</Btn>
          )}
        </div>
        <button onClick={onClose} style={{ marginTop: 16, background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 11 }}>Pular tour</button>
      </div>
    </div>
  );
}
