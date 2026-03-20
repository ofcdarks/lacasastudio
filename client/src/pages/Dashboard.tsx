// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Onboarding from "../components/shared/Onboarding";
import { researchApi } from "../lib/api";
import { C, Btn } from "../components/shared/UI";

const fmt=n=>{if(!n)return"0";if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return n.toString();};
const hdr=()=>({Authorization:`Bearer ${localStorage.getItem("lc_token")}`});

function StatCard({icon,label,value,color,path,sub}){
  const nav=useNavigate();const[h,setH]=useState(false);
  return<button onClick={()=>nav(path)} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:C.bgCard,borderRadius:14,border:`1px solid ${h?color+"25":C.border}`,padding:"16px 12px",cursor:"pointer",textAlign:"center",transition:"all 0.25s",transform:h?"translateY(-2px)":"none",position:"relative",overflow:"hidden"}}>
    {h&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:color}}/>}
    <div style={{fontSize:18,marginBottom:4}}>{icon}</div>
    <div style={{fontSize:24,fontWeight:800,color,letterSpacing:"-0.03em",lineHeight:1}}>{value}</div>
    <div style={{fontSize:9,color:C.dim,marginTop:4,fontWeight:600,textTransform:"uppercase"}}>{label}</div>
    {sub&&<div style={{fontSize:10,color:sub.c||C.dim,marginTop:2}}>{sub.t}</div>}
  </button>
}

function QuickAction({icon,label,desc,path,color,isNew}){
  const nav=useNavigate();const[h,setH]=useState(false);
  return<button onClick={()=>nav(path)} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:h?C.bgCardElevated:C.bgCard,borderRadius:14,border:`1px solid ${h?color+"20":C.border}`,padding:16,cursor:"pointer",textAlign:"left",transition:"all 0.25s",transform:h?"translateY(-2px)":"none",position:"relative",overflow:"hidden"}}>
    {isNew&&<span style={{position:"absolute",top:8,right:8,fontSize:8,fontWeight:800,color:C.green,background:`${C.green}15`,padding:"2px 6px",borderRadius:4}}>NEW</span>}
    <div style={{fontSize:22,marginBottom:8}}>{icon}</div>
    <div style={{fontWeight:700,fontSize:12,color:h?C.text:C.muted}}>{label}</div>
    <div style={{fontSize:10,color:C.dim,marginTop:4,lineHeight:1.5}}>{desc}</div>
  </button>
}

