// @ts-nocheck
import { useProgress } from "../components/shared/ProgressModal";
import { useState, useEffect } from "react";
import { researchApi, aiApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import MagicTabs from "../components/shared/MagicTabs";

const TIERS={OURO:{c:"#F59E0B",bg:"#F59E0B15",i:"💎"},PRATA:{c:"#94A3B8",bg:"#94A3B815",i:"🥈"},PROMISSOR:{c:"#22C55E",bg:"#22C55E15",i:"⭐"},INICIANTE:{c:"#6B7280",bg:"#6B728015",i:"🌱"}};
function fmt(n){if(!n&&n!==0)return"0";if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);}
function ageStr(m){if(!m)return"Novo";if(m>=24)return Math.floor(m/12)+"a";if(m>=12)return"1a "+(m-12)+"m";return m+"m";}
const VIRAL_Q=["faceless youtube channels viral","dark channels mystery horror","factory process satisfying","AI generated content channels","cash cow channels 2025","storytelling channels viral","shorts channels millions views","educational animated channels","true crime documentary","ASMR satisfying","finance investing growth","tech review faceless"];
const FALLBACK_NICHES={trending:[],emerging:[]};
const REGIONS=[["US","🇺🇸"],["BR","🇧🇷"],["GB","🇬🇧"],["IN","🇮🇳"],["DE","🇩🇪"],["JP","🇯🇵"],["KR","🇰🇷"],["MX","🇲🇽"],["FR","🇫🇷"],["ES","🇪🇸"]];
const COUNTRIES={"US":"🇺🇸 EUA","GB":"🇬🇧 UK","CA":"🇨🇦 Canadá","AU":"🇦🇺 Austrália","DE":"🇩🇪 Alemanha","BR":"🇧🇷 Brasil","MX":"🇲🇽 México","IN":"🇮🇳 Índia","ES":"🇪🇸 Espanha","FR":"🇫🇷 França","JP":"🇯🇵 Japão","KR":"🇰🇷 Coreia","PT":"🇵🇹 Portugal","IT":"🇮🇹 Itália","SA":"🇸🇦 Arábia"};
function Sec({t,i,children}){return<div style={{background:"rgba(255,255,255,.02)",borderRadius:12,border:`1px solid ${C.border}`,padding:18,marginBottom:14}}><div style={{fontWeight:700,fontSize:16,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>{i} {t}</div>{children}</div>}
function Row({l,v}){return<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:14,color:C.muted}}>{l}</span><span style={{fontSize:14,fontWeight:600}}>{v}</span></div>}
function Stat({l,v,c}){return<div style={{background:`${c||C.blue}08`,borderRadius:8,padding:"12px 8px",textAlign:"center",border:`1px solid ${c||C.blue}12`}}><div style={{fontSize:11,color:C.muted,marginBottom:3}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:c||C.text}}>{v}</div></div>}

function ChCard({ch,onAnalyze,onSave,saved,busy}){const t=TIERS[ch.tier]||TIERS.INICIANTE;return<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,display:"flex",flexDirection:"column",gap:8}}>
  <div style={{display:"flex",alignItems:"center",gap:10}}>{ch.thumbnail?<img src={ch.thumbnail} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover"}}/>:<div style={{width:42,height:42,borderRadius:"50%",background:`${t.c}20`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:t.c}}>{ch.name?.[0]}</div>}<div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</div><div style={{fontSize:10,color:C.dim}}>{fmt(ch.subscribers)} subs · {ageStr(ch.channelAge)}</div></div><span style={{fontSize:9,fontWeight:800,color:t.c,background:t.bg,padding:"3px 8px",borderRadius:4}}>{t.i}{ch.tier}</span></div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,textAlign:"center"}}>{[["Views",fmt(ch.totalViews)],["Vídeos",ch.videoCount],["Score",ch.score]].map(([l,v])=><div key={l} style={{background:"rgba(255,255,255,.03)",borderRadius:6,padding:"5px 0"}}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:l==="Score"?t.c:C.text}}>{v}</div></div>)}</div>
  <div style={{display:"flex",gap:6}}><button onClick={()=>onAnalyze(ch.ytChannelId)} disabled={busy} style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:`${C.blue}20`,color:C.blue,cursor:"pointer",fontSize:11,fontWeight:600}}>{busy?"⏳":"🔍 Analisar"}</button><button onClick={()=>saved?null:onSave(ch)} disabled={saved} style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:saved?`${C.green}20`:"rgba(255,255,255,.04)",color:saved?C.green:C.muted,cursor:saved?"default":"pointer",fontSize:11,fontWeight:600}}>{saved?"✅":"♡ Salvar"}</button></div>
</div>}

