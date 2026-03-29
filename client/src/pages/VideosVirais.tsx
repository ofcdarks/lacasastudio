// @ts-nocheck
import { useState } from "react";
import { C, Card, Btn } from "../components/shared/UI";

const fmt = (n) => { if (!n) return "0"; if (n >= 1e9) return (n / 1e9).toFixed(1) + "B"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };
const hdr = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` });

export default function VideosVirais() {
  const [query, setQuery] = useState("");
  const [publishedAfter, setPublishedAfter] = useState("");
  const [publishedBefore, setPublishedBefore] = useState("");
  const [minDuration, setMinDuration] = useState("300");
  const [minViews, setMinViews] = useState("");
  const [datePreset, setDatePreset] = useState("Qualquer data");
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem("lcs_saved_viral") || "[]"); } catch { return []; } });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("search");
  const [error, setError] = useState("");

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/youtube/search-viral", {
        method: "POST", headers: hdr(),
        body: JSON.stringify({ query: query.trim(), minDuration: +minDuration || 0, minViews: +minViews || 0, publishedAfter, publishedBefore, datePreset }),
      });
      if (!res.ok) {
        // Fallback: use research API
        const fallback = await fetch("/api/research/trending", { method: "POST", headers: hdr(), body: JSON.stringify({ query: query.trim(), niche: query.trim() }) });
        if (fallback.ok) { const data = await fallback.json(); setResults(data.videos || data.results || []); }
        else throw new Error("Configure a API Key do YouTube nas Configurações");
      } else {
        const data = await res.json();
        setResults(data.videos || data.items || data || []);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const saveVideo = (v) => {
    const updated = [...saved, { ...v, savedAt: new Date().toISOString() }];
    setSaved(updated);
    localStorage.setItem("lcs_saved_viral", JSON.stringify(updated));
  };

  const removeSaved = (idx) => {
    const updated = saved.filter((_, i) => i !== idx);
    setSaved(updated);
    localStorage.setItem("lcs_saved_viral", JSON.stringify(updated));
  };

  const clearFilters = () => { setDatePreset("Qualquer data"); setMinDuration("300"); setMinViews(""); setPublishedAfter(""); setPublishedBefore(""); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.red}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔥</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Vídeos Virais</h1>
          <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Busca avançada com filtros de duração, data de publicação e métricas. Configure a duração mínima para controlar o tipo de conteúdo.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, justifyContent: "flex-end" }}>
        <Btn style={{ background: `${C.orange}15`, color: C.orange, padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>📖 Tutorial</Btn>
        <Btn style={{ background: `${C.blue}15`, color: C.blue, padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>⚙️ Configurar API</Btn>
      </div>

      <Card style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Filtros de Busca</span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 6, display: "block" }}>PALAVRAS-CHAVE PARA BUSCA *</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex: como fazer bolo, programação python..." onKeyDown={(e) => e.key === "Enter" && search()} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, outline: "none" }} />
        </div>

        <Card color={C.orange} style={{ padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.orange }}>
            💡 <strong>Dica:</strong> Pesquise usando palavras-chave no idioma dos vídeos que deseja encontrar (Ex: "how to cook" para inglês, "como cozinhar" para português)
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.dim, marginBottom: 4, display: "block" }}>PUBLICADO HÁ</label>
            <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, outline: "none" }}>
              <option>Qualquer data</option>
              <option>Última semana</option>
              <option>Último mês</option>
              <option>Últimos 3 meses</option>
              <option>Último ano</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.dim, marginBottom: 4, display: "block" }}>DURAÇÃO MÍNIMA (SEG)</label>
            <input type="number" value={minDuration} onChange={(e) => setMinDuration(e.target.value)} placeholder="300" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.dim, marginBottom: 4, display: "block" }}>PUBLICADO APÓS</label>
            <input type="date" value={publishedAfter} onChange={(e) => setPublishedAfter(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.dim, marginBottom: 4, display: "block" }}>PUBLICADO ANTES</label>
            <input type="date" value={publishedBefore} onChange={(e) => setPublishedBefore(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, outline: "none" }} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: C.dim, marginBottom: 4, display: "block" }}>VISUALIZAÇÕES MÍNIMAS</label>
          <input type="number" value={minViews} onChange={(e) => setMinViews(e.target.value)} placeholder="Ex: 10000" style={{ width: 250, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, outline: "none" }} />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Btn onClick={search} disabled={loading || !query.trim()} style={{ background: C.blue, color: "#fff", padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.6 : 1 }}>🔍 Buscar Vídeos</Btn>
          <Btn onClick={clearFilters} style={{ background: "transparent", color: C.muted, padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 12, border: `1px solid ${C.border}` }}>✕ Limpar Filtros</Btn>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: C.dim }}>
          ✨ <strong style={{ color: C.purple }}>Busca Inteligente:</strong> Vídeos com mais visualizações primeiro (máx: 100)<br />
          <strong>Score Viral™:</strong> Baseado em engajamento, crescimento e qualidade. Score alto = vídeo viral! 🔥
        </div>
      </Card>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button onClick={() => setTab("search")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "none", borderBottom: `2px solid ${tab === "search" ? C.blue : "transparent"}`, background: "transparent", color: tab === "search" ? C.blue : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔍 Buscar Vídeos</button>
        <button onClick={() => setTab("saved")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "none", borderBottom: `2px solid ${tab === "saved" ? C.blue : "transparent"}`, background: "transparent", color: tab === "saved" ? C.blue : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📁 Vídeos Salvos ({saved.length})</button>
      </div>

      {error && <Card color={C.red} style={{ padding: 14, marginBottom: 16 }}><span style={{ fontSize: 12, color: C.red }}>⚠️ {error}</span></Card>}

      {tab === "search" && (
        loading ? (
          <div style={{ textAlign: "center", padding: 60, color: C.dim }}>⏳ Buscando vídeos virais...</div>
        ) : results.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {results.map((v, i) => (
              <Card key={i} hov style={{ padding: 0, overflow: "hidden" }}>
                {(v.thumbnail || v.thumbnails?.medium?.url) && <img src={v.thumbnail || v.thumbnails?.medium?.url} alt="" style={{ width: "100%", height: 180, objectFit: "cover" }} />}
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>{v.channelTitle || v.channel}</div>
                  <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: C.text }}>👁️ {fmt(v.viewCount || v.views)}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>👍 {fmt(v.likeCount || v.likes || 0)}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>💬 {fmt(v.commentCount || v.comments || 0)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={() => saveVideo(v)} style={{ flex: 1, background: `${C.blue}15`, color: C.blue, padding: "7px", borderRadius: 8, fontWeight: 600, fontSize: 10, textAlign: "center" }}>💾 Salvar</Btn>
                    <Btn onClick={() => window.open(`https://youtube.com/watch?v=${v.videoId || v.id}`, "_blank")} style={{ flex: 1, background: `${C.red}15`, color: C.red, padding: "7px", borderRadius: 8, fontWeight: 600, fontSize: 10, textAlign: "center" }}>▶️ Ver</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card style={{ textAlign: "center", padding: "60px 40px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Pronto para descobrir vídeos virais?</h2>
            <p style={{ fontSize: 13, color: C.dim, margin: "0 0 24px" }}>Use a busca acima para encontrar oportunidades de conteúdo,<br />analisar concorrentes ou identificar tendências no seu nicho</p>
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 4 }}>🔍</div><div style={{ fontSize: 10, color: C.dim }}>Busque por<br />nicho</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 4 }}>📊</div><div style={{ fontSize: 10, color: C.dim }}>Analise<br />métricas</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 4 }}>🎯</div><div style={{ fontSize: 10, color: C.dim }}>Encontre<br />oportunidades</div></div>
            </div>
          </Card>
        )
      )}

      {tab === "saved" && (
        saved.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {saved.map((v, i) => (
              <Card key={i} style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 6 }}>{v.title}</div>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>{v.channelTitle || v.channel} • {fmt(v.viewCount || v.views)} views</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => window.open(`https://youtube.com/watch?v=${v.videoId || v.id}`, "_blank")} style={{ flex: 1, background: `${C.red}15`, color: C.red, padding: "6px", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>▶️ Ver</Btn>
                  <Btn onClick={() => removeSaved(i)} style={{ background: `${C.dim}15`, color: C.dim, padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>🗑️</Btn>
                </div>
              </Card>
            ))}
          </div>
        ) : <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Nenhum vídeo salvo ainda</div>
      )}
    </div>
  );
}
