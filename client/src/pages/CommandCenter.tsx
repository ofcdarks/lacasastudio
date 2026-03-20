// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const hdr=()=>({"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`});
const api={
  cmd:(data)=>fetch("/api/algorithm/command-center",{method:"POST",headers:hdr(),body:JSON.stringify(data)}).then(r=>r.json()),
  latest:()=>fetch("/api/algorithm/my-channel/latest-video",{headers:hdr()}).then(r=>r.json()),
  aiInsight:(data)=>fetch("/api/algorithm/command-center/insights",{method:"POST",headers:hdr(),body:JSON.stringify(data)}).then(r=>r.json()),
};
const fmt=n=>{if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);};
const LAYER_COLORS={testing:C.dim,core:C.blue,recent:C.purple,topic:C.orange,adjacent:C.green,viral:C.red};
const cp=txt=>{try{navigator.clipboard.writeText(txt)}catch{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}};

export default function CommandCenter(){
  const toast=useToast();const pg=useProgress();
  const[videoUrl,setVideoUrl]=useState("");const[r,setR]=useState(null);const[loading,setLoading]=useState(false);
  const[latestVids,setLatestVids]=useState([]);const[channelName,setChannelName]=useState("");
  const[aiResult,setAiResult]=useState(null);const[aiLoading,setAiLoading]=useState(false);

  useEffect(()=>{
    api.latest().then(d=>{
      if(d.videos?.length){setLatestVids(d.videos);setChannelName(d.channelName||"");
        if(d.latest?.videoId)setVideoUrl(`https://youtu.be/${d.latest.videoId}`);}
    }).catch(()=>{});
  },[]);

  const analyze=async(vid)=>{
    const url=vid||videoUrl;if(!url.trim()){toast?.error("URL obrigatória");return;}
    let id=url.trim();const m=url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);if(m)id=m[1];
    setLoading(true);setAiResult(null);
    pg?.start("🎯 Command Center",["YouTube Analytics","Camadas algoritmo","IA analisando","Plano de ação"]);
    try{const d=await api.cmd({videoId:id});if(d.error)throw new Error(d.error);setR(d);
      // Auto AI
      try{const ai=await api.aiInsight({video:d.video,layer:d.layer,vsChannel:d.vsChannel,channelName});if(!ai.error)setAiResult(ai);}catch{}
      pg?.done();
    }catch(e){pg?.fail(e.message);}setLoading(false);
  };

  const v=r?.video||{};const lc=LAYER_COLORS[r?.layer]||C.dim;

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Command Center — 48h" sub="Monitore + IA diz exatamente o que fazer agora"/>

    {latestVids.length>0&&<div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:C.dim,marginBottom:6}}>ÚLTIMOS VÍDEOS (clique para monitorar)</div>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
        {latestVids.map((vid,i)=><button key={i} onClick={()=>{setVideoUrl(`https://youtu.be/${vid.videoId}`);analyze(`https://youtu.be/${vid.videoId}`);}}
          style={{display:"flex",gap:8,padding:8,borderRadius:10,border:`1px solid ${C.border}`,background:"rgba(255,255,255,.02)",cursor:"pointer",minWidth:220,textAlign:"left",flexShrink:0}}>
          {vid.thumbnail&&<img src={vid.thumbnail} style={{width:60,height:34,borderRadius:6,objectFit:"cover"}}/>}
          <div><div style={{fontSize:11,fontWeight:600,color:C.text,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vid.title}</div>
            <div style={{fontSize:9,color:C.dim}}>{vid.publishedAt?.slice(0,10)}</div></div>
        </button>)}
      </div>
    </div>}

    <div style={{display:"flex",gap:10,marginBottom:24,alignItems:"end"}}>
      <div style={{flex:1}}><Label t="URL ou ID do Vídeo"/><Input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="Cole a URL..." onKeyDown={e=>e.key==="Enter"&&analyze()}/></div>
      <Btn onClick={()=>analyze()} disabled={loading}>{loading?"⏳":"🎯 Monitorar"}</Btn>
    </div>

    {r&&<div>
      {/* Video info card */}
      {v.title&&<div style={{display:"flex",gap:14,padding:14,background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,marginBottom:16,alignItems:"center"}}>
        {v.thumbnail&&<img src={v.thumbnail} style={{width:120,height:68,borderRadius:8,objectFit:"cover"}}/>}
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{v.title}</div>
          <div style={{display:"flex",gap:8,fontSize:10,color:C.dim}}>
            {v.publishedAt&&<span>📅 {v.publishedAt.slice(0,10)}</span>}
            {v.daysSincePublish!==null&&<span>({v.daysSincePublish} dias)</span>}
            {v.isFirst48h&&<span style={{color:C.red,fontWeight:700}}>🔥 Primeiras 48h!</span>}
            {v.tagCount>0&&<span>🏷️ {v.tagCount} tags</span>}
          </div>
        </div>
        {v.velocity>0&&<div style={{textAlign:"center",padding:"8px 14px",background:`${C.green}08`,borderRadius:10}}>
          <div style={{fontSize:18,fontWeight:800,color:C.green}}>{v.velocity}</div>
          <div style={{fontSize:9,color:C.dim}}>views/dia</div>
        </div>}
      </div>}

      {aiResult?.status&&<div style={{background:aiResult.status.includes("🟢")?`${C.green}08`:aiResult.status.includes("🟡")?`#F59E0B08`:`${C.red}08`,borderRadius:14,border:`1px solid ${aiResult.status.includes("🟢")?C.green:aiResult.status.includes("🟡")?"#F59E0B":C.red}20`,padding:20,marginBottom:20}}>
        <div style={{fontSize:18,fontWeight:800,marginBottom:6}}>{aiResult.status}</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{aiResult.diagnosis}</div>
      </div>}

      <div style={{background:`linear-gradient(135deg,${lc}08,${lc}04)`,borderRadius:16,border:`1px solid ${lc}25`,padding:24,marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:11,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Camada do Algoritmo</div>
        <div style={{fontSize:28,fontWeight:900,color:lc}}>{r.layerLabel}</div>
        <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:10}}>
          {["testing","core","recent","topic","adjacent","viral"].map(l=><div key={l} style={{width:40,height:6,borderRadius:3,background:l===r.layer?LAYER_COLORS[l]:"rgba(255,255,255,.06)"}}/>)}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",maxWidth:260,margin:"4px auto 0",fontSize:8,color:C.dim}}>
          <span>Test</span><span>Core</span><span>Recent</span><span>Topic</span><span>Adjacent</span><span>Viral</span>
        </div>
        {aiResult?.layerPrediction&&<div style={{fontSize:12,color:C.muted,marginTop:10}}>🔮 {aiResult.layerPrediction}</div>}
      </div>

      {/* Analytics delay warning for recent videos */}
      {v.isFirst48h&&v.avgDuration===0&&<div style={{background:"#F59E0B08",borderRadius:10,border:"1px solid #F59E0B20",padding:12,marginBottom:12,fontSize:11,color:"#F59E0B"}}>
        ⏳ YouTube Analytics tem delay de 48-72h. AVD, watch time e retenção serão atualizados automaticamente. Views, likes e comments já são em tempo real via Data API.
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>Views Total</div>
          <div style={{fontSize:22,fontWeight:800,color:C.green}}>{fmt(v.totalViews||v.views)}</div>
        </div>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>Likes</div>
          <div style={{fontSize:22,fontWeight:800,color:C.red}}>{fmt(v.totalLikes||v.likes)}</div>
        </div>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>Comments</div>
          <div style={{fontSize:22,fontWeight:800,color:C.blue}}>{fmt(v.totalComments||v.comments)}</div>
        </div>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>Satisfaction</div>
          <div style={{fontSize:22,fontWeight:800,color:v.satisfaction>=90?C.green:v.satisfaction>0?C.red:C.dim}}>{v.satisfaction>0?`${v.satisfaction}%`:"—"}</div>
        </div>
      </div>

      {/* Analytics metrics (may be delayed for recent videos) */}
      {(v.avgDuration>0||v.watchTime>0||v.views7d>0)&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        {v.views7d>0&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>7d Views</div>
          <div style={{fontSize:20,fontWeight:800,color:C.blue}}>{fmt(v.views7d)}</div>
        </div>}
        {v.watchTime>0&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>Watch Time</div>
          <div style={{fontSize:20,fontWeight:800,color:C.purple}}>{fmt(v.watchTime)}min</div>
        </div>}
        {v.avgDuration>0&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>AVD</div>
          <div style={{fontSize:20,fontWeight:800,color:C.orange}}>{Math.round(v.avgDuration)}s</div>
        </div>}
        {v.avgPct>0&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>Retenção</div>
          <div style={{fontSize:20,fontWeight:800,color:v.avgPct>=50?C.green:C.red}}>{Math.round(v.avgPct)}%</div>
        </div>}
      </div>}

      {/* Engagement rate calculated from Data API */}
      {(v.totalViews||v.views)>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim}}>Likes/Views</div>
          <div style={{fontSize:16,fontWeight:800,color:((v.totalLikes||v.likes)/(v.totalViews||v.views)*100)>=3?C.green:"#F59E0B"}}>{((v.totalLikes||v.likes)/(v.totalViews||v.views)*100).toFixed(1)}%</div>
        </div>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim}}>Comments/Views</div>
          <div style={{fontSize:16,fontWeight:800,color:((v.totalComments||v.comments)/(v.totalViews||v.views)*100)>=0.5?C.green:"#F59E0B"}}>{((v.totalComments||v.comments)/(v.totalViews||v.views)*100).toFixed(2)}%</div>
        </div>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim}}>Engajamento Total</div>
          <div style={{fontSize:16,fontWeight:800,color:(((v.totalLikes||v.likes)+(v.totalComments||v.comments)+(v.shares||0))/(v.totalViews||v.views)*100)>=5?C.green:"#F59E0B"}}>{(((v.totalLikes||v.likes)+(v.totalComments||v.comments)+(v.shares||0))/(v.totalViews||v.views)*100).toFixed(1)}%</div>
        </div>
      </div>}

      {r.vsChannel&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {[["Views vs Canal",r.vsChannel.viewsVsAvg,fmt(r.vsChannel.avgViews)+" avg"],["AVD vs Canal",r.vsChannel.durationVsAvg,r.vsChannel.avgDuration+"s avg"]].map(([label,pct,avg])=>
          <div key={label} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${pct>=100?C.green:C.red}20`,padding:16,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.dim}}>{label}</div>
            <div style={{fontSize:32,fontWeight:900,color:pct>=100?C.green:C.red}}>{pct}%</div>
            <div style={{fontSize:11,color:C.muted}}>{pct>=100?"Acima":"Abaixo"} ({avg})</div>
          </div>)}
      </div>}

      {aiResult?.immediateActions?.length>0&&<div style={{background:`${C.red}06`,borderRadius:14,border:`1px solid ${C.red}20`,padding:20,marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:16,color:C.red,marginBottom:12}}>⚡ Faça AGORA</div>
        {aiResult.immediateActions.map((a,i)=><div key={i} style={{padding:12,marginBottom:6,background:"rgba(255,255,255,.02)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontWeight:700,fontSize:13}}>{a.action}</div><div style={{fontSize:10,color:C.dim,marginTop:2}}>⏱️ {a.timeNeeded}</div></div>
          <span style={{fontSize:10,fontWeight:700,color:a.priority==="urgente"?C.red:"#F59E0B",padding:"4px 10px",borderRadius:6,background:a.priority==="urgente"?`${C.red}12`:`#F59E0B12`}}>{a.priority}</span>
        </div>)}
      </div>}

      {(aiResult?.thumbChange||aiResult?.titleChange)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {aiResult.thumbChange&&<div style={{background:`${C.red}06`,borderRadius:12,border:`1px solid ${C.red}20`,padding:14}}>
          <div style={{fontWeight:700,fontSize:13,color:C.red}}>🖼️ TROCAR THUMBNAIL</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>{aiResult.thumbReason}</div>
        </div>}
        {aiResult.titleChange&&<div style={{background:`${C.blue}06`,borderRadius:12,border:`1px solid ${C.blue}20`,padding:14}}>
          <div style={{fontWeight:700,fontSize:13,color:C.blue}}>✍️ TROCAR TÍTULO</div>
          <div style={{fontSize:13,fontWeight:600,marginTop:4}}>{aiResult.titleSuggestion}</div>
          <button onClick={()=>{cp(aiResult.titleSuggestion);toast?.success("Copiado!");}} style={{marginTop:6,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10}}>📋 Copiar novo título</button>
        </div>}
      </div>}

      {aiResult?.whatToPost&&<div style={{background:`${C.green}06`,borderRadius:12,border:`1px solid ${C.green}20`,padding:14,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,color:C.green}}>📢 Postar AGORA</div>
        <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.6}}>{aiResult.whatToPost}</div>
      </div>}

      {(aiResult?.seoQuickFix||aiResult?.engagementTip)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        {aiResult.seoQuickFix&&<div style={{background:`${C.blue}06`,borderRadius:12,border:`1px solid ${C.blue}20`,padding:14}}>
          <div style={{fontWeight:700,fontSize:12,color:C.blue,marginBottom:4}}>🔍 SEO Quick Fix</div>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>{aiResult.seoQuickFix}</div>
        </div>}
        {aiResult.engagementTip&&<div style={{background:`${C.purple}06`,borderRadius:12,border:`1px solid ${C.purple}20`,padding:14}}>
          <div style={{fontWeight:700,fontSize:12,color:C.purple,marginBottom:4}}>💬 Dica de Engajamento</div>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>{aiResult.engagementTip}</div>
        </div>}
      </div>}

      {aiResult?.nextCheckIn&&<div style={{textAlign:"center",fontSize:12,color:C.dim,marginBottom:20}}>⏰ Próximo check: {aiResult.nextCheckIn}</div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
        {[["❤️ Likes",fmt(v.totalLikes||v.likes),C.red],["💬 Comments",fmt(v.totalComments||v.comments),C.blue],["🔄 Shares",fmt(v.shares),C.purple],["👥 +Subs",`+${fmt(v.subsGained)}`,C.green]].map(([l,val,c])=>
          <div key={l} style={{background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`,padding:12,textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:c}}>{val}</div>
            <div style={{fontSize:10,color:C.dim}}>{l}</div>
          </div>)}
      </div>
    </div>}
  </div>;
}
