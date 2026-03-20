// @ts-nocheck
import { useState, useEffect } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

function Ring({score,size=60,label}){const r=size/2-5,circ=2*Math.PI*r,off=circ-(score/100)*circ;const c=score>=80?C.green:score>=60?"#F59E0B":C.red;return<div style={{textAlign:"center"}}><svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset .8s"}}/><text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size*.25} fontWeight="800">{score}</text></svg>{label&&<div style={{fontSize:9,color:C.dim,marginTop:2}}>{label}</div>}</div>}
const fmt=n=>{if(!n)return"0";if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return n.toString();};
const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}catch{}};

export default function Analytics(){
  const toast=useToast();const pg=useProgress();
  const[saved,setSaved]=useState([]);const[spyData,setSpyData]=useState(null);const[loading,setLoading]=useState(false);
  // Quick analyze
  const[query,setQuery]=useState("");const[qaResult,setQaResult]=useState(null);const[qaLoading,setQaLoading]=useState(false);

  useEffect(()=>{researchApi.listSaved().then(r=>setSaved(Array.isArray(r)?r:[])).catch(()=>{});},[]);
  const refresh=async()=>{if(!saved.length)return;setLoading(true);pg?.start("📊 Atualizando",saved.map(s=>s.name));try{setSpyData(await researchApi.spy(saved.map(s=>s.ytChannelId)));pg?.done();}catch(e){pg?.fail(e.message);}setLoading(false);};
  useEffect(()=>{if(saved.length>0&&!spyData)refresh();},[saved]);

  const quickAnalyze=async()=>{
    if(!query.trim()){toast?.error("Digite nome ou URL do canal");return;}
    setQaLoading(true);pg?.start("🔍 Analisando Canal",["Buscando no YouTube","Coletando vídeos recentes","IA analisando crescimento","Gerando dicas"]);
    try{const r=await researchApi.quickAnalyze(query);pg?.done();setQaResult(r);}
    catch(e){pg?.fail(e.message);toast?.error(e.message);}setQaLoading(false);
  };

  const totalSubs=saved.reduce((a,c)=>a+c.subscribers,0);
  const totalViews=saved.reduce((a,c)=>a+c.totalViews,0);
  const avgScore=saved.length?Math.round(saved.reduce((a,c)=>a+c.score,0)/saved.length):0;
  const identities=saved.filter(ch=>{try{return JSON.parse(ch.notes||"{}").mockup;}catch{return false;}});
  const a=qaResult?.analysis;const ch=qaResult?.channel;

  return<div className="page-enter">
    <Hdr title="Analytics" sub="Analise qualquer canal · Monitore seus salvos · Dicas de crescimento" action={saved.length?<Btn onClick={refresh} disabled={loading}>{loading?"⏳":"🔄"}</Btn>:null}/>

    {/* QUICK ANALYZER */}
    <div style={{background:`linear-gradient(135deg,${C.red}06,${C.blue}06)`,borderRadius:16,border:`1px solid ${C.red}20`,padding:20,marginBottom:24}}>
      <div style={{fontWeight:800,fontSize:16,marginBottom:10}}>🔍 Analisar Qualquer Canal</div>
      <div style={{display:"flex",gap:10}}>
        <Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome do canal, @handle ou URL do YouTube..." style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&quickAnalyze()}/>
        <Btn onClick={quickAnalyze} disabled={qaLoading}>{qaLoading?"⏳":"🔍 Analisar"}</Btn>
      </div>
    </div>

    {/* ANALYSIS RESULT */}
    {qaResult&&<div style={{marginBottom:28}}>
      {/* Channel header */}
      <div style={{display:"flex",gap:16,alignItems:"center",background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:20,marginBottom:16}}>
        {ch?.thumbnail&&<img src={ch.thumbnail} style={{width:64,height:64,borderRadius:"50%"}}/>}
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:18}}>{ch?.name}</div>
          <div style={{fontSize:11,color:C.dim}}>{ch?.handle} · {ch?.country}</div>
          <div style={{display:"flex",gap:16,marginTop:8}}>
            {[["Inscritos",fmt(ch?.subscribers),C.blue],["Views",fmt(ch?.totalViews),C.green],["Vídeos",ch?.videoCount,"#F59E0B"],["Média/vídeo",fmt(ch?.avgViews),C.purple]].map(([l,v,c])=>
              <div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div></div>
            )}
          </div>
        </div>
        {a?.health&&<div style={{textAlign:"center"}}>
          <Ring score={a.health.score} size={80}/>
          <div style={{fontSize:11,fontWeight:700,color:a.health.score>=70?C.green:a.health.score>=50?"#F59E0B":C.red,marginTop:4}}>{a.health.status}</div>
        </div>}
      </div>

      {a&&<div>
        {/* Diagnosis */}
        {a.health?.diagnosis&&<div style={{background:`${a.health.score>=70?C.green:C.red}06`,borderRadius:12,border:`1px solid ${a.health.score>=70?C.green:C.red}20`,padding:14,marginBottom:12}}>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>🩺 {a.health.diagnosis}</div>
        </div>}

        {/* Metrics */}
        {a.metrics&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {Object.entries(a.metrics).map(([k,v])=>{const labels={subsGrowth:"Crescimento Subs",viewsPerVideo:"Views/Vídeo",engagement:"Engajamento",consistency:"Consistência",seoQuality:"SEO"};const c=v==="Bom"||v==="Rápido"||v==="Alto"||v==="Regular"?C.green:v==="Fraco"||v==="Lento"||v==="Baixo"||v==="Irregular"?C.red:"#F59E0B";
            return<div key={k} style={{padding:"6px 12px",borderRadius:8,background:`${c}10`,border:`1px solid ${c}20`}}><span style={{fontSize:9,color:C.dim}}>{labels[k]||k}: </span><span style={{fontSize:11,fontWeight:700,color:c}}>{v}</span></div>
          })}
        </div>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {/* Strengths */}
          {a.strengths&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.green}20`,padding:14}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:C.green}}>✅ Pontos Fortes</div>
            {a.strengths.map((s,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>💪 {s}</div>)}
          </div>}
          {/* Problems */}
          {a.problems&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.red}20`,padding:14}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:C.red}}>🚨 Problemas que Travam Crescimento</div>
            {a.problems.map((p,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>⚠️ {p}</div>)}
          </div>}
        </div>

        {/* Quick Wins */}
        {a.quickWins&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.green}20`,padding:16,marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:10,color:C.green}}>⚡ Ações Imediatas pra Dar um UP</div>
          <div style={{display:"grid",gap:10}}>
            {a.quickWins.map((q,i)=><div key={i} style={{padding:12,background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`,borderLeft:`4px solid ${q.impact==="alto"?C.green:"#F59E0B"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontWeight:700,fontSize:13}}>🎯 {q.action}</div>
                <span style={{fontSize:9,fontWeight:800,color:q.impact==="alto"?C.green:"#F59E0B",background:q.impact==="alto"?`${C.green}15`:`#F59E0B15`,padding:"2px 8px",borderRadius:4}}>●{q.impact}</span>
              </div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>📋 {q.howTo}</div>
            </div>)}
          </div>
        </div>}

        {/* Beat Competition */}
        {a.beatCompetition&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.purple}20`,padding:16,marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:10,color:C.purple}}>🏆 Como Passar a Concorrência</div>
          {a.beatCompetition.map((b,i)=><div key={i} style={{padding:12,marginBottom:8,background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{b.tip}</div>
            <div style={{fontSize:10,color:C.dim,marginBottom:4}}>🎯 Alvo: {b.competitor}</div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>{b.strategy}</div>
          </div>)}
        </div>}

        {/* Content Ideas */}
        {a.contentIdeas&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.blue}20`,padding:16,marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:10,color:C.blue}}>💡 5 Vídeos que VIRALIZARIAM nesse Canal</div>
          {a.contentIdeas.map((idea,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:16,fontWeight:900,color:C.red,opacity:.3}}>{i+1}</span>
            <span style={{fontSize:13,fontWeight:600,flex:1}}>{idea}</span>
            <button onClick={()=>{cp(idea);toast?.success("Copiado!");}} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9}}>📋</button>
          </div>)}
        </div>}

        {/* Growth Plan */}
        {a.growthPlan&&<div style={{background:`linear-gradient(135deg,${C.green}06,${C.blue}06)`,borderRadius:14,border:`1px solid ${C.green}20`,padding:16,marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:10}}>📈 Plano de Crescimento</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
            {[["Semana 1",a.growthPlan.week1,C.red],["Semana 2",a.growthPlan.week2,"#F59E0B"],["Mês 1",a.growthPlan.month1,C.blue],["Mês 3",a.growthPlan.month3,C.green]].map(([l,v,c])=>
              <div key={l} style={{padding:10,borderRadius:8,background:"rgba(255,255,255,.02)",borderTop:`3px solid ${c}`}}>
                <div style={{fontSize:10,fontWeight:700,color:c,marginBottom:4}}>{l}</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{v}</div>
              </div>
            )}
          </div>
        </div>}

        {/* Recent videos */}
        {qaResult.recentVideos?.length>0&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>📹 Últimos Vídeos</div>
          {qaResult.recentVideos.map((v,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,color:C.muted,flex:1}}>{v.title}</span>
            <span style={{fontSize:12,fontWeight:700,color:C.green,flexShrink:0}}>{fmt(v.views)}</span>
          </div>)}
        </div>}

        <button onClick={()=>setQaResult(null)} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:11}}>🔄 Analisar outro canal</button>
      </div>}
    </div>}

    {/* SAVED CHANNELS OVERVIEW */}
    {saved.length>0&&!qaResult&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
        {[["Canais",saved.length,"📺",C.blue],["Identidades",identities.length,"🚀",C.green],["Subs",fmt(totalSubs),"👥",C.purple],["Views",fmt(totalViews),"👁️","#F59E0B"],["Score",avgScore,"⭐",avgScore>=70?C.green:C.red]].map(([l,v,i,c])=>
          <div key={l} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,textAlign:"center"}}>
            <div style={{fontSize:20}}>{i}</div><div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:9,color:C.dim,marginTop:2}}>{l}</div>
          </div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>🏆 Ranking por Score</div>
          {[...saved].sort((a,b)=>b.score-a.score).slice(0,8).map((ch,i)=><div key={ch.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:14,fontWeight:900,color:i<3?C.red:C.dim,minWidth:20}}>{i+1}</span>
            {ch.thumbnail?<img src={ch.thumbnail} style={{width:24,height:24,borderRadius:"50%"}}/>:<div style={{width:24,height:24,borderRadius:"50%",background:`${C.red}20`}}/>}
            <div style={{flex:1,fontSize:11,fontWeight:600}}>{ch.name}</div>
            <Ring score={ch.score} size={30}/>
          </div>)}
        </div>
        <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>📈 Views por Canal</div>
          {[...saved].sort((a,b)=>b.totalViews-a.totalViews).slice(0,8).map(ch=>{const mx=Math.max(...saved.map(s=>s.totalViews))||1;return<div key={ch.id} style={{marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}><span style={{fontWeight:600}}>{ch.name}</span><span style={{color:C.green,fontWeight:700}}>{fmt(ch.totalViews)}</span></div>
            <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,.06)"}}><div style={{height:"100%",borderRadius:3,background:`linear-gradient(90deg,${C.green},${C.blue})`,width:`${(ch.totalViews/mx)*100}%`}}/></div>
          </div>})}
        </div>
      </div>

      {spyData?.channels?.length>0&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>🕵️ Feed de Vídeos Recentes</div>
        {spyData.channels.flatMap(ch=>ch.recentVideos?.slice(0,2).map(v=>({...v,channelName:ch.name}))||[]).sort((a,b)=>b.views-a.views).slice(0,10).map((v,i)=>
          <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:800,color:C.dim,minWidth:18}}>{i+1}</span>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:11}}>{v.title}</div><div style={{fontSize:9,color:C.dim}}>{v.channelName}</div></div>
            <span style={{fontSize:12,fontWeight:800,color:C.green}}>{fmt(v.views)}</span>
          </div>
        )}
      </div>}
    </div>}

    {!saved.length&&!qaResult&&<div style={{textAlign:"center",padding:40,color:C.dim}}>
      <div style={{fontSize:40,marginBottom:12}}>🔍</div>
      <div style={{fontSize:14}}>Use a barra acima pra analisar qualquer canal do YouTube</div>
      <div style={{fontSize:11,marginTop:6}}>Ou salve canais na Pesquisa de Mercado pra ver o overview aqui</div>
    </div>}
  </div>
}
