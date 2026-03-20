// @ts-nocheck
import { useState } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api={cmd:(data)=>fetch("/api/algorithm/command-center",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(data)}).then(r=>r.json())};
const fmt=n=>{if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);};
const LAYER_COLORS={testing:C.dim,core:C.blue,recent:C.purple,topic:C.orange,adjacent:C.green,viral:C.red};

function Ring({score,size=90,label}){const r=size/2-6,circ=2*Math.PI*r,off=circ-(score/100)*circ;const c=score>=80?C.green:score>=60?"#F59E0B":C.red;return<div style={{textAlign:"center"}}><svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="5"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset .8s"}}/><text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size*.28} fontWeight="800">{score}</text></svg>{label&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>{label}</div>}</div>}

export default function CommandCenter(){
  const toast=useToast();const pg=useProgress();
  const[videoUrl,setVideoUrl]=useState("");const[r,setR]=useState(null);const[loading,setLoading]=useState(false);

  const analyze=async()=>{
    if(!videoUrl.trim()){toast?.error("URL obrigatória");return;}
    let id=videoUrl.trim();const m=videoUrl.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);if(m)id=m[1];
    setLoading(true);pg?.start("🎯 Command Center 48h",["Conectando YouTube Analytics","CTR em tempo real","Analisando camadas","Comparando com canal"]);
    try{const d=await api.cmd({videoId:id});if(d.error)throw new Error(d.error);pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  const v=r?.video||{};const lc=LAYER_COLORS[r?.layer]||C.dim;

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Command Center — 48h" sub="Monitore as primeiras 48 horas críticas do seu vídeo com dados reais"/>
    <div style={{display:"flex",gap:10,marginBottom:24,alignItems:"end"}}>
      <div style={{flex:1}}><Label t="URL ou ID do Vídeo Publicado"/><Input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="Cole a URL do YouTube..." onKeyDown={e=>e.key==="Enter"&&analyze()}/></div>
      <Btn onClick={analyze} disabled={loading}>{loading?"⏳":"🎯 Monitorar"}</Btn>
    </div>

    {r&&<div>
      {/* Layer indicator */}
      <div style={{background:`linear-gradient(135deg,${lc}08,${lc}04)`,borderRadius:16,border:`1px solid ${lc}25`,padding:24,marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:11,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Camada do Algoritmo</div>
        <div style={{fontSize:28,fontWeight:900,color:lc}}>{r.layerLabel}</div>
        <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:10}}>
          {["testing","core","recent","topic","adjacent","viral"].map(l=><div key={l} style={{width:40,height:6,borderRadius:3,background:l===r.layer?LAYER_COLORS[l]:"rgba(255,255,255,.06)",transition:"all 0.3s"}}/>)}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",maxWidth:260,margin:"4px auto 0",fontSize:8,color:C.dim}}>
          <span>Test</span><span>Core</span><span>Recent</span><span>Topic</span><span>Adjacent</span><span>Viral</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20}}>
        {[["Views",fmt(v.views),C.green],["Watch Time",`${fmt(v.watchTime)}min`,C.blue],["AVD",`${Math.round(v.avgDuration)}s`,C.purple],["Retenção",`${Math.round(v.avgPct)}%`,v.avgPct>=50?C.green:C.red],["Satisfaction",`${v.satisfaction}%`,v.satisfaction>=90?C.green:C.red]].map(([l,val,c])=>
          <div key={l} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
            <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>{l}</div>
            <div style={{fontSize:20,fontWeight:800,color:c}}>{val}</div>
          </div>
        )}
      </div>

      {/* Vs Channel Average */}
      {r.vsChannel&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${r.vsChannel.viewsVsAvg>=100?C.green:C.red}20`,padding:16,textAlign:"center"}}>
          <div style={{fontSize:11,color:C.dim}}>Views vs Média do Canal</div>
          <div style={{fontSize:32,fontWeight:900,color:r.vsChannel.viewsVsAvg>=100?C.green:C.red}}>{r.vsChannel.viewsVsAvg}%</div>
          <div style={{fontSize:11,color:C.muted}}>{r.vsChannel.viewsVsAvg>=100?"Acima da média":"Abaixo da média"} ({fmt(r.vsChannel.avgViews)} avg)</div>
        </div>
        <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${r.vsChannel.durationVsAvg>=100?C.green:C.red}20`,padding:16,textAlign:"center"}}>
          <div style={{fontSize:11,color:C.dim}}>AVD vs Média do Canal</div>
          <div style={{fontSize:32,fontWeight:900,color:r.vsChannel.durationVsAvg>=100?C.green:C.red}}>{r.vsChannel.durationVsAvg}%</div>
          <div style={{fontSize:11,color:C.muted}}>{r.vsChannel.durationVsAvg>=100?"Acima da média":"Abaixo da média"} ({r.vsChannel.avgDuration}s avg)</div>
        </div>
      </div>}

      {/* Engagement */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
        {[["❤️ Likes",fmt(v.likes),C.red],["💬 Comments",fmt(v.comments),C.blue],["🔄 Shares",fmt(v.shares),C.purple],["👥 +Subs",`+${fmt(v.subsGained)}`,C.green]].map(([l,val,c])=>
          <div key={l} style={{background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`,padding:12,textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:c}}>{val}</div>
            <div style={{fontSize:10,color:C.dim}}>{l}</div>
          </div>
        )}
      </div>

      {/* Daily chart */}
      {r.daily?.length>0&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>📊 Evolução</div>
        <div style={{display:"flex",gap:4,height:60,alignItems:"end"}}>
          {r.daily.map((d,i)=>{const max=Math.max(...r.daily.map(x=>x.views))||1;return<div key={i} style={{flex:1,background:`${C.green}40`,height:`${(d.views/max)*100}%`,borderRadius:"3px 3px 0 0",minHeight:2}}/>})}
        </div>
      </div>}
    </div>}
  </div>;
}
