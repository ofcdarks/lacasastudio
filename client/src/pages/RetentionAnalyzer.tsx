// @ts-nocheck
import { useState, useEffect } from "react";
import { sceneApi } from "../lib/api";
import { useApp } from "../context/AppContext";
import { C, Btn, Hdr, Input, Label, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api = {
  analyze: (data) => fetch("/api/competitive/retention-analyze", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` }, body: JSON.stringify(data) }).then(r => r.json()),
};

function RetentionBar({ scenes }) {
  if (!scenes?.length) return null;
  const max = 100;
  return <div style={{ display: "flex", gap: 2, marginBottom: 16, height: 60, alignItems: "end" }}>
    {scenes.map((s, i) => {
      const h = (s.predicted / max) * 100;
      const c = s.risk === "low" ? C.green : s.risk === "medium" ? "#F59E0B" : C.red;
      return <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: c, marginBottom: 2 }}>{s.predicted}%</div>
        <div style={{ width: "100%", height: `${h}%`, background: `${c}30`, borderRadius: "4px 4px 0 0", border: `1px solid ${c}40`, minHeight: 4 }} />
        <div style={{ fontSize: 8, color: C.dim, marginTop: 2 }}>C{i + 1}</div>
      </div>;
    })}
  </div>;
}

export default function RetentionAnalyzer() {
  const toast = useToast(); const pg = useProgress();
  const { videos } = useApp();
  const [videoId, setVideoId] = useState("");
  const [scenes, setScenes] = useState([]);
  const [niche, setNiche] = useState(""); const [title, setTitle] = useState("");
  const [r, setR] = useState(null); const [loading, setLoading] = useState(false);

  const loadScenes = async (vid) => {
    if (!vid) return;
    setVideoId(vid);
    const v = videos.find(v => v.id === Number(vid));
    if (v) setTitle(v.title);
    try { const s = await sceneApi.listByVideo(Number(vid)); setScenes(s); } catch {}
  };

  const analyze = async () => {
    if (!scenes.length) { toast?.error("Selecione um vídeo com cenas"); return; }
    setLoading(true); pg?.start("🎯 Analisando Retenção", ["Mapeando cenas", "Identificando riscos", "Gerando micro-hooks", "Curva de retenção"]);
    try {
      const d = await api.analyze({
        scenes: scenes.map(s => ({ title: s.title, duration: s.duration, notes: s.notes, type: s.type })),
        title, niche, totalDuration: scenes.reduce((a, s) => a + (parseInt(s.duration) || 0), 0) + " min"
      });
      if (d.error) throw new Error(d.error);
      pg?.done(); setR(d);
    } catch (e) { pg?.fail(e.message); } setLoading(false);
  };

  return <div className="page-enter" style={{ maxWidth: 1000, margin: "0 auto" }}>
    <Hdr title="Retention Analyzer" sub="Análise cena-por-cena — identifica onde viewers abandonam e como re-engajar" />

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 20, alignItems: "end" }}>
      <div><Label t="Vídeo (do Planner)" /><Select value={videoId} onChange={e => loadScenes(e.target.value)}>
        <option value="">Selecione um vídeo...</option>
        {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
      </Select></div>
      <div><Label t="Nicho" /><Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="história, dark..." /></div>
      <Btn onClick={analyze} disabled={loading || !scenes.length}>{loading ? "⏳" : `🎯 Analisar ${scenes.length} Cenas`}</Btn>
    </div>

    {scenes.length > 0 && !r && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🎬 {scenes.length} Cenas Carregadas</div>
      {scenes.map((s, i) => <div key={s.id} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: C.dim, minWidth: 20 }}>{i + 1}</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{s.title}</div><div style={{ fontSize: 10, color: C.dim }}>{s.duration || "?"} · {s.type}</div></div>
      </div>)}
    </div>}

    {r && <div>
      {/* Retention Curve */}
      <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📈 Curva de Retenção Estimada</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: r.overallRetention >= 60 ? C.green : r.overallRetention >= 40 ? "#F59E0B" : C.red }}>Retenção média: {r.overallRetention}%</div>
        </div>
        <RetentionBar scenes={r.retentionCurve || []} />
        {r.estimatedAvgViewDuration && <div style={{ fontSize: 12, color: C.blue, fontWeight: 600, textAlign: "center" }}>⏱️ Duração média estimada: {r.estimatedAvgViewDuration} ({r.retentionVsAvg})</div>}
      </div>

      {/* Scene-by-scene with micro-hooks */}
      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        {(r.retentionCurve || []).map((scene, i) => {
          const c = scene.risk === "low" ? C.green : scene.risk === "medium" ? "#F59E0B" : C.red;
          return <div key={i} style={{ display: "flex", gap: 12, padding: 14, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, borderLeft: `4px solid ${c}` }}>
            <div style={{ textAlign: "center", minWidth: 50 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{scene.predicted}%</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: c, textTransform: "uppercase" }}>{scene.risk}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Cena {scene.scene}: {scenes[i]?.title || ""}</div>
              {scene.microHook && <div style={{ fontSize: 12, color: C.green, padding: "4px 8px", borderRadius: 6, background: `${C.green}08`, display: "inline-block" }}>🎣 {scene.microHook}</div>}
            </div>
          </div>;
        })}
      </div>

      {/* Dropoff Points */}
      {r.dropoffPoints?.length > 0 && <div style={{ background: `${C.red}06`, borderRadius: 14, border: `1px solid ${C.red}20`, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.red, marginBottom: 10 }}>⚠️ Pontos de Abandono</div>
        {r.dropoffPoints.map((d, i) => <div key={i} style={{ padding: 10, marginBottom: 6, background: "rgba(255,255,255,.02)", borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Após Cena {d.afterScene}</div>
          <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>❌ {d.reason}</div>
          <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>✅ {d.fix}</div>
        </div>)}
      </div>}

      {/* Hooks */}
      {r.hooks && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.green}20`, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.green, marginBottom: 8 }}>🎣 Hook de Abertura</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{r.hooks.opening}</div>
        </div>
        <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.blue}20`, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.blue, marginBottom: 8 }}>🎬 Teaser de Payoff</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{r.hooks.payoffTeaser}</div>
        </div>
      </div>}

      {r.hooks?.reEngagement?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.purple}20`, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.purple, marginBottom: 8 }}>🔄 Re-engagement Hooks</div>
        {r.hooks.reEngagement.map((h, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>💡 {h}</div>)}
      </div>}

      {r.structureTips?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🧠 Dicas de Estrutura</div>
        {r.structureTips.map((t, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>🔥 {t}</div>)}
      </div>}
    </div>}
  </div>;
}
