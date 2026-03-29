// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Card, Btn } from "../components/shared/UI";

const CATEGORIES = ["Todos", "SEO", "Roteiro", "Thumbnail", "Títulos", "Descrição", "Tags", "Shorts", "Hooks", "CTA", "Análise"];

const DEFAULT_PROMPTS = [
  { id: 1, title: "Gerador de Títulos Virais", category: "Títulos", content: "Gere 10 títulos virais para um vídeo sobre {tema}. Use técnicas de curiosidade, números e power words. Formato: título principal + variação.", icon: "🎯", color: "#F04444" },
  { id: 2, title: "Roteiro Completo", category: "Roteiro", content: "Crie um roteiro completo para um vídeo de {duração} minutos sobre {tema}. Inclua: hook nos primeiros 30s, desenvolvimento com storytelling, CTA e encerramento.", icon: "📝", color: "#A855F7" },
  { id: 3, title: "Descrição SEO Otimizada", category: "Descrição", content: "Escreva uma descrição otimizada para SEO do vídeo '{titulo}'. Inclua: resumo, timestamps, links, keywords e hashtags relevantes.", icon: "🔍", color: "#4B8DF8" },
  { id: 4, title: "Tags Estratégicas", category: "Tags", content: "Gere 30 tags otimizadas para o vídeo '{titulo}' no nicho de {nicho}. Inclua: broad, specific e long-tail keywords.", icon: "🏷️", color: "#22D35E" },
  { id: 5, title: "Hook Irresistível", category: "Hooks", content: "Crie 5 hooks diferentes para os primeiros 5 segundos do vídeo sobre {tema}. Use: pergunta provocativa, fato chocante, promessa de valor, storytelling e contraste.", icon: "🪝", color: "#F5A623" },
  { id: 6, title: "Script para Shorts", category: "Shorts", content: "Crie um script de 60 segundos para Shorts sobre {tema}. Formato: hook (3s), problema (10s), solução (30s), CTA (5s). Tom: {tom}.", icon: "📱", color: "#EC4899" },
  { id: 7, title: "Análise de Concorrente", category: "Análise", content: "Analise o canal {canal} e identifique: estratégia de conteúdo, frequência de postagem, tipos de thumbnail, hooks mais usados e oportunidades não exploradas.", icon: "🔬", color: "#06B6D4" },
  { id: 8, title: "CTA Persuasivo", category: "CTA", content: "Crie 5 CTAs diferentes para o final do vídeo sobre {tema}. Tipos: inscrevam-se, like, comentário, compartilhamento e próximo vídeo.", icon: "📣", color: "#14B8A6" },
  { id: 9, title: "Conceito de Thumbnail", category: "Thumbnail", content: "Sugira 3 conceitos de thumbnail para o vídeo '{titulo}'. Para cada conceito descreva: composição visual, texto overlay (max 5 palavras), expressão facial e cores dominantes.", icon: "🖼️", color: "#F04444" },
  { id: 10, title: "Otimização SEO Completa", category: "SEO", content: "Faça uma otimização SEO completa para: Título: {titulo}. Inclua: título otimizado, descrição, tags, hashtags, categoria e horário ideal de publicação.", icon: "🚀", color: "#4B8DF8" },
];

export default function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ title: "", category: "SEO", content: "", icon: "📝", color: "#4B8DF8" });

  useEffect(() => {
    const saved = localStorage.getItem("lcs_prompts");
    if (saved) { try { setPrompts(JSON.parse(saved)); } catch { setPrompts(DEFAULT_PROMPTS); } }
    else setPrompts(DEFAULT_PROMPTS);
  }, []);

  const save = (list) => { setPrompts(list); localStorage.setItem("lcs_prompts", JSON.stringify(list)); };

  const filtered = prompts.filter((p) => {
    if (filter !== "Todos" && p.category !== filter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(content);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editing) {
      save(prompts.map((p) => (p.id === editing.id ? { ...p, ...form } : p)));
    } else {
      save([...prompts, { ...form, id: Date.now() }]);
    }
    setShowCreate(false);
    setEditing(null);
    setForm({ title: "", category: "SEO", content: "", icon: "📝", color: "#4B8DF8" });
  };

  const handleDelete = (id) => { if (confirm("Remover este prompt?")) save(prompts.filter((p) => p.id !== id)); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✨</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Prompts</h1>
            <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Biblioteca de prompts para criar conteúdo mais rápido</p>
          </div>
        </div>
        <Btn onClick={() => { setEditing(null); setForm({ title: "", category: "SEO", content: "", icon: "📝", color: "#4B8DF8" }); setShowCreate(true); }} style={{ background: C.blue, color: "#fff", fontWeight: 700, padding: "10px 20px", borderRadius: 10 }}>+ Novo Prompt</Btn>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar prompts..." style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 13, minWidth: 250, outline: "none" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${filter === cat ? C.blue : C.border}`, background: filter === cat ? `${C.blue}15` : "transparent", color: filter === cat ? C.blue : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{cat}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {filtered.map((p) => (
          <Card key={p.id} style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "start", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.title}</div>
                <span style={{ fontSize: 10, fontWeight: 600, color: p.color, background: `${p.color}12`, padding: "2px 8px", borderRadius: 4 }}>{p.category}</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: "0 0 14px", maxHeight: 72, overflow: "hidden" }}>{p.content}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleCopy(p.content)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: copied === p.content ? `${C.green}15` : "transparent", color: copied === p.content ? C.green : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{copied === p.content ? "✓ Copiado!" : "📋 Copiar"}</button>
              <button onClick={() => { setEditing(p); setForm({ title: p.title, category: p.category, content: p.content, icon: p.icon, color: p.color }); setShowCreate(true); }} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>✏️</button>
              <button onClick={() => handleDelete(p.id)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 11, cursor: "pointer" }}>🗑️</button>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Nenhum prompt encontrado</div>}

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, width: 500, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 20px" }}>{editing ? "Editar Prompt" : "Novo Prompt"}</h2>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título do prompt" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", marginBottom: 12 }} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", marginBottom: 12 }}>
              {CATEGORIES.filter((c) => c !== "Todos").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Conteúdo do prompt... Use {variável} para placeholders" rows={6} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", resize: "vertical", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setShowCreate(false)} style={{ flex: 1, background: C.bgHover, color: C.muted, padding: "10px", borderRadius: 10, fontWeight: 600 }}>Cancelar</Btn>
              <Btn onClick={handleSave} style={{ flex: 1, background: C.blue, color: "#fff", padding: "10px", borderRadius: 10, fontWeight: 700 }}>{editing ? "Salvar" : "Criar"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
