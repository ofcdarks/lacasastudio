// @ts-nocheck
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { scriptApi, sceneApi } from "../lib/api";
import { C, Btn, Hdr, Input, Label, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api = {
  clip: (data) => fetch("/api/competitive/shorts-clip", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` }, body: JSON.stringify(data) }).then(r => r.json()),
};

export default function ShortsClipper() {
  const toast = useToast(); const pg = useProgress();
  const { videos } = useApp();
  const [videoId, setVideoId] = useState("");
  const [title, setTitle] = useState(""); const [niche, setNiche] = useState("");
  const [manualScript, setManualScript] = useState("");
  const [r, setR] = useState(null); const [loading, setLoading] = useState(false);
  const cp = txt => { try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); toast?.success("Copiado!"); } catch {} };

  const loadVideo = async (vid) => {
    setVideoId(vid);
    const v = videos.find(v => v.id === Number(vid));
    if (v) setTitle(v.title);
    try {
      const scripts = await scriptApi.listByVideo(Number(vid));
      if (scripts.length) setManualScript(scripts[0].content);
      else {
        const scenes = await sceneApi.listByVideo(Number(vid));
        if (scenes.length) setManualScript(scenes.map(s => `[${s.title}] ${s.notes || ""}`).join("\n"));
      }
    } catch {}
  };

  const clip = async () => {
    if (!manualScript.trim() && !videoId) { toast?.error("Selecione um vídeo ou cole um roteiro"); return; }
    setLoading(true); pg?.start("✂️ Extraindo Shorts", ["Analisando roteiro", "Identificando momentos virais", "Criando 5 shorts", "Hook + CTA"]);
    try {
      const d = await api.clip({ script: manualScript, title, niche });
      if (d.error) throw new Error(d.error);
      pg?.done(); setR(d);
    } catch (e) { pg?.fail(e.message); } setLoading(false);
  };

  const copyAll = () => {
    if (!r?.shorts) return;
    cp(r.shorts.map((s, i) => `=== SHORT ${i + 1}: ${s.title} ===\n🎣 Hook: ${s.hook}\n\n${s.script}\n\n📍 De: ${s.timecodeStart} → ${s.timecodeEnd}\n🎯 CTA: ${s.cta}\n${s.hashtags?.join(" ")}`).join("\n\n---\n\n"));
  };

  return <div className="page-enter" role="main" aria-label="ShortsClipper" style={{ maxWidth: 1000, margin: "0 auto" }}>
    <Hdr title="Shorts Clipper" sub="Extraia 5 Shorts virais do seu roteiro longo — com hooks, CTAs e hashtags" />

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
      <div><Label t="Vídeo (opcional)" /><Select value={videoId} onChange={e => loadVideo(e.target.value)}>
        <option value="">Selecione ou cole abaixo...</option>
        {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
      </Select></div>
      <div><Label t="Título do Vídeo" /><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título original..." /></div>
      <div><Label t="Nicho" /><Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="história, dark..." /></div>
    </div>
    <div style={{ marginBottom: 16 }}><Label t="Roteiro / Resumo do Vídeo" /><textarea value={manualScript} onChange={e => setManualScript(e.target.value)} placeholder="Cole o roteiro completo ou um resumo detalhado do conteúdo do vídeo..." style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.text, fontSize: 13, outline: "none", minHeight: 120, resize: "vertical" }} /></div>
    <Btn onClick={clip} disabled={loading} style={{ width: "100%", justifyContent: "center", marginBottom: 24 }}>{loading ? "⏳" : "✂️ Extrair 5 Shorts Virais"}</Btn>

    {r?.shorts && <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Btn onClick={copyAll} style={{ fontSize: 11 }}>📋 Copiar TODOS</Btn>
        <span style={{ fontSize: 11, color: C.dim, display: "flex", alignItems: "center" }}>{r.shorts.length} shorts extraídos</span>
      </div>

      {r.strategy && <div style={{ background: `linear-gradient(135deg,${C.red}06,${C.purple}06)`, borderRadius: 12, border: `1px solid ${C.red}20`, padding: 14, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📋 Estratégia de Publicação</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{r.strategy}</div>
      </div>}

      <div style={{ display: "grid", gap: 12 }}>
        {r.shorts.map((s, i) => <div key={i} style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: `${C.red}06`, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: C.red }}>#{i + 1}</span>
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</div><div style={{ fontSize: 10, color: C.dim }}>{s.platform} · {s.timecodeStart} → {s.timecodeEnd}</div></div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {s.estimatedViews && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: `${C.green}12`, color: C.green, fontWeight: 700 }}>{s.estimatedViews} views</span>}
              <button onClick={() => cp(`${s.hook}\n\n${s.script}\n\n${s.cta}\n\n${s.hashtags?.join(" ")}`)} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.red}30`, background: `${C.red}08`, color: C.red, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>📋</button>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 6 }}>🎣 Hook (3s): "{s.hook}"</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 10, padding: 12, background: "rgba(255,255,255,.02)", borderRadius: 8, border: `1px solid ${C.border}` }}>{s.script}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.blue, marginBottom: 6 }}>🎯 CTA: {s.cta}</div>
            {s.whyViral && <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>💡 {s.whyViral}</div>}
            {s.hashtags && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {s.hashtags.map((h, j) => <span key={j} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${C.purple}10`, color: C.purple }}>{h}</span>)}
            </div>}
          </div>
        </div>)}
      </div>
    </div>}
  </div>;
}
