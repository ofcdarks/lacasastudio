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
  saveActions:(data)=>fetch("/api/algorithm/actions",{method:"POST",headers:hdr(),body:JSON.stringify(data)}).then(r=>r.json()),
  toggleAction:(id,note)=>fetch(`/api/algorithm/actions/${id}/toggle`,{method:"PUT",headers:hdr(),body:JSON.stringify({note})}).then(r=>r.json()),
  getActions:(videoId)=>fetch(`/api/algorithm/actions/${videoId}`,{headers:hdr()}).then(r=>r.json()),
  getHistory:()=>fetch("/api/algorithm/actions-history",{headers:hdr()}).then(r=>r.json()),
};
const fmt=n=>{if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);};
const LAYER_COLORS={testing:C.dim,core:C.blue,recent:C.purple,topic:C.orange,adjacent:C.green,viral:C.red};
const cp=txt=>{navigator.clipboard?.writeText(txt).catch(()=>{})};

export default function CommandCenter(){
  const toast=useToast();const pg=useProgress();
  const[videoUrl,setVideoUrl]=useState("");const[r,setR]=useState(null);const[loading,setLoading]=useState(false);
  const[latestVids,setLatestVids]=useState([]);const[channelName,setChannelName]=useState("");
  const[aiResult,setAiResult]=useState(null);const[aiLoading,setAiLoading]=useState(false);
  // Checklist + History
  const[checklist,setChecklist]=useState([]);
  const[prevActions,setPrevActions]=useState([]);
  const[history,setHistory]=useState([]);
  const[showHistory,setShowHistory]=useState(false);
  const[curVideoId,setCurVideoId]=useState("");

  useEffect(()=>{
    api.latest().then(d=>{
      if(d.videos?.length){setLatestVids(d.videos);setChannelName(d.channelName||"");
        if(d.latest?.videoId)setVideoUrl(`https://youtu.be/${d.latest.videoId}`);}
    }).catch(()=>{});
    // Load history
    api.getHistory().then(h=>{if(Array.isArray(h))setHistory(h);}).catch(()=>{});
  },[]);

  const analyze=async(vid)=>{
    const url=vid||videoUrl;if(!url.trim()){toast?.error("URL obrigatória");return;}
    let id=url.trim();const m=url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);if(m)id=m[1];
    setCurVideoId(id);setLoading(true);setAiResult(null);setChecklist([]);setPrevActions([]);
    pg?.start("🎯 Command Center",["YouTube Analytics","Camadas algoritmo","IA analisando","Plano de ação"]);
    try{
      // Load previous actions for this video
      api.getActions(id).then(prev=>{if(Array.isArray(prev)&&prev.length)setPrevActions(prev);}).catch(()=>{});
      const d=await api.cmd({videoId:id});if(d.error)throw new Error(d.error);setR(d);
      // Auto AI
      try{const ai=await api.aiInsight({video:d.video,layer:d.layer,vsChannel:d.vsChannel,channelName});
        if(!ai.error){setAiResult(ai);
          // Build checklist from AI actions
          const items=[];
          if(ai.immediateActions?.length){ai.immediateActions.forEach((a,i)=>items.push({id:`ia-${i}`,action:a.action,category:"imediato",priority:a.priority||"urgente",aiSuggestion:a.action,timeNeeded:a.timeNeeded,done:false}));}
          if(ai.thumbChange)items.push({id:"thumb",action:"Trocar Thumbnail: "+(ai.thumbReason||"").slice(0,80),category:"thumbnail",priority:"urgente",aiSuggestion:ai.thumbReason,done:false});
          if(ai.titleChange)items.push({id:"title",action:"Trocar Título para: "+ai.titleSuggestion,category:"titulo",priority:"urgente",aiSuggestion:ai.titleSuggestion,done:false});
          if(ai.seoQuickFix)items.push({id:"seo",action:"SEO: "+ai.seoQuickFix.slice(0,100),category:"seo",priority:"medio",aiSuggestion:ai.seoQuickFix,done:false});
          if(ai.engagementTip)items.push({id:"engage",action:"Engajamento: "+ai.engagementTip.slice(0,100),category:"engajamento",priority:"medio",aiSuggestion:ai.engagementTip,done:false});
          if(ai.whatToPost)items.push({id:"post",action:"Postar: "+ai.whatToPost.slice(0,100),category:"social",priority:"medio",aiSuggestion:ai.whatToPost,done:false});
          setChecklist(items);
          // Auto-save to DB
          if(items.length){api.saveActions({videoId:id,videoTitle:d.video?.title||"",actions:items}).catch(()=>{});}
        }
      }catch{}
      pg?.done();
    }catch(e){pg?.fail(e.message);}setLoading(false);
  };

  const toggleCheck=async(idx)=>{
    const item=checklist[idx];if(!item)return;
    const newDone=!item.done;
    setChecklist(p=>p.map((c,i)=>i===idx?{...c,done:newDone}:c));
    // Find the DB action and toggle
    if(prevActions.length){
      const dbAction=prevActions.find(a=>a.action===item.action||a.aiSuggestion===item.aiSuggestion);
      if(dbAction){api.toggleAction(dbAction.id,"").catch(()=>{});}
    }
    toast?.success(newDone?"✅ Marcado como feito!":"Desmarcado");
  };

  const v=r?.video||{};const lc=LAYER_COLORS[r?.layer]||C.dim;
  const completedCount=checklist.filter(c=>c.done).length;
  const totalCount=checklist.length;
  const progress=totalCount>0?Math.round(completedCount/totalCount*100):0;

  return<div className="page-enter" role="main" aria-label="CommandCenter" style={{maxWidth:1000,margin:"0 auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <Hdr title="Command Center — 48h" sub="Monitore + IA diz exatamente o que fazer agora"/>
      <Btn onClick={()=>setShowHistory(!showHistory)} style={{fontSize:11}}>{showHistory?"✕ Fechar":"📋 Histórico"}</Btn>
    </div>

    {/* ── HISTORY PANEL ── */}
    {showHistory&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:20,marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>📋 Histórico de Alterações por Vídeo</div>
      {history.length===0?<div style={{textAlign:"center",padding:20,color:C.dim}}>Nenhuma ação registrada ainda. Analise um vídeo para começar.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {history.map((h,hi)=><div key={hi} style={{background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`,padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div>
                <div style={{fontWeight:700,fontSize:12}}>{h.videoTitle||h.videoId}</div>
                <div style={{fontSize:10,color:C.dim}}>{h.completed}/{h.total} ações completadas</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:60,height:6,borderRadius:3,background:"rgba(255,255,255,.06)",overflow:"hidden"}}>
                  <div style={{width:`${h.total>0?Math.round(h.completed/h.total*100):0}%`,height:"100%",borderRadius:3,background:h.completed===h.total?C.green:C.orange}}/>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:h.completed===h.total?C.green:C.orange}}>{h.total>0?Math.round(h.completed/h.total*100):0}%</span>
                <button onClick={()=>{setVideoUrl(`https://youtu.be/${h.videoId}`);analyze(`https://youtu.be/${h.videoId}`);setShowHistory(false);}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:9,fontWeight:600}}>Re-analisar</button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {h.actions?.slice(0,5).map((a,ai)=><div key={ai} style={{display:"flex",gap:8,alignItems:"center",fontSize:11,color:a.completed?C.green:C.muted}}>
                <span style={{fontSize:14}}>{a.completed?"✅":"⬜"}</span>
                <span style={{textDecoration:a.completed?"line-through":"none",flex:1}}>{a.action?.slice(0,80)}</span>
                {a.completedAt&&<span style={{fontSize:9,color:C.dim}}>{new Date(a.completedAt).toLocaleDateString("pt-BR")}</span>}
              </div>)}
              {h.actions?.length>5&&<div style={{fontSize:9,color:C.dim}}>... +{h.actions.length-5} ações</div>}
            </div>
          </div>)}
        </div>}
    </div>}

    {/* Latest videos */}
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

    {/* Previous actions for this video */}
    {prevActions.length>0&&!showHistory&&<div style={{background:`${C.purple}06`,borderRadius:12,border:`1px solid ${C.purple}20`,padding:14,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:12,color:C.purple,marginBottom:8}}>📝 Alterações anteriores neste vídeo ({prevActions.filter(a=>a.completed).length}/{prevActions.length} feitas)</div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {prevActions.slice(0,6).map(a=><div key={a.id} style={{display:"flex",gap:8,alignItems:"center",fontSize:11}}>
          <span style={{fontSize:13}}>{a.completed?"✅":"⬜"}</span>
          <span style={{color:a.completed?C.green:C.muted,textDecoration:a.completed?"line-through":"none",flex:1}}>{a.action?.slice(0,70)}</span>
          {a.completedAt&&<span style={{fontSize:9,color:C.dim}}>{new Date(a.completedAt).toLocaleDateString("pt-BR")}</span>}
        </div>)}
      </div>
    </div>}

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
          </div>
        </div>
        {v.velocity>0&&<div style={{textAlign:"center",padding:"8px 14px",background:`${C.green}08`,borderRadius:10}}>
          <div style={{fontSize:18,fontWeight:800,color:C.green}}>{v.velocity}</div>
          <div style={{fontSize:9,color:C.dim}}>views/dia</div>
        </div>}
      </div>}

      {/* AI Status */}
      {aiResult?.status&&<div style={{background:aiResult.status.includes("🟢")?`${C.green}08`:aiResult.status.includes("🟡")?`#F59E0B08`:`${C.red}08`,borderRadius:14,border:`1px solid ${aiResult.status.includes("🟢")?C.green:aiResult.status.includes("🟡")?"#F59E0B":C.red}20`,padding:20,marginBottom:20}}>
        <div style={{fontSize:18,fontWeight:800,marginBottom:6}}>{aiResult.status}</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{aiResult.diagnosis}</div>
      </div>}

      {/* Algorithm Layer */}
      <div style={{background:`linear-gradient(135deg,${lc}08,${lc}04)`,borderRadius:16,border:`1px solid ${lc}25`,padding:24,marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:11,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Camada do Algoritmo</div>
        <div style={{fontSize:28,fontWeight:900,color:lc}}>{r.layerLabel}</div>
        <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:10}}>
          {["testing","core","recent","topic","adjacent","viral"].map(l=><div key={l} style={{width:40,height:6,borderRadius:3,background:l===r.layer?LAYER_COLORS[l]:"rgba(255,255,255,.06)"}}/>)}
        </div>
        {aiResult?.layerPrediction&&<div style={{fontSize:12,color:C.muted,marginTop:10}}>🔮 {aiResult.layerPrediction}</div>}
      </div>

      {/* Metrics */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        {[["Views",fmt(v.totalViews||v.views),C.green],["Likes",fmt(v.totalLikes||v.likes),C.red],["Comments",fmt(v.totalComments||v.comments),C.blue],["Satisfaction",v.satisfaction>0?v.satisfaction+"%":"—",v.satisfaction>=90?C.green:C.dim]].map(([l,val,c])=>
          <div key={l} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 10px",textAlign:"center"}}>
            <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",marginBottom:4}}>{l}</div>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{val}</div>
          </div>)}
      </div>

      {/* ═══ CHECKLIST DE AÇÕES DA IA ═══ */}
      {checklist.length>0&&<div style={{background:`${C.red}04`,borderRadius:16,border:`1px solid ${C.red}15`,padding:20,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:C.red}}>⚡ Plano de Ação — {completedCount}/{totalCount}</div>
            <div style={{fontSize:11,color:C.dim,marginTop:2}}>Marque cada ação conforme executa. O progresso é salvo automaticamente.</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:80,height:8,borderRadius:4,background:"rgba(255,255,255,.06)",overflow:"hidden"}}>
              <div style={{width:`${progress}%`,height:"100%",borderRadius:4,background:progress===100?C.green:C.orange,transition:"width 0.5s"}}/>
            </div>
            <span style={{fontSize:13,fontWeight:800,color:progress===100?C.green:C.orange}}>{progress}%</span>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {checklist.map((item,idx)=>{
            const pColor=item.priority==="urgente"?C.red:item.priority==="medio"?"#F59E0B":C.blue;
            return<div key={item.id} onClick={()=>toggleCheck(idx)} style={{
              display:"flex",gap:10,alignItems:"flex-start",padding:"12px 14px",borderRadius:10,cursor:"pointer",
              background:item.done?`${C.green}06`:"rgba(255,255,255,.02)",
              border:`1px solid ${item.done?C.green+"20":C.border}`,
              transition:"all 0.2s",opacity:item.done?0.7:1,
            }}>
              <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${item.done?C.green:C.border}`,background:item.done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                {item.done&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,textDecoration:item.done?"line-through":"none",color:item.done?C.green:C.text}}>{item.action}</div>
                {item.timeNeeded&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>⏱️ {item.timeNeeded}</div>}
              </div>
              <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:4,background:`${pColor}12`,color:pColor,flexShrink:0}}>{item.priority}</span>
            </div>;
          })}
        </div>

        {progress===100&&<div style={{textAlign:"center",marginTop:14,padding:12,borderRadius:10,background:`${C.green}10`,border:`1px solid ${C.green}20`}}>
          <div style={{fontSize:16,fontWeight:800,color:C.green}}>🎉 Todas as ações concluídas!</div>
          <div style={{fontSize:11,color:C.muted,marginTop:4}}>Re-analise em 24-48h para ver o impacto das mudanças.</div>
        </div>}
      </div>}

      {/* Title/Thumb change cards */}
      {(aiResult?.thumbChange||aiResult?.titleChange)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {aiResult.thumbChange&&<div style={{background:`${C.red}06`,borderRadius:12,border:`1px solid ${C.red}20`,padding:14}}>
          <div style={{fontWeight:700,fontSize:13,color:C.red}}>🖼️ TROCAR THUMBNAIL</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>{aiResult.thumbReason}</div>
        </div>}
        {aiResult.titleChange&&<div style={{background:`${C.blue}06`,borderRadius:12,border:`1px solid ${C.blue}20`,padding:14}}>
          <div style={{fontWeight:700,fontSize:13,color:C.blue}}>✍️ TROCAR TÍTULO</div>
          <div style={{fontSize:13,fontWeight:600,marginTop:4}}>{aiResult.titleSuggestion}</div>
          <button onClick={()=>{cp(aiResult.titleSuggestion);toast?.success("Copiado!");}} style={{marginTop:6,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10}}>📋 Copiar</button>
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

      {/* Engagement stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
        {[["❤️ Likes",fmt(v.totalLikes||v.likes),C.red],["💬 Comments",fmt(v.totalComments||v.comments),C.blue],["🔄 Shares",fmt(v.shares),C.purple],["👥 +Subs",`+${fmt(v.subsGained)}`,C.green]].map(([l,val,c])=>
          <div key={l} style={{background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`,padding:12,textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:c}}>{val}</div>
            <div style={{fontSize:10,color:C.dim}}>{l}</div>
          </div>)}
      </div>

      {/* vs Channel */}
      {r.vsChannel&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {[["Views vs Canal",r.vsChannel.viewsVsAvg,fmt(r.vsChannel.avgViews)+" avg"],["AVD vs Canal",r.vsChannel.durationVsAvg,r.vsChannel.avgDuration+"s avg"]].map(([label,pct,avg])=>
          <div key={label} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${pct>=100?C.green:C.red}20`,padding:16,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.dim}}>{label}</div>
            <div style={{fontSize:32,fontWeight:900,color:pct>=100?C.green:C.red}}>{pct}%</div>
            <div style={{fontSize:11,color:C.muted}}>{pct>=100?"Acima":"Abaixo"} ({avg})</div>
          </div>)}
      </div>}
    </div>}
  </div>;
}
