// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const hdr=()=>({"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`});
const api = {
  generate: (countries) => fetch("/api/competitive/daily-ideas/generate", { method: "POST", headers: hdr(), body: JSON.stringify({ countries }) }).then(r => r.json()),
  list: () => fetch("/api/competitive/daily-ideas", { headers: hdr() }).then(r => r.json()),
  use: (id) => fetch(`/api/competitive/daily-ideas/${id}/use`, { method: "PUT", headers: hdr() }).then(r => r.json()),
};
const fmt=n=>{if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);};
const cp=txt=>{try{navigator.clipboard.writeText(txt)}catch{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}};

const POT = { very_high: { c: "#E53935", bg: "#E5393512", l: "Explosivo", icon: "🔥", score: 95 }, high: { c: C.green, bg: `${C.green}12`, l: "Alto", icon: "🚀", score: 80 }, medium: { c: "#F59E0B", bg: "#F59E0B12", l: "Médio", icon: "📊", score: 60 }, low: { c: C.dim, bg: "rgba(255,255,255,.06)", l: "Baixo", icon: "📉", score: 35 } };
const CAT = { trending_surf: { c: "#E53935", l: "Surfar Trend", icon: "🌊" }, niche_deep: { c: C.blue, l: "Nicho Profundo", icon: "🎯" }, cross_niche: { c: C.purple, l: "Cross-Nicho", icon: "🔄" }, shorts: { c: C.orange, l: "Shorts", icon: "📱" }, evergreen: { c: C.green, l: "Evergreen", icon: "🌲" } };
const URGENCY = { "AGORA": { c: "#E53935", bg: "#E5393515" }, "esta semana": { c: "#F59E0B", bg: "#F59E0B15" }, "qualquer momento": { c: C.dim, bg: "rgba(255,255,255,.04)" } };
const FLAGS = { BR: "🇧🇷", US: "🇺🇸", MX: "🇲🇽", PT: "🇵🇹", ES: "🇪🇸", global: "🌍" };
const ALL_COUNTRIES = [["BR","🇧🇷 Brasil"],["US","🇺🇸 EUA"],["MX","🇲🇽 México"],["ES","🇪🇸 Espanha"],["PT","🇵🇹 Portugal"],["AR","🇦🇷 Argentina"],["CO","🇨🇴 Colômbia"],["GB","🇬🇧 UK"],["FR","🇫🇷 França"],["DE","🇩🇪 Alemanha"]];

function Ring({score,size=44}){const r=size/2-4,circ=2*Math.PI*r,off=circ-(score/100)*circ;const c=score>=80?C.green:score>=60?"#F59E0B":"#E53935";return<svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="3"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/><text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={11} fontWeight="800">{score}</text></svg>;}

