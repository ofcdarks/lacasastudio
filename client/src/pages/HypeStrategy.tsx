// @ts-nocheck
import { useState } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api={gen:(d)=>fetch("/api/algorithm/hype-strategy",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(d)}).then(r=>r.json())};
const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}catch{}};

export default function HypeStrategy(){
  const toast=useToast();const pg=useProgress();
  const[title,setTitle]=useState("");const[subs,setSubs]=useState("");const[niche,setNiche]=useState("");
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);

  const gen=async()=>{
    if(!title.trim()){toast?.error("Título obrigatório");return;}
    setLoading(true);pg?.start("🔥 Gerando Estratégia Hype",["Analisando elegibilidade","CTA scripts","Timeline 7 dias"]);
    try{const d=await api.gen({videoTitle:title,subscribers:subs,niche});if(d.error)throw new Error(d.error);pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  return<div className="page-enter" style={{maxWidth:900,margin:"0 auto"}}>
    <Hdr title="Hype Strategy" sub="Maximize Hypes nos primeiros 7 dias — feature YouTube 2026 (500-500K subs)"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,marginBottom:20,alignItems:"end"}}>
      <div><Label t="Título do Vídeo *"/><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título..."/></div>
      <div><Label t="Inscritos"/><Input value={subs} onChange={e=>setSubs(e.target.value)} placeholder="Ex: 10K"/></div>
      <div><Label t="Nicho"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="dark history..."/></div>
      <Btn onClick={gen} disabled={loading}>{loading?"⏳":"🔥 Gerar"}</Btn>
    </div>

    {r&&<div>
      {r.eligible!==undefined&&<div style={{background:r.eligible?`${C.green}06`:`${C.red}06`,borderRadius:12,border:`1px solid ${r.eligible?C.green:C.red}20`,padding:14,marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:16,fontWeight:800,color:r.eligible?C.green:C.red}}>{r.eligible?"✅ Elegível para Hype":"❌ Fora do range (500-500K subs)"}</div>
      </div>}

      {r.strategy&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>📋 Estratégia</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{r.strategy}</div>
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {r.ctaScript&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.red}20`,padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:C.red,marginBottom:6}}>🎬 CTA no Vídeo</div>
          <div style={{fontSize:12,color:C.text,lineHeight:1.7}}>{r.ctaScript}</div>
          <button onClick={()=>{cp(r.ctaScript);toast?.success("Copiado!");}} style={{marginTop:8,padding:"6px 12px",borderRadius:6,border:`1px solid ${C.red}30`,background:`${C.red}08`,color:C.red,cursor:"pointer",fontSize:10,width:"100%"}}>📋 Copiar</button>
        </div>}
        {r.pinnedComment&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.blue}20`,padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:C.blue,marginBottom:6}}>📌 Comentário Fixado</div>
          <div style={{fontSize:12,color:C.text,lineHeight:1.7}}>{r.pinnedComment}</div>
          <button onClick={()=>{cp(r.pinnedComment);toast?.success("Copiado!");}} style={{marginTop:8,padding:"6px 12px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10,width:"100%"}}>📋 Copiar</button>
        </div>}
      </div>

      {r.timeline&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>📅 Timeline 7 Dias</div>
        <div style={{display:"grid",gap:8}}>
          {r.timeline.map((t,i)=><div key={i} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontWeight:800,fontSize:13,color:i===0?C.red:i<3?C.orange:C.green,minWidth:50}}>{t.day}</span>
            <span style={{fontSize:12,color:C.muted}}>{t.action}</span>
          </div>)}
        </div>
      </div>}

      {r.estimatedBoost&&<div style={{fontSize:13,fontWeight:700,color:C.green,textAlign:"center",padding:10}}>🚀 Boost estimado: {r.estimatedBoost}</div>}
    </div>}
  </div>;
}
