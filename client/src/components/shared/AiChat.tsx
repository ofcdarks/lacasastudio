// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { chatApi } from "../../lib/api";
import { C } from "./UI";

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Olá! Sou o assistente IA do LaCasaStudio. Posso ajudar com nichos, títulos, SEO, thumbnails, roteiros e estratégia. O que precisa?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const apiMsgs = newMsgs.filter(m => m.role !== "assistant" || newMsgs.indexOf(m) > 0).map(m => ({ role: m.role, content: m.content }));
      const { reply } = await chatApi.send(apiMsgs.slice(-10));
      setMsgs(p => [...p, { role: "assistant", content: reply }]);
    } catch (e) { setMsgs(p => [...p, { role: "assistant", content: "Erro: " + e.message }]); }
    setLoading(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ position: "fixed", bottom: 20, right: 20, width: 52, height: 52, borderRadius: "50%", border: "none", background: `linear-gradient(135deg, ${C.red}, ${C.orange})`, color: "#fff", fontSize: 22, cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      🤖
    </button>
  );

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, width: 380, height: 520, borderRadius: 16, background: C.bgCard, border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(0,0,0,.5)", zIndex: 999, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, background: `linear-gradient(135deg, ${C.red}15, ${C.orange}15)` }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.red}, ${C.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>Assistente IA</div><div style={{ fontSize: 9, color: C.dim }}>YouTube Expert</div></div>
        <button onClick={() => setMsgs([msgs[0]])} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 9 }}>Limpar</button>
        <button onClick={() => setOpen(false)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(255,255,255,.06)", color: C.muted, cursor: "pointer", fontSize: 12 }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: 12, fontSize: 12, lineHeight: 1.6, background: m.role === "user" ? `${C.red}20` : "rgba(255,255,255,.04)", color: m.role === "user" ? C.text : C.muted, borderBottomRightRadius: m.role === "user" ? 4 : 12, borderBottomLeftRadius: m.role === "user" ? 12 : 4, whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ fontSize: 11, color: C.dim, padding: "4px 12px" }}>⏳ Pensando...</div>}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Pergunte qualquer coisa..." style={{ flex: 1, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12, outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: C.red, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, opacity: loading ? .5 : 1 }}>→</button>
      </div>
    </div>
  );
}
