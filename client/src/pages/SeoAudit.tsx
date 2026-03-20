// @ts-nocheck
import { useState } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";
import MagicTabs from "../components/shared/MagicTabs";

const hdr=()=>({"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`});
const api = {
  audit: (data) => fetch("/api/competitive/seo-audit", { method: "POST", headers: hdr(), body: JSON.stringify(data) }).then(r => r.json()),
  prePub: (data) => fetch("/api/competitive/seo-audit/pre-publish", { method: "POST", headers: hdr(), body: JSON.stringify(data) }).then(r => r.json()),
  aiFix: (data) => fetch("/api/algorithm/seo-ai-fix", { method: "POST", headers: hdr(), body: JSON.stringify(data) }).then(r => r.json()),
};
const fmt = n => { if (!n) return "0"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };
const cp=txt=>{try{navigator.clipboard.writeText(txt)}catch{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}};

function Ring({ score, size = 90, label }) {
  const r = size / 2 - 6, circ = 2 * Math.PI * r, off = circ - (score / 100) * circ;
  const c = score >= 80 ? C.green : score >= 60 ? "#F59E0B" : C.red;
  return <div style={{ textAlign: "center" }}><svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .8s" }} /><text x={size / 2} y={size / 2 + 2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size * .28} fontWeight="800">{score}</text></svg>{label && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{label}</div>}</div>;
}

function CopyBlock({label, content, score, color, changes, toast}) {
  return <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${(color||C.green)}20`,padding:16,marginBottom:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div style={{fontWeight:700,fontSize:14,color:color||C.green}}>{label}</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {score!==undefined&&<span style={{fontSize:12,fontWeight:800,color:score>=80?C.green:score>=60?"#F59E0B":C.red}}>Score: {score}</span>}
        <button onClick={()=>{cp(content);toast?.success("Copiado! Cole no YouTube.");}} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${C.green}40`,background:`${C.green}12`,color:C.green,cursor:"pointer",fontSize:12,fontWeight:700}}>📋 Copiar</button>
      </div>
    </div>
    <div style={{fontSize:13,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto",padding:12,background:"rgba(255,255,255,.02)",borderRadius:8,border:`1px solid ${C.border}`}}>{content}</div>
    {changes?.length>0&&<div style={{marginTop:8}}>{changes.map((c,i)=><div key={i} style={{fontSize:11,color:C.muted,padding:"2px 0"}}>✅ {c}</div>)}</div>}
  </div>;
}

export default function SeoAudit() {
  const toast = useToast(); const pg = useProgress();
  const [tab, setTab] = useState("published");
  const [url, setUrl] = useState(""); const [r, setR] = useState(null); const [loading, setLoading] = useState(false);
  const [ppTitle, setPpTitle] = useState(""); const [ppDesc, setPpDesc] = useState(""); const [ppTags, setPpTags] = useState(""); const [ppNiche, setPpNiche] = useState("");
  const [ppR, setPpR] = useState(null); const [ppLoading, setPpLoading] = useState(false);
  const [fix, setFix] = useState(null); const [fixLoading, setFixLoading] = useState(false);

  const auditPublished = async () => {
    if (!url.trim()) { toast?.error("URL obrigatória"); return; }
    setLoading(true); setFix(null);
    pg?.start("🔍 Auditando SEO", ["Buscando vídeo", "Analisando título", "Checando tags", "Score final"]);
    try { const d = await api.audit({ videoUrl: url }); if (d.error) throw new Error(d.error); pg?.done(); setR(d); }
    catch (e) { pg?.fail(e.message); } setLoading(false);
  };

  const auditPrePub = async () => {
    if (!ppTitle.trim()) { toast?.error("Título obrigatório"); return; }
    setPpLoading(true);
    pg?.start("📝 Auditando", ["Analisando título", "SEO check", "Sugestões"]);
    try { const d = await api.prePub({ title: ppTitle, description: ppDesc, tags: ppTags.split(",").map(t => t.trim()).filter(Boolean), niche: ppNiche }); if (d.error) throw new Error(d.error); pg?.done(); setPpR(d); }
    catch (e) { pg?.fail(e.message); } setPpLoading(false);
  };

  const runAiFix = async () => {
    if (!r) return;
    setFixLoading(true);
    pg?.start("🤖 IA Corrigindo SEO", ["Analisando problemas", "Gerando título otimizado", "Reescrevendo descrição", "Otimizando tags"]);
    try {
      const d = await api.aiFix({ title: r.title, description: r.description, tags: r.tags, checks: r.checks, niche: "", views: r.views, channelTitle: r.channelTitle });
      if (d.error) throw new Error(d.error);
      pg?.done(); setFix(d);
    } catch (e) { pg?.fail(e.message); } setFixLoading(false);
  };

  const CAT_LABELS = { title: "Título", description: "Descrição", tags: "Tags", engagement: "Engajamento" };
  const CAT_ICONS = { title: "✍️", description: "📝", tags: "🏷️", engagement: "💬" };
  const failCount = r ? r.checks?.filter(c => !c.pass).length : 0;

  return <div className="page-enter" style={{ maxWidth: 1000, margin: "0 auto" }}>
    <Hdr title="SEO Score Audit" sub="Audite + IA corrige tudo automaticamente" />

    <MagicTabs tabs={[{key:"published",icon:"📺",label:"Vídeo Publicado",color:C.blue},{key:"pre",icon:"📝",label:"Pré-Publicação",color:C.green}]} active={tab} onChange={setTab}/>

    {tab === "published" && <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "end" }}>
        <div style={{ flex: 1 }}><Label t="URL do Vídeo *" /><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="Cole a URL do YouTube..." onKeyDown={e => e.key === "Enter" && auditPublished()} /></div>
        <Btn onClick={auditPublished} disabled={loading}>{loading ? "⏳" : "🔍 Auditar"}</Btn>
      </div>

      {r && <div>
        {/* Score Header */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <Ring score={r.overallScore} size={110} />
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>Grade {r.grade}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{r.verdict}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{r.title}</div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>{r.channelTitle} · {fmt(r.views)} views</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {r.categoryScores?.map(cat => <div key={cat.category} style={{ padding: 10, borderRadius: 10, background: `${cat.score >= 70 ? C.green : cat.score >= 40 ? "#F59E0B" : C.red}08`, border: `1px solid ${cat.score >= 70 ? C.green : cat.score >= 40 ? "#F59E0B" : C.red}15`, textAlign: "center" }}>
                <div style={{ fontSize: 14 }}>{CAT_ICONS[cat.category]}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: cat.score >= 70 ? C.green : cat.score >= 40 ? "#F59E0B" : C.red }}>{cat.score}</div>
                <div style={{ fontSize: 9, color: C.dim }}>{CAT_LABELS[cat.category]}</div>
                <div style={{ fontSize: 9, color: C.dim }}>{cat.passed}/{cat.total}</div>
              </div>)}
            </div>
          </div>
        </div>

        {/* AI FIX BUTTON — the killer feature */}
        {failCount > 0 && <div style={{background:`linear-gradient(135deg,${C.red}08,${C.purple}08)`,borderRadius:16,border:`1px solid ${C.red}20`,padding:20,marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:6}}>🤖 {failCount} problemas encontrados — a IA pode corrigir TUDO</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Gera título, descrição e tags otimizados prontos pra copiar e colar no YouTube</div>
          <Btn onClick={runAiFix} disabled={fixLoading}>{fixLoading?"⏳ Gerando...":"🤖 IA Corrigir Tudo Automaticamente"}</Btn>
        </div>}

        {/* AI FIX RESULTS — copy-ready */}
        {fix && <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:18}}>🤖 Correções prontas — copie e cole no YouTube</div>
            {fix.estimatedScoreAfter&&<div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,color:C.dim}}>Score estimado após:</span>
              <span style={{fontSize:18,fontWeight:800,color:C.green}}>{fix.estimatedScoreAfter}</span>
              {fix.estimatedCTRBoost&&<span style={{fontSize:11,color:C.green,padding:"3px 8px",borderRadius:6,background:`${C.green}12`}}>CTR {fix.estimatedCTRBoost}</span>}
            </div>}
          </div>
          {fix.newTitle&&<CopyBlock label="✍️ Novo Título" content={fix.newTitle} score={fix.titleScore} color={C.blue} changes={fix.titleChanges} toast={toast}/>}
          {fix.newDescription&&<CopyBlock label="📝 Nova Descrição" content={fix.newDescription} score={fix.descScore} color={C.green} changes={fix.descChanges} toast={toast}/>}
          {fix.newTags?.length>0&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.purple}20`,padding:16,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:14,color:C.purple}}>🏷️ Novas Tags ({fix.newTags.length})</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {fix.tagScore!==undefined&&<span style={{fontSize:12,fontWeight:800,color:fix.tagScore>=80?C.green:"#F59E0B"}}>Score: {fix.tagScore}</span>}
                <button onClick={()=>{cp(fix.newTags.join(", "));toast?.success("Tags copiadas!");}} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${C.purple}40`,background:`${C.purple}12`,color:C.purple,cursor:"pointer",fontSize:12,fontWeight:700}}>📋 Copiar Tags</button>
              </div>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {fix.newTags.map((t,i)=><span key={i} style={{padding:"4px 10px",borderRadius:6,background:`${C.purple}10`,color:C.purple,fontSize:11,cursor:"pointer"}} onClick={()=>{cp(t);toast?.success(`"${t}" copiada`);}}>{t}</span>)}
            </div>
            {fix.tagChanges?.map((c,i)=><div key={i} style={{fontSize:11,color:C.muted,padding:"2px 0",marginTop:6}}>✅ {c}</div>)}
          </div>}
        </div>}

        {/* Checklist */}
        <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>✅ Checklist SEO ({r.checks.filter(c => c.pass).length}/{r.checks.length})</div>
          {["title", "description", "tags", "engagement"].map(cat => <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>{CAT_ICONS[cat]} {CAT_LABELS[cat]}</div>
            {r.checks.filter(c => c.category === cat).map((check, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: check.pass ? `${C.green}06` : `${C.red}06`, border: `1px solid ${check.pass ? C.green : C.red}12` }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{check.pass ? "✅" : "❌"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: check.pass ? C.green : C.red }}>{check.label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{check.tip}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: check.pass ? C.green : C.dim, flexShrink: 0 }}>+{check.score}</div>
            </div>)}
          </div>)}
        </div>
      </div>}
    </div>}

    {tab === "pre" && <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div><Label t="Título *" /><Input value={ppTitle} onChange={e => setPpTitle(e.target.value)} placeholder="Título que pretende usar..." /></div>
        <div><Label t="Nicho" /><Input value={ppNiche} onChange={e => setPpNiche(e.target.value)} placeholder="história, dark..." /></div>
      </div>
      <div style={{ marginBottom: 10 }}><Label t="Descrição" /><textarea value={ppDesc} onChange={e => setPpDesc(e.target.value)} placeholder="Cole a descrição..." style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.text, fontSize: 13, outline: "none", minHeight: 80, resize: "vertical" }} /></div>
      <div style={{ marginBottom: 16 }}><Label t="Tags (separadas por vírgula)" /><Input value={ppTags} onChange={e => setPpTags(e.target.value)} placeholder="tag1, tag2, tag3..." /></div>
      <Btn onClick={auditPrePub} disabled={ppLoading} style={{ width: "100%", justifyContent: "center", marginBottom: 24 }}>{ppLoading ? "⏳" : "📝 Auditar Pré-Publicação"}</Btn>

      {ppR && <div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
          <Ring score={ppR.score || 0} size={100} label={`Grade ${ppR.grade || "?"}`} />
          <div>
            {ppR.titleAnalysis && <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.blue, marginBottom: 4 }}>✍️ Título (Score: {ppR.titleAnalysis.score})</div>
              {ppR.titleAnalysis.betterVersions?.map((v, i) => <div key={i} style={{ fontSize: 12, color: C.green, padding: "2px 0", cursor: "pointer" }} onClick={()=>{cp(v);toast?.success("Título copiado!");}}>💡 {v} <span style={{fontSize:9,color:C.dim}}>📋</span></div>)}
              {ppR.titleAnalysis.improvements?.map((v, i) => <div key={i} style={{ fontSize: 11, color: C.muted, padding: "2px 0" }}>⚡ {v}</div>)}
            </div>}
            {ppR.tagAnalysis?.suggested && <div style={{ marginBottom: 8 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.green }}>🏷️ Tags Sugeridas</div>
                <button onClick={()=>{cp(ppR.tagAnalysis.suggested.join(", "));toast?.success("Tags copiadas!");}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.green}30`,background:`${C.green}08`,color:C.green,cursor:"pointer",fontSize:10}}>📋 Copiar Todas</button>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{ppR.tagAnalysis.suggested.map((t, i) => <span key={i} style={{ padding: "3px 8px", borderRadius: 6, background: `${C.green}12`, color: C.green, fontSize: 11, cursor:"pointer" }} onClick={()=>{cp(t);toast?.success(`"${t}" copiada`);}}>{t}</span>)}</div>
            </div>}
            {ppR.overallTips?.map((t, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "3px 0" }}>🎯 {t}</div>)}
            {ppR.predictedCTR && <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginTop: 8 }}>CTR estimado: {ppR.predictedCTR}</div>}
          </div>
        </div>
      </div>}
    </div>}
  </div>;
}
