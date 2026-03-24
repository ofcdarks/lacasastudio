// @ts-nocheck
import { useState } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

function Ring({score,size=100}){const r=size/2-6,circ=2*Math.PI*r,off=circ-(score/100)*circ;const c=score>=80?C.green:score>=60?"#F59E0B":C.red;return<svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset .8s"}}/><text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size*.28} fontWeight="800">{score}</text></svg>}

export default function ViralPredict(){
  const toast=useToast();const pg=useProgress();
  const[title,setTitle]=useState("");const[thumb,setThumb]=useState("");const[niche,setNiche]=useState("");
  const[time,setTime]=useState("");const[tags,setTags]=useState("");const[subs,setSubs]=useState("");
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);

  const predict=async()=>{
    if(!title.trim()){toast?.error("Título obrigatório");return;}
    setLoading(true);pg?.start("🔮 Prevendo Viralização",["Analisando título","Simulando CTR","Estimando views","Calculando receita"]);
    try{const d=await researchApi.predictViral({title,thumbnailConcept:thumb,niche,uploadTime:time,tags,subscribers:subs});pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  return<div className="page-enter" role="main" aria-label="ViralPredict" style={{maxWidth:900,margin:"0 auto"}}>
    <Hdr title="Preditor de Viralização" sub="Preveja views, CTR e receita ANTES de publicar"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
      <div><Label t="Título do Vídeo *"/><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título que vai publicar..."/></div>
      <div><Label t="Conceito da Thumbnail"/><Input value={thumb} onChange={e=>setThumb(e.target.value)} placeholder="Descrição visual da thumb..."/></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
      <div><Label t="Nicho"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="história, dark..."/></div>
      <div><Label t="Horário Upload"/><Input value={time} onChange={e=>setTime(e.target.value)} placeholder="Terça 14h"/></div>
      <div><Label t="Tags"/><Input value={tags} onChange={e=>setTags(e.target.value)} placeholder="tag1, tag2..."/></div>
      <div><Label t="Inscritos"/><Input value={subs} onChange={e=>setSubs(e.target.value)} placeholder="1K, 10K..."/></div>
    </div>
    <Btn onClick={predict} disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:24}}>{loading?"⏳":"🔮 Prever Performance"}</Btn>

    {r&&<div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:16,marginBottom:16}}>
        <div style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24,textAlign:"center"}}>
          <Ring score={r.viralScore||0} size={120}/>
          <div style={{fontSize:16,fontWeight:800,marginTop:8}}>Score Viral</div>
          <div style={{fontSize:12,marginTop:4,padding:"6px 12px",borderRadius:8,background:r.verdict?.includes("Publicar")?`${C.green}15`:r.verdict?.includes("Ajustar")?`${C.orange}15`:`${C.red}15`,color:r.verdict?.includes("Publicar")?C.green:r.verdict?.includes("Ajustar")?"#F59E0B":C.red,fontWeight:700,display:"inline-block"}}>{r.verdict?.split("—")[0]||"Analisando"}</div>
          <div style={{fontSize:11,color:C.dim,marginTop:6}}>{r.verdict?.split("—")[1]||""}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {[["😔 Pessimista",r.views?.pessimist,C.red],["📊 Realista",r.views?.realistic,C.blue],["🚀 Otimista",r.views?.optimist,C.green]].map(([l,v,c])=><div key={l} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:16,textAlign:"center"}}><div style={{fontSize:10,color:C.dim}}>{l}</div><div style={{fontSize:22,fontWeight:800,color:c,marginTop:4}}>{v||"?"}</div><div style={{fontSize:9,color:C.dim}}>views</div></div>)}
          {r.ctr&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:12}}><div style={{fontSize:10,fontWeight:700,color:"#F59E0B"}}>CTR: {r.ctr.score}%</div><div style={{fontSize:10,color:C.dim,marginTop:3}}>{r.ctr.analysis}</div></div>}
          {r.retention&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:12}}><div style={{fontSize:10,fontWeight:700,color:C.blue}}>Retenção: {r.retention.score}%</div><div style={{fontSize:10,color:C.dim,marginTop:3}}>{r.retention.analysis}</div></div>}
          {r.timing&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:12}}><div style={{fontSize:10,fontWeight:700,color:C.green}}>Melhor: {r.timing.bestDay} {r.timing.bestHour}</div><div style={{fontSize:10,color:C.dim,marginTop:3}}>{r.timing.reason}</div></div>}
        </div>
      </div>
      {r.estimatedRevenue&&<div style={{background:`linear-gradient(135deg,${C.green}06,${C.blue}06)`,borderRadius:12,border:`1px solid ${C.green}20`,padding:16,marginBottom:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center"}}>
        <div><div style={{fontSize:10,color:C.dim}}>CPM</div><div style={{fontSize:18,fontWeight:800,color:C.green}}>{r.estimatedRevenue.cpm}</div></div>
        <div><div style={{fontSize:10,color:C.dim}}>Receita 30d</div><div style={{fontSize:18,fontWeight:800,color:C.blue}}>{r.estimatedRevenue.revenue30d}</div></div>
        <div><div style={{fontSize:10,color:C.dim}}>Receita 90d</div><div style={{fontSize:18,fontWeight:800,color:C.purple}}>{r.estimatedRevenue.revenue90d}</div></div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {r.strengths&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.green}20`,padding:14}}><div style={{fontWeight:700,fontSize:13,marginBottom:6,color:C.green}}>✅ Pontos Fortes</div>{r.strengths.map((s,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"3px 0"}}>💪 {s}</div>)}</div>}
        {r.weaknesses&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.red}20`,padding:14}}><div style={{fontWeight:700,fontSize:13,marginBottom:6,color:C.red}}>⚠️ Fraquezas</div>{r.weaknesses.map((w,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"3px 0"}}>⚡ {w}</div>)}</div>}
      </div>
      {r.improvements&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,marginTop:12}}><div style={{fontWeight:700,fontSize:13,marginBottom:6}}>🚀 Melhorias pra Aumentar Views</div>{r.improvements.map((m,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"3px 0"}}>💡 {m}</div>)}</div>}
    </div>}
  </div>
}
