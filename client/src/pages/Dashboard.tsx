// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Onboarding from "../components/shared/Onboarding";
import { researchApi } from "../lib/api";
import { C, Btn } from "../components/shared/UI";

const fmt=n=>{if(!n)return"0";if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return n.toString();};

function StatCard({icon,label,value,color,path,desc}){
  const nav=useNavigate();const[h,setH]=useState(false);
  return<button onClick={()=>nav(path)} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:C.bgCard,borderRadius:14,border:`1px solid ${h?color+"25":C.border}`,padding:"20px 16px",cursor:"pointer",textAlign:"center",transition:"all 0.25s cubic-bezier(0.4,0,0.2,1)",transform:h?"translateY(-2px)":"none",boxShadow:h?`0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${color}12`:"none",position:"relative",overflow:"hidden"}}>
    {h&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color},${color}60)`}}/>}
    <div style={{fontSize:22,marginBottom:6,filter:h?"none":"grayscale(0.3)",transition:"filter 0.2s"}}>{icon}</div>
    <div style={{fontSize:28,fontWeight:800,color,letterSpacing:"-0.03em",lineHeight:1}}>{value}</div>
    <div style={{fontSize:10,color:C.dim,marginTop:6,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</div>
  </button>
}

function QuickAction({icon,label,desc,path,color,isNew}){
  const nav=useNavigate();const[h,setH]=useState(false);
  return<button onClick={()=>nav(path)} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:h?C.bgCardElevated:C.bgCard,borderRadius:14,border:`1px solid ${h?color+"20":C.border}`,padding:18,cursor:"pointer",textAlign:"left",transition:"all 0.25s cubic-bezier(0.4,0,0.2,1)",transform:h?"translateY(-2px)":"none",boxShadow:h?`0 8px 24px rgba(0,0,0,0.3)`:"none",position:"relative",overflow:"hidden"}}>
    {isNew&&<span style={{position:"absolute",top:8,right:8,fontSize:8,fontWeight:800,color:C.green,background:`${C.green}15`,padding:"2px 6px",borderRadius:4,letterSpacing:"0.06em"}}>NEW</span>}
    <div style={{fontSize:26,marginBottom:10}}>{icon}</div>
    <div style={{fontWeight:700,fontSize:13,color:h?C.text:C.muted,transition:"color 0.2s",letterSpacing:"-0.01em"}}>{label}</div>
    <div style={{fontSize:10.5,color:C.dim,marginTop:5,lineHeight:1.55}}>{desc}</div>
  </button>
}

function SectionHeader({title,icon,action}){
  return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
    <div style={{fontWeight:800,fontSize:15,letterSpacing:"-0.02em",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{icon}</span>{title}</div>
    {action}
  </div>
}

export default function Dashboard(){
  const nav=useNavigate();
  const{videos,channels}=useApp();
  const[saved,setSaved]=useState([]);
  const[identities,setIdentities]=useState([]);
  const[showOnboarding,setShowOnboarding]=useState(()=>!localStorage.getItem("lcs_onboarded"));

  useEffect(()=>{
    researchApi.listSaved().then(s=>{const arr=Array.isArray(s)?s:[];setSaved(arr);setIdentities(arr.filter(ch=>{try{return JSON.parse(ch.notes||"{}").mockup;}catch{return false;}}));}).catch(()=>{});
  },[]);

  const totalSubs=saved.reduce((a,c)=>a+c.subscribers,0);
  const totalViews=saved.reduce((a,c)=>a+c.totalViews,0);

  return<div className="page-enter">
    {showOnboarding&&<Onboarding onClose={()=>{setShowOnboarding(false);localStorage.setItem("lcs_onboarded","1");}}/>}

    {/* Hero Header */}
    <div style={{marginBottom:32,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
      <div>
        <div style={{fontSize:28,fontWeight:900,letterSpacing:"-0.04em",lineHeight:1.1}}>LaCasaStudio</div>
        <div style={{fontSize:13,color:C.dim,marginTop:6,letterSpacing:"0.02em"}}>YouTube Production OS — V2.4</div>
      </div>
      <div style={{display:"flex",gap:6}}>
        <Btn onClick={()=>nav("/pipeline")} vr="primary">Criar Canal</Btn>
        <Btn onClick={()=>nav("/research")} vr="ghost">Pesquisar</Btn>
      </div>
    </div>

    {/* Stats Row */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:32}}>
      <StatCard icon="📺" label="Canais Monitorados" value={saved.length} color={C.blue} path="/research"/>
      <StatCard icon="🚀" label="Identidades" value={identities.length} color={C.green} path="/research"/>
      <StatCard icon="🎬" label="Vídeos" value={videos.length} color={C.purple} path="/planner"/>
      <StatCard icon="👥" label="Subs Rastreados" value={fmt(totalSubs)} color={C.orange} path="/analytics"/>
      <StatCard icon="👁️" label="Views Rastreadas" value={fmt(totalViews)} color={C.red} path="/analytics"/>
    </div>

    {/* Quick Actions - Creation */}
    <SectionHeader title="Criar" icon="⚡"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
      <QuickAction icon="🎬" label="Canal do Zero" desc="Pipeline: nicho → identidade → roteiros → calendário" path="/pipeline" color={C.red}/>
      <QuickAction icon="🔍" label="Pesquisar Nicho" desc="Canais, DNA viral e oportunidades de mercado" path="/research" color={C.blue}/>
      <QuickAction icon="📜" label="Roteiro Completo" desc="Palavra-por-palavra com narração e cues visuais" path="/roteiro" color={C.green}/>
      <QuickAction icon="🖼️" label="Thumbnail IA" desc="Editor de thumbnails + geração de alto impacto" path="/thumbs" color={C.purple}/>
    </div>

    {/* Quick Actions - Intelligence */}
    <SectionHeader title="Inteligência" icon="🧠"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
      <QuickAction icon="📸" label="Analisar Prints" desc="Upload prints de canais, IA encontra oportunidades" path="/analyzer" color={C.orange}/>
      <QuickAction icon="🔮" label="Prever Viralização" desc="Views e receita estimadas antes de publicar" path="/preditor" color={C.red}/>
      <QuickAction icon="💸" label="Monetizar 360°" desc="6 fontes de receita com estratégia completa" path="/monetizar" color={C.green}/>
      <QuickAction icon="♻️" label="Repurpose" desc="1 vídeo → 10+ peças multiplataforma" path="/repurpose" color={C.blue}/>
    </div>

    {/* Quick Actions - NEW Data Features */}
    <SectionHeader title="Dados" icon="📊"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
      <QuickAction icon="🔑" label="Keywords" desc="Volume, competição e score com dados reais" path="/keywords" color={C.blue} isNew/>
      <QuickAction icon="🏷️" label="Tag Spy" desc="Descubra tags de qualquer vídeo do YouTube" path="/tag-spy" color={C.teal} isNew/>
      <QuickAction icon="✅" label="SEO Audit" desc="Audite SEO de vídeos publicados ou pré-publish" path="/seo-audit" color={C.green} isNew/>
      <QuickAction icon="💡" label="Ideias do Dia" desc="10 ideias personalizadas baseadas em trends" path="/daily-ideas" color={C.orange} isNew/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:32}}>
      <QuickAction icon="📊" label="Comparador" desc="Head-to-head entre canais com radar chart" path="/compare" color={C.purple} isNew/>
      <QuickAction icon="🎯" label="Retenção" desc="Análise cena-por-cena de retenção do vídeo" path="/retention" color={C.red} isNew/>
      <QuickAction icon="✂️" label="Shorts Clipper" desc="Extraia 5 shorts virais do seu roteiro" path="/shorts-clip" color={C.pink} isNew/>
      <QuickAction icon="⚡" label="Armas do Algoritmo" desc="Spy alerts, tendências, melhor horário" path="/algoritmo" color={C.red}/>
    </div>

    {/* Recent Identities */}
    {identities.length>0&&<div style={{marginBottom:28}}>
      <SectionHeader title="Identidades Recentes" icon="🚀"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
        {identities.slice(0,4).map(ch=>{let m=null;let imgs={};try{const p=JSON.parse(ch.notes);m=p.mockup;imgs=p.mockImgs||{};}catch{};return m?<div key={ch.id} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",cursor:"pointer",transition:"all 0.2s"}} onClick={()=>nav("/research")}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderH}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{height:50,background:imgs.banner?`url(${imgs.banner}) center/cover`:`linear-gradient(135deg,${m.colors?.primary||"#1a1a2e"},${m.colors?.secondary||"#16213e"})`}}/>
          <div style={{padding:"14px 16px",display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:imgs.logo?`url(${imgs.logo}) center/cover`:`linear-gradient(135deg,${m.colors?.primary||C.red},${m.colors?.accent||C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff",flexShrink:0}}>{!imgs.logo&&(m.channelName?.[0]||"C")}</div>
            <div><div style={{fontWeight:700,fontSize:13}}>{m.channelName}</div><div style={{fontSize:10,color:C.dim}}>Baseado em: {ch.name}</div></div>
          </div>
        </div>:null})}
      </div>
    </div>}

    {/* Top Monitored Channels */}
    {saved.length>0&&<div>
      <SectionHeader title="Top Canais Monitorados" icon="📺" action={
        <button onClick={()=>nav("/research")} style={{fontSize:11,color:C.blue,background:"transparent",border:"none",cursor:"pointer",fontWeight:600,letterSpacing:"0.02em"}}>Ver todos →</button>
      }/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
        {[...saved].sort((a,b)=>b.score-a.score).slice(0,8).map(ch=>
          <div key={ch.id} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 12px",display:"flex",gap:10,alignItems:"center",transition:"all 0.2s",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderH}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
            onClick={()=>nav("/research")}>
            {ch.thumbnail?<img src={ch.thumbnail} style={{width:32,height:32,borderRadius:"50%"}}/>:<div style={{width:32,height:32,borderRadius:"50%",background:`${C.red}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.red}}>{ch.name?.[0]}</div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</div>
              <div style={{fontSize:10,color:C.dim,marginTop:2}}>{fmt(ch.subscribers)} subs</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:800,color:ch.score>=70?C.green:ch.score>=40?C.orange:C.red}}>{ch.score}</div>
              <div style={{fontSize:8,color:C.dim,letterSpacing:"0.06em"}}>SCORE</div>
            </div>
          </div>
        )}
      </div>
    </div>}
  </div>
}
