// @ts-nocheck
import { useProgress } from "../components/shared/ProgressModal";
import { useState } from "react";
import { chatApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

export default function Shorts() {
  const toast = useToast();
  const pg = useProgress();
  const [script, setScript] = useState("");
  const [count, setCount] = useState(5);
  const [style, setStyle] = useState("dinâmico com cortes rápidos");
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!script.trim()) { toast?.error("Cole um roteiro"); return; }
    setLoading(true);
    pg?.start("🚀 Gerando Shorts", ["Analisando roteiro", "Extraindo melhores momentos", "Criando " + count + " shorts", "Gerando hooks e hashtags"]);
    try {
      const r = await chatApi.shorts({ script, count, style });
      setShorts(r.shorts || []);
      pg?.done(); toast?.success(`${(r.shorts || []).length} shorts gerados!`);
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
    setLoading(false);
  };

  const cp = txt => { try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); toast?.success("Copiado!"); } catch {} };

  return (
    <div className="page-enter" role="main" aria-label="Shorts" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Hdr title="Gerador de Shorts/Reels" sub="Transforme roteiros longos em shorts virais com IA" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginBottom: 24 }}>
        <div>
          <Label t="Roteiro / Texto base" />
          <textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Cole aqui o roteiro do seu vídeo longo. A IA vai extrair os melhores momentos e transformar em shorts/reels virais..." style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, color: C.text, fontSize: 13, outline: "none", minHeight: 200, resize: "vertical", lineHeight: 1.6 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><Label t="Quantidade" /><Select value={count} onChange={e => setCount(Number(e.target.value))}>{[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} shorts</option>)}</Select></div>
          <div><Label t="Estilo" /><Select value={style} onChange={e => setStyle(e.target.value)}>
            <option value="dinâmico com cortes rápidos">⚡ Cortes Rápidos</option>
            <option value="storytelling emocional">💫 Storytelling</option>
            <option value="educativo com dados na tela">📊 Educativo</option>
            <option value="humor com timing perfeito">😂 Humor</option>
            <option value="polêmico e provocativo">🔥 Polêmico</option>
            <option value="ASMR/satisfying visual">🎧 ASMR/Satisfying</option>
          </Select></div>
          <Btn onClick={generate} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>{loading ? "⏳ Gerando..." : "🚀 Gerar Shorts"}</Btn>
        </div>
      </div>

      {shorts.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{shorts.length} Shorts Gerados</div>
          <div style={{ display: "grid", gap: 12 }}>
            {shorts.map((s, i) => (
              <div key={i} style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ display: "flex" }}>
                  {/* Phone mockup */}
                  <div style={{ width: 180, minHeight: 320, background: "linear-gradient(180deg, #0a0a0a, #1a1a2e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
                    <div style={{ width: 120, height: 213, borderRadius: 12, border: `2px solid ${C.border}`, background: "#000", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,.5)", textAlign: "center", lineHeight: 1.4 }}>{s.hook}</div>
                      </div>
                      {s.textOverlays?.length > 0 && <div style={{ padding: "4px 6px" }}>{s.textOverlays.slice(0, 2).map((t, j) => <div key={j} style={{ fontSize: 6, color: "#fff", background: "rgba(0,0,0,.7)", padding: "2px 4px", borderRadius: 2, marginBottom: 2, textAlign: "center" }}>{t}</div>)}</div>}
                      <div style={{ padding: "4px 6px", background: "rgba(0,0,0,.5)", fontSize: 6, color: C.dim, textAlign: "center" }}>{s.duration || "30s"}</div>
                    </div>
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 8, textAlign: "center" }}>Short #{s.number || i + 1}</div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: C.red, fontWeight: 600, marginBottom: 8 }}>🎣 {s.hook}</div>

                    <div style={{ background: "rgba(0,0,0,.2)", borderRadius: 8, padding: 10, marginBottom: 10, maxHeight: 140, overflowY: "auto" }}>
                      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{s.script}</div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 10, color: C.dim, flexWrap: "wrap" }}>
                      <span>⏱ {s.duration}</span>
                      {s.transition && <span>✨ {s.transition}</span>}
                      {s.music && <span>🎵 {s.music}</span>}
                    </div>

                    {s.hashtags && <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>{s.hashtags.map(h => <span key={h} style={{ fontSize: 9, color: C.blue, background: `${C.blue}10`, padding: "2px 6px", borderRadius: 4 }}>{h}</span>)}</div>}

                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => cp(s.script)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10 }}>📋 Script</button>
                      <button onClick={() => cp(s.title)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10 }}>📋 Título</button>
                      {s.thumbnailPrompt && <button onClick={() => cp(s.thumbnailPrompt)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.blue}30`, background: `${C.blue}08`, color: C.blue, cursor: "pointer", fontSize: 10 }}>🖼️ Thumb</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
