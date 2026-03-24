// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const api={
  log:(d)=>fetch("/api/algorithm/streak/log",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(d)}).then(r=>r.json()),
  data:()=>fetch("/api/algorithm/streak/data",{headers:{Authorization:`Bearer ${localStorage.getItem("lc_token")}`}}).then(r=>r.json()),
};

export default function StreakTracker(){
  const toast=useToast();
  const[data,setData]=useState(null);const[title,setTitle]=useState("");const[type,setType]=useState("long");

  useEffect(()=>{api.data().then(setData).catch(()=>{});},[]);

  const log=async()=>{
    await api.log({videoTitle:title,type});
    toast?.success("Upload registrado!");setTitle("");
    api.data().then(setData).catch(()=>{});
  };

  // Generate heatmap for last 52 weeks
  const heatmap=data?.heatmap||{};
  const weeks=[];
  for(let w=51;w>=0;w--){
    const days=[];
    for(let d=0;d<7;d++){
      const date=new Date();date.setDate(date.getDate()-w*7-d);
      const key=date.toISOString().split("T")[0];
      days.push({date:key,count:heatmap[key]||0});
    }
    weeks.push(days);
  }

  return<div className="page-enter" role="main" aria-label="StreakTracker" style={{maxWidth:900,margin:"0 auto"}}>
    <Hdr title="Upload Streak" sub="Consistência é fator de ranking — mantenha seu streak vivo"/>

    {data&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>
      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:C.red}}>{data.currentStreak}</div><div style={{fontSize:10,color:C.dim}}>Streak Atual (semanas)</div></div>
      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:C.green}}>{data.longestStreak}</div><div style={{fontSize:10,color:C.dim}}>Maior Streak</div></div>
      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:C.blue}}>{data.thisMonth}</div><div style={{fontSize:10,color:C.dim}}>Este Mês</div></div>
      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:data.consistencyScore>=70?C.green:C.red}}>{data.consistencyScore}%</div><div style={{fontSize:10,color:C.dim}}>Consistência</div></div>
    </div>}

    {/* Heatmap */}
    <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:24,overflowX:"auto"}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>📅 Atividade (52 semanas)</div>
      <div style={{display:"flex",gap:2}}>
        {weeks.map((w,wi)=><div key={wi} style={{display:"flex",flexDirection:"column",gap:2}}>
          {w.map((d,di)=><div key={di} title={`${d.date}: ${d.count} uploads`} style={{width:10,height:10,borderRadius:2,background:d.count>=3?C.green:d.count>=2?`${C.green}80`:d.count>=1?`${C.green}40`:"rgba(255,255,255,.04)"}}/>)}
        </div>)}
      </div>
      <div style={{display:"flex",gap:8,marginTop:8,fontSize:9,color:C.dim,alignItems:"center"}}>
        <span>Menos</span>{[0,1,2,3].map(n=><div key={n} style={{width:10,height:10,borderRadius:2,background:n===0?"rgba(255,255,255,.04)":n===1?`${C.green}40`:n===2?`${C.green}80`:C.green}}/>)}<span>Mais</span>
      </div>
    </div>

    {/* Log upload */}
    <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>Registrar Upload</div>
      <div style={{display:"flex",gap:10,alignItems:"end"}}>
        <div style={{flex:1}}><Label t="Título"/><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título do vídeo publicado..."/></div>
        <div style={{display:"flex",gap:4}}>
          {[["long","🎬"],["short","📱"]].map(([k,i])=><button key={k} onClick={()=>setType(k)} style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${type===k?C.blue:C.border}`,background:type===k?`${C.blue}12`:"transparent",color:type===k?C.blue:C.dim,cursor:"pointer",fontSize:14}}>{i}</button>)}
        </div>
        <Btn onClick={log}>Registrar</Btn>
      </div>
    </div>
  </div>;
}
