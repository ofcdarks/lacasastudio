// @ts-nocheck
import { useState, useEffect } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api = {
  compare: (data) => fetch("/api/competitive/compare", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` }, body: JSON.stringify(data) }).then(r => r.json()),
};
const fmt = n => { if (!n) return "0"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };
const COLORS = [C.red, C.blue, C.green, C.purple];

function RadarChart({ data, size = 300 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const axes = ["subscribers", "avgViews", "engagement", "frequency", "totalViews", "catalog"];
  const labels = ["Subs", "Views/vídeo", "Engajamento", "Frequência", "Views total", "Catálogo"];
  const n = axes.length;

  const getPoint = (axis, value, radius) => {
    const angle = (Math.PI * 2 * axis) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius * (value / 100), y: cy + Math.sin(angle) * radius * (value / 100) };
  };

  return <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
    {/* Grid circles */}
    {[20, 40, 60, 80, 100].map(v => <polygon key={v} points={axes.map((_, i) => { const p = getPoint(i, v, r); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />)}
    {/* Axis lines */}
    {axes.map((_, i) => { const p = getPoint(i, 100, r); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,.08)" strokeWidth="0.5" />; })}
    {/* Labels */}
    {axes.map((_, i) => { const p = getPoint(i, 115, r); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,.4)" fontSize="10">{labels[i]}</text>; })}
    {/* Data polygons */}
    {data.map((d, di) => <polygon key={di} points={axes.map((ax, i) => { const p = getPoint(i, d[ax] || 0, r); return `${p.x},${p.y}`; }).join(" ")} fill={`${COLORS[di]}20`} stroke={COLORS[di]} strokeWidth="2" />)}
    {/* Data dots */}
    {data.map((d, di) => axes.map((ax, i) => { const p = getPoint(i, d[ax] || 0, r); return <circle key={`${di}-${i}`} cx={p.x} cy={p.y} r="3" fill={COLORS[di]} />; }))}
  </svg>;
}

export default function Compare() {
  const toast = useToast(); const pg = useProgress();
  const [saved, setSaved] = useState([]);
  const [selected, setSelected] = useState([]);
  const [r, setR] = useState(null); const [loading, setLoading] = useState(false);

  useEffect(() => { researchApi.listSaved().then(r=>setSaved(Array.isArray(r)?r:[])).catch(() => {}); }, []);

  const toggle = (ch) => {
    if (selected.find(s => s.ytChannelId === ch.ytChannelId)) setSelected(selected.filter(s => s.ytChannelId !== ch.ytChannelId));
    else if (selected.length < 4) setSelected([...selected, ch]);
    else toast?.error("Máximo 4 canais");
  };

  const compare = async () => {
    if (selected.length < 2) { toast?.error("Selecione pelo menos 2 canais"); return; }
    setLoading(true); pg?.start("📊 Comparando Canais", selected.map(s => s.name));
    try { const d = await api.compare({ channelIds: selected.map(s => s.ytChannelId) }); if (d.error) throw new Error(d.error); pg?.done(); setR(d); }
    catch (e) { pg?.fail(e.message); } setLoading(false);
  };

  return <div className="page-enter" role="main" aria-label="Compare" style={{ maxWidth: 1000, margin: "0 auto" }}>
    <Hdr title="Comparador Head-to-Head" sub="Compare até 4 canais lado a lado com dados reais" />

    {/* Channel Selector */}
    <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Selecione 2-4 canais salvos ({selected.length}/4)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 6 }}>
        {saved.map(ch => {
          const sel = selected.find(s => s.ytChannelId === ch.ytChannelId);
          return <button key={ch.id} onClick={() => toggle(ch)} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 10, border: `1px solid ${sel ? C.red : C.border}`, background: sel ? `${C.red}12` : "transparent", cursor: "pointer", textAlign: "left" }}>
            {ch.thumbnail ? <img src={ch.thumbnail} style={{ width: 24, height: 24, borderRadius: "50%" }} /> : <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${C.red}20` }} />}
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: sel ? C.red : C.text }}>{ch.name}</div><div style={{ fontSize: 9, color: C.dim }}>{fmt(ch.subscribers)} subs</div></div>
            {sel && <span style={{ fontSize: 12, color: C.red }}>✓</span>}
          </button>;
        })}
      </div>
      <div style={{ marginTop: 12 }}><Btn onClick={compare} disabled={loading || selected.length < 2}>{loading ? "⏳" : `📊 Comparar ${selected.length} Canais`}</Btn></div>
    </div>

    {r && <div>
      {/* Radar Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20 }}>
          <RadarChart data={r.radarData || []} />
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10 }}>
            {r.channels?.map((ch, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i] }} />{ch.name}</span>)}
          </div>
        </div>

        {/* Metrics Table */}
        <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📊 Métricas</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ textAlign: "left", padding: 6, color: C.dim, fontWeight: 600 }}>Métrica</th>
              {r.channels?.map((ch, i) => <th key={i} style={{ textAlign: "right", padding: 6, color: COLORS[i], fontWeight: 700, fontSize: 11 }}>{ch.name?.slice(0, 15)}</th>)}
            </tr></thead>
            <tbody>
              {[["Inscritos", "subscribers"], ["Views total", "totalViews"], ["Vídeos", "videoCount"], ["Views/vídeo", "avgViews"], ["Engajamento %", "engagementRate"], ["Views/sub", "viewsPerSub"]].map(([l, k]) => <tr key={k} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: 6, color: C.muted }}>{l}</td>
                {r.channels?.map((ch, i) => {
                  const vals = r.channels.map(c => c[k]);
                  const isMax = ch[k] === Math.max(...vals);
                  return <td key={i} style={{ textAlign: "right", padding: 6, fontWeight: isMax ? 700 : 400, color: isMax ? C.green : C.text }}>{k.includes("Rate") || k.includes("Per") ? ch[k] : fmt(ch[k])}{isMax && " 🏆"}</td>;
                })}
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insight */}
      {r.insight && <div style={{ background: `linear-gradient(135deg,${C.red}06,${C.blue}06)`, borderRadius: 14, border: `1px solid ${C.red}20`, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🧠 Análise Comparativa IA</div>
        {r.insight.winner && <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 8 }}>🏆 Destaque: {r.insight.winner} — {r.insight.reason}</div>}
        {r.insight.insights?.map((ins, i) => <div key={i} style={{ padding: 12, marginBottom: 8, background: "rgba(255,255,255,.02)", borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS[i] || C.text }}>{ins.channel}</div>
          <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>💪 {ins.strength}</div>
          <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>⚠️ {ins.weakness}</div>
          <div style={{ fontSize: 11, color: C.blue, marginTop: 2 }}>💡 {ins.tip}</div>
        </div>)}
        {r.insight.conclusion && <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginTop: 8, padding: 10, borderTop: `1px solid ${C.border}` }}>{r.insight.conclusion}</div>}
      </div>}
    </div>}

    {!saved.length && <div style={{ textAlign: "center", padding: 40, color: C.dim }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 14 }}>Salve canais na Pesquisa de Mercado primeiro</div>
    </div>}
  </div>;
}
