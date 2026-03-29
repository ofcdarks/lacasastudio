// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Card, Btn } from "../components/shared/UI";
import { researchApi } from "../lib/api";

const fmt = (n) => { if (!n) return "0"; if (n >= 1e9) return (n / 1e9).toFixed(1) + "B"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };
const CATEGORIES = [
  { key: "explodindo", label: "Explodindo", icon: "⚡", color: "#F04444", desc: "Canais com menos de 15 dias postando e mais de 100 mil visualizações" },
  { key: "em_alta", label: "Em Alta", icon: "📈", color: "#F5A623", desc: "Canais com crescimento acelerado nos últimos 30 dias" },
  { key: "crescendo", label: "Crescendo", icon: "📊", color: "#22D35E", desc: "Canais com crescimento constante" },
  { key: "novos_canais", label: "Novos Canais", icon: "🆕", color: "#A855F7", desc: "Canais criados recentemente com potencial" },
  { key: "outros", label: "Outros", icon: "📁", color: "#4B8DF8", desc: "Demais canais monitorados" },
];

export default function NichosVirais() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("explodindo");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({ explodindo: 0, em_alta: 0, crescendo: 0, novos_canais: 0, outros: 0, total: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await researchApi.trendingNiches();
      const all = data?.channels || data?.niches || data?.results || [];
      setChannels(all);
      // Categorize
      const now = Date.now();
      const day = 86400000;
      let c = { explodindo: 0, em_alta: 0, crescendo: 0, novos_canais: 0, outros: 0, total: all.length };
      all.forEach((ch) => {
        const age = ch.publishedAt ? (now - new Date(ch.publishedAt).getTime()) / day : 999;
        const views = ch.views || ch.viewCount || 0;
        if (age <= 15 && views >= 100000) { ch._cat = "explodindo"; c.explodindo++; }
        else if (ch.growthRate > 50 || (ch.trend === "up" && views > 50000)) { ch._cat = "em_alta"; c.em_alta++; }
        else if (ch.growthRate > 10 || ch.trend === "growing") { ch._cat = "crescendo"; c.crescendo++; }
        else if (age <= 30) { ch._cat = "novos_canais"; c.novos_canais++; }
        else { ch._cat = "outros"; c.outros++; }
      });
      setCounts(c);
    } catch (e) {
      // Fallback: try emerging
      try { const data = await researchApi.emerging(); setChannels(data?.channels || []); } catch {}
    }
    setLoading(false);
  };

  const filtered = channels.filter((ch) => {
    if (activeCategory !== "total" && ch._cat !== activeCategory) return false;
    if (search && !((ch.title || ch.name || "").toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const activeCat = CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.orange}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔥</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Nichos Virais</h1>
          <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Sistema inteligente</p>
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
        {CATEGORIES.map((cat) => (
          <button key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{ padding: "16px 12px", borderRadius: 14, border: `1px solid ${activeCategory === cat.key ? cat.color + "40" : C.border}`, background: activeCategory === cat.key ? `${cat.color}08` : C.bgCard, cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{cat.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{counts[cat.key]}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: cat.color }}>{cat.label}</div>
          </button>
        ))}
        <button onClick={() => setActiveCategory("total")} style={{ padding: "16px 12px", borderRadius: 14, border: `1px solid ${activeCategory === "total" ? C.blue + "40" : C.border}`, background: activeCategory === "total" ? `${C.blue}08` : C.bgCard, cursor: "pointer", textAlign: "center" }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>📋</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{counts.total}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.blue }}>Todos os Nichos</div>
        </button>
      </div>

      {activeCat && (
        <Card color={activeCat.color} style={{ padding: 14, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: activeCat.color }}>
            {activeCat.icon} <strong>{activeCat.label}:</strong> {activeCat.desc}
          </span>
        </Card>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar canais..." style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 13, outline: "none" }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.dim }}>⏳ Carregando nichos virais...</div>
      ) : filtered.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((ch, i) => {
            const cat = CATEGORIES.find((c) => c.key === ch._cat);
            return (
              <Card key={i} hov style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {ch.thumbnail ? <img src={ch.thumbnail} alt="" style={{ width: 40, height: 40, borderRadius: 20, objectFit: "cover" }} /> : <div style={{ width: 40, height: 40, borderRadius: 20, background: `${cat?.color || C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📺</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{ch.title || ch.name}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: cat?.color || C.blue, padding: "2px 6px", borderRadius: 4 }}>{ch.niche || ch._cat?.toUpperCase()}</span>
                    </div>
                  </div>
                  {ch.latestVideo?.thumbnail && <img src={ch.latestVideo.thumbnail} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />}
                  {ch.latestVideo?.title && <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>{ch.latestVideo.title}</div>}
                  <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    <div><span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>👁️ {fmt(ch.views || ch.viewCount)}</span><br /><span style={{ fontSize: 9, color: C.dim }}>VIEWS</span></div>
                    <div><span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>👥 {fmt(ch.subscribers || ch.subs)}</span><br /><span style={{ fontSize: 9, color: C.dim }}>SUBS</span></div>
                    <div><span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>🎬 {ch.videoCount || ch.videos || 0}</span><br /><span style={{ fontSize: 9, color: C.dim }}>VÍDEOS</span></div>
                  </div>
                  <Btn onClick={() => window.open(`https://youtube.com/channel/${ch.channelId || ch.id}`, "_blank")} style={{ width: "100%", background: `${C.red}15`, color: C.red, padding: "8px", borderRadius: 8, fontWeight: 600, fontSize: 11, textAlign: "center" }}>📺 Ver Canal</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Descubra nichos em crescimento</h2>
          <p style={{ fontSize: 13, color: C.dim }}>O sistema monitora canais e identifica tendências automaticamente</p>
        </Card>
      )}
    </div>
  );
}
