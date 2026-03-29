// @ts-nocheck
import { useState } from "react";
import { C, Card, Btn } from "../components/shared/UI";

const FAQ = [
  { q: "Como configurar a API Key do YouTube?", a: "Vá em Configurações > API Keys e cole sua chave do Google Cloud Console. Você precisa ter a YouTube Data API v3 habilitada." },
  { q: "Como conectar meu canal do YouTube?", a: "Em Gestão de Canais, clique em 'Novo Canal' e insira as informações do seu canal. Para analytics avançados, conecte via OAuth em Configurações." },
  { q: "O que é o Score Viral?", a: "É uma métrica proprietária que analisa engajamento, crescimento e qualidade do conteúdo para prever o potencial viral de um vídeo." },
  { q: "Como funciona a IA para roteiros?", a: "Utilizamos modelos de IA avançados para gerar roteiros otimizados. Configure sua API Key de IA nas Configurações para usar essa funcionalidade." },
  { q: "Posso usar a plataforma em equipe?", a: "Sim! Vá em Equipe para adicionar membros e definir permissões de acesso para cada pessoa." },
  { q: "Como exportar meus dados?", a: "Você pode exportar vídeos em CSV, roteiros em TXT e relatórios em PDF a partir de cada seção." },
];

const LINKS = [
  { title: "Documentação", desc: "Guias completos de todas as funcionalidades", icon: "📚", url: "#", color: C.blue },
  { title: "Discord", desc: "Comunidade ativa de criadores de conteúdo", icon: "💬", url: "#", color: C.purple },
  { title: "YouTube", desc: "Tutoriais em vídeo da plataforma", icon: "▶️", url: "#", color: C.red },
  { title: "Blog", desc: "Artigos e novidades sobre YouTube", icon: "📝", url: "#", color: C.green },
];

export default function ComunidadeSuporte() {
  const [openFaq, setOpenFaq] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  const sendFeedback = () => {
    if (!feedback.trim()) return;
    setSent(true);
    setFeedback("");
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.blue}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤝</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Comunidade & Suporte</h1>
          <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Conecte-se com outros criadores e obtenha ajuda</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
        {LINKS.map((l, i) => (
          <Card key={i} hov style={{ padding: 16, cursor: "pointer" }} onClick={() => l.url !== "#" && window.open(l.url, "_blank")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${l.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{l.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{l.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{l.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>❓ Perguntas Frequentes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQ.map((f, i) => (
              <Card key={i} style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.q}</span>
                  <span style={{ fontSize: 12, color: C.dim, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                </div>
                {openFaq === i && (
                  <div style={{ padding: "0 16px 14px", fontSize: 12, color: C.muted, lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>{f.a}</div>
                )}
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>💬 Enviar Feedback</h2>
          <Card style={{ padding: 20 }}>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Compartilhe sua sugestão, bug ou feedback..." rows={6} style={{ width: "100%", padding: 14, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", marginBottom: 14 }} />
            <Btn onClick={sendFeedback} disabled={!feedback.trim()} style={{ width: "100%", background: sent ? C.green : C.blue, color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 13, textAlign: "center" }}>
              {sent ? "✅ Enviado com sucesso!" : "📤 Enviar Feedback"}
            </Btn>
          </Card>

          <Card style={{ marginTop: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>📧 Contato Direto</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              Para suporte técnico urgente, envie um email para <span style={{ color: C.blue }}>suporte@lacasastudio.com</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
