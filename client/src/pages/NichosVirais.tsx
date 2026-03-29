// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Card, Btn } from "../components/shared/UI";
import { researchApi } from "../lib/api";

const TABS = [
  { key: "trending", label: "Em Alta", icon: "📈", color: C.orange },
  { key: "emerging", label: "Emergentes", icon: "🚀", color: C.red },
  { key: "microNiches", label: "Micro-Nichos", icon: "🎯", color: C.purple },
];

export default function NichosVirais() {
  const [data, setData] = useState({ trending: [], emerging: [], microNiches: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("trending");
  const [error, setError] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true); setError("");
    try {
      const result = await researchApi.trendingNiches();
      setData({
        trending: result?.trending || [],
        emerging: result?.emerging || [],
        microNiches: result?.microNiches || [],
      });
    } catch (e) { setError(e.message || "Erro ao carregar nichos"); }
    setLoading(false);
  };

  const activeTab = TABS.find((t) => t.key === tab);
  const items = data[tab] || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.orange}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔥</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Nichos Virais</h1>
          <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Sistema inteligente de detecção de tendências e nichos</p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Btn onClick={loadData} disabled={loading} style={{ background: `${C.blue}15`, color: C.blue, padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 11 }}>🔄 Atualizar</Btn>
        </div>
      </div>

      {/* Category stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "18px 14px", borderRadius: 14, border: `1px solid ${tab === t.key ? t.color + "40" : C.border}`, background: tab === t.key ? `${t.color}08` : C.bgCard, cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{(data[t.key] || []).length}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.label}</div>
          </button>
        ))}
      </div>

      {error && <Card color={C.red} style={{ padding: 14, marginBottom: 16 }}><span style={{ fontSize: 12, color: C.red }}>⚠️ {error}</span></Card>}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.dim }}>⏳ Carregando nichos...</div>
      ) : tab === "microNiches" ? (
        /* Micro-nichos have a different structure */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {items.map((n, i) => (
            <Card key={i} hov style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{n.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{n.name}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.green, background: `${C.green}12`, padding: "2px 8px", borderRadius: 4 }}>Concorrência: {n.competition}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: "0 0 10px" }}>{n.description}</p>
              <div style={{ fontSize: 11, color: C.cyan, marginBottom: 10 }}>💡 <strong>Como começar:</strong> {n.howToStart}</div>
              {n.contentIdeas && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.dim, marginBottom: 6 }}>IDEIAS DE CONTEÚDO:</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {n.contentIdeas.map((idea, j) => (
                      <span key={j} style={{ fontSize: 10, color: C.text, background: `${C.purple}12`, padding: "3px 8px", borderRadius: 6 }}>{idea}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>🔍 {n.query}</div>
            </Card>
          ))}
        </div>
      ) : (
        /* Trending / Emerging nichos */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {items.map((n, i) => (
            <Card key={i} hov style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{n.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{n.name}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: n.growth === "explosiva" ? C.red : C.orange, background: `${n.growth === "explosiva" ? C.red : C.orange}12`, padding: "2px 8px", borderRadius: 4 }}>
                    {n.growth === "explosiva" ? "🚀 Explosiva" : "📈 Alta"}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: "0 0 10px" }}>{n.description}</p>
              <div style={{ fontSize: 11, color: C.green, marginBottom: 8 }}>💡 <strong>Dica:</strong> {n.tip}</div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>🔍 {n.query}</div>
            </Card>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <Card style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Nenhum nicho encontrado</h2>
          <p style={{ fontSize: 13, color: C.dim }}>Tente atualizar os dados</p>
        </Card>
      )}
    </div>
  );
}
