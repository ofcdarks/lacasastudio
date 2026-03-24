// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";
import { researchApi } from "../lib/api";

const api = {
  search: (data) => fetch("/api/competitive/keywords/search", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` }, body: JSON.stringify(data) }).then(r => r.json()),
  history: () => fetch("/api/competitive/keywords/history", { headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` } }).then(r => r.json()),
};

function ScoreBadge({ score, label }) {
  const c = score >= 70 ? C.green : score >= 40 ? "#F59E0B" : C.red;
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 6px", background: `${c}08`, borderRadius: 10, border: `1px solid ${c}15` }}>
    <div style={{ fontSize: 24, fontWeight: 800, color: c }}>{score}</div>
    <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{label}</div>
  </div>;
}

function Ring({ score, size = 80 }) {
  const r = size / 2 - 6, circ = 2 * Math.PI * r, off = circ - (score / 100) * circ;
  const c = score >= 70 ? C.green : score >= 40 ? "#F59E0B" : C.red;
  return <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .8s" }} /><text x={size / 2} y={size / 2 + 2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size * .28} fontWeight="800">{score}</text></svg>;
}

const fmt = n => { if (!n) return "0"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };

export default function Keywords() {
  const toast = useToast(); const pg = useProgress();
  const [keyword, setKeyword] = useState(""); const [niche, setNiche] = useState("");
  const [r, setR] = useState(null); const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const cp = txt => { try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); toast?.success("Copiado!"); } catch {} };

  useEffect(() => { api.history().then(r => setHistory(Array.isArray(r) ? r : [])).catch(() => {}); }, []);

  const search = async () => {
    if (!keyword.trim()) { toast?.error("Keyword obrigatória"); return; }
    setLoading(true); pg?.start("🔍 Pesquisando Keyword", ["Buscando no YouTube", "Calculando volume", "Analisando competição", "Score final"]);
    try { const d = await api.search({ keyword, niche }); pg?.done(); setR(d); api.history().then(r => setHistory(Array.isArray(r) ? r : [])).catch(() => {}); }
    catch (e) { pg?.fail(e.message); } setLoading(false);
  };

  return <div className="page-enter" role="main" aria-label="Keywords" style={{ maxWidth: 1000, margin: "0 auto" }}>
    <Hdr title="Keyword Research" sub="Volume · Competição · Score · Tags — dados reais da YouTube API" />

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 20, alignItems: "end" }}>
      <div><Label t="Keyword *" /><Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Ex: como ganhar dinheiro, dark history..." onKeyDown={e => e.key === "Enter" && search()} /></div>
      <div><Label t="Nicho (opcional)" /><Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Filtra contexto..." /></div>
      <Btn onClick={search} disabled={loading}>{loading ? "⏳" : "🔍 Pesquisar"}</Btn>
    </div>

    {r && <div>
      {/* Score Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, textAlign: "center" }}>
          <Ring score={r.score} size={100} />
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>Score</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: r.score >= 70 ? C.green : r.score >= 40 ? "#F59E0B" : C.red, marginTop: 4, padding: "4px 12px", borderRadius: 6, background: r.score >= 70 ? `${C.green}15` : r.score >= 40 ? "#F59E0B15" : `${C.red}15`, display: "inline-block" }}>{r.opportunity}</div>
        </div>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <ScoreBadge score={r.volumeScore} label="Volume" />
            <ScoreBadge score={100 - r.competition} label="Oportunidade" />
            <div style={{ padding: "10px 6px", background: `${C.blue}08`, borderRadius: 10, border: `1px solid ${C.blue}15`, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{fmt(r.avgViews)}</div><div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>Views médias</div></div>
            <div style={{ padding: "10px 6px", background: `${C.purple}08`, borderRadius: 10, border: `1px solid ${C.purple}15`, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: C.purple }}>{fmt(r.totalResults)}</div><div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>Resultados</div></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: r.volumeScore >= 60 ? `${C.green}12` : `${C.red}12`, color: r.volumeScore >= 60 ? C.green : C.red, fontWeight: 600 }}>Volume: {r.volumeLabel}</span>
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: r.competition <= 40 ? `${C.green}12` : r.competition <= 70 ? "#F59E0B12" : `${C.red}12`, color: r.competition <= 40 ? C.green : r.competition <= 70 ? "#F59E0B" : C.red, fontWeight: 600 }}>Competição: {r.competitionLabel}</span>
          </div>
        </div>
      </div>

      {/* Related Keywords */}
      {r.related?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🔗 Keywords Relacionadas</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {r.related.map((kw, i) => <button key={i} onClick={() => { setKeyword(kw); }} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 12 }}>{kw}</button>)}
        </div>
      </div>}

      {/* Top Tags from results */}
      {r.topTags?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.green}20`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.green }}>🏷️ Tags Mais Usadas (top 10 vídeos)</div>
          <button onClick={() => cp(r.topTags.map(t => t.tag).join(", "))} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 10 }}>📋 Copiar todas</button>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {r.topTags.map((t, i) => <span key={i} onClick={() => cp(t.tag)} style={{ padding: "4px 10px", borderRadius: 6, background: `${C.green}08`, border: `1px solid ${C.green}15`, color: C.green, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.tag} <span style={{ color: C.dim, fontSize: 9 }}>×{t.frequency}</span></span>)}
        </div>
      </div>}

      {/* Top Videos */}
      {r.topVideos?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🏆 Top Vídeos para "{r.keyword}"</div>
        {r.topVideos.map((v, i) => <div key={v.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: i < 3 ? C.red : C.dim, minWidth: 20 }}>{i + 1}</span>
          {v.thumbnail && <img src={v.thumbnail} style={{ width: 90, height: 50, borderRadius: 6, objectFit: "cover" }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div>
            <div style={{ fontSize: 10, color: C.dim }}>{v.channelTitle}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{fmt(v.views)}</div>
            <div style={{ fontSize: 9, color: C.dim }}>{fmt(v.likes)} likes</div>
          </div>
          <button onClick={() => cp(v.tags?.join(", ") || "")} title="Copiar tags" style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 9 }}>🏷️</button>
        </div>)}
      </div>}
    </div>}

    {/* History */}
    {!r && history.length > 0 && <div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📜 Pesquisas Recentes</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
        {history.slice(0, 12).map(h => <button key={h.id} onClick={() => { setKeyword(h.keyword); }} style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, padding: 12, cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{h.keyword}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: h.score >= 70 ? C.green : h.score >= 40 ? "#F59E0B" : C.red }}>Score: {h.score}</span>
            <span style={{ fontSize: 10, color: C.dim }}>{new Date(h.createdAt).toLocaleDateString("pt-BR")}</span>
          </div>
        </button>)}
      </div>
    </div>}
  </div>;
}
