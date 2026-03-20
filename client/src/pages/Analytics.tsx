// @ts-nocheck
import { useState, useEffect } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

function Ring({score,size=60,label}){const r=size/2-5,circ=2*Math.PI*r,off=circ-(score/100)*circ;const c=score>=80?C.green:score>=60?"#F59E0B":C.red;return<div style={{textAlign:"center"}}><svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset .8s"}}/><text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size*.25} fontWeight="800">{score}</text></svg>{label&&<div style={{fontSize:9,color:C.dim,marginTop:2}}>{label}</div>}</div>}

const fmt=n=>{if(!n)return"0";if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return n.toString();};

export default function Analytics(){
  const toast=useToast();const pg=useProgress();
  const[saved,setSaved]=useState([]);
  const[spyData,setSpyData]=useState(null);
  const[loading,setLoading]=useState(false);

  useEffect(()=>{researchApi.listSaved().then(setSaved).catch(()=>{});},[]);

  const refresh=async()=>{
    if(!saved.length){toast?.error("Salve canais primeiro na Inteligência de Mercado");return;}
    setLoading(true);pg?.start("📊 Atualizando Analytics",saved.map(s=>s.name));
    try{const r=await researchApi.spy(saved.map(s=>s.ytChannelId));pg?.done();setSpyData(r);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  useEffect(()=>{if(saved.length>0&&!spyData)refresh();},[saved]);

  const totalSubs=saved.reduce((a,c)=>a+c.subscribers,0);
  const totalViews=saved.reduce((a,c)=>a+c.totalViews,0);
  const avgScore=saved.length?Math.round(saved.reduce((a,c)=>a+c.score,0)/saved.length):0;
  const identities=saved.filter(ch=>{try{return JSON.parse(ch.notes||"{}").mockup;}catch{return false;}});

  return<div className="page-enter">
    <Hdr title="Analytics" sub={`Monitorando ${saved.length} canais salvos · Visão geral do ecossistema`} action={<Btn onClick={refresh} disabled={loading}>{loading?"⏳":"🔄 Atualizar"}</Btn>}/>

    {/* Overview cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}}>
      {[["Canais Salvos",saved.length,"📺",C.blue],["Identidades",identities.length,"🚀",C.green],["Subs Totais",fmt(totalSubs),"👥",C.purple],["Views Totais",fmt(totalViews),"👁️","#F59E0B"],["Score Médio",avgScore,"⭐",avgScore>=70?C.green:C.red]].map(([l,v,i,c])=>
        <div key={l} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:18,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:4}}>{i}</div>
          <div style={{fontSize:26,fontWeight:900,color:c}}>{v}</div>
          <div style={{fontSize:10,color:C.dim,marginTop:4}}>{l}</div>
        </div>
      )}
    </div>

    {/* Ranking */}
    {saved.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:18}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🏆 Ranking por Score</div>
        {[...saved].sort((a,b)=>b.score-a.score).slice(0,10).map((ch,i)=><div key={ch.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:16,fontWeight:900,color:i<3?C.red:C.dim,minWidth:24}}>{i+1}</span>
          {ch.thumbnail?<img src={ch.thumbnail} style={{width:28,height:28,borderRadius:"50%"}}/>:<div style={{width:28,height:28,borderRadius:"50%",background:`${C.red}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.red}}>{ch.name?.[0]}</div>}
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{ch.name}</div><div style={{fontSize:9,color:C.dim}}>{fmt(ch.subscribers)} subs · {fmt(ch.totalViews)} views</div></div>
          <Ring score={ch.score} size={36}/>
        </div>)}
      </div>

      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:18}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>📈 Views por Canal</div>
        {[...saved].sort((a,b)=>b.totalViews-a.totalViews).slice(0,10).map((ch,i)=>{const maxV=saved[0]?Math.max(...saved.map(s=>s.totalViews)):1;return<div key={ch.id} style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{fontWeight:600}}>{ch.name}</span><span style={{color:C.green,fontWeight:700}}>{fmt(ch.totalViews)}</span></div>
          <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,.06)",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:`linear-gradient(90deg,${C.green},${C.blue})`,width:`${(ch.totalViews/maxV)*100}%`,transition:"width .5s"}}/></div>
        </div>})}
      </div>
    </div>}

    {/* Spy - recent videos */}
    {spyData?.channels?.length>0&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:18,marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🕵️ Últimos Vídeos dos Canais Monitorados</div>
      <div style={{display:"grid",gap:8}}>
        {spyData.channels.flatMap(ch=>ch.recentVideos?.slice(0,2).map(v=>({...v,channelName:ch.name,channelThumb:ch.thumbnail}))||[]).sort((a,b)=>b.views-a.views).slice(0,12).map((v,i)=>
          <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:800,color:C.dim,minWidth:20}}>{i+1}</span>
            {v.thumbnail?<img src={v.thumbnail} style={{width:80,height:45,borderRadius:6,objectFit:"cover"}}/>:<div style={{width:80,height:45,borderRadius:6,background:"rgba(255,255,255,.04)"}}/>}
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:12,lineHeight:1.4}}>{v.title}</div>
              <div style={{fontSize:10,color:C.dim}}>{v.channelName} · {v.publishedAt?new Date(v.publishedAt).toLocaleDateString("pt-BR"):""}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:14,fontWeight:800,color:C.green}}>{fmt(v.views)}</div><div style={{fontSize:9,color:C.dim}}>views</div></div>
          </div>
        )}
      </div>
    </div>}

    {/* Niche distribution */}
    {saved.length>0&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:18}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🎯 Distribuição por Nicho</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {Object.entries(saved.reduce((a,ch)=>{const n=ch.niche||"Sem nicho";a[n]=(a[n]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).map(([niche,count])=>
          <div key={niche} style={{padding:"6px 12px",borderRadius:8,background:`${C.purple}10`,border:`1px solid ${C.purple}20`,fontSize:11}}>
            <span style={{fontWeight:700,color:C.purple}}>{niche}</span> <span style={{color:C.dim}}>({count})</span>
          </div>
        )}
      </div>
    </div>}
  </div>
}
