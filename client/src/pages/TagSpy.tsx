// @ts-nocheck
import { useState } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api = {
  spy: (data) => fetch("/api/competitive/tag-spy", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` }, body: JSON.stringify(data) }).then(r => r.json()),
};
const fmt = n => { if (!n) return "0"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };

export default function TagSpy() {
  const toast = useToast(); const pg = useProgress();
  const [url, setUrl] = useState(""); const [r, setR] = useState(null); const [loading, setLoading] = useState(false);
  const cp = txt => { try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); toast?.success("Copiado!"); } catch {} };

  const analyze = async () => {
    if (!url.trim()) { toast?.error("URL obrigatória"); return; }
    setLoading(true); pg?.start("🏷️ Espiando Tags", ["Buscando vídeo", "Extraindo tags", "Analisando força"]);
    try { const d = await api.spy({ videoUrl: url }); if (d.error) throw new Error(d.error); pg?.done(); setR(d); }
    catch (e) { pg?.fail(e.message); } setLoading(false);
  };

  const STR = { forte: { c: C.green, bg: `${C.green}12` }, médio: { c: "#F59E0B", bg: "#F59E0B12" }, fraco: { c: C.dim, bg: "rgba(255,255,255,.04)" } };

  return <div className="page-enter" role="main" aria-label="TagSpy" style={{ maxWidth: 1000, margin: "0 auto" }}>
    <Hdr title="Tag Spy" sub="Descubra TODAS as tags de qualquer vídeo do YouTube" />
    <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "end" }}>
      <div style={{ flex: 1 }}><Label t="URL ou ID do Vídeo *" /><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="Cole a URL do YouTube ou ID do vídeo..." onKeyDown={e => e.key === "Enter" && analyze()} /></div>
      <Btn onClick={analyze} disabled={loading}>{loading ? "⏳" : "🏷️ Espiar Tags"}</Btn>
    </div>

    {r && <div>
      {/* Video Header */}
      <div style={{ display: "flex", gap: 16, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        {r.thumbnail && <img src={r.thumbnail} style={{ width: 200, height: 112, borderRadius: 10, objectFit: "cover" }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{r.title}</div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>{r.channelTitle}</div>
          <div style={{ display: "flex", gap: 16 }}>
            {[["Views", fmt(r.views), C.green], ["Likes", fmt(r.likes), C.blue], ["Comentários", fmt(r.comments), C.purple]].map(([l, v, c]) =>
              <div key={l}><div style={{ fontSize: 9, color: C.dim }}>{l}</div><div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div></div>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
          <div style={{ padding: "8px 14px", borderRadius: 8, background: `${C.red}10`, border: `1px solid ${C.red}20` }}><div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{r.tagCount}</div><div style={{ fontSize: 9, color: C.dim }}>Tags</div></div>
          <div style={{ padding: "8px 14px", borderRadius: 8, background: `${C.blue}10`, border: `1px solid ${C.blue}20` }}><div style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{r.titleLength}</div><div style={{ fontSize: 9, color: C.dim }}>Chars título</div></div>
        </div>
      </div>

      {/* Meta Info */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {r.hasTimestamps && <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.green}12`, color: C.green, fontWeight: 600 }}>✅ Timestamps</span>}
        {!r.hasTimestamps && <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.red}12`, color: C.red, fontWeight: 600 }}>❌ Sem timestamps</span>}
        {r.hasLinks && <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.green}12`, color: C.green, fontWeight: 600 }}>✅ Links</span>}
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.blue}12`, color: C.blue, fontWeight: 600 }}>📝 {r.descriptionLength} chars desc</span>
      </div>

      {/* Tags */}
      <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.green}20`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.green }}>🏷️ {r.tagCount} Tags Encontradas</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => cp(r.tags.map(t => t.tag).join(", "))} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.green}30`, background: `${C.green}08`, color: C.green, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>📋 Copiar Todas</button>
            <button onClick={() => cp(r.tags.filter(t => t.strength === "forte").map(t => t.tag).join(", "))} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.blue}30`, background: `${C.blue}08`, color: C.blue, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>📋 Só Fortes</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {r.tags.map((t, i) => {
            const s = STR[t.strength] || STR.fraco;
            return <span key={i} onClick={() => cp(t.tag)} style={{ padding: "6px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.c}20`, color: s.c, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {t.tag}
              {t.inTitle && <span style={{ fontSize: 8, background: `${C.red}20`, color: C.red, padding: "1px 4px", borderRadius: 3 }}>T</span>}
              {t.inDescription && <span style={{ fontSize: 8, background: `${C.blue}20`, color: C.blue, padding: "1px 4px", borderRadius: 3 }}>D</span>}
            </span>;
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 10, color: C.dim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.green }} /> Forte (título+desc)</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#F59E0B" }} /> Médio (título ou desc)</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.dim }} /> Fraco (só tag)</span>
          <span><span style={{ fontSize: 8, background: `${C.red}20`, color: C.red, padding: "1px 4px", borderRadius: 3 }}>T</span> = no título</span>
          <span><span style={{ fontSize: 8, background: `${C.blue}20`, color: C.blue, padding: "1px 4px", borderRadius: 3 }}>D</span> = na descrição</span>
        </div>
      </div>

      {/* Hashtags */}
      {r.hashtags?.length > 0 && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.purple}20`, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.purple, marginBottom: 8 }}># Hashtags</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {r.hashtags.map((h, i) => <span key={i} onClick={() => cp(h)} style={{ padding: "4px 10px", borderRadius: 6, background: `${C.purple}10`, color: C.purple, fontSize: 12, cursor: "pointer" }}>{h}</span>)}
        </div>
      </div>}
    </div>}
  </div>;
}
