// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";
import MagicTabs from "../components/shared/MagicTabs";

const hdr = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` });
const api = {
  status: () => fetch("/api/algorithm/oauth/status", { headers: hdr() }).then(async r => { const t = await r.text(); try { return JSON.parse(t); } catch { throw new Error(r.ok ? "Resposta inválida" : `Erro ${r.status}`); } }),
  url: () => fetch("/api/algorithm/oauth/url", { headers: hdr() }).then(async r => { const t = await r.text(); try { return JSON.parse(t); } catch { throw new Error(r.ok ? "Resposta inválida" : `Erro ${r.status}`); } }),
  channels: () => fetch("/api/algorithm/oauth/channels", { headers: hdr() }).then(r => r.json()),
  delChannel: (id) => fetch(`/api/algorithm/oauth/channel/${id}`, { method: "DELETE", headers: hdr() }).then(r => r.json()),
  overview: (days) => fetch(`/api/algorithm/my-channel/overview?days=${days}`, { headers: hdr() }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
  videos: (days) => fetch(`/api/algorithm/my-channel/videos?days=${days}`, { headers: hdr() }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
  satisfaction: () => fetch("/api/algorithm/satisfaction", { headers: hdr() }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
  devices: () => fetch("/api/algorithm/devices", { headers: hdr() }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
  aiInsights: (d) => fetch("/api/algorithm/ai-insights", { method: "POST", headers: hdr(), body: JSON.stringify(d) }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
};
const fmt = n => { if (!n) return "0"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };

function Ring({ score, size = 80, label }) { const r = size / 2 - 6, circ = 2 * Math.PI * r, off = circ - (score / 100) * circ; const c = score >= 80 ? C.green : score >= 60 ? "#F59E0B" : C.red; return <div style={{ textAlign: "center" }}><svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="5" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .8s" }} /><text x={size / 2} y={size / 2 + 2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size * .28} fontWeight="800">{score}</text></svg>{label && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{label}</div>}</div>; }
function Stat({ label, value, color, sub }) { return <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: "16px 14px", textAlign: "center" }}><div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 800, color: color || C.text }}>{value}</div>{sub && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{sub}</div>}</div>; }

export default function MyAnalytics() {
  const toast = useToast(); const pg = useProgress();
  const [connected, setConnected] = useState(false); const [channels, setChannels] = useState([]);
  const [selChannel, setSelChannel] = useState(null);
  const [tab, setTab] = useState("overview"); const [days, setDays] = useState(28);
  const [overview, setOverview] = useState(null); const [videos, setVideos] = useState([]);
  const [satisfaction, setSatisfaction] = useState(null); const [devices, setDevices] = useState(null);
  const [insights, setInsights] = useState(null); const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.status().then(s => { setConnected(s.connected); setChannels(s.channels || []); if (s.channels?.length) setSelChannel(s.channels[0]); }).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "success") { toast?.success("YouTube conectado!"); window.history.replaceState({}, "", window.location.pathname); }
    if (params.get("oauth") === "error") { toast?.error("Erro OAuth: " + (params.get("reason") || "tente novamente")); window.history.replaceState({}, "", window.location.pathname); }
  }, []);

  const connect = async () => {
    try { const d = await api.url(); if (d.error) { toast?.error(d.error); return; } if (d.url) window.location.href = d.url; else toast?.error("URL não retornada"); }
    catch (e) { toast?.error("Erro: " + (e?.message || "desconhecido")); }
  };

  const loadData = async (t) => {
    setTab(t); setLoading(true);
    pg?.start("📊 Carregando", ["YouTube Analytics", "Processando"]);
    try {
      if (t === "overview" || !overview) {
        const o = await api.overview(days); setOverview(o);
        // Refresh channel list to pick up updated subscribers
        api.status().then(s => { if (s.channels?.length) setChannels(s.channels); }).catch(() => {});
      }
      if (t === "videos" || !videos.length) { const v = await api.videos(days); setVideos(Array.isArray(v.videos) ? v.videos : []); }
      if (t === "satisfaction") { const s = await api.satisfaction(); setSatisfaction(s); }
      if (t === "devices") { const d = await api.devices(); setDevices(d); }
      pg?.done();
    } catch (e) { pg?.fail(e.message); } setLoading(false);
  };

  const loadInsights = async () => {
    if (!overview?.totals) { toast?.error("Carregue os dados primeiro"); return; }
    setInsightsLoading(true);
    pg?.start("🧠 IA Analisando Tudo", ["Lendo métricas reais", "Analisando fontes de tráfego", "Cruzando termos de busca", "Comparando com período anterior", "Gerando plano de guerra"]);
    try {
      const d = await api.aiInsights({
        totals: overview.totals, growth: overview.growth, traffic: overview.traffic,
        devices: overview.devices, countries: overview.countries, searches: overview.searches,
        revenue: overview.revenue, videos: videos.slice(0, 8),
        channelName: selChannel?.channelName, period: days
      });
      if (d.error) throw new Error(d.error);
      pg?.done(); setInsights(d);
    } catch (e) { pg?.fail(e.message); } setInsightsLoading(false);
  };

  const removeChannel = async (id) => {
    await api.delChannel(id);
    setChannels(channels.filter(c => c.id !== id));
    toast?.success("Canal removido");
    if (channels.length <= 1) { setConnected(false); setSelChannel(null); }
  };

  useEffect(() => { if (connected && selChannel) loadData("overview"); }, [connected, selChannel]);

  // ── NOT CONNECTED ──
  if (!connected) return <div className="page-enter" role="main" aria-label="MyAnalytics" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 60 }}>
    <Hdr title="Meus Canais — Dados Reais" sub="Conecte seus canais YouTube para ver métricas reais + IA" />
    <div style={{ fontSize: 48, marginBottom: 20 }}>🔗</div>
    <div style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.7 }}>Conecte via OAuth para puxar dados REAIS: CTR, retenção, satisfaction e mais. A IA analisa os dados e diz EXATAMENTE o que fazer.</div>
    <Btn onClick={connect}>🔗 Conectar Meu Canal YouTube</Btn>
    <div style={{ fontSize: 11, color: C.dim, marginTop: 12 }}>Você pode conectar múltiplos canais</div>
  </div>;

  const t = overview?.totals || {};
  const IMP = { alto: { c: C.red, bg: `${C.red}12` }, medio: { c: "#F59E0B", bg: "#F59E0B12" }, baixo: { c: C.blue, bg: `${C.blue}12` } };

  return <div className="page-enter" role="main" aria-label="MyAnalytics" style={{ maxWidth: 1100, margin: "0 auto" }}>
    {/* ── HEADER + CHANNEL SELECTOR ── */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>📺 {selChannel?.channelName || "Meu Canal"}</h1>
        <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>Dados reais + IA que diz o que fazer</div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {/* Channel selector pills */}
        {channels.map(ch => <button key={ch.id} onClick={() => { setSelChannel(ch); setOverview(null); setInsights(null); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, border: `1px solid ${selChannel?.id === ch.id ? C.red : C.border}`, background: selChannel?.id === ch.id ? `${C.red}12` : "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600, color: selChannel?.id === ch.id ? C.red : C.muted }}>
          {ch.thumbnail && <img src={ch.thumbnail} style={{ width: 18, height: 18, borderRadius: "50%" }} />}
          {ch.channelName?.slice(0, 20)}
        </button>)}
        <Btn onClick={connect} vr="ghost" style={{ fontSize: 11 }}>+ Canal</Btn>
        {/* Period selector */}
        {[7, 28, 90].map(d => <button key={d} onClick={() => { setDays(d); setOverview(null); setInsights(null); }} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${days === d ? C.blue : C.border}`, background: days === d ? `${C.blue}12` : "transparent", color: days === d ? C.blue : C.dim, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{d}d</button>)}
      </div>
    </div>

    <MagicTabs tabs={[{ key: "overview", icon: "📊", label: "Overview", color: C.blue }, { key: "ai", icon: "🧠", label: "IA Coach", color: C.red }, { key: "videos", icon: "🎬", label: "Vídeos", color: C.green }, { key: "satisfaction", icon: "😊", label: "Satisfação", color: C.purple }, { key: "devices", icon: "📱", label: "Devices", color: C.orange }]} active={tab} onChange={k => { if (k === "ai") { setTab(k); if (!insights) loadInsights(); } else loadData(k); }} />

    {/* ── OVERVIEW ── */}
    {tab === "overview" && overview && <div>
      {/* Channel stats bar */}
      {overview.channelInfo?.subscribers > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
        <Stat label="Inscritos" value={fmt(overview.channelInfo.subscribers)} color={C.red} />
        <Stat label="Views Totais" value={fmt(overview.channelInfo.totalViews)} color={C.blue} />
        <Stat label="Vídeos" value={fmt(overview.channelInfo.videoCount)} color={C.purple} />
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 12 }}>
        <Stat label="Views" value={fmt(t.views)} color={C.green} /><Stat label="Watch Time" value={`${fmt(Math.round(t.watchTime))}min`} color={C.blue} /><Stat label="AVD" value={`${Math.round(t.avgDuration)}s`} color={C.purple} /><Stat label="Retenção" value={`${Math.round(t.avgPct)}%`} color={t.avgPct >= 50 ? C.green : C.red} /><Stat label="Satisfaction" value={`${t.satisfaction}%`} color={t.satisfaction >= 90 ? C.green : C.red} /><Stat label="Net Subs" value={`+${fmt(t.netSubs)}`} color={t.netSubs > 0 ? C.green : C.red} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 20 }}>
        <Stat label="Likes" value={fmt(t.likes)} color={C.green} /><Stat label="Comments" value={fmt(t.comments)} color={C.blue} /><Stat label="Shares" value={fmt(t.shares)} color={C.purple} /><Stat label="Engajamento" value={`${t.engagementRate || 0}%`} color={(t.engagementRate || 0) >= 5 ? C.green : C.red} sub="likes+comments+shares/views" /><Stat label="Views/dia" value={fmt(t.viewsPerDay || 0)} color={C.orange} />
      </div>
      {/* Quick AI button */}
      <div style={{ background: `linear-gradient(135deg,${C.red}08,${C.purple}08)`, borderRadius: 16, border: `1px solid ${C.red}20`, padding: 20, marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>🧠 O que a IA recomenda baseado nesses dados?</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>A IA analisa TODAS as métricas, tráfego, devices, termos de busca e receita — e cria plano de guerra</div>
        <Btn onClick={() => { setTab("ai"); if (!insights) loadInsights(); }}>{insightsLoading ? "⏳" : "🧠 Pedir Conselho da IA"}</Btn>
      </div>

      {/* Growth vs previous period */}
      {overview.growth && <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {[["Views", overview.growth.viewsChange], ["Watch Time", overview.growth.watchTimeChange], ["Likes", overview.growth.likesChange], ["Subs", overview.growth.subsChange]].map(([label, val]) =>
          <div key={label} style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${val >= 0 ? C.green : C.red}20`, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: val >= 0 ? C.green : C.red }}>{val > 0 ? "+" : ""}{val}%</div>
            <div style={{ fontSize: 10, color: C.dim }}>{label} vs período anterior</div>
          </div>)}
      </div>}

      {/* Traffic sources + Top searches side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {overview.traffic?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🔀 Fontes de Tráfego</div>
          {overview.traffic.slice(0, 6).map((t, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
            <span style={{ color: C.muted }}>{t.source?.replace("YT_", "").replace("_", " ")}</span>
            <span style={{ fontWeight: 700, color: C.blue }}>{t.pct}%</span>
          </div>)}
        </div>}
        {overview.searches?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🔍 Termos de Busca (viewers reais)</div>
          {overview.searches.slice(0, 8).map((s, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
            <span style={{ color: C.muted }}>"{s.term}"</span>
            <span style={{ fontWeight: 700, color: C.green }}>{fmt(s.views)}</span>
          </div>)}
        </div>}
      </div>

      {/* Revenue if available */}
      {overview.revenue && <div style={{ background: `#F59E0B08`, borderRadius: 14, border: `1px solid #F59E0B20`, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#F59E0B", marginBottom: 10 }}>💰 Receita</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#F59E0B" }}>${overview.revenue.estimated?.toFixed(2)}</div><div style={{ fontSize: 10, color: C.dim }}>Estimada</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>${overview.revenue.cpm?.toFixed(2)}</div><div style={{ fontSize: 10, color: C.dim }}>CPM</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: C.blue }}>{fmt(overview.revenue.monetizedPlaybacks)}</div><div style={{ fontSize: 10, color: C.dim }}>Playbacks</div></div>
        </div>
      </div>}
      {overview.daily?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📈 Views por Dia</div>
        <div style={{ display: "flex", gap: 2, height: 100, alignItems: "flex-end" }}>
          {overview.daily.map((d, i) => { const max = Math.max(...overview.daily.map(x => x.views)) || 1; const pct = Math.max((d.views / max) * 100, 3); return <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}><div title={`${d.views} views`} style={{ width: "100%", background: `linear-gradient(to top, ${C.green}60, ${C.green}20)`, borderRadius: "3px 3px 0 0", minHeight: 3, height: pct + "%" }} /><div style={{ fontSize: 7, color: C.dim, marginTop: 2, whiteSpace: "nowrap" }}>{d.date?.slice(8)}</div></div>; })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 9, color: C.dim }}>{overview.daily[0]?.date?.slice(5)}</span>
          <span style={{ fontSize: 9, color: C.dim }}>{overview.daily[overview.daily.length-1]?.date?.slice(5)}</span>
        </div>
      </div>}
    </div>}

    {/* ── AI COACH ── */}
    {tab === "ai" && <div>
      {!insights && !insightsLoading && <div style={{ textAlign: "center", padding: 40 }}>
        <Btn onClick={loadInsights}>🧠 Analisar Meus Dados com IA</Btn>
      </div>}
      {insights && <div>
        {/* Health Score */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 20 }}>
          <Ring score={insights.healthScore || 0} size={110} label="Saúde" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: (insights.healthScore || 0) >= 70 ? C.green : C.red }}>{insights.healthLabel}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.7 }}>{insights.diagnosis}</div>
          </div>
        </div>

        {/* Urgent Actions */}
        {insights.urgentActions?.length > 0 && <div style={{ background: `${C.red}06`, borderRadius: 14, border: `1px solid ${C.red}20`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.red, marginBottom: 12 }}>🚨 Ações Urgentes — Faça AGORA</div>
          {insights.urgentActions.map((a, i) => { const imp = IMP[a.impact] || IMP.medio; return <div key={i} style={{ padding: 14, marginBottom: 8, background: "rgba(255,255,255,.02)", border: `1px solid ${C.border}`, borderLeft: `4px solid ${imp.c}`, borderRadius: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>🎯 {a.action}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: imp.c, background: imp.bg, padding: "3px 10px", borderRadius: 6 }}>{a.impact} impacto</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>📋 {a.why}</div>
            {a.steps && <div style={{ fontSize: 11, color: C.text, marginTop: 6, padding: "6px 10px", background: "rgba(255,255,255,.03)", borderRadius: 6, lineHeight: 1.7 }}>📌 {a.steps}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11 }}>
              <span style={{ color: C.blue }}>📊 {a.metric}</span>
              {a.tool && <span style={{ color: C.green }}>🔧 {a.tool}</span>}
            </div>
          </div>; })}
        </div>}

        {/* Weekly Plan */}
        {insights.weeklyPlan?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.green}20`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.green, marginBottom: 12 }}>📅 Plano da Semana — Dia por Dia</div>
          <div style={{ display: "grid", gap: 6 }}>
            {insights.weeklyPlan.map((d, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1fr 50px 130px", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,.02)", border: `1px solid ${C.border}`, alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: C.green }}>{d.day}</span>
              <div><div style={{ fontSize: 12, color: C.text }}>{d.task}</div>{d.why && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{d.why}</div>}</div>
              <span style={{ fontSize: 10, color: C.dim }}>{d.time}</span>
              <span style={{ fontSize: 10, color: C.blue, fontWeight: 600 }}>🔧 {d.tool}</span>
            </div>)}
          </div>
        </div>}

        {/* Content Strategy */}
        {insights.contentStrategy && <div style={{ background: `${C.blue}06`, borderRadius: 14, border: `1px solid ${C.blue}20`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.blue, marginBottom: 8 }}>🎬 Estratégia de Conteúdo</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{insights.contentStrategy}</div>
        </div>}

        {/* Next Video */}
        {insights.nextVideo && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.purple}20`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.purple, marginBottom: 10 }}>🎯 Próximo Vídeo Recomendado</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>"{insights.nextVideo.titleIdea}"</div>
          {insights.nextVideo.whyThisTitle && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>{insights.nextVideo.whyThisTitle}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.blue}12`, color: C.blue }}>⏱️ {insights.nextVideo.optimalDuration}</span>
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.green}12`, color: C.green }}>📅 {insights.nextVideo.bestDay} {insights.nextVideo.bestHour}</span>
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.purple}12`, color: C.purple }}>🎬 {insights.nextVideo.format}</span>
          </div>
          {insights.nextVideo.hook && <div style={{ fontSize: 12, color: C.red, marginBottom: 6 }}>🎣 Hook: "{insights.nextVideo.hook}"</div>}
          {insights.nextVideo.seoKeywords?.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>{insights.nextVideo.seoKeywords.map((k, i) => <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${C.green}12`, color: C.green }}>{k}</span>)}</div>}
          {insights.nextVideo.thumbnailTip && <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>🖼️ Thumb: {insights.nextVideo.thumbnailTip}</div>}
        </div>}

        {/* Algorithm Tips */}
        {insights.algorithmSecrets?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>🧠 Segredos do Algoritmo (seus concorrentes NÃO sabem)</div>
          {insights.algorithmSecrets.map((t, i) => <div key={i} style={{ fontSize: 13, color: C.muted, padding: "8px 0", borderBottom: `1px solid ${C.border}`, lineHeight: 1.7 }}>🔥 {t}</div>)}
        </div>}

        {/* Traffic Insights */}
        {insights.trafficInsights && <div style={{ background: `${C.blue}06`, borderRadius: 14, border: `1px solid ${C.blue}20`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.blue, marginBottom: 8 }}>🔀 Análise de Tráfego</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{insights.trafficInsights}</div>
        </div>}

        {/* Search Term Gold */}
        {insights.searchTermGold?.length > 0 && <div style={{ background: `#F59E0B08`, borderRadius: 14, border: `1px solid #F59E0B20`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#F59E0B", marginBottom: 10 }}>🔑 Termos de Busca OURO (viewers reais buscam isso)</div>
          {insights.searchTermGold.map((s, i) => <div key={i} style={{ padding: 12, marginBottom: 6, background: "rgba(255,255,255,.02)", borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>"{s.term}"</span>
              <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{s.views} views</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>💡 {s.opportunity}</div>
            <div style={{ fontSize: 11, color: C.blue, marginTop: 4 }}>🔧 {s.action}</div>
          </div>)}
        </div>}

        {/* Device Strategy */}
        {insights.deviceStrategy && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.purple}20`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.purple, marginBottom: 8 }}>📱 Estratégia por Dispositivo</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{insights.deviceStrategy}</div>
        </div>}

        {/* Shorts Strategy */}
        {insights.shortsStrategy && <div style={{ background: `${C.orange}06`, borderRadius: 14, border: `1px solid ${C.orange}20`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.orange, marginBottom: 8 }}>📱 Estratégia de Shorts (200B views/dia)</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{insights.shortsStrategy}</div>
        </div>}

        {/* Competitive Edge */}
        {insights.competitiveEdge && <div style={{ background: `linear-gradient(135deg,${C.red}06,${C.purple}06)`, borderRadius: 14, border: `1px solid ${C.red}20`, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.red, marginBottom: 8 }}>⚔️ Sua Vantagem Competitiva</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{insights.competitiveEdge}</div>
        </div>}

        {/* Warnings */}
        {insights.warnings?.length > 0 && <div style={{ background: `${C.red}06`, borderRadius: 12, border: `1px solid ${C.red}20`, padding: 14, marginBottom: 20 }}>
          {insights.warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: C.red, padding: "4px 0" }}>⚠️ {w}</div>)}
        </div>}

        {/* Growth + Monetization */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {insights.growth30d && <div style={{ background: `${C.green}06`, borderRadius: 12, border: `1px solid ${C.green}20`, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.green, marginBottom: 4 }}>📈 Previsão 30 dias</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{insights.growth30d}</div>
          </div>}
          {insights.monetization && <div style={{ background: `#F59E0B08`, borderRadius: 12, border: `1px solid #F59E0B20`, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#F59E0B", marginBottom: 4 }}>💰 Monetização</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{insights.monetization}</div>
          </div>}
        </div>

        <Btn onClick={loadInsights} vr="ghost" disabled={insightsLoading}>{insightsLoading ? "⏳" : "🔄 Atualizar Análise da IA"}</Btn>
      </div>}
    </div>}

    {/* ── VIDEOS ── */}
    {tab === "videos" && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🎬 Performance por Vídeo</div>
      {videos.map((v, i) => <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.dim, minWidth: 20 }}>{i + 1}</span>
        {v.thumbnail && <img src={v.thumbnail} style={{ width: 80, height: 45, borderRadius: 6, objectFit: "cover" }} />}
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div><div style={{ fontSize: 10, color: C.dim }}>{fmt(v.views)} views · {Math.round(v.avgPct)}% ret</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, textAlign: "center", fontSize: 10 }}>
          <div><div style={{ fontWeight: 700, color: C.green }}>{fmt(v.views)}</div><div style={{ color: C.dim }}>views</div></div>
          <div><div style={{ fontWeight: 700, color: C.blue }}>{Math.round(v.avgDuration)}s</div><div style={{ color: C.dim }}>AVD</div></div>
          <div><div style={{ fontWeight: 700, color: C.purple }}>{Math.round(v.avgPct)}%</div><div style={{ color: C.dim }}>ret</div></div>
          <div><div style={{ fontWeight: 700, color: C.orange }}>+{v.subsGained}</div><div style={{ color: C.dim }}>subs</div></div>
        </div>
      </div>)}
    </div>}

    {/* ── SATISFACTION ── */}
    {tab === "satisfaction" && satisfaction && <div>
      <div style={{ display: "flex", gap: 20, alignItems: "center", background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
        <Ring score={satisfaction.overall} size={110} label="Satisfaction" />
        <div><div style={{ fontSize: 20, fontWeight: 800, color: satisfaction.overall >= 90 ? C.green : C.red }}>Satisfaction Score: {satisfaction.overall}%</div><div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Tendência: {satisfaction.trend === "up" ? "📈 Subindo" : "📉 Caindo"}</div><div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Em 2026, satisfaction é o fator #1 de ranking</div></div>
      </div>
      <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ display: "flex", gap: 2, height: 60, alignItems: "end" }}>
          {(satisfaction.daily || []).slice(-30).map((d, i) => <div key={i} style={{ flex: 1, background: d.satisfaction >= 90 ? `${C.green}40` : d.satisfaction >= 70 ? `#F59E0B40` : `${C.red}40`, height: `${d.satisfaction}%`, borderRadius: "2px 2px 0 0", minHeight: 2 }} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.dim, marginTop: 4 }}><span>30 dias</span><span>Hoje</span></div>
      </div>
    </div>}

    {/* ── DEVICES ── */}
    {tab === "devices" && devices && <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 16 }}>
        {(devices.devices || []).map((d, i) => <div key={i} style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>{d.device === "MOBILE" ? "📱" : d.device === "DESKTOP" ? "💻" : d.device === "TV" ? "📺" : "📟"}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{d.pct}%</div>
          <div style={{ fontSize: 11, color: C.dim }}>{d.device}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{fmt(d.views)} views · AVD {d.avgDuration}s</div>
        </div>)}
      </div>
      {devices.recommendations?.map((r, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>💡 {r}</div>)}
    </div>}

    {/* ── CHANNEL MANAGEMENT ── */}
    {channels.length > 0 && <div style={{ marginTop: 32, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 10 }}>CANAIS CONECTADOS ({channels.length})</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {channels.map(ch => <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: C.bgCard, border: `1px solid ${C.border}` }}>
          {ch.thumbnail && <img src={ch.thumbnail} style={{ width: 24, height: 24, borderRadius: "50%" }} />}
          <div><div style={{ fontSize: 12, fontWeight: 600 }}>{ch.channelName}</div><div style={{ fontSize: 10, color: C.dim }}>{Number(ch.subscribers) > 0 ? fmt(Number(ch.subscribers)) + " subs" : "Conectado"}</div></div>
          <button onClick={() => removeChannel(ch.id)} style={{ padding: "2px 6px", borderRadius: 4, border: `1px solid ${C.red}30`, background: "transparent", color: C.red, cursor: "pointer", fontSize: 10 }}>✕</button>
        </div>)}
        <Btn onClick={connect} vr="ghost" style={{ fontSize: 11 }}>+ Adicionar Canal</Btn>
      </div>
    </div>}
  </div>;
}
