// @ts-nocheck
import { useState, useEffect } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input, Select, Card, SecTitle } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const TIERS = { OURO: { c: "#F59E0B", bg: "#F59E0B15", i: "💎" }, PRATA: { c: "#94A3B8", bg: "#94A3B815", i: "🥈" }, PROMISSOR: { c: "#22C55E", bg: "#22C55E15", i: "⭐" }, INICIANTE: { c: "#6B7280", bg: "#6B728015", i: "🌱" } };
const NICHES = ["Todos","Tecnologia","Finanças","Educação","Saúde","Fitness","Culinária","Games","Música","Arte","Viagem","Humor","Ciência","História","True Crime","Animais","Automotivo","Factory/Processos","DIY","ASMR","Motivação","Dark/Mistério","Kids","Shorts"];

function fmt(n) { if (n >= 1e9) return (n/1e9).toFixed(1)+"B"; if (n >= 1e6) return (n/1e6).toFixed(1)+"M"; if (n >= 1e3) return (n/1e3).toFixed(1)+"K"; return String(n); }

function ChannelCard({ ch, onAnalyze, onSave, saved, analyzing }) {
  const tier = TIERS[ch.tier] || TIERS.INICIANTE;
  return (
    <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {ch.thumbnail ? <img src={ch.thumbnail} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${tier.c}20`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: tier.c }}>{ch.name?.[0]}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.name}</div>
          <div style={{ fontSize: 10, color: C.dim }}>{fmt(ch.subscribers)} inscritos</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: tier.c, background: tier.bg, padding: "3px 8px", borderRadius: 4, letterSpacing: 1 }}>{tier.i} {ch.tier}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, textAlign: "center" }}>
        {[["Views", fmt(ch.totalViews)], ["Vídeos", ch.videoCount], ["Score", ch.score]].map(([l, v]) => (
          <div key={l} style={{ background: "rgba(255,255,255,.03)", borderRadius: 6, padding: "6px 0" }}>
            <div style={{ fontSize: 9, color: C.dim }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: l === "Score" ? tier.c : C.text }}>{v}</div>
          </div>
        ))}
      </div>
      {ch.niche && <div style={{ fontSize: 10, color: C.muted, background: "rgba(255,255,255,.03)", padding: "6px 8px", borderRadius: 6 }}>
        💡 {ch.niche}{ch.subNiche ? ` → ${ch.subNiche}` : ""}{ch.microNiche ? ` → ${ch.microNiche}` : ""}
      </div>}
      {ch.country && ch.country !== "N/A" && <div style={{ fontSize: 10, color: C.dim }}>🌍 {ch.country}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onAnalyze(ch.ytChannelId)} disabled={analyzing} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: `${C.blue}20`, color: C.blue, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
          {analyzing ? "⏳ Analisando..." : "🔍 Analisar"}
        </button>
        <button onClick={() => saved ? null : onSave(ch)} disabled={saved} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: saved ? `${C.green}20` : `rgba(255,255,255,.04)`, color: saved ? C.green : C.muted, cursor: saved ? "default" : "pointer", fontSize: 11, fontWeight: 600 }}>
          {saved ? "✅ Salvo" : "♡ Salvar"}
        </button>
      </div>
    </div>
  );
}

function AnalysisModal({ data, onClose, onSave, saved }) {
  if (!data) return null;
  const tier = TIERS[data.tier] || TIERS.INICIANTE;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 780, background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, padding: 0, maxHeight: "95vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
          {data.thumbnail && <img src={data.thumbnail} style={{ width: 56, height: 56, borderRadius: "50%" }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
              {data.name}
              <span style={{ fontSize: 10, fontWeight: 800, color: tier.c, background: tier.bg, padding: "3px 10px", borderRadius: 4 }}>{tier.i} {data.tier} · {data.score}pts</span>
            </div>
            <div style={{ fontSize: 12, color: C.dim }}>{data.handle} · {fmt(data.subscribers)} inscritos · {data.country}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(255,255,255,.06)", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: "20px 28px", display: "grid", gap: 16 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
            {[["Inscritos", fmt(data.subscribers), C.blue], ["Views Total", fmt(data.totalViews), C.green], ["Vídeos", data.videoCount, C.purple], ["Score", data.score, tier.c], ["Engajamento", data.engRate + "%", C.red]].map(([l, v, c]) => (
              <div key={l} style={{ background: `${c}08`, borderRadius: 10, padding: "12px 8px", textAlign: "center", border: `1px solid ${c}15` }}>
                <div style={{ fontSize: 9, color: C.dim, marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Niche analysis */}
          <div style={{ background: "rgba(255,255,255,.02)", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>🎯 Análise de Nicho</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[["Nicho", data.niche], ["Sub-Nicho", data.subNiche], ["Micro-Nicho", data.microNiche]].map(([l, v]) => (
                <div key={l}><div style={{ fontSize: 9, color: C.dim, marginBottom: 2 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{v || "N/A"}</div></div>
              ))}
            </div>
            {data.contentType && <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: C.blue, fontWeight: 700 }}>Tipo:</span> {data.contentType}</div>}
            {data.growthPotential && <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: C.green, fontWeight: 700 }}>Potencial:</span> {data.growthPotential}</div>}
            {data.competitionLevel && <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: C.red, fontWeight: 700 }}>Competição:</span> {data.competitionLevel}</div>}
            {data.monetization && <div style={{ fontSize: 12 }}><span style={{ color: C.purple, fontWeight: 700 }}>Monetização:</span> {data.monetization}</div>}
          </div>

          {/* Production pattern */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,.02)", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📊 Padrão de Produção</div>
              {[["Uploads/semana", data.uploadsPerWeek || "N/A"], ["Melhor dia", data.bestDay || "N/A"], ["Melhor horário", data.bestHour || "N/A"], ["Duração média", data.avgDuration || "N/A"], ["Views médias", fmt(data.avgViews || 0)], ["Likes médios", fmt(data.avgLikes || 0)]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, color: C.dim }}>{l}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(255,255,255,.02)", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🌍 Modelagem</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: data.modelable ? `${C.green}20` : `${C.red}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{data.modelable ? "✅" : "❌"}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: data.modelable ? C.green : C.red }}>{data.modelable ? "Vale modelar" : "Não recomendado"}</div>
              </div>
              {data.modelableCountries?.length > 0 && <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Países para modelar:</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{data.modelableCountries.map(c => <span key={c} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${C.blue}15`, color: C.blue }}>{c}</span>)}</div>
              </div>}
              {data.recommendation && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, fontStyle: "italic", marginTop: 8, borderLeft: `2px solid ${tier.c}`, paddingLeft: 10 }}>{data.recommendation}</div>}
            </div>
          </div>

          {/* Top videos */}
          {data.topVideos?.length > 0 && <div style={{ background: "rgba(255,255,255,.02)", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🏆 Top Vídeos (por views)</div>
            {data.topVideos.map((v, i) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.dim, width: 20 }}>{i + 1}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div></div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.green, fontFamily: "var(--mono)", minWidth: 60, textAlign: "right" }}>{fmt(v.views)}</span>
                <span style={{ fontSize: 10, color: C.dim }}>{Math.floor(v.durationSecs / 60)}:{String(v.durationSecs % 60).padStart(2, "0")}</span>
              </div>
            ))}
          </div>}

          {/* Save button */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <a href={`https://youtube.com/channel/${data.ytChannelId}`} target="_blank" rel="noopener" style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 12, textDecoration: "none" }}>🔗 Ver no YouTube</a>
            <Btn onClick={() => onSave(data)} disabled={saved} style={{ opacity: saved ? .5 : 1 }}>{saved ? "✅ Já Salvo" : "💾 Salvar Canal"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Research() {
  const toast = useToast();
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [saved, setSaved] = useState([]);
  const [filterNiche, setFilterNiche] = useState("Todos");

  useEffect(() => { researchApi.listSaved().then(setSaved).catch(() => {}); }, []);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try { const d = await researchApi.search(query); setResults(d.channels || []); }
    catch (e) { toast?.error(e.message); }
    setLoading(false);
  };

  const analyze = async (channelId) => {
    setAnalyzing(channelId);
    try { const d = await researchApi.analyze(channelId); setAnalysis(d); }
    catch (e) { toast?.error(e.message); }
    setAnalyzing(null);
  };

  const saveChannel = async (ch) => {
    try { const s = await researchApi.save(ch); setSaved(p => [...p, s]); toast?.success("Canal salvo!"); }
    catch (e) { toast?.error(e.message); }
  };

  const deleteSaved = async (id) => {
    try { await researchApi.deleteSaved(id); setSaved(p => p.filter(s => s.id !== id)); }
    catch (e) { toast?.error(e.message); }
  };

  const isSaved = (ytId) => saved.some(s => s.ytChannelId === ytId);
  const filteredSaved = filterNiche === "Todos" ? saved : saved.filter(s => s.niche?.includes(filterNiche) || s.subNiche?.includes(filterNiche));

  const VIRAL_QUERIES = ["faceless youtube channels viral", "dark channels mystery horror", "factory process satisfying", "AI generated content channels", "cash cow channels 2025", "storytelling channels viral", "shorts channels millions views", "educational animated channels", "true crime documentary channels", "ASMR satisfying channels", "finance investing channels growth", "tech review faceless channels"];

  return (
    <div className="page-enter" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {analysis && <AnalysisModal data={analysis} onClose={() => setAnalysis(null)} onSave={saveChannel} saved={isSaved(analysis.ytChannelId)} />}
      <Hdr title="Inteligência de Mercado" sub="Descubra nichos virais, analise canais e modele estratégias" />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
        {[["search", "🔍 Buscar Canais"], ["viral", "🔥 Nichos Virais"], ["saved", "💾 Salvos (" + saved.length + ")"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "transparent", color: tab === k ? C.red : C.muted, borderBottom: tab === k ? `2px solid ${C.red}` : "2px solid transparent" }}>{l}</button>
        ))}
      </div>

      {/* SEARCH TAB */}
      {tab === "search" && <div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <Input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="Buscar por nicho, canal ou tema... (ex: 'factory process', 'dark channels', 'AI faceless')" style={{ flex: 1 }} />
          <Btn onClick={search} disabled={loading}>{loading ? "⏳ Buscando..." : "🔍 Buscar"}</Btn>
        </div>
        {results.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
          {results.map(ch => <ChannelCard key={ch.ytChannelId} ch={ch} onAnalyze={analyze} onSave={saveChannel} saved={isSaved(ch.ytChannelId)} analyzing={analyzing === ch.ytChannelId} />)}
        </div>}
        {results.length === 0 && !loading && <div style={{ textAlign: "center", padding: 60, color: C.dim }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: .2 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Pesquise nichos e canais</div>
          <div style={{ fontSize: 12, color: C.dim, marginBottom: 20 }}>Busque por nicho, tema ou nome de canal pra descobrir oportunidades</div>
        </div>}
      </div>}

      {/* VIRAL NICHES TAB */}
      {tab === "viral" && <div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Clique num nicho viral pra buscar canais nessa categoria</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
          {VIRAL_QUERIES.map(q => (
            <button key={q} onClick={async () => { setQuery(q); setTab("search"); setLoading(true); try { const d = await researchApi.search(q); setResults(d.channels || []); } catch(e) { toast?.error(e.message); } setLoading(false); }}
              style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.red + "50"} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <span style={{ fontSize: 20 }}>🔥</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.text, textTransform: "capitalize" }}>{q.replace(/channels?|youtube|viral/gi, "").trim()}</div>
                <div style={{ fontSize: 10, color: C.dim }}>Clique para buscar</div>
              </div>
            </button>
          ))}
        </div>
      </div>}

      {/* SAVED TAB */}
      {tab === "saved" && <div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <Select value={filterNiche} onChange={e => setFilterNiche(e.target.value)} style={{ minWidth: 180 }}>
            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
          </Select>
          <span style={{ fontSize: 11, color: C.dim }}>{filteredSaved.length} canais salvos</span>
        </div>
        {filteredSaved.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {filteredSaved.map(ch => {
              const tier = TIERS[ch.tier] || TIERS.INICIANTE;
              let analysis = null; try { analysis = JSON.parse(ch.analysisJson || "{}"); } catch {}
              return (
                <div key={ch.id} style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  {ch.thumbnail ? <img src={ch.thumbnail} style={{ width: 44, height: 44, borderRadius: "50%" }} /> : <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${tier.c}20`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: tier.c }}>{ch.name?.[0]}</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{ch.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, color: tier.c, background: tier.bg, padding: "2px 6px", borderRadius: 3 }}>{tier.i} {ch.tier}</span>
                      {ch.modelable && <span style={{ fontSize: 9, color: C.green, background: `${C.green}15`, padding: "2px 6px", borderRadius: 3 }}>✅ Modelável</span>}
                    </div>
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                      {fmt(ch.subscribers)} subs · {fmt(ch.totalViews)} views · {ch.videoCount} vids · Score {ch.score}
                      {ch.niche ? ` · ${ch.niche}` : ""}
                      {ch.uploadsPerWeek ? ` · ${ch.uploadsPerWeek}/sem` : ""}
                      {ch.avgDuration ? ` · ${ch.avgDuration} avg` : ""}
                    </div>
                  </div>
                  <button onClick={() => { if (analysis?.ytChannelId) setAnalysis(analysis); else analyze(ch.ytChannelId); }} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10 }}>🔍 Ver</button>
                  <a href={`https://youtube.com/channel/${ch.ytChannelId}`} target="_blank" rel="noopener" style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.blue}30`, background: `${C.blue}08`, color: C.blue, cursor: "pointer", fontSize: 10, textDecoration: "none" }}>🔗 Canal</a>
                  <button onClick={() => deleteSaved(ch.id)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: "#EF4444", cursor: "pointer", fontSize: 10 }}>🗑</button>
                </div>
              );
            })}
          </div>
        ) : <div style={{ textAlign: "center", padding: 60, color: C.dim }}><div style={{ fontSize: 48, marginBottom: 12, opacity: .2 }}>💾</div><div style={{ fontSize: 14, fontWeight: 600 }}>Nenhum canal salvo</div></div>}
      </div>}
    </div>
  );
}
