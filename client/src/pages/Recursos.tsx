// @ts-nocheck
import { useState } from "react";
import { C, Card, Btn } from "../components/shared/UI";

const CATEGORIES = ["Todos", "Templates", "Guias", "Ferramentas", "Referências", "Downloads"];

const RESOURCES = [
  { id: 1, title: "Template de Roteiro Universal", desc: "Estrutura de roteiro que funciona para qualquer nicho", category: "Templates", icon: "📝", format: "Google Docs", color: C.blue },
  { id: 2, title: "Checklist de Publicação", desc: "Lista completa de verificação antes de publicar qualquer vídeo", category: "Templates", icon: "✅", format: "PDF", color: C.green },
  { id: 3, title: "Guia de Thumbnails", desc: "As melhores práticas para criar thumbnails que convertem", category: "Guias", icon: "🖼️", format: "PDF", color: C.purple },
  { id: 4, title: "Planilha de Métricas", desc: "Template para acompanhar suas métricas do YouTube semanalmente", category: "Templates", icon: "📊", format: "Excel", color: C.orange },
  { id: 5, title: "Guia SEO YouTube 2026", desc: "Guia atualizado com todas as técnicas de SEO para YouTube", category: "Guias", icon: "🔍", format: "PDF", color: C.cyan },
  { id: 6, title: "Lista de Ferramentas Essenciais", desc: "Todas as ferramentas que você precisa para produzir vídeos", category: "Ferramentas", icon: "🛠️", format: "Notion", color: C.red },
  { id: 7, title: "Banco de Músicas Livres", desc: "Curadoria de músicas sem copyright para usar nos seus vídeos", category: "Referências", icon: "🎵", format: "Link", color: C.pink },
  { id: 8, title: "Pack de Overlays", desc: "Overlays profissionais para usar nos seus vídeos", category: "Downloads", icon: "🎨", format: "ZIP", color: C.teal },
  { id: 9, title: "Calendário de Conteúdo", desc: "Template de planejamento mensal de conteúdo", category: "Templates", icon: "📅", format: "Notion", color: C.blue },
  { id: 10, title: "Guia de Monetização", desc: "Todas as formas de monetizar seu canal do YouTube", category: "Guias", icon: "💰", format: "PDF", color: C.green },
];

export default function Recursos() {
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [bookmarked, setBookmarked] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lcs_bookmarks") || "[]"); } catch { return []; }
  });

  const toggleBookmark = (id) => {
    const updated = bookmarked.includes(id) ? bookmarked.filter((b) => b !== id) : [...bookmarked, id];
    setBookmarked(updated);
    localStorage.setItem("lcs_bookmarks", JSON.stringify(updated));
  };

  const filtered = RESOURCES.filter((r) => {
    if (filter !== "Todos" && r.category !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.teal}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Recursos</h1>
          <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Templates, guias e ferramentas para acelerar seu crescimento</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar recursos..." style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 13, minWidth: 200, outline: "none" }} />
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(c)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${filter === c ? C.teal : C.border}`, background: filter === c ? `${C.teal}12` : "transparent", color: filter === c ? C.teal : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{c}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.map((r) => (
          <Card key={r.id} hov style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "start", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${r.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{r.title}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: r.color, background: `${r.color}12`, padding: "2px 6px", borderRadius: 4 }}>{r.category}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: C.dim, background: `${C.dim}12`, padding: "2px 6px", borderRadius: 4 }}>{r.format}</span>
                </div>
              </div>
              <button onClick={() => toggleBookmark(r.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: bookmarked.includes(r.id) ? C.orange : C.dim }}>{bookmarked.includes(r.id) ? "⭐" : "☆"}</button>
            </div>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
