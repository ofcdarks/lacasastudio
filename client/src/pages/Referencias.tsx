// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Card, Btn } from "../components/shared/UI";
import { youtubeApi, researchApi } from "../lib/api";

const NICHES = ["Todos os Nichos", "Gaming", "Tech", "Finanças", "Educação", "Entretenimento", "Fitness", "Música", "Culinária", "Viagem", "Outro"];

export default function Referencias() {
  const [refs, setRefs] = useState([]);
  const [filter, setFilter] = useState("Todas as Referências");
  const [nicheFilter, setNicheFilter] = useState("Todos os Nichos");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("Outro");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("lcs_referencias");
    if (saved) try { setRefs(JSON.parse(saved)); } catch {}
    setLoading(false);
  }, []);

  const save = (list) => { setRefs(list); localStorage.setItem("lcs_referencias", JSON.stringify(list)); };

  const handleAdd = async () => {
    if (!url.trim()) return;
    setAdding(true);
    try {
      const handle = url.replace(/.*\/(c\/|channel\/|@)?/, "").replace(/\?.*/, "").trim();
      const data = await youtubeApi.channel(handle);
      const ref = { id: Date.now(), channelId: data.id, name: data.title, thumbnail: data.thumbnail, subs: data.stats?.subscribers || 0, views: data.stats?.views || 0, videos: data.stats?.videos || 0, niche, addedAt: new Date().toISOString() };
      save([...refs, ref]);
      setShowAdd(false);
      setUrl("");
    } catch (e) { alert("Erro ao buscar canal: " + e.message); }
    finally { setAdding(false); }
  };

  const handleRemove = (id) => { if (confirm("Remover referência?")) save(refs.filter((r) => r.id !== id)); };

  const fmt = (n) => { if (!n) return "0"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };

  const filtered = refs.filter((r) => {
    if (nicheFilter !== "Todos os Nichos" && r.niche !== nicheFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔖</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Referências de Canais</h1>
            <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Canais que você acompanha para inspiração, análise e modelagem de títulos por nicho</p>
          </div>
        </div>
        <Btn onClick={() => setShowAdd(true)} style={{ background: C.blue, color: "#fff", fontWeight: 700, padding: "10px 20px", borderRadius: 10 }}>+ Novo Canal</Btn>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }}>
          <option>Todas as Referências</option>
          <option>Recentes</option>
          <option>Mais inscritos</option>
        </select>
        <select value={nicheFilter} onChange={(e) => setNicheFilter(e.target.value)} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }}>
          {NICHES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar canais..." style={{ width: "100%", padding: "10px 16px 10px 36px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>💜</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Nenhum canal cadastrado</h2>
          <p style={{ fontSize: 13, color: C.dim, margin: "0 0 24px" }}>Comece adicionando seu primeiro canal de referência</p>
          <Btn onClick={() => setShowAdd(true)} style={{ background: C.blue, color: "#fff", fontWeight: 700, padding: "12px 28px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8 }}>+ Adicionar Primeiro Canal</Btn>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((r) => (
            <Card key={r.id} style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                {r.thumbnail ? (
                  <img src={r.thumbnail} alt="" style={{ width: 44, height: 44, borderRadius: 22, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📺</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{r.name}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.orange, background: `${C.orange}12`, padding: "2px 8px", borderRadius: 4 }}>{r.niche}</span>
                </div>
                <button onClick={() => handleRemove(r.id)} style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <div><span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{fmt(r.subs)}</span><span style={{ fontSize: 10, color: C.dim, marginLeft: 4 }}>subs</span></div>
                <div><span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{fmt(r.views)}</span><span style={{ fontSize: 10, color: C.dim, marginLeft: 4 }}>views</span></div>
                <div><span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{r.videos}</span><span style={{ fontSize: 10, color: C.dim, marginLeft: 4 }}>vídeos</span></div>
              </div>
              <Btn onClick={() => window.open(`https://youtube.com/channel/${r.channelId}`, "_blank")} style={{ width: "100%", background: `${C.red}12`, color: C.red, padding: "8px", borderRadius: 8, fontWeight: 600, fontSize: 11, textAlign: "center" }}>🔗 Ver Canal</Btn>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAdd(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, width: 440, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 20px" }}>Adicionar Referência</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 6, display: "block" }}>URL ou Handle do Canal</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/@canal ou @canal" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 6, display: "block" }}>Nicho</label>
              <select value={niche} onChange={(e) => setNiche(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none" }}>
                {NICHES.filter((n) => n !== "Todos os Nichos").map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setShowAdd(false)} style={{ flex: 1, background: C.bgHover, color: C.muted, padding: "10px", borderRadius: 10, fontWeight: 600 }}>Cancelar</Btn>
              <Btn onClick={handleAdd} disabled={adding} style={{ flex: 1, background: C.blue, color: "#fff", padding: "10px", borderRadius: 10, fontWeight: 700, opacity: adding ? 0.6 : 1 }}>{adding ? "Buscando..." : "Adicionar"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