export default function Dashboard(){
  const nav=useNavigate();
  const{videos}=useApp();
  const[saved,setSaved]=useState([]);
  const[showOnboarding,setShowOnboarding]=useState(()=>!localStorage.getItem("lcs_onboarded"));
  // OAuth data
  const[oauthData,setOauthData]=useState(null);
  const[channels,setChannels]=useState([]);
  const[latestVid,setLatestVid]=useState(null);
  const[streak,setStreak]=useState(null);

  useEffect(()=>{
    researchApi.listSaved().then(s=>setSaved(Array.isArray(s)?s:[])).catch(()=>{});
    // Pull OAuth data
    fetch("/api/algorithm/oauth/status",{headers:hdr()}).then(r=>r.json()).then(d=>{
      if(d.connected){
        setChannels(d.channels||[]);
        // Get overview (7 days for dashboard)
        fetch("/api/algorithm/my-channel/overview?days=7",{headers:hdr()}).then(r=>r.json()).then(o=>{if(o.totals)setOauthData(o);}).catch(()=>{});
        // Latest video
        fetch("/api/algorithm/my-channel/latest-video",{headers:hdr()}).then(r=>r.json()).then(d=>{if(d.latest)setLatestVid(d.latest);}).catch(()=>{});
        // Streak
        fetch("/api/algorithm/streak/data",{headers:hdr()}).then(r=>r.json()).then(setStreak).catch(()=>{});
      }
    }).catch(()=>{});
  },[]);

  const t=oauthData?.totals||{};
  const g=oauthData?.growth||{};
  const hasOAuth=channels.length>0;

  return<div className="page-enter">
    {showOnboarding&&<Onboarding onClose={()=>{setShowOnboarding(false);localStorage.setItem("lcs_onboarded","1");}}/>}

    {/* Hero */}
    <div style={{marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
      <div>
        <div style={{fontSize:28,fontWeight:900,letterSpacing:"-0.04em",lineHeight:1.1}}>LaCasaStudio</div>
        <div style={{fontSize:13,color:C.dim,marginTop:6}}>YouTube Production OS — V2.4</div>
      </div>
      <div style={{display:"flex",gap:6}}>
        <Btn onClick={()=>nav("/pipeline")} vr="primary">Criar Canal</Btn>
        <Btn onClick={()=>nav("/research")} vr="ghost">Pesquisar</Btn>
      </div>
    </div>

    {/* ═══ OAUTH REAL DATA SECTION ═══ */}
    {hasOAuth&&oauthData&&<div style={{marginBottom:28}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontWeight:800,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>📺</span> Seu Canal — Últimos 7 Dias
          {channels.map(ch=><span key={ch.id} style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:`${C.red}12`,color:C.red,fontWeight:600}}>{ch.channelName}</span>)}
        </div>
        <button onClick={()=>nav("/my-analytics")} style={{fontSize:11,color:C.blue,background:"transparent",border:"none",cursor:"pointer",fontWeight:600}}>Ver completo →</button>
      </div>

      {/* Real stats from OAuth */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,marginBottom:12}}>
        <StatCard icon="👁️" label="Views" value={fmt(t.views)} color={C.green} path="/my-analytics" sub={g.viewsChange!==undefined?{t:`${g.viewsChange>0?"+":""}${g.viewsChange}%`,c:g.viewsChange>=0?C.green:C.red}:null}/>
        <StatCard icon="⏱️" label="Watch Time" value={`${fmt(Math.round(t.watchTime||0))}m`} color={C.blue} path="/my-analytics"/>
        <StatCard icon="📊" label="AVD" value={`${t.avgDuration||0}s`} color={C.purple} path="/my-analytics"/>
        <StatCard icon="📈" label="Retenção" value={`${t.avgPct||0}%`} color={(t.avgPct||0)>=50?C.green:C.red} path="/my-analytics"/>
        <StatCard icon="😊" label="Satisfaction" value={`${t.satisfaction||0}%`} color={(t.satisfaction||0)>=90?C.green:C.red} path="/my-analytics"/>
        <StatCard icon="👥" label="Net Subs" value={`+${fmt(t.netSubs||0)}`} color={(t.netSubs||0)>=0?C.green:C.red} path="/my-analytics" sub={g.subsChange!==undefined?{t:`${g.subsChange>0?"+":""}${g.subsChange}%`,c:g.subsChange>=0?C.green:C.red}:null}/>
        <StatCard icon="💬" label="Engajamento" value={`${t.engagementRate||0}%`} color={(t.engagementRate||0)>=5?C.green:"#F59E0B"} path="/my-analytics"/>
      </div>

      {/* Channel info bar */}
      {oauthData.channelInfo&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,marginBottom:12}}>
        <div style={{background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>👥</span>
          <div><div style={{fontSize:18,fontWeight:800,color:C.red}}>{fmt(oauthData.channelInfo.subscribers)}</div><div style={{fontSize:9,color:C.dim}}>inscritos</div></div>
        </div>
        <div style={{background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>🎬</span>
          <div><div style={{fontSize:18,fontWeight:800,color:C.blue}}>{fmt(oauthData.channelInfo.videoCount)}</div><div style={{fontSize:9,color:C.dim}}>vídeos</div></div>
        </div>
        {streak&&<div style={{background:C.bgCard,borderRadius:10,border:`1px solid ${streak.currentStreak>0?C.green:C.red}20`,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>nav("/streak")}>
          <span style={{fontSize:16}}>🔥</span>
          <div><div style={{fontSize:18,fontWeight:800,color:streak.currentStreak>0?C.green:C.red}}>{streak.currentStreak}</div><div style={{fontSize:9,color:C.dim}}>streak</div></div>
        </div>}
        <Btn onClick={()=>nav("/my-analytics")} vr="ghost" style={{fontSize:11}}>🧠 Pedir IA Coach</Btn>
      </div>}

      {/* Latest video quick card */}
      {latestVid&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:14,display:"flex",gap:12,alignItems:"center",cursor:"pointer"}} onClick={()=>nav("/command-center")}>
        {latestVid.thumbnail&&<img src={latestVid.thumbnail} style={{width:100,height:56,borderRadius:8,objectFit:"cover"}}/>}
        <div style={{flex:1}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",fontWeight:600,marginBottom:2}}>Último vídeo publicado</div>
          <div style={{fontWeight:700,fontSize:13}}>{latestVid.title}</div>
          <div style={{fontSize:10,color:C.dim,marginTop:2}}>{latestVid.publishedAt?.slice(0,10)}</div>
        </div>
        <div style={{textAlign:"center"}}>
          <Btn vr="ghost" style={{fontSize:10}}>🎯 Command Center</Btn>
        </div>
      </div>}
    </div>}

    {/* Not connected prompt */}
    {!hasOAuth&&<div style={{background:`linear-gradient(135deg,${C.red}06,${C.blue}06)`,borderRadius:16,border:`1px solid ${C.red}20`,padding:24,marginBottom:28,textAlign:"center"}}>
      <div style={{fontSize:16,fontWeight:800,marginBottom:6}}>🔗 Conecte seu YouTube para ver dados reais aqui</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Views, subs, satisfaction, retenção — tudo em tempo real + IA Coach</div>
      <Btn onClick={()=>nav("/my-analytics")}>Conectar Agora</Btn>
    </div>}

    {/* ═══ LOCAL DATA STATS ═══ */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
      <StatCard icon="📺" label="Canais Monitorados" value={saved.length} color={C.blue} path="/research"/>
      <StatCard icon="🎬" label="Vídeos Pipeline" value={videos.length} color={C.purple} path="/planner"/>
      <StatCard icon="👥" label="Subs Rastreados" value={fmt(saved.reduce((a,c)=>a+c.subscribers,0))} color={C.orange} path="/analytics"/>
      <StatCard icon="👁️" label="Views Rastreadas" value={fmt(saved.reduce((a,c)=>a+c.totalViews,0))} color={C.red} path="/analytics"/>
    </div>

    {/* ═══ QUICK ACTIONS ═══ */}
    <div style={{fontWeight:800,fontSize:15,display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
      <span style={{fontSize:16}}>⚡</span> Ações Rápidas
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
      <QuickAction icon="🎬" label="Canal do Zero" desc="Pipeline completo" path="/pipeline" color={C.red}/>
      <QuickAction icon="📜" label="Roteiro IA" desc="Palavra-por-palavra" path="/roteiro" color={C.green}/>
      <QuickAction icon="🔍" label="Pesquisar" desc="DNA Viral + Blueprint" path="/research" color={C.blue}/>
      <QuickAction icon="🖼️" label="Thumbnail" desc="Editor + geração IA" path="/thumbs" color={C.purple}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
      <QuickAction icon="🔑" label="Keywords" desc="Volume + competição" path="/keywords" color={C.blue} isNew/>
      <QuickAction icon="✅" label="SEO Audit" desc="Audit + IA corrige tudo" path="/seo-audit" color={C.green} isNew/>
      <QuickAction icon="💡" label="Ideias do Dia" desc="10 ideias multi-país" path="/daily-ideas" color={C.orange} isNew/>
      <QuickAction icon="🎯" label="Command Center" desc="Monitorar 48h + IA" path="/command-center" color={C.red} isNew/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
      <QuickAction icon="📈" label="Tendências" desc="12 países + IA" path="/algoritmo" color={C.red} isNew/>
      <QuickAction icon="🧪" label="A/B Testing" desc="Thumb + título" path="/ab-testing" color={C.purple} isNew/>
      <QuickAction icon="💸" label="Monetizar" desc="CPM + sponsors + afiliados" path="/monetizar" color={C.green}/>
      <QuickAction icon="♻️" label="Repurpose" desc="1 vídeo → 10+ peças" path="/repurpose" color={C.blue}/>
    </div>

    {/* Top channels */}
    {saved.length>0&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontWeight:800,fontSize:15,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>📺</span> Top Canais Monitorados</div>
        <button onClick={()=>nav("/research")} style={{fontSize:11,color:C.blue,background:"transparent",border:"none",cursor:"pointer",fontWeight:600}}>Ver todos →</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
        {[...saved].sort((a,b)=>b.score-a.score).slice(0,8).map(ch=>
          <div key={ch.id} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"12px 10px",display:"flex",gap:8,alignItems:"center",cursor:"pointer"}} onClick={()=>nav("/research")}>
            {ch.thumbnail?<img src={ch.thumbnail} style={{width:28,height:28,borderRadius:"50%"}}/>:<div style={{width:28,height:28,borderRadius:"50%",background:`${C.red}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.red}}>{ch.name?.[0]}</div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</div>
              <div style={{fontSize:9,color:C.dim}}>{fmt(ch.subscribers)} subs</div>
            </div>
            <div style={{fontSize:14,fontWeight:800,color:ch.score>=70?C.green:ch.score>=40?C.orange:C.red}}>{ch.score}</div>
          </div>
        )}
      </div>
    </div>}
  </div>
}
