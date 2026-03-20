// @ts-nocheck
import { useState } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api={opt:(d)=>fetch("/api/algorithm/shorts-optimize",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(d)}).then(r=>r.json())};

export default function ShortsOptimizer(){
  const toast=useToast();const pg=useProgress();
  const[title,setTitle]=useState("");const[script,setScript]=useState("");const[niche,setNiche]=useState("");const[dur,setDur]=useState("30s");
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);

  const optimize=async()=>{
    if(!title.trim()){toast?.error("Título obrigatório");return;}
    setLoading(true);pg?.start("📱 Otimizando Short",["Hook analysis","Loop score","Swipe predictor","SEO Shorts"]);
    try{const d=await api.opt({title,script,niche,duration:dur});if(d.error)throw new Error(d.error);pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  return<div className="page-enter" style={{maxWidth:900,margin:"0 auto"}}>
    <Hdr title="Shorts Optimizer" sub="Otimize para o algoritmo de Shorts 2026 — 200B views/dia"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,marginBottom:10,alignItems:"end"}}>
      <div><Label t="Título do Short *"/><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título..."/></div>
      <div><Label t="Nicho"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="dark history..."/></div>
      <div><Label t="Duração"/><div style={{display:"flex",gap:4}}>{["15s","30s","45s","60s"].map(d=><button key={d} onClick={()=>setDur(d)} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${dur===d?C.red:C.border}`,background:dur===d?`${C.red}12`:"transparent",color:dur===d?C.red:C.dim,cursor:"pointer",fontSize:11,fontWeight:600}}>{d}</button>)}</div></div>
      <Btn onClick={optimize} disabled={loading}>{loading?"⏳":"📱 Otimizar"}</Btn>
    </div>
    <div style={{marginBottom:20}}><Label t="Roteiro (opcional)"/><textarea value={script} onChange={e=>setScript(e.target.value)} placeholder="Roteiro do short..." style={{width:"100%",background:"rgba(255,255,255,.03)",border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:C.text,fontSize:13,outline:"none",minHeight:60,resize:"vertical"}}/></div>

    {r&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        {[["Hook Score",r.hookAnalysis?.score||0,C.red],["Loop Score",r.loopScore||0,C.purple],["Swipe Safe",r.viewedVsSwipedPrediction||0,C.green],["Duration",r.optimalDuration||"?",C.blue]].map(([l,v,c])=>
          <div key={l} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${c}20`,padding:14,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{typeof v==="number"?`${v}%`:v}</div>
            <div style={{fontSize:10,color:C.dim}}>{l}</div>
          </div>)}
      </div>

      {r.optimizedTitle&&<div style={{background:`${C.green}06`,borderRadius:12,border:`1px solid ${C.green}20`,padding:14,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,color:C.green,marginBottom:4}}>✍️ Título otimizado para Shorts Search</div>
        <div style={{fontSize:14,fontWeight:600,color:C.text}}>{r.optimizedTitle}</div>
      </div>}

      {r.hookAnalysis&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.red}20`,padding:14,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,color:C.red,marginBottom:4}}>🎣 Hook (1º segundo)</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{r.hookAnalysis.firstSecond}</div>
        {r.hookAnalysis.improvement&&<div style={{fontSize:12,color:C.green,marginTop:4}}>💡 {r.hookAnalysis.improvement}</div>}
      </div>}

      {r.swipeRisk&&<div style={{background:`${C.red}06`,borderRadius:12,border:`1px solid ${C.red}20`,padding:14,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,color:C.red}}>⚠️ Risco de Swipe</div>
        <div style={{fontSize:12,color:C.muted}}>{r.swipeRisk}</div>
      </div>}

      {r.loopTip&&<div style={{fontSize:12,color:C.muted,padding:"6px 0"}}>🔄 Loop: {r.loopTip}</div>}
      {r.seoKeywords?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{r.seoKeywords.map((k,i)=><span key={i} style={{padding:"4px 8px",borderRadius:6,background:`${C.blue}12`,color:C.blue,fontSize:11}}>{k}</span>)}</div>}
      {r.retentionTips?.map((t,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0"}}>🔥 {t}</div>)}
      {r.postingStrategy&&<div style={{fontSize:12,color:C.blue,marginTop:8}}>📅 {r.postingStrategy}</div>}
    </div>}
  </div>;
}
