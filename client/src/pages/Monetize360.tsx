// @ts-nocheck
import { useState, useEffect } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const fmt=n=>{if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return n.toString();};
const hdr=()=>({"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`});
const cp=txt=>{try{navigator.clipboard.writeText(txt)}catch{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}};

export default function Monetize360(){
  const toast=useToast();const pg=useProgress();
  const[niche,setNiche]=useState("");const[subs,setSubs]=useState("1K");const[views,setViews]=useState("10K");
  const[country,setCountry]=useState("BR");const[style,setStyle]=useState("faceless");
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);
  const[revenue,setRevenue]=useState(null);const[channelName,setChannelName]=useState("");

  // Pull OAuth revenue data
  useEffect(()=>{
    fetch("/api/algorithm/my-channel/overview?days=28",{headers:hdr()}).then(r=>r.json()).then(d=>{
      if(d.revenue)setRevenue(d.revenue);
      if(d.channelInfo){
        setChannelName(d.channelInfo.channelName||"");
        if(d.channelInfo.subscribers)setSubs(fmt(d.channelInfo.subscribers));
        if(d.totals?.viewsPerDay)setViews(fmt(d.totals.viewsPerDay*30));
      }
      if(d.countries?.length){
        const topCountry=d.countries[0]?.country;
        if(topCountry)setCountry(topCountry);
      }
    }).catch(()=>{});
  },[]);

  const generate=async()=>{
    if(!niche.trim()){toast?.error("Nicho obrigatório");return;}
    setLoading(true);pg?.start("💸 Criando Estratégia 360°",["Analisando nicho","Calculando AdSense","Mapeando afiliados","Planejando produtos","Timeline"]);
    try{const d=await researchApi.monetize360({niche,subscribers:subs,avgViews:views,country,style});pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Monetização 360°" sub="AdSense · Afiliados · Cursos · Patrocínios · Membership · Merch"/>

    {/* OAuth Revenue Card */}
    {revenue&&<div style={{background:`linear-gradient(135deg,#F59E0B08,${C.green}08)`,borderRadius:16,border:`1px solid #F59E0B20`,padding:24,marginBottom:20}}>
      <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",marginBottom:8}}>Receita real do canal {channelName} (últimos 28 dias via OAuth)</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:"#F59E0B"}}>${revenue.estimated?.toFixed(2)}</div><div style={{fontSize:10,color:C.dim}}>Receita Estimada</div></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:C.green}}>${revenue.cpm?.toFixed(2)}</div><div style={{fontSize:10,color:C.dim}}>CPM</div></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:C.blue}}>{fmt(revenue.monetizedPlaybacks)}</div><div style={{fontSize:10,color:C.dim}}>Playbacks Monetizados</div></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:C.purple}}>{fmt(revenue.adImpressions)}</div><div style={{fontSize:10,color:C.dim}}>Ad Impressions</div></div>
      </div>
      {revenue.cpm>0&&<div style={{marginTop:12,padding:12,background:"rgba(255,255,255,.02)",borderRadius:10}}>
        <div style={{fontSize:12,color:C.muted}}>💡 Projeção mensal com seu CPM atual: <strong style={{color:"#F59E0B"}}>${(revenue.cpm * (revenue.monetizedPlaybacks||0) / 1000 * (30/28)).toFixed(2)}/mês</strong></div>
        <div style={{fontSize:11,color:C.dim,marginTop:4}}>Se dobrar views: <strong style={{color:C.green}}>${(revenue.cpm * (revenue.monetizedPlaybacks||0) / 1000 * 2 * (30/28)).toFixed(2)}/mês</strong></div>
      </div>}
    </div>}

    {/* CPM Reference Table */}
    <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>💰 CPM Médio por País (referência 2026)</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
        {[["🇺🇸 EUA","$5-15"],["🇬🇧 UK","$4-12"],["🇩🇪 Alemanha","$4-10"],["🇨🇦 Canadá","$4-10"],["🇦🇺 Austrália","$4-10"],["🇧🇷 Brasil","$0.5-3"],["🇲🇽 México","$0.5-2"],["🇦🇷 Argentina","$0.3-1.5"],["🇮🇳 Índia","$0.3-1"],["🇵🇹 Portugal","$1-4"]].map(([c,v])=>
          <div key={c} style={{padding:8,borderRadius:8,background:"rgba(255,255,255,.02)",textAlign:"center"}}>
            <div style={{fontSize:12,marginBottom:2}}>{c}</div>
            <div style={{fontSize:13,fontWeight:700,color:"#F59E0B"}}>{v}</div>
          </div>
        )}
      </div>
      <div style={{fontSize:10,color:C.dim,marginTop:8}}>*CPM varia por nicho. Finanças/Tech = 3-5x maior. Gaming/Vlogs = mais baixo.</div>
    </div>

    {/* Generator inputs */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
      <div><Label t="Nicho *"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="história, dark..."/></div>
      <div><Label t="Inscritos"/><Input value={subs} onChange={e=>setSubs(e.target.value)} placeholder="1K"/></div>
      <div><Label t="Views médias"/><Input value={views} onChange={e=>setViews(e.target.value)} placeholder="10K"/></div>
      <div><Label t="País"/><Select value={country} onChange={e=>setCountry(e.target.value)}><option value="BR">Brasil</option><option value="US">EUA</option><option value="MX">México</option><option value="ES">Espanha</option><option value="PT">Portugal</option><option value="global">Global</option></Select></div>
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
          <div style={{fontSize:10,color:C.dim,marginBottom:4}}>⏱️ {s.timeToStart}</div>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:6}}>{s.howTo}</div>
          {s.platforms&&<div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:4}}>{s.platforms.map(p=><span key={p} style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:`${C.purple}10`,color:C.purple}}>{p}</span>)}</div>}
          {s.tips?.map((t,j)=><div key={j} style={{fontSize:10,color:C.dim,padding:"2px 0"}}>💡 {t}</div>)}
          {s.emailTemplate&&<button onClick={()=>{cp(s.emailTemplate);toast?.success("Template copiado!");}} style={{marginTop:6,padding:"6px 12px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10,width:"100%"}}>📋 Copiar Template Email</button>}
        </div>)}
      </div>

      {r.timeline&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:20,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📅 Timeline de Monetização</div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(r.timeline.length,4)},1fr)`,gap:12}}>
          {r.timeline.map((t,i)=><div key={i} style={{padding:12,background:"rgba(255,255,255,.02)",borderLeft:`3px solid ${i===0?C.red:i===1?"#F59E0B":C.green}`,borderRadius:0}}>
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