export default function DailyIdeas() {
  const toast = useToast(); const pg = useProgress();
  const [ideas, setIdeas] = useState([]); const [freshIdeas, setFreshIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [extraCountries, setExtraCountries] = useState([]);
  const [showCountries, setShowCountries] = useState(false);
  const [filter, setFilter] = useState("all"); // all, trending_surf, niche_deep, shorts, etc

  useEffect(() => { api.list().then(r => setIdeas(Array.isArray(r) ? r : [])).catch(() => {}); }, []);

  const generate = async () => {
    setLoading(true);
    pg?.start("💡 Gerando Ideias", ["Trends por país", "Vídeos do nicho", "IA criando ideias", "Score viral", "Ranqueando"]);
    try {
      const d = await api.generate(extraCountries);
      if (d.error) throw new Error(d.error);
      pg?.done();
      setContext({ niches: d.niches, countries: d.countries, trending: d.trendingByCountry, nicheVids: d.nicheVideos });
      setFreshIdeas(Array.isArray(d.ideas) ? d.ideas : d.ideas?.ideas || []);
      api.list().then(r => setIdeas(Array.isArray(r) ? r : [])).catch(() => {});
    } catch (e) { pg?.fail(e.message); } setLoading(false);
  };

  const markUsed = async (id) => {
    await api.use(id);
    setIdeas(ideas.map(i => i.id === id ? { ...i, used: true } : i));
    toast?.success("Marcado!");
  };

  const displayIdeas = freshIdeas.length ? freshIdeas : [];
  const filtered = filter === "all" ? displayIdeas : displayIdeas.filter(i => i.category === filter);
  const todayDB = ideas.filter(i => new Date(i.createdAt).toDateString() === new Date().toDateString());
  const pastIdeas = ideas.filter(i => new Date(i.createdAt).toDateString() !== new Date().toDateString());

  return <div className="page-enter" role="main" aria-label="DailyIdeas" style={{ maxWidth: 1100, margin: "0 auto" }}>
    <Hdr title="Ideias do Dia" sub="Ideias baseadas em trends reais por país + nicho dos seus canais OAuth" />

    {/* Controls */}
    <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
      <Btn onClick={generate} disabled={loading}>{loading ? "⏳" : "💡 Gerar Ideias de Hoje"}</Btn>
      <button onClick={() => setShowCountries(!showCountries)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 12 }}>🌍 Países {extraCountries.length > 0 && `(+${extraCountries.length})`}</button>
      {freshIdeas.length > 0 && <span style={{ fontSize: 11, color: C.dim }}>{freshIdeas.length} ideias · {context?.countries?.length || 1} países</span>}
    </div>

    {/* Country selector */}
    {showCountries && <div style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, marginBottom: 8 }}>Adicionar países (trends de cada país)</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ALL_COUNTRIES.map(([code, label]) => <button key={code} onClick={() => setExtraCountries(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])}
          style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${extraCountries.includes(code) ? C.blue : C.border}`, background: extraCountries.includes(code) ? `${C.blue}12` : "transparent", color: extraCountries.includes(code) ? C.blue : C.muted, cursor: "pointer", fontSize: 11 }}>{label}</button>)}
      </div>
    </div>}

    {/* Context badges */}
    {context && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
      {context.niches?.map((n, i) => <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.blue}12`, color: C.blue }}>🎯 {n}</span>)}
      {context.countries?.map((c, i) => <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.green}12`, color: C.green }}>{FLAGS[c] || "🌍"} {c}</span>)}
    </div>}

    {/* Category filter */}
    {freshIdeas.length > 0 && <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto" }}>
      <button onClick={() => setFilter("all")} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${filter === "all" ? C.blue : C.border}`, background: filter === "all" ? `${C.blue}12` : "transparent", color: filter === "all" ? C.blue : C.dim, cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>Todas ({displayIdeas.length})</button>
      {Object.entries(CAT).map(([key, cat]) => {
        const count = displayIdeas.filter(i => i.category === key).length;
        if (!count) return null;
        return <button key={key} onClick={() => setFilter(key)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${filter === key ? cat.c : C.border}`, background: filter === key ? `${cat.c}12` : "transparent", color: filter === key ? cat.c : C.dim, cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{cat.icon} {cat.l} ({count})</button>;
      })}
    </div>}

    {/* Ideas cards */}
    {filtered.length > 0 && <div style={{ display: "grid", gap: 12, marginBottom: 28 }}>
      {filtered.map((idea, idx) => {
        const p = POT[idea.potential] || POT.medium;
        const cat = CAT[idea.category] || CAT.niche_deep;
        const urg = URGENCY[idea.urgency] || URGENCY["qualquer momento"];
        return <div key={idx} style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, borderLeft: `4px solid ${p.c}`, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
          {/* Header row */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
            <Ring score={idea.viralScore || p.score} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.4, marginBottom: 4 }}>{idea.title}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: cat.c, background: `${cat.c}12`, padding: "2px 8px", borderRadius: 4 }}>{cat.icon} {cat.l}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: urg.c, background: urg.bg, padding: "2px 8px", borderRadius: 4 }}>{idea.urgency || "?"}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: p.c, background: p.bg, padding: "2px 8px", borderRadius: 4 }}>{p.icon} {p.l}</span>
                {idea.country && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,.04)", color: C.dim }}>{FLAGS[idea.country] || "🌍"} {idea.country}</span>}
                {idea.bestFormat && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: `${C.purple}10`, color: C.purple }}>{idea.bestFormat === "short" ? "📱" : idea.bestFormat === "both" ? "📱+🎬" : "🎬"} {idea.bestFormat}</span>}
                {idea.estimatedViews && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: `${C.green}10`, color: C.green }}>👁️ {idea.estimatedViews}</span>}
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, marginBottom: 10, padding: "10px 14px", background: "rgba(255,255,255,.02)", borderRadius: 10 }}>{idea.reasoning}</div>

          {/* Competitor gap */}
          {idea.competitorGap && <div style={{ fontSize: 12, color: "#E53935", lineHeight: 1.6, marginBottom: 10, padding: "8px 14px", background: "#E5393508", borderRadius: 10, border: "1px solid #E5393512" }}>⚔️ {idea.competitorGap}</div>}

          {/* Hook */}
          {idea.hookIdea && <div style={{ fontSize: 12, color: C.blue, marginBottom: 8 }}>🎣 Hook: "{idea.hookIdea}"</div>}

          {/* Thumbnail */}
          {idea.thumbnailIdea && <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>🖼️ Thumb: {idea.thumbnailIdea}</div>}

          {/* Tags + SEO Keywords */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            {(idea.tags || "").split(",").filter(Boolean).map((t, i) => <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${C.purple}10`, color: C.purple, cursor: "pointer" }} onClick={() => { cp(t.trim()); toast?.success("Tag copiada"); }}>{t.trim()}</span>)}
            {idea.seoKeywords?.map((k, i) => <span key={`seo-${i}`} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${C.green}10`, color: C.green, cursor: "pointer" }} onClick={() => { cp(k); toast?.success("Keyword copiada"); }}>🔑 {k}</span>)}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { cp(idea.title); toast?.success("Título copiado!"); }} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 11 }}>📋 Copiar título</button>
            {idea.hookIdea && <button onClick={() => { cp(idea.hookIdea); toast?.success("Hook copiado!"); }} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.blue}30`, background: `${C.blue}08`, color: C.blue, cursor: "pointer", fontSize: 11 }}>🎣 Copiar hook</button>}
            <button onClick={() => { cp(`Título: ${idea.title}\nHook: ${idea.hookIdea || ""}\nTags: ${idea.tags}\nKeywords: ${(idea.seoKeywords || []).join(", ")}\nThumb: ${idea.thumbnailIdea || ""}`); toast?.success("Tudo copiado!"); }} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.green}30`, background: `${C.green}08`, color: C.green, cursor: "pointer", fontSize: 11 }}>📦 Copiar tudo</button>
          </div>
        </div>;
      })}
    </div>}

    {/* Trending by country (context) */}
    {context?.trending?.length > 0 && <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🔥 Trending por País</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(context.trending.length, 3)}, 1fr)`, gap: 10 }}>
        {context.trending.map((t, i) => <div key={i} style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{FLAGS[t.country] || "🌍"} {t.country}</div>
          {t.videos?.slice(0, 5).map((v, j) => <div key={j} style={{ fontSize: 11, color: C.muted, padding: "3px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{v.title}</span>
            <span style={{ fontWeight: 700, color: C.green, flexShrink: 0 }}>{fmt(v.views)}</span>
          </div>)}
        </div>)}
      </div>
    </div>}

    {/* Niche videos */}
    {context?.nicheVids?.length > 0 && <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🎯 Vídeos Recentes nos Seus Nichos</div>
      {context.nicheVids.map((n, i) => <div key={i} style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 4 }}>{n.niche}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {n.videos?.slice(0, 5).map((v, j) => <div key={j} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.03)", border: `1px solid ${C.border}`, color: C.muted }}>{v.title?.slice(0, 50)} <span style={{ color: C.dim }}>• {v.channel}</span></div>)}
        </div>
      </div>)}
    </div>}

    {/* DB past ideas */}
    {pastIdeas.length > 0 && <div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.dim }}>📜 Ideias Anteriores</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 8 }}>
        {pastIdeas.slice(0, 20).map(idea => {
          const p = POT[idea.potential] || POT.medium;
          return <div key={idea.id} onClick={() => { cp(idea.title); toast?.success("Copiado!"); }} style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, padding: 12, cursor: "pointer", opacity: idea.used ? 0.5 : 0.8 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{idea.title}</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: p.c }}>{p.icon} {p.l}</span>
              <span style={{ fontSize: 9, color: C.dim }}>{new Date(idea.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>;
        })}
      </div>
    </div>}

    {!ideas.length && !freshIdeas.length && <div style={{ textAlign: "center", padding: 40, color: C.dim }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>💡</div>
      <div style={{ fontSize: 14 }}>Clique "Gerar Ideias de Hoje" para 10 ideias personalizadas</div>
      <div style={{ fontSize: 11, marginTop: 6 }}>Baseadas nos canais OAuth + trends de múltiplos países</div>
    </div>}
  </div>;
}