function AnalysisPanel({data,onClose,onSave,saved,toast,pg}){
  if(!data)return null;const t=TIERS[data.tier]||TIERS.INICIANTE;
  const[sub,setSub]=useState("overview");
  const[dna,setDna]=useState(null);const[dnaL,setDnaL]=useState(false);
  const[bp,setBp]=useState(null);const[bpL,setBpL]=useState(false);
  const[money,setMoney]=useState(null);const[moneyL,setMoneyL]=useState(false);
  const[titles,setTitles]=useState(null);const[titlesL,setTitlesL]=useState(false);
  const[cal,setCal]=useState(null);const[calL,setCalL]=useState(false);
  const[mockup,setMockup]=useState(null);const[mockL,setMockL]=useState(false);
  const[mockImgs,setMockImgs]=useState({});const[genImg,setGenImg]=useState(null);

  const ld=async(k,fn,set,setL,dep,title)=>{if(fn)return;setL(true);if(pg&&title)pg.start(title,["Processando","IA gerando","Finalizando"]);try{if(pg)pg.update(1);const r=await dep();if(pg)pg.done();set(r);}catch(e){if(pg)pg.fail(e.message);toast?.error(e.message);}setL(false);};
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const genImage=async(key,prompt)=>{setGenImg(key);try{const r=await aiApi.generateAsset({prompt});if(r.url)setMockImgs(p=>({...p,[key]:r.url}));else toast?.error("Falha");}catch(e){toast?.error(e.message);}setGenImg(null);};

  const TABS=[["overview","📊","Geral"],["dna","🧬","DNA Viral"],["blueprint","📐","Blueprint"],["money","💰","Receita"],["titles","🎯","Títulos"],["calendar","🗓️","30 Dias"],["mockup","🚀","Superar"]];

  return<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
    <div onClick={e=>e.stopPropagation()} style={{width:880,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,maxHeight:"95vh",overflowY:"auto"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
        {data.thumbnail&&<img src={data.thumbnail} style={{width:44,height:44,borderRadius:"50%"}}/>}
        <div style={{flex:1}}><div style={{fontWeight:800,fontSize:15,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{data.name}<span style={{fontSize:9,fontWeight:800,color:t.c,background:t.bg,padding:"2px 6px",borderRadius:4}}>{t.i}{data.score}</span></div><div style={{fontSize:10,color:C.dim}}>{fmt(data.subscribers)} subs · {data.country} · {ageStr(data.channelAge)}</div></div>
        <button onClick={onClose} style={{width:28,height:28,borderRadius:8,border:"none",background:"rgba(255,255,255,.06)",color:C.muted,cursor:"pointer",fontSize:13}}>✕</button>
      </div>
      <div style={{padding:"6px 20px",borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        <MagicTabs tabs={TABS.map(([k,ic,lb])=>({key:k,icon:ic,label:lb,color:k==="overview"?C.blue:k==="dna"?C.purple:k==="blueprint"?C.teal:k==="money"?C.green:k==="titles"?C.orange:k==="calendar"?C.blue:C.red}))} active={sub} onChange={k=>{setSub(k);
          if(k==="dna")ld(k,dna,setDna,setDnaL,()=>researchApi.dna({channelName:data.name,topVideos:data.topVideos,avgDuration:data.avgDuration,subscribers:data.subscribers,niche:data.niche}),"🧬 Extraindo DNA Viral");
          if(k==="blueprint")ld(k,bp,setBp,setBpL,()=>researchApi.blueprint(data),"📐 Gerando Blueprint");
          if(k==="money")ld(k,money,setMoney,setMoneyL,()=>researchApi.monetization({niche:data.niche,country:data.country,videosPerWeek:data.uploadsPerWeek||3,avgViews:data.avgViews||10000,subscribers:data.subscribers}),"💰 Calculando Monetização");
          if(k==="titles")ld(k,titles,setTitles,setTitlesL,()=>researchApi.generateTitles({channelName:data.name,niche:data.niche,topVideoTitles:data.topVideos?.map(v=>v.title),targetCountry:data.country,language:data.language}).then(r=>r.ideas||[]),"🎯 Gerando Títulos Virais");
          if(k==="calendar")ld(k,cal,setCal,setCalL,()=>researchApi.calendar({niche:data.niche,subNiche:data.subNiche,videosPerWeek:data.uploadsPerWeek||3,style:data.contentType,targetCountry:data.country,language:data.language}).then(r=>r.calendar||[]),"🗓️ Planejando 30 Dias");
          if(k==="mockup")ld(k,mockup,setMockup,setMockL,()=>researchApi.channelMockup({originalChannel:data.name,niche:data.niche,subNiche:data.subNiche,style:data.contentType,targetCountry:data.country,language:data.language,analysisData:{subscribers:data.subscribers,totalViews:data.totalViews,videoCount:data.videoCount,score:data.score,topVideos:data.topVideos}}),"🚀 Criando Canal SUPERIOR");
        }}/>
      </div>
      <div style={{padding:"14px 20px"}}>
        {/* OVERVIEW */}
        {sub==="overview"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:14}}><Stat l="Inscritos" v={fmt(data.subscribers)} c={C.blue}/><Stat l="Views" v={fmt(data.totalViews)} c={C.green}/><Stat l="Vídeos" v={data.videoCount} c={C.purple}/><Stat l="Score" v={data.score} c={t.c}/><Stat l="Engaj." v={(data.engRate||0)+"%"} c={C.red}/></div>
          <Sec t="Nicho" i="🎯">{!data.niche&&!data.subNiche?<div style={{fontSize:11,color:C.dim,padding:"8px 0"}}>⚠️ Análise de IA não disponível. Verifique a API Key e modelo nas Configurações.</div>:<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>{[["Nicho",data.niche],["Sub",data.subNiche],["Micro",data.microNiche]].map(([l,v])=><div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{fontSize:12,fontWeight:600}}>{v||"N/A"}</div></div>)}</div>}
            {data.contentType&&<div style={{fontSize:11}}><b style={{color:C.blue}}>Tipo:</b> {data.contentType}</div>}
            {data.recommendation&&<div style={{fontSize:11,color:C.muted,lineHeight:1.6,fontStyle:"italic",marginTop:6,borderLeft:`2px solid ${t.c}`,paddingLeft:10}}>{data.recommendation}</div>}
          </Sec>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sec t="Produção" i="📊">{[["Uploads/sem",data.uploadsPerWeek||"~"+Math.round((data.videoCount||0)/Math.max(1,(data.channelAge||1)*4.3)*10)/10],["Dia",data.bestDay],["Hora",data.bestHour],["Duração",data.avgDuration],["Views médias",fmt(data.avgViews||0)]].map(([l,v])=><Row key={l} l={l} v={v||"N/A"}/>)}</Sec>
            <Sec t="Modelagem" i="🌍"><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><span>{data.modelable?"✅":"❌"}</span><span style={{fontWeight:700,fontSize:12,color:data.modelable?C.green:C.red}}>{data.modelable?"Modelável":"Não recomendado"}</span></div>
              {data.modelableCountries?.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{data.modelableCountries.map(c=><span key={c} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${C.blue}15`,color:C.blue}}>{c}</span>)}</div>}</Sec>
          </div>
          {data.topVideos?.length>0&&<Sec t="Top Vídeos" i="🏆">{data.topVideos.map((v,i)=><div key={v.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:10,fontWeight:800,color:C.dim,width:16}}>{i+1}</span><div style={{flex:1,fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div><span style={{fontSize:10,fontWeight:700,color:C.green,fontFamily:"var(--mono)"}}>{fmt(v.views)}</span></div>)}</Sec>}
          <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><a href={`https://youtube.com/channel/${data.ytChannelId}`} target="_blank" style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.border}`,color:C.muted,fontSize:11,textDecoration:"none"}}>🔗</a><Btn onClick={()=>onSave(data)} disabled={saved}>{saved?"✅":"💾 Salvar"}</Btn></div>
        </div>}

        {/* DNA */}
        {sub==="dna"&&<div>{dnaL?<div style={{textAlign:"center",padding:30}}><div style={{width:200,height:6,borderRadius:3,background:"rgba(255,255,255,.06)",margin:"0 auto 10px",overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${C.red},${C.orange})`,borderRadius:3,animation:"pulse 1.5s ease infinite"}}/></div><div style={{color:C.dim,fontSize:12}}>🧬 Extraindo DNA viral...</div></div>:dna?<div>
          {[["Hook","🎯","hookPattern"],["Retenção","📈","retentionFormula"],["Títulos","✍️","titleFormula"],["Thumbnail","🖼️","thumbnailStyle"]].map(([t,i,k])=>dna[k]?<Sec key={k} t={t} i={i}><p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{dna[k]}</p></Sec>:null)}
          <Sec t="Estrutura" i="📋"><div style={{display:"flex",flexDirection:"column",gap:4}}>{(dna.contentStructure||[]).map((s,i)=><div key={i} style={{display:"flex",gap:6}}><span style={{fontSize:10,fontWeight:800,color:C.red,minWidth:16}}>{i+1}</span><span style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{s}</span></div>)}</div></Sec>
          {dna.viralElements&&<Sec t="Virais" i="🔥"><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{dna.viralElements.map((e,i)=><span key={i} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:`${C.red}10`,color:C.red}}>{e}</span>)}</div></Sec>}
          {dna.scriptTemplate&&<Sec t="Script" i="📝"><div style={{background:"rgba(0,0,0,.3)",borderRadius:8,padding:12,fontSize:11,color:"rgba(255,255,255,.7)",lineHeight:1.7,fontFamily:"var(--mono)",whiteSpace:"pre-wrap",maxHeight:250,overflowY:"auto"}}>{dna.scriptTemplate}</div><button onClick={()=>cp(dna.scriptTemplate)} style={{marginTop:6,padding:"5px 12px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10}}>📋 Copiar</button></Sec>}
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra analisar</p>}</div>}

        {/* BLUEPRINT */}
        {sub==="blueprint"&&<div>{bpL?<div style={{textAlign:"center",padding:30}}><div style={{width:200,height:6,borderRadius:3,background:"rgba(255,255,255,.06)",margin:"0 auto 10px",overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${C.purple},${C.blue})`,borderRadius:3,animation:"pulse 1.5s ease infinite"}}/></div><div style={{color:C.dim,fontSize:12}}>📐 Construindo Blueprint...</div></div>:bp?<div>
          {bp.channelSetup&&<Sec t="Setup" i="📺"><Row l="Nomes" v={bp.channelSetup.name}/><Row l="País" v={bp.channelSetup.targetCountry}/>{bp.channelSetup.description&&<p style={{fontSize:11,color:C.dim,marginTop:6}}>{bp.channelSetup.description}</p>}</Sec>}
          {bp.contentStrategy&&<Sec t="Estratégia" i="🎯"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}><div><div style={{fontSize:9,color:C.dim}}>Vids/sem</div><div style={{fontSize:14,fontWeight:800,color:C.blue}}>{bp.contentStrategy.videosPerWeek}</div></div><div><div style={{fontSize:9,color:C.dim}}>Duração</div><div style={{fontSize:12,fontWeight:700}}>{bp.contentStrategy.idealDuration}</div></div><div><div style={{fontSize:9,color:C.dim}}>Dias</div><div style={{fontSize:11}}>{(bp.contentStrategy.bestDays||[]).join(", ")}</div></div></div>{bp.contentStrategy.first30Videos&&<p style={{fontSize:11,color:C.muted,lineHeight:1.6,borderLeft:`2px solid ${C.green}`,paddingLeft:8}}>{bp.contentStrategy.first30Videos}</p>}</Sec>}
          {bp.timeline&&<Sec t="Timeline" i="📅">{bp.timeline.map((t,i)=><div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:10,fontWeight:800,color:C.red,minWidth:45}}>{t.month}</span><div><div style={{fontSize:11,fontWeight:600}}>{t.goal}</div><div style={{fontSize:10,color:C.dim}}>{t.action}</div></div></div>)}</Sec>}
          {bp.growthHacks&&<Sec t="Growth Hacks" i="🚀">{bp.growthHacks.map((h,i)=><div key={i} style={{fontSize:11,color:C.muted,marginBottom:3}}>🔥 {h}</div>)}</Sec>}
          <button onClick={()=>cp(JSON.stringify(bp,null,2))} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:11}}>📋 Copiar</button>
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra gerar</p>}</div>}

        {/* MONEY */}
        {sub==="money"&&<div>{moneyL?<div style={{textAlign:"center",padding:30}}><div style={{width:200,height:6,borderRadius:3,background:"rgba(255,255,255,.06)",margin:"0 auto 10px",overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${C.green},${C.blue})`,borderRadius:3,animation:"pulse 1.5s ease infinite"}}/></div><div style={{color:C.dim,fontSize:12}}>💰 Calculando receita...</div></div>:money?<div>
          <Sec t="Projeção" i="📈"><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>{(money.projections||[]).map(p=><div key={p.month} style={{background:`${C.green}08`,borderRadius:8,padding:8,textAlign:"center"}}><div style={{fontSize:9,color:C.dim}}>Mês {p.month}</div><div style={{fontSize:16,fontWeight:800,color:C.green}}>${fmt(p.revenue)}</div></div>)}</div></Sec>
          <Sec t="CPM" i="🌍">{(money.countries||[]).map(c=><div key={c.country} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:11,minWidth:90}}>{COUNTRIES[c.country]||c.country}</span><div style={{flex:1,height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:C.green,borderRadius:3,width:`${Math.min(100,c.monthlyRevenue/(money.countries[0]?.monthlyRevenue||1)*100)}%`}}/></div><span style={{fontSize:10,fontWeight:700,color:C.green,fontFamily:"var(--mono)",minWidth:30}}>${c.cpm}</span><span style={{fontSize:9,color:C.dim,fontFamily:"var(--mono)",minWidth:50,textAlign:"right"}}>${fmt(c.monthlyRevenue)}/m</span></div>)}</Sec>
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra calcular</p>}</div>}

        {/* TITLES */}
        {sub==="titles"&&<div>{titlesL?<div style={{textAlign:"center",padding:30}}><div style={{width:200,height:6,borderRadius:3,background:"rgba(255,255,255,.06)",margin:"0 auto 10px",overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${C.red},${C.orange})`,borderRadius:3,animation:"pulse 1.5s ease infinite"}}/></div><div style={{color:C.dim,fontSize:12}}>🎯 Gerando títulos virais...</div></div>:titles?.length>0?<div style={{display:"grid",gap:8}}>{titles.map((t,i)=><div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`,padding:12}}><div style={{fontWeight:700,fontSize:13,marginBottom:3}}>{String(i+1).padStart(2,"0")}. {t.title}</div>{t.hook&&<div style={{fontSize:10,color:C.dim,fontStyle:"italic",marginBottom:4}}>🎣 {t.hook}</div>}{t.thumbnailPrompt&&<div style={{background:"rgba(0,0,0,.2)",borderRadius:6,padding:8,fontSize:10,fontFamily:"var(--mono)",color:"rgba(255,255,255,.4)",marginBottom:4}}>🖼️ {t.thumbnailPrompt}</div>}<div style={{display:"flex",gap:4}}><button onClick={()=>cp(t.title)} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>📋 Título</button><button onClick={()=>cp(t.thumbnailPrompt)} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:9}}>📋 Thumb</button></div></div>)}</div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra gerar</p>}</div>}

        {/* CALENDAR */}
        {sub==="calendar"&&<div>{calL?<div style={{textAlign:"center",padding:30}}><div style={{width:200,height:6,borderRadius:3,background:"rgba(255,255,255,.06)",margin:"0 auto 10px",overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${C.green},${C.red})`,borderRadius:3,animation:"pulse 1.5s ease infinite"}}/></div><div style={{color:C.dim,fontSize:12}}>🗓️ Planejando 30 dias de conteúdo...</div></div>:cal?.length>0?<div>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>{cal.length} vídeos planejados para 30 dias</div>
          <div style={{display:"grid",gap:6}}>{cal.map((v,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{textAlign:"center",minWidth:40}}><div style={{fontSize:18,fontWeight:900,color:C.red,opacity:.4}}>D{v.day}</div><div style={{fontSize:9,color:C.dim}}>{v.weekday}</div></div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{v.title}</div>{v.hook&&<div style={{fontSize:10,color:C.dim,fontStyle:"italic"}}>🎣 {v.hook}</div>}{v.description&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>{v.description}</div>}<div style={{display:"flex",gap:8,marginTop:4,fontSize:9,color:C.dim}}><span>⏱{v.duration}</span><span>🕐{v.uploadTime}</span>{v.priority&&<span style={{color:v.priority==="alta"?C.red:C.muted}}>●{v.priority}</span>}</div></div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}><button onClick={()=>cp(v.title)} style={{padding:"2px 6px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:8}}>📋</button>{v.thumbnailPrompt&&<button onClick={()=>cp(v.thumbnailPrompt)} style={{padding:"2px 6px",borderRadius:4,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:8}}>🖼️</button>}</div>
          </div>)}</div>
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra gerar calendário</p>}</div>}

        {/* CHANNEL MOCKUP */}
        {sub==="mockup"&&<div>{mockL?<div style={{textAlign:"center",padding:40}}>
          <div style={{width:200,height:6,borderRadius:3,background:"rgba(255,255,255,.06)",margin:"0 auto 12px",overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${C.red},${C.orange})`,borderRadius:3,animation:"pulse 1.5s ease-in-out infinite",width:"60%"}}/></div>
          <div style={{color:C.dim,fontSize:13}}>⏳ Criando canal SUPERIOR ao original...</div>
          <div style={{color:C.dim,fontSize:10,marginTop:6}}>Analisando fraquezas, gerando identidade melhorada, 4 vídeos otimizados</div>
        </div>:mockup?<div>
          {/* === YOUTUBE CHANNEL PAGE MOCKUP === */}
          <div style={{background:"#0f0f0f",borderRadius:16,overflow:"hidden",border:`1px solid ${C.border}`}}>
            {/* Banner - full width like YouTube */}
            <div style={{height:160,background:mockImgs.banner?`url(${mockImgs.banner}) center/cover`:`linear-gradient(135deg,${mockup.colors?.primary||"#1a1a2e"},${mockup.colors?.secondary||"#16213e"})`,position:"relative"}}>
              {!mockImgs.banner?<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><button onClick={()=>genImage("banner",mockup.bannerPrompt)} disabled={!!genImg} style={{padding:"10px 20px",borderRadius:8,border:"1px solid rgba(255,255,255,.3)",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,backdropFilter:"blur(4px)"}}>{genImg==="banner"?"⏳":"🎨 Gerar Banner"}</button></div>
              :<a href={mockImgs.banner} download="banner.png" style={{position:"absolute",top:8,right:8,padding:"5px 10px",borderRadius:6,background:"rgba(0,0,0,.6)",color:"#fff",fontSize:10,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>📥 Download</a>}
            </div>
            
            {/* Channel header - like YouTube */}
            <div style={{padding:"20px 24px",display:"flex",gap:16,alignItems:"center",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
              <div style={{width:80,height:80,borderRadius:"50%",background:mockImgs.logo?`url(${mockImgs.logo}) center/cover`:`linear-gradient(135deg,${mockup.colors?.primary||"#EF4444"},${mockup.colors?.accent||"#F59E0B"})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:900,color:"#fff",flexShrink:0,cursor:"pointer",position:"relative",border:"2px solid rgba(255,255,255,.1)"}} onClick={()=>!mockImgs.logo&&genImage("logo",mockup.logoPrompt)}>
                {!mockImgs.logo&&<span>{mockup.channelName?.[0]||"C"}</span>}
                {mockImgs.logo&&<a href={mockImgs.logo} download="logo.png" onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:-2,right:-2,width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none",fontSize:10}}>📥</a>}
                {!mockImgs.logo&&<div style={{position:"absolute",inset:0,borderRadius:"50%",background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .2s",fontSize:11,color:"#fff"}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0"}>🎨</div>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:20,color:"#fff",display:"flex",alignItems:"center",gap:8}}>{mockup.channelName} <svg width="14" height="14" viewBox="0 0 24 24" fill="#aaa"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>
                <div style={{fontSize:12,color:"#aaa",marginTop:2}}>@{(mockup.channelName||"").toLowerCase().replace(/\s+/g,"")} · 0 inscritos · {mockup.videos?.length||4} vídeos</div>
                <div style={{fontSize:12,color:"#717171",marginTop:4,maxWidth:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mockup.tagline || mockup.description?.slice(0,80)}</div>
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                <div style={{padding:"8px 16px",borderRadius:20,background:"#fff",color:"#0f0f0f",fontSize:13,fontWeight:600,cursor:"default"}}>Inscrever-se</div>
              </div>
            </div>

            {/* Tabs like YouTube */}
            <div style={{display:"flex",gap:0,padding:"0 24px",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
              {["Início","Vídeos","Playlists","Posts"].map((t,i)=><div key={t} style={{padding:"12px 20px",fontSize:13,fontWeight:i===1?600:400,color:i===1?"#fff":"#aaa",borderBottom:i===1?"2px solid #fff":"2px solid transparent"}}>{t}</div>)}
            </div>

            {/* Filter bar like YouTube */}
            <div style={{padding:"12px 24px",display:"flex",gap:8}}>
              {["Mais recentes","Em alta","Mais antigos"].map((f,i)=><div key={f} style={{padding:"6px 12px",borderRadius:6,background:i===0?"#fff":"rgba(255,255,255,.08)",color:i===0?"#0f0f0f":"#fff",fontSize:12,fontWeight:500}}>{f}</div>)}
            </div>

            {/* Videos grid - 4 videos in YouTube style */}
            <div style={{padding:"8px 24px 24px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              {(mockup.videos||[]).slice(0,4).map((v,i)=><div key={i} style={{cursor:"pointer"}}>
                <div style={{aspectRatio:"16/9",borderRadius:10,overflow:"hidden",background:mockImgs[`thumb${i}`]?`url(${mockImgs[`thumb${i}`]}) center/cover`:"linear-gradient(135deg,#1a1a1a,#2a2a2a)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {!mockImgs[`thumb${i}`]?<button onClick={()=>genImage(`thumb${i}`,v.thumbnailPrompt)} disabled={!!genImg} style={{padding:"6px 14px",borderRadius:6,border:"1px solid rgba(255,255,255,.25)",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",fontSize:10}}>{genImg===`thumb${i}`?"⏳":"🎨 Gerar"}</button>
                  :<a href={mockImgs[`thumb${i}`]} download={`thumb${i+1}.png`} style={{position:"absolute",top:6,right:6,padding:"3px 8px",borderRadius:4,background:"rgba(0,0,0,.7)",color:"#fff",fontSize:9,textDecoration:"none"}}>📥</a>}
                  <div style={{position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,.85)",color:"#fff",padding:"2px 6px",borderRadius:4,fontSize:11,fontWeight:500,letterSpacing:.5}}>{v.duration||"12:00"}</div>
                </div>
                <div style={{display:"flex",gap:10,marginTop:10}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:mockImgs.logo?`url(${mockImgs.logo}) center/cover`:`linear-gradient(135deg,${mockup.colors?.primary||"#EF4444"},${mockup.colors?.accent||"#F59E0B"})`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{!mockImgs.logo&&(mockup.channelName?.[0]||"C")}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:"#fff",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{v.title}</div>
                    <div style={{fontSize:12,color:"#aaa",marginTop:3}}>{mockup.channelName}</div>
                    <div style={{fontSize:12,color:"#aaa"}}>{v.views||"50K-100K"} views</div>
                  </div>
                </div>
              </div>)}
            </div>
          </div>

          {/* Why this channel is BETTER */}
          {mockup.whatsBetter&&<div style={{background:`linear-gradient(135deg,${C.green}06,${C.blue}06)`,borderRadius:12,border:`1px solid ${C.green}20`,padding:14,marginTop:12}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:6,color:C.green}}>🏆 Por que este canal é SUPERIOR ao "{data.name}"</div>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{mockup.whatsBetter}</p>
            {mockup.weaknessesFixed?.length>0&&<div style={{marginTop:8}}><div style={{fontSize:11,fontWeight:700,color:C.red,marginBottom:4}}>⚡ Fraquezas do original que corrigimos:</div>{mockup.weaknessesFixed.map((w,i)=><div key={i} style={{fontSize:11,color:C.muted,padding:"3px 0"}}>✅ {w}</div>)}</div>}
            {mockup.strategyEdge&&<div style={{marginTop:8,fontSize:11,color:C.green,fontStyle:"italic"}}>📈 {mockup.strategyEdge}</div>}
          </div>}

          {/* Action buttons */}
          <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
            <button onClick={async()=>{setGenImg("all");const keys=["logo","banner",...(mockup.videos||[]).slice(0,4).map((_,i)=>`thumb${i}`)];for(const k of keys){const prompt=k==="logo"?mockup.logoPrompt:k==="banner"?mockup.bannerPrompt:mockup.videos?.[Number(k.replace("thumb",""))]?.thumbnailPrompt;if(prompt&&!mockImgs[k]){try{const r=await aiApi.generateAsset({prompt});if(r.url)setMockImgs(p=>({...p,[k]:r.url}));}catch{}}};setGenImg(null);}} disabled={!!genImg} style={{padding:"10px 20px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.red},${C.orange})`,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>{genImg==="all"?"⏳ Gerando...":"🎨 Gerar Todas as Imagens"}</button>
            <button onClick={()=>{const all={...mockup,generatedImages:mockImgs};cp(JSON.stringify(all,null,2));}} style={{padding:"10px 20px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:12}}>📋 Copiar Tudo</button>
            <button onClick={async()=>{try{await researchApi.save({...data,notes:JSON.stringify({mockup,mockImgs}),tags:"modelado"});toast?.success("Identidade salva!");}catch(e){toast?.error(e.message);}}} style={{padding:"10px 20px",borderRadius:8,border:"none",background:`${C.green}20`,color:C.green,cursor:"pointer",fontSize:12,fontWeight:600}}>💾 Salvar</button>
          </div>

          {/* All prompts ready to copy */}
          <Sec t="Prompts Prontos para Copiar" i="📋">
            <div style={{display:"grid",gap:8}}>
              {[["🎨 Logo",mockup.logoPrompt],["🖼️ Banner (2560x1440)",mockup.bannerPrompt],...(mockup.videos||[]).slice(0,4).map((v,i)=>[`📸 Thumb ${i+1}: ${v.title?.slice(0,25)}...`,v.thumbnailPrompt])].map(([l,p])=>p?<div key={l} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:C.red,marginBottom:3}}>{l}</div><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontFamily:"var(--mono)",lineHeight:1.5}}>{p}</div></div>
                <button onClick={()=>cp(p)} style={{padding:"5px 10px",borderRadius:4,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10,flexShrink:0}}>📋</button>
              </div>:null)}
            </div>
          </Sec>

          {/* Channel description + keywords */}
          <Sec t="Descrição do Canal" i="📝">
            <p style={{fontSize:12,color:C.muted,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{mockup.description}</p>
            <button onClick={()=>cp(mockup.description)} style={{marginTop:8,padding:"5px 12px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:10}}>📋 Copiar Descrição</button>
          </Sec>
          {mockup.keywords&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>{mockup.keywords.map(k=><span key={k} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:`${C.blue}10`,color:C.blue}}>#{k}</span>)}</div>}
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra criar um canal MELHOR que "{data.name}"</p>}</div>}
      </div>
    </div>
  </div>
}

export default function Research(){
  const toast=useToast();
  const pg=useProgress();
  const[tab,setTab]=useState("search");const[query,setQuery]=useState("");const[results,setResults]=useState([]);const[fc,setFc]=useState(0);
  const[loading,setLoading]=useState(false);const[azing,setAzing]=useState(null);const[analysis,setAnalysis]=useState(null);
  const[saved,setSaved]=useState([]);const[filterTier,setFilterTier]=useState("Todos");
  const[trending,setTrending]=useState([]);const[tPeriod,setTPeriod]=useState("week");const[tRegion,setTRegion]=useState("US");const[tLoad,setTLoad]=useState(false);
  const[emerging,setEmerging]=useState(null);const[eLoad,setELoad]=useState(false);
  const[spyData,setSpyData]=useState(null);const[spyLoad,setSpyLoad]=useState(false);
  const[niches,setNiches]=useState(null);const[nichesLoad,setNichesLoad]=useState(false);
  const[abTitles,setAbTitles]=useState("");
  const[compIds,setCompIds]=useState([]);const[compData,setCompData]=useState(null);const[compLoad,setCompLoad]=useState(false);const[abNiche,setAbNiche]=useState("");const[abResults,setAbResults]=useState(null);const[abLoad,setAbLoad]=useState(false);

  useEffect(()=>{researchApi.listSaved().then(r=>{console.log("Saved channels loaded:",r?.length||0);setSaved(Array.isArray(r)?r:[]);}).catch(e=>{console.error("Load saved error:",e);setSaved([]);});},[]);

  const search=async q=>{const s=q||query;if(!s.trim())return;setLoading(true);pg?.start("🔍 Buscando Canais",["Pesquisando","Filtrando","Pontuando"]);try{pg?.update(1);const d=await researchApi.search(s);setResults(d.channels||[]);setFc(d.filtered||0);pg?.done();}catch(e){pg?.fail(e.message);toast?.error(e.message);}setLoading(false);};
  const analyze=async id=>{setAzing(id);pg?.start("Analisando Canal",["Buscando dados do YouTube","Analisando vídeos recentes","Calculando métricas","IA analisando nicho"]);try{pg?.update(1,"Buscando dados do canal...");const r=await researchApi.analyze(id);pg?.done();setAnalysis(r);}catch(e){pg?.fail(e.message);toast?.error(e.message);}setAzing(null);};
  const saveC=async ch=>{
    try{
      const s=await researchApi.save(ch);
      if(s && s.id) { setSaved(p=>[...p,s]); toast?.success("Canal salvo!"); }
      else { toast?.error("Erro: resposta inválida do servidor"); }
    }catch(e){
      console.error("Save error:", e);
      toast?.error(e.message || "Erro ao salvar canal");
    }
  };
  const delS=async id=>{try{await researchApi.deleteSaved(id);setSaved(p=>p.filter(s=>s.id!==id));}catch(e){toast?.error(e.message);}};
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};
  const loadTrend=async(p,r)=>{setTLoad(true);pg?.start("Carregando Hype",["Buscando trending","Filtrando"]);try{pg?.update(1);setTrending((await researchApi.trending({period:p||tPeriod,regionCode:r||tRegion})).videos||[]);pg?.done();}catch(e){pg?.fail(e.message);toast?.error(e.message);}setTLoad(false);};
  const loadEmerging=async()=>{setELoad(true);pg?.start("Detectando Tendências",["Coletando trending US","Coletando trending BR","Coletando trending IN,GB","Coletando trending DE,JP,KR,MX","IA cruzando dados de 8 países"]);try{pg?.update(2,"Buscando dados de 8 países...");const r=await researchApi.emerging();pg?.update(4,"IA analisando padrões...");pg?.done();setEmerging(r);}catch(e){pg?.fail(e.message);toast?.error(e.message);}setELoad(false);};
  const loadSpy=async()=>{if(!saved.length){toast?.error("Salve canais primeiro");return;}setSpyLoad(true);pg?.start("Espiando Canais",saved.map(s=>s.name));try{const r=await researchApi.spy(saved.map(s=>s.ytChannelId));pg?.done();setSpyData(r);}catch(e){pg?.fail(e.message);toast?.error(e.message);}setSpyLoad(false);};
  const loadNiches=async()=>{if(niches)return;setNichesLoad(true);pg?.start("🔥 Buscando Nichos em Alta",["Analisando tendências","IA identificando oportunidades"]);try{const r=await researchApi.trendingNiches();pg?.done();setNiches(r);}catch(e){pg?.fail(e.message);setNiches(FALLBACK_NICHES);}setNichesLoad(false);};
  const runAB=async()=>{if(!abTitles.trim())return;setAbLoad(true);pg?.start("🧪 Testando CTR",["Analisando títulos","IA pontuando","Gerando melhorias"]);try{pg?.update(1);const ts=abTitles.split("\n").filter(t=>t.trim());setAbResults((await researchApi.abTest({titles:ts,niche:abNiche})).results||[]);pg?.done();}catch(e){pg?.fail(e.message);toast?.error(e.message);}setAbLoad(false);};
  const isSaved=id=>saved.some(s=>s.ytChannelId===id);
  const dR=filterTier==="Todos"?results:results.filter(r=>r.tier===filterTier);

  return<div className="page-enter" role="main" aria-label="Research" style={{maxWidth:1200,margin:"0 auto"}}>
    {analysis&&<AnalysisPanel data={analysis} onClose={()=>setAnalysis(null)} onSave={saveC} saved={isSaved(analysis.ytChannelId)} toast={toast}/>}
    <Hdr title="Inteligência de Mercado" sub="DNA · Blueprint · Monetização · Títulos · Calendário · Preview de Canal"/>
    <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:`1px solid ${C.border}`,overflowX:"auto",flexShrink:0}}>
      {[["search","🔍 Buscar"],["trending","📈 Hype"],["emerging","🔮 Tendências"],["viral","🔥 Nichos"],["spy","🕵️ Spy"],["abtest","🧪 A/B Test"],["saved","💾 ("+saved.length+")"],["compare","📊 Comparar"]].map(([k,l])=><button key={k} onClick={()=>{setTab(k);if(k==="trending"&&!trending.length)loadTrend();if(k==="emerging"&&!emerging)loadEmerging();if(k==="spy"&&!spyData)loadSpy();if(k==="viral")loadNiches();}} style={{padding:"10px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:"transparent",color:tab===k?C.red:C.muted,borderBottom:tab===k?`2px solid ${C.red}`:"2px solid transparent",whiteSpace:"nowrap"}}>{l}</button>)}
    </div>

    {/* SEARCH */}
    {tab==="search"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:10}}><Input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="Nicho, canal ou tema..." style={{flex:1}}/><Btn onClick={()=>search()} disabled={loading}>{loading?"⏳":"🔍"}</Btn></div>
      {results.length>0&&<div style={{display:"flex",gap:4,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>{["Todos","OURO","PRATA","PROMISSOR"].map(t=><button key={t} onClick={()=>setFilterTier(t)} style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:filterTier===t?(TIERS[t]?.bg||`${C.red}15`):"rgba(255,255,255,.04)",color:filterTier===t?(TIERS[t]?.c||C.red):C.dim}}>{TIERS[t]?.i||"📊"}{t}</button>)}<span style={{fontSize:9,color:C.dim}}>{dR.length} canais{fc>0?` · ${fc} fracos ocultos`:""}</span></div>}
      {dR.length>0?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>{dR.map(ch=><ChCard key={ch.ytChannelId} ch={ch} onAnalyze={analyze} onSave={saveC} saved={isSaved(ch.ytChannelId)} busy={azing===ch.ytChannelId}/>)}</div>
      :<div style={{textAlign:"center",padding:50,color:C.dim}}>🔍 Só canais modeláveis (score 40+)</div>}
    </div>}

    {/* TRENDING */}
    {tab==="trending"&&<div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>{[["day","Hoje"],["week","Semana"],["month","Mês"]].map(([k,l])=><button key={k} onClick={()=>{setTPeriod(k);loadTrend(k);}} style={{padding:"6px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:tPeriod===k?`${C.red}15`:"rgba(255,255,255,.04)",color:tPeriod===k?C.red:C.dim}}>{l}</button>)}<Select value={tRegion} onChange={e=>{setTRegion(e.target.value);loadTrend(tPeriod,e.target.value);}} style={{minWidth:100}}>{REGIONS.map(([c,f])=><option key={c} value={c}>{f} {c}</option>)}</Select></div>
      {trending.length>0?<div style={{display:"grid",gap:6}}>{trending.map((v,i)=><div key={v.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 14px",background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`}}>
        <span style={{fontSize:14,fontWeight:900,color:C.red,opacity:.3,minWidth:22}}>{i+1}</span>
        <img src={v.thumbnail} style={{width:100,height:56,borderRadius:6,objectFit:"cover"}}/>
        <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div><div style={{fontSize:10,color:C.dim}}>{v.channelTitle} · 👁{fmt(v.views)} · ❤️{fmt(v.likes)}</div></div>
        <button onClick={()=>analyze(v.channelId)} style={{padding:"4px 8px",borderRadius:6,border:"none",background:`${C.blue}20`,color:C.blue,cursor:"pointer",fontSize:9}}>🔍</button>
      </div>)}</div>:<p style={{textAlign:"center",padding:40,color:C.dim}}>{tLoad?"⏳":"Carregue"}</p>}
    </div>}

    {/* EMERGING */}
    {tab==="emerging"&&<div>
      {eLoad?<p style={{textAlign:"center",padding:40,color:C.dim}}>⏳ Cruzando dados de 8 países... ~30s</p>:emerging?.trends?.length>0?<div style={{display:"grid",gap:10}}>
        {emerging.trends.map((t,i)=><div key={i} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:20}}>🔮</span><div style={{flex:1}}><div style={{fontWeight:800,fontSize:14}}>{t.trend}</div><div style={{fontSize:10,color:C.dim}}>Origem: {t.originCountry} → Oportunidade: {t.opportunityCountries?.join(", ")}</div></div><span style={{fontSize:10,fontWeight:700,color:t.urgency==="alta"?C.red:t.urgency==="média"?C.orange:C.dim,background:t.urgency==="alta"?`${C.red}15`:"rgba(255,255,255,.04)",padding:"3px 8px",borderRadius:4}}>●{t.urgency}</span></div>
          <p style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:8}}>{t.description}</p>
          {t.nicheIdea&&<div style={{fontSize:11,color:C.green,marginBottom:6}}>💡 {t.nicheIdea}</div>}
          {t.exampleTitles&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{t.exampleTitles.map((tt,j)=><span key={j} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:"rgba(255,255,255,.04)",color:C.muted}}>"{tt}"</span>)}</div>}
        </div>)}
      </div>:<p style={{textAlign:"center",padding:40,color:C.dim}}>🔮 Detector cruza trending de 8 países</p>}
      {!eLoad&&!emerging&&<Btn onClick={loadEmerging} style={{margin:"0 auto",display:"block"}}>🔮 Detectar Tendências</Btn>}
    </div>}

    {/* VIRAL */}
    {tab==="viral"&&<div>
      {nichesLoad?<div style={{textAlign:"center",padding:40,color:C.dim}}>⏳ Buscando nichos em alta...</div>
      :niches&&(niches.trending?.length||niches.emerging?.length)?<div>
        {niches.trending?.length>0&&<div style={{marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>🔥 Nichos em Alta Agora</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
            {niches.trending.map((n,i)=><button key={i} onClick={async()=>{setQuery(n.query||n.name);setTab("search");setLoading(true);pg?.start("🔍 Buscando",["Pesquisando"]);try{const d=await researchApi.search(n.query||n.name);setResults(d.channels||[]);setFc(d.filtered||0);pg?.done();}catch{}setLoading(false);}} style={{padding:"12px 14px",borderRadius:12,border:`1px solid ${C.border}`,background:C.bgCard,cursor:"pointer",textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.red+"50"} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontSize:18}}>{n.emoji||"🔥"}</span>
                <span style={{fontWeight:700,fontSize:13,flex:1}}>{n.name}</span>
                <span style={{fontSize:9,fontWeight:700,color:C.red,background:`${C.red}15`,padding:"2px 6px",borderRadius:4}}>●HOT</span>
              </div>
              <div style={{fontSize:10,color:C.dim,lineHeight:1.5,marginBottom:4}}>{n.description?.slice(0,80)}</div>
              {n.examples?.length>0&&<div style={{fontSize:9,color:C.muted}}>Ex: {n.examples.slice(0,2).join(", ")}</div>}
              {n.tip&&<div style={{fontSize:9,color:C.green,marginTop:3}}>💡 {n.tip?.slice(0,60)}</div>}
            </button>)}
          </div>
        </div>}
        {niches.emerging?.length>0&&<div>
          <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>🌱 Emergentes — Crescendo Rápido</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
            {niches.emerging.map((n,i)=><button key={i} onClick={async()=>{setQuery(n.query||n.name);setTab("search");setLoading(true);pg?.start("🔍 Buscando",["Pesquisando"]);try{const d=await researchApi.search(n.query||n.name);setResults(d.channels||[]);setFc(d.filtered||0);pg?.done();}catch{}setLoading(false);}} style={{padding:"12px 14px",borderRadius:12,border:`1px solid ${C.green}20`,background:`${C.green}04`,cursor:"pointer",textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.green+"50"} onMouseLeave={e=>e.currentTarget.style.borderColor=C.green+"20"}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontSize:18}}>{n.emoji||"🌱"}</span>
                <span style={{fontWeight:700,fontSize:13,flex:1}}>{n.name}</span>
                <span style={{fontSize:9,fontWeight:700,color:C.green,background:`${C.green}15`,padding:"2px 6px",borderRadius:4}}>●NOVO</span>
              </div>
              <div style={{fontSize:10,color:C.dim,lineHeight:1.5,marginBottom:4}}>{n.description?.slice(0,80)}</div>
              {n.tip&&<div style={{fontSize:9,color:C.green,marginTop:3}}>💡 {n.tip?.slice(0,60)}</div>}
            </button>)}
          </div>
        </div>}
        {niches.microNiches?.length>0&&<div style={{marginTop:20}}>
          <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>💎 Micro-Nichos — Pouca Concorrência, Muita Demanda</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
            {niches.microNiches.map((n,i)=><button key={i} onClick={async()=>{setQuery(n.query||n.name);setTab("search");setLoading(true);pg?.start("🔍 Buscando",["Pesquisando"]);try{const d=await researchApi.search(n.query||n.name);setResults(d.channels||[]);setFc(d.filtered||0);pg?.done();}catch{}setLoading(false);}} style={{padding:"14px",borderRadius:12,border:`1px solid #F59E0B20`,background:"rgba(245,158,11,.03)",cursor:"pointer",textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#F59E0B50"} onMouseLeave={e=>e.currentTarget.style.borderColor="#F59E0B20"}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:18}}>{n.emoji||"💎"}</span>
                <span style={{fontWeight:700,fontSize:13,flex:1}}>{n.name}</span>
                <span style={{fontSize:9,fontWeight:700,color:"#F59E0B",background:"#F59E0B15",padding:"2px 8px",borderRadius:4}}>●{n.competition||"baixa"}</span>
              </div>
              <div style={{fontSize:10,color:C.dim,lineHeight:1.5,marginBottom:6}}>{n.description?.slice(0,100)}</div>
              {n.howToStart&&<div style={{fontSize:9,color:C.green,marginBottom:4}}>🚀 {n.howToStart?.slice(0,80)}</div>}
              {n.contentIdeas?.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{n.contentIdeas.slice(0,3).map((id,j)=><span key={j} style={{fontSize:8,padding:"2px 5px",borderRadius:3,background:"rgba(255,255,255,.04)",color:C.muted}}>💡 {id.slice(0,30)}</span>)}</div>}
            </button>)}
          </div>
        </div>}
        <button onClick={()=>{setNiches(null);loadNiches();}} style={{marginTop:12,padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:11}}>🔄 Atualizar Nichos</button>
      </div>
      :<div><div style={{fontSize:12,color:C.dim,marginBottom:12}}>Nichos estáticos (clique pra buscar):</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>{VIRAL_Q.map(q=><button key={q} onClick={async()=>{setQuery(q);setTab("search");setLoading(true);try{const d=await researchApi.search(q);setResults(d.channels||[]);setFc(d.filtered||0);}catch{}setLoading(false);}} style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bgCard,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.red+"50"} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}><span style={{fontSize:18}}>🔥</span><div style={{fontWeight:600,fontSize:12,color:C.text,textTransform:"capitalize"}}>{q.replace(/channels?|youtube|viral/gi,"").trim()}</div></button>)}</div></div>}
    </div>}

    {/* SPY */}
    {tab==="spy"&&<div>
      {spyLoad?<p style={{textAlign:"center",padding:40,color:C.dim}}>⏳ Espiando {saved.length} canais...</p>:spyData?.channels?.length>0?<div style={{display:"grid",gap:12}}>
        {spyData.channels.map(ch=><div key={ch.ytChannelId} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            {ch.thumbnail&&<img src={ch.thumbnail} style={{width:36,height:36,borderRadius:"50%"}}/>}
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{ch.name}</div><div style={{fontSize:10,color:C.dim}}>{fmt(ch.subscribers)} subs · {ch.videoCount} vids · {fmt(ch.totalViews)} views</div></div>
            <a href={`https://youtube.com/channel/${ch.ytChannelId}`} target="_blank" style={{fontSize:10,color:C.blue,textDecoration:"none"}}>🔗</a>
          </div>
          {ch.recentVideos?.length>0&&<div><div style={{fontSize:10,fontWeight:700,color:C.red,marginBottom:6}}>Últimos vídeos:</div>{ch.recentVideos.map(v=><div key={v.id} style={{display:"flex",gap:8,alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
            {v.thumbnail&&<img src={v.thumbnail} style={{width:64,height:36,borderRadius:4,objectFit:"cover"}}/>}
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div><div style={{fontSize:9,color:C.dim}}>👁{fmt(v.views)} · {new Date(v.publishedAt).toLocaleDateString("pt-BR")}</div></div>
          </div>)}</div>}
        </div>)}
      </div>:<div style={{textAlign:"center",padding:40}}>
        <p style={{color:C.dim,marginBottom:16}}>{saved.length>0?`${saved.length} canais salvos para monitorar`:"Salve canais primeiro"}</p>
        {saved.length>0&&<Btn onClick={loadSpy}>🕵️ Espiar Canais Salvos</Btn>}
      </div>}
    </div>}

    {/* A/B TEST */}
    {tab==="abtest"&&<div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Cole títulos (um por linha) para testar CTR:</div>
        <textarea value={abTitles} onChange={e=>setAbTitles(e.target.value)} placeholder={"Título 1\nTítulo 2\nTítulo 3"} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:C.text,fontSize:13,outline:"none",minHeight:80,resize:"vertical",marginBottom:8}}/>
        <div style={{display:"flex",gap:8}}><Input value={abNiche} onChange={e=>setAbNiche(e.target.value)} placeholder="Nicho (ex: finanças)" style={{flex:1}}/><Btn onClick={runAB} disabled={abLoad}>{abLoad?"⏳":"🧪 Testar CTR"}</Btn></div>
      </div>
      {abResults?.length>0&&<div style={{display:"grid",gap:8}}>{abResults.map((r,i)=><div key={i} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:`${r.ctrScore>=80?C.green:r.ctrScore>=60?C.blue:C.red}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:r.ctrScore>=80?C.green:r.ctrScore>=60?C.blue:C.red}}>{r.ctrScore}</div>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{r.title}</div>{r.emotionalTrigger&&<div style={{fontSize:10,color:C.dim}}>🧠 {r.emotionalTrigger}</div>}</div>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{(r.strengths||[]).map((s,j)=><span key={j} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${C.green}10`,color:C.green}}>✅{s}</span>)}{(r.weaknesses||[]).map((w,j)=><span key={j} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${C.red}10`,color:C.red}}>⚠️{w}</span>)}</div>
        {r.improvedVersion&&<div style={{fontSize:11,padding:"6px 8px",background:"rgba(255,255,255,.04)",borderRadius:6,marginBottom:4}}><b style={{color:C.green}}>Melhor:</b> {r.improvedVersion}</div>}
        {r.curiosityGap&&<div style={{fontSize:10,color:C.dim}}>🔍 {r.curiosityGap}</div>}
      </div>)}</div>}
    </div>}

    {/* SAVED */}
    {tab==="saved"&&<div>
      {/* Identidades Criadas */}
      {saved.filter(ch=>{try{const n=JSON.parse(ch.notes||"{}");return n.mockup;}catch{return false;}}).length>0&&<div style={{marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>🚀 Identidades Criadas</div>
        <div style={{display:"grid",gap:10}}>
          {saved.filter(ch=>{try{return JSON.parse(ch.notes||"{}").mockup;}catch{return false;}}).map(ch=>{let id=null;try{id=JSON.parse(ch.notes);}catch{};if(!id?.mockup)return null;const m=id.mockup;const imgs=id.mockImgs||{};return<div key={ch.id+"_id"} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.green}20`,overflow:"hidden"}}>
            {/* Mini banner */}
            <div style={{height:60,background:imgs.banner?`url(${imgs.banner}) center/cover`:`linear-gradient(135deg,${m.colors?.primary||"#1a1a2e"},${m.colors?.secondary||"#16213e"})`,position:"relative"}}>
              <div style={{position:"absolute",bottom:-16,left:16,width:40,height:40,borderRadius:"50%",border:"2px solid #0f0f0f",background:imgs.logo?`url(${imgs.logo}) center/cover`:`linear-gradient(135deg,${m.colors?.primary||"#EF4444"},${m.colors?.accent||"#F59E0B"})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff"}}>{!imgs.logo&&(m.channelName?.[0]||"C")}</div>
            </div>
            <div style={{padding:"24px 16px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div><div style={{fontWeight:800,fontSize:14}}>{m.channelName}</div><div style={{fontSize:10,color:C.dim}}>{m.tagline} · Baseado em: {ch.name}</div></div>
                <div style={{display:"flex",gap:4}}>
                  {imgs.banner&&<a href={imgs.banner} download="banner.png" style={{padding:"3px 8px",borderRadius:4,background:`${C.blue}08`,color:C.blue,fontSize:9,textDecoration:"none",border:`1px solid ${C.blue}20`}}>📥 Banner</a>}
                  {imgs.logo&&<a href={imgs.logo} download="logo.png" style={{padding:"3px 8px",borderRadius:4,background:`${C.blue}08`,color:C.blue,fontSize:9,textDecoration:"none",border:`1px solid ${C.blue}20`}}>📥 Logo</a>}
                  <button onClick={()=>cp(JSON.stringify({...m,images:imgs},null,2))} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>📋 JSON</button>
                  <button onClick={()=>delS(ch.id)} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.red}20`,background:`${C.red}08`,color:C.red,cursor:"pointer",fontSize:9}}>🗑</button>
                </div>
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:6,lineHeight:1.5}}>{m.description?.slice(0,150)}...</div>
              {m.videos?.length>0&&<div style={{display:"flex",gap:4,marginTop:8,overflowX:"auto"}}>{m.videos.slice(0,4).map((v,i)=><div key={i} style={{flexShrink:0,width:100}}><div style={{aspectRatio:"16/9",borderRadius:6,background:imgs[`thumb${i}`]?`url(${imgs[`thumb${i}`]}) center/cover`:"rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:C.dim}}>{!imgs[`thumb${i}`]&&"🎬"}</div><div style={{fontSize:8,color:C.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title?.slice(0,25)}</div></div>)}</div>}
              {m.keywords&&<div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:6}}>{m.keywords.slice(0,5).map(k=><span key={k} style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:`${C.blue}10`,color:C.blue}}>#{k}</span>)}</div>}
            </div>
          </div>})}
        </div>
      </div>}

      {/* Canais Salvos */}
      <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>💾 Canais Salvos</div>
      {saved.length>0?<div style={{display:"grid",gap:6}}>{saved.map(ch=>{const t=TIERS[ch.tier]||TIERS.INICIANTE;let a=null;try{a=JSON.parse(ch.analysisJson||"{}");}catch{};const hasId=ch.notes&&ch.notes.includes("mockup");return<div key={ch.id} style={{background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
        {ch.thumbnail?<img src={ch.thumbnail} style={{width:36,height:36,borderRadius:"50%"}}/>:<div style={{width:36,height:36,borderRadius:"50%",background:`${t.c}20`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:t.c,fontSize:12}}>{ch.name?.[0]}</div>}
        <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}><span style={{fontWeight:700,fontSize:12}}>{ch.name}</span><span style={{fontSize:8,fontWeight:800,color:t.c,background:t.bg,padding:"1px 5px",borderRadius:3}}>{t.i}{ch.tier}</span>{ch.modelable&&<span style={{fontSize:8,color:C.green,background:`${C.green}15`,padding:"1px 5px",borderRadius:3}}>✅</span>}{hasId&&<span style={{fontSize:8,color:C.purple,background:`${C.purple}15`,padding:"1px 5px",borderRadius:3}}>🚀 Identidade</span>}</div>
          <div style={{fontSize:9,color:C.dim}}>{fmt(ch.subscribers)} · Score {ch.score}{ch.niche?` · ${ch.niche}`:""}</div></div>
        <button onClick={()=>{if(a?.ytChannelId)setAnalysis(a);else analyze(ch.ytChannelId);}} style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>🔍</button>
        <a href={`https://youtube.com/channel/${ch.ytChannelId}`} target="_blank" style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,fontSize:9,textDecoration:"none"}}>🔗</a>
        <button onClick={()=>delS(ch.id)} style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:"#EF4444",cursor:"pointer",fontSize:9}}>🗑</button>
      </div>})}</div>:<p style={{textAlign:"center",padding:50,color:C.dim}}>Nenhum salvo</p>}
    </div>}

    {/* COMPARE */}
    {tab==="compare"&&<div>
      {saved.length<2?<p style={{textAlign:"center",padding:50,color:C.dim}}>Salve pelo menos 2 canais para comparar</p>:<div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Selecione 2-3 canais para comparar:</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>{saved.map(ch=>{const sel=compIds.includes(ch.ytChannelId);return<button key={ch.id} onClick={()=>setCompIds(p=>sel?p.filter(x=>x!==ch.ytChannelId):p.length>=3?p:[...p,ch.ytChannelId])} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${sel?C.red:C.border}`,background:sel?`${C.red}15`:"transparent",color:sel?C.red:C.muted,cursor:"pointer",fontSize:11,fontWeight:sel?700:400}}>{ch.name}</button>})}</div>
        {compIds.length>=2&&<Btn onClick={async()=>{setCompLoad(true);try{const spy=await researchApi.spy(compIds);setCompData(spy);const ai=await researchApi.smartCompare(spy.channels||[]);setCompData(p=>({...p,ai}));}catch(e){toast?.error(e.message);}setCompLoad(false);}} disabled={compLoad}>{compLoad?"⏳ Analisando...":"📊 Comparar com IA"}</Btn>}
        {compData?.channels?.length>=2&&<div style={{marginTop:16}}>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${compData.channels.length},1fr)`,gap:12,marginBottom:16}}>
            {compData.channels.map(ch=><div key={ch.ytChannelId} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,textAlign:"center"}}>
              {ch.thumbnail&&<img src={ch.thumbnail} style={{width:48,height:48,borderRadius:"50%",margin:"0 auto 6px"}}/>}
              <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{ch.name}</div>
              <div style={{fontSize:10,color:C.dim,marginBottom:10}}>{fmt(ch.subscribers)} subs</div>
              {[["Views",fmt(ch.totalViews),C.green],["Vídeos",ch.videoCount,C.blue]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:10,color:C.dim}}>{l}</span><span style={{fontSize:10,fontWeight:700,color:c}}>{v}</span></div>)}
              {ch.recentVideos?.slice(0,3).map(v=><div key={v.id} style={{fontSize:9,color:C.muted,padding:"3px 0",borderBottom:`1px solid ${C.border}`,textAlign:"left"}}>{v.title?.slice(0,35)}... <span style={{color:C.green}}>{fmt(v.views)}</span></div>)}
            </div>)}
          </div>
          {/* AI Analysis */}
          {compData.ai&&<div>
            {compData.ai.winner&&<Sec t={`Vencedor: ${compData.ai.winner}`} i="🏆"><p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{compData.ai.recommendation}</p></Sec>}
            {compData.ai.gaps?.length>0&&<Sec t="Lacunas (ninguém explora)" i="🕳️"><div style={{display:"flex",flexDirection:"column",gap:4}}>{compData.ai.gaps.map((g,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>⚡ {g}</div>)}</div></Sec>}
            {compData.ai.unexploredThemes?.length>0&&<Sec t="Temas Inexplorados com Alta Procura" i="🔥"><div style={{display:"flex",flexDirection:"column",gap:4}}>{compData.ai.unexploredThemes.map((t,i)=><div key={i} style={{fontSize:12,color:C.green}}>💡 {t}</div>)}</div></Sec>}
            {compData.ai.titlesToExplore?.length>0&&<Sec t="5 Títulos para Explorar" i="🎯"><div style={{display:"grid",gap:6}}>{compData.ai.titlesToExplore.map((t,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:14,fontWeight:900,color:C.red,opacity:.4}}>{i+1}</span><div><div style={{fontWeight:700,fontSize:12}}>{t.title}</div><div style={{fontSize:10,color:C.dim}}>{t.reason}</div></div><button onClick={()=>cp(t.title)} style={{padding:"3px 6px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:8,flexShrink:0}}>📋</button></div>)}</div></Sec>}
          </div>}
        </div>}
      </div>}
    </div>}
  </div>
}
