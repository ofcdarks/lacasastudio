// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Onboarding from "../components/shared/Onboarding";
import { researchApi } from "../lib/api";
import { C, Btn } from "../components/shared/UI";

const fmt=n=>{if(!n)return"0";if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return n.toString();};

function QuickAction({icon,label,desc,path,color}){const nav=useNavigate();return<button onClick={()=>nav(path)} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:18,cursor:"pointer",textAlign:"left",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=color+"50";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
  <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
  <div style={{fontWeight:700,fontSize:13,color:C.text}}>{label}</div>
  <div style={{fontSize:10,color:C.dim,marginTop:3,lineHeight:1.5}}>{desc}</div>
</button>}

export default function Dashboard(){
  const nav=useNavigate();
  const{videos,channels}=useApp();
  const[saved,setSaved]=useState([]);
  const[identities,setIdentities]=useState([]);
  const[showOnboarding,setShowOnboarding]=useState(()=>!localStorage.getItem("lcs_onboarded"));

  useEffect(()=>{
    researchApi.listSaved().then(s=>{setSaved(s);setIdentities(s.filter(ch=>{try{return JSON.parse(ch.notes||"{}").mockup;}catch{return false;}}));}).catch(()=>{});
  },[]);

  const totalSubs=saved.reduce((a,c)=>a+c.subscribers,0);
  const totalViews=saved.reduce((a,c)=>a+c.totalViews,0);

  return<div className="page-enter">
    {showOnboarding&&<Onboarding onClose={()=>{setShowOnboarding(false);localStorage.setItem("lcs_onboarded","1");}}/>}
    {/* Header */}
    <div style={{marginBottom:28}}>
      <div style={{fontSize:28,fontWeight:900,marginBottom:4}}>LaCasaStudio</div>
      <div style={{fontSize:13,color:C.dim}}>YouTube Production OS — Sua máquina de criação de canais</div>
    </div>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:28}}>
      {[["Canais Monitorados",saved.length,"📺",C.blue,"/research"],["Identidades Criadas",identities.length,"🚀",C.green,"/research"],["Vídeos Planejados",videos.length,"🎬",C.purple,"/planner"],["Subs Rastreados",fmt(totalSubs),"👥","#F59E0B","/analytics"],["Views Rastreadas",fmt(totalViews),"👁️",C.red,"/analytics"]].map(([l,v,i,c,p])=>
        <button key={l} onClick={()=>nav(p)} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,textAlign:"center",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=c+"50"} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{fontSize:20}}>{i}</div>
          <div style={{fontSize:24,fontWeight:900,color:c,marginTop:4}}>{v}</div>
          <div style={{fontSize:9,color:C.dim,marginTop:2}}>{l}</div>
        </button>
      )}
    </div>

    {/* Quick Actions */}
    <div style={{fontWeight:800,fontSize:16,marginBottom:12}}>⚡ Ações Rápidas</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
      <QuickAction icon="🎬" label="Criar Canal do Zero" desc="Pipeline completo: nicho → identidade → roteiros → calendário" path="/pipeline" color={C.red}/>
      <QuickAction icon="🔍" label="Pesquisar Nicho" desc="Busca canais, analisa DNA viral e encontra oportunidades" path="/research" color={C.blue}/>
      <QuickAction icon="📜" label="Criar Roteiro" desc="Roteiro palavra-por-palavra com narração e cues visuais" path="/roteiro" color={C.green}/>
      <QuickAction icon="🖼️" label="Criar Thumbnail" desc="Editor de thumbnails com IA + geração de alto impacto" path="/thumbs" color={C.purple}/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
      <QuickAction icon="📸" label="Analisar Prints" desc="Suba prints de canais e a IA encontra oportunidades" path="/analyzer" color="#F59E0B"/>
      <QuickAction icon="🔮" label="Prever Viralização" desc="Preveja views e receita antes de publicar" path="/preditor" color={C.red}/>
      <QuickAction icon="💸" label="Monetizar Canal" desc="Estratégia 360° com 6 fontes de receita" path="/monetizar" color={C.green}/>
      <QuickAction icon="♻️" label="Repurpose" desc="1 vídeo → 10+ peças de conteúdo multiplataforma" path="/repurpose" color={C.blue}/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
      <QuickAction icon="⚡" label="Armas do Algoritmo" desc="Spy alerts, tendências, melhor horário, engajamento" path="/algoritmo" color={C.red}/>
    </div>

    {/* Recent identities */}
    {identities.length>0&&<div style={{marginBottom:24}}>
      <div style={{fontWeight:800,fontSize:16,marginBottom:12}}>🚀 Identidades Recentes</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
        {identities.slice(0,4).map(ch=>{let m=null;let imgs={};try{const p=JSON.parse(ch.notes);m=p.mockup;imgs=p.mockImgs||{};}catch{};return m?<div key={ch.id} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",cursor:"pointer"}} onClick={()=>nav("/research")}>
          <div style={{height:50,background:imgs.banner?`url(${imgs.banner}) center/cover`:`linear-gradient(135deg,${m.colors?.primary||"#1a1a2e"},${m.colors?.secondary||"#16213e"})`}}/>
          <div style={{padding:"12px 14px",display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:imgs.logo?`url(${imgs.logo}) center/cover`:`linear-gradient(135deg,${m.colors?.primary||C.red},${m.colors?.accent||C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff",flexShrink:0}}>{!imgs.logo&&(m.channelName?.[0]||"C")}</div>
            <div><div style={{fontWeight:700,fontSize:13}}>{m.channelName}</div><div style={{fontSize:9,color:C.dim}}>Baseado em: {ch.name}</div></div>
          </div>
        </div>:null})}
      </div>
    </div>}

    {/* Saved channels quick view */}
    {saved.length>0&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:16}}>📺 Top Canais Monitorados</div>
        <button onClick={()=>nav("/research")} style={{fontSize:11,color:C.blue,background:"transparent",border:"none",cursor:"pointer"}}>Ver todos →</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
        {[...saved].sort((a,b)=>b.score-a.score).slice(0,8).map(ch=>
          <div key={ch.id} style={{background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`,padding:12,display:"flex",gap:8,alignItems:"center"}}>
            {ch.thumbnail?<img src={ch.thumbnail} style={{width:30,height:30,borderRadius:"50%"}}/>:<div style={{width:30,height:30,borderRadius:"50%",background:`${C.red}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.red}}>{ch.name?.[0]}</div>}
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</div><div style={{fontSize:9,color:C.dim}}>{fmt(ch.subscribers)} · Score {ch.score}</div></div>
          </div>
        )}
      </div>
    </div>}
  </div>
}
