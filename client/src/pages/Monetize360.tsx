// @ts-nocheck
import { useState } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

export default function Monetize360(){
  const toast=useToast();const pg=useProgress();
  const[niche,setNiche]=useState("");const[subs,setSubs]=useState("1K");const[views,setViews]=useState("10K");
  const[country,setCountry]=useState("BR");const[style,setStyle]=useState("faceless");
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const generate=async()=>{
    if(!niche.trim()){toast?.error("Nicho obrigatório");return;}
    setLoading(true);pg?.start("💸 Criando Estratégia 360°",["Analisando nicho","Calculando AdSense","Mapeando afiliados","Planejando produtos","Timeline"]);
    try{const d=await researchApi.monetize360({niche,subscribers:subs,avgViews:views,country,style});pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Monetização 360°" sub="AdSense · Afiliados · Cursos · Patrocínios · Membership · Merch"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
      <div><Label t="Nicho *"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="história, dark..."/></div>
      <div><Label t="Inscritos"/><Input value={subs} onChange={e=>setSubs(e.target.value)} placeholder="1K"/></div>
      <div><Label t="Views médias"/><Input value={views} onChange={e=>setViews(e.target.value)} placeholder="10K"/></div>
      <div><Label t="País"/><Select value={country} onChange={e=>setCountry(e.target.value)}><option value="BR">Brasil</option><option value="US">EUA</option><option value="global">Global</option></Select></div>
      <div><Label t="Estilo"/><Select value={style} onChange={e=>setStyle(e.target.value)}><option value="faceless">Faceless</option><option value="face">Aparece</option><option value="animated">Animado</option></Select></div>
    </div>
    <Btn onClick={generate} disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:24}}>{loading?"⏳":"💸 Gerar Estratégia Completa"}</Btn>

    {r&&<div>
      {r.totalPotential&&<div style={{background:`linear-gradient(135deg,${C.green}08,${C.blue}08)`,borderRadius:16,border:`1px solid ${C.green}20`,padding:24,textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:12,color:C.dim}}>Potencial Total Mensal</div>
        <div style={{fontSize:36,fontWeight:900,color:C.green,marginTop:4}}>{r.totalPotential}</div>
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12,marginBottom:20}}>
        {(r.streams||[]).map((s,i)=><div key={i} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:18}}>{s.icon} <span style={{fontWeight:700,fontSize:14}}>{s.name}</span></div>
            <span style={{fontSize:9,padding:"2px 8px",borderRadius:4,background:s.difficulty==="fácil"?`${C.green}15`:s.difficulty==="médio"?`${C.blue}15`:`${C.red}15`,color:s.difficulty==="fácil"?C.green:s.difficulty==="médio"?C.blue:C.red,fontWeight:700}}>{s.difficulty}</span>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{flex:1,textAlign:"center",background:"rgba(255,255,255,.02)",borderRadius:8,padding:8}}><div style={{fontSize:9,color:C.dim}}>Min/mês</div><div style={{fontSize:16,fontWeight:800,color:C.green}}>R${s.monthlyMin}</div></div>
            <div style={{flex:1,textAlign:"center",background:"rgba(255,255,255,.02)",borderRadius:8,padding:8}}><div style={{fontSize:9,color:C.dim}}>Max/mês</div><div style={{fontSize:16,fontWeight:800,color:C.blue}}>R${s.monthlyMax}</div></div>
          </div>
          <div style={{fontSize:10,color:C.dim,marginBottom:4}}>⏱️ Tempo: {s.timeToStart}</div>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:6}}>{s.howTo}</div>
          {s.platforms&&<div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:4}}>{s.platforms.map(p=><span key={p} style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:`${C.purple}10`,color:C.purple}}>{p}</span>)}</div>}
          {s.tips?.map((t,j)=><div key={j} style={{fontSize:10,color:C.dim,padding:"2px 0"}}>💡 {t}</div>)}
          {s.emailTemplate&&<button onClick={()=>cp(s.emailTemplate)} style={{marginTop:6,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:9,width:"100%"}}>📋 Copiar Template Email</button>}
        </div>)}
      </div>

      {r.timeline&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:20,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📅 Timeline de Monetização</div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${r.timeline.length},1fr)`,gap:12}}>
          {r.timeline.map((t,i)=><div key={i} style={{padding:12,borderRadius:10,background:"rgba(255,255,255,.02)",borderLeft:`3px solid ${i===0?C.red:i===1?"#F59E0B":C.green}`}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{t.month}</div>
            <div style={{fontSize:11,color:C.blue,fontWeight:700,marginBottom:4}}>{t.focus}</div>
            <div style={{fontSize:14,fontWeight:800,color:C.green,marginBottom:6}}>{t.revenue}</div>
            {t.actions?.map((a,j)=><div key={j} style={{fontSize:10,color:C.muted,padding:"2px 0"}}>• {a}</div>)}
          </div>)}
        </div>
      </div>}

      {r.quickWins&&<div style={{background:`${C.green}06`,borderRadius:12,border:`1px solid ${C.green}20`,padding:14}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:C.green}}>⚡ Quick Wins — Monetize HOJE</div>
        {r.quickWins.map((q,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>🔥 {q}</div>)}
      </div>}
    </div>}
  </div>
}
