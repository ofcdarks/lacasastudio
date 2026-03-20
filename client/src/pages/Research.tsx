// @ts-nocheck
import { useState, useEffect } from "react";
import { researchApi, aiApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const TIERS={OURO:{c:"#F59E0B",bg:"#F59E0B15",i:"💎"},PRATA:{c:"#94A3B8",bg:"#94A3B815",i:"🥈"},PROMISSOR:{c:"#22C55E",bg:"#22C55E15",i:"⭐"},INICIANTE:{c:"#6B7280",bg:"#6B728015",i:"🌱"}};
function fmt(n){if(!n&&n!==0)return"0";if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);}
function ageStr(m){if(!m)return"Novo";if(m>=24)return Math.floor(m/12)+"a";if(m>=12)return"1a "+(m-12)+"m";return m+"m";}
const VIRAL_Q=["faceless youtube channels viral","dark channels mystery horror","factory process satisfying","AI generated content channels","cash cow channels 2025","storytelling channels viral","shorts channels millions views","educational animated channels","true crime documentary","ASMR satisfying","finance investing growth","tech review faceless"];
const REGIONS=[["US","🇺🇸"],["BR","🇧🇷"],["GB","🇬🇧"],["IN","🇮🇳"],["DE","🇩🇪"],["JP","🇯🇵"],["KR","🇰🇷"],["MX","🇲🇽"],["FR","🇫🇷"],["ES","🇪🇸"]];
const COUNTRIES={"US":"🇺🇸 EUA","GB":"🇬🇧 UK","CA":"🇨🇦 Canadá","AU":"🇦🇺 Austrália","DE":"🇩🇪 Alemanha","BR":"🇧🇷 Brasil","MX":"🇲🇽 México","IN":"🇮🇳 Índia","ES":"🇪🇸 Espanha","FR":"🇫🇷 França","JP":"🇯🇵 Japão","KR":"🇰🇷 Coreia","PT":"🇵🇹 Portugal","IT":"🇮🇹 Itália","SA":"🇸🇦 Arábia"};
function Sec({t,i,children}){return<div style={{background:"rgba(255,255,255,.02)",borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:12}}><div style={{fontWeight:700,fontSize:14,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>{i} {t}</div>{children}</div>}
function Row({l,v}){return<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:11,color:C.dim}}>{l}</span><span style={{fontSize:11,fontWeight:600}}>{v}</span></div>}
function Stat({l,v,c}){return<div style={{background:`${c||C.blue}08`,borderRadius:8,padding:"10px 6px",textAlign:"center",border:`1px solid ${c||C.blue}12`}}><div style={{fontSize:8,color:C.dim,marginBottom:2}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:c||C.text}}>{v}</div></div>}

function ChCard({ch,onAnalyze,onSave,saved,busy}){const t=TIERS[ch.tier]||TIERS.INICIANTE;return<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,display:"flex",flexDirection:"column",gap:8}}>
  <div style={{display:"flex",alignItems:"center",gap:10}}>{ch.thumbnail?<img src={ch.thumbnail} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover"}}/>:<div style={{width:42,height:42,borderRadius:"50%",background:`${t.c}20`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:t.c}}>{ch.name?.[0]}</div>}<div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</div><div style={{fontSize:10,color:C.dim}}>{fmt(ch.subscribers)} subs · {ageStr(ch.channelAge)}</div></div><span style={{fontSize:9,fontWeight:800,color:t.c,background:t.bg,padding:"3px 8px",borderRadius:4}}>{t.i}{ch.tier}</span></div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,textAlign:"center"}}>{[["Views",fmt(ch.totalViews)],["Vídeos",ch.videoCount],["Score",ch.score]].map(([l,v])=><div key={l} style={{background:"rgba(255,255,255,.03)",borderRadius:6,padding:"5px 0"}}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:l==="Score"?t.c:C.text}}>{v}</div></div>)}</div>
  <div style={{display:"flex",gap:6}}><button onClick={()=>onAnalyze(ch.ytChannelId)} disabled={busy} style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:`${C.blue}20`,color:C.blue,cursor:"pointer",fontSize:11,fontWeight:600}}>{busy?"⏳":"🔍 Analisar"}</button><button onClick={()=>saved?null:onSave(ch)} disabled={saved} style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:saved?`${C.green}20`:"rgba(255,255,255,.04)",color:saved?C.green:C.muted,cursor:saved?"default":"pointer",fontSize:11,fontWeight:600}}>{saved?"✅":"♡ Salvar"}</button></div>
</div>}

function AnalysisPanel({data,onClose,onSave,saved,toast}){
  if(!data)return null;const t=TIERS[data.tier]||TIERS.INICIANTE;
  const[sub,setSub]=useState("overview");
  const[dna,setDna]=useState(null);const[dnaL,setDnaL]=useState(false);
  const[bp,setBp]=useState(null);const[bpL,setBpL]=useState(false);
  const[money,setMoney]=useState(null);const[moneyL,setMoneyL]=useState(false);
  const[titles,setTitles]=useState(null);const[titlesL,setTitlesL]=useState(false);
  const[cal,setCal]=useState(null);const[calL,setCalL]=useState(false);
  const[mockup,setMockup]=useState(null);const[mockL,setMockL]=useState(false);
  const[mockImgs,setMockImgs]=useState({});const[genImg,setGenImg]=useState(null);

  const ld=async(k,fn,set,setL,dep)=>{if(fn)return;setL(true);try{set(await dep());}catch(e){toast?.error(e.message);}setL(false);};
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const genImage=async(key,prompt)=>{setGenImg(key);try{const r=await aiApi.generateAsset({prompt});if(r.url)setMockImgs(p=>({...p,[key]:r.url}));else toast?.error("Falha");}catch(e){toast?.error(e.message);}setGenImg(null);};

  const TABS=[["overview","📊"],["dna","🧬"],["blueprint","📐"],["money","💰"],["titles","🎯"],["calendar","🗓️"],["mockup","📺"]];

  return<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
    <div onClick={e=>e.stopPropagation()} style={{width:880,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,maxHeight:"95vh",overflowY:"auto"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
        {data.thumbnail&&<img src={data.thumbnail} style={{width:44,height:44,borderRadius:"50%"}}/>}
        <div style={{flex:1}}><div style={{fontWeight:800,fontSize:15,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{data.name}<span style={{fontSize:9,fontWeight:800,color:t.c,background:t.bg,padding:"2px 6px",borderRadius:4}}>{t.i}{data.score}</span></div><div style={{fontSize:10,color:C.dim}}>{fmt(data.subscribers)} subs · {data.country} · {ageStr(data.channelAge)}</div></div>
        <button onClick={onClose} style={{width:28,height:28,borderRadius:8,border:"none",background:"rgba(255,255,255,.06)",color:C.muted,cursor:"pointer",fontSize:13}}>✕</button>
      </div>
      <div style={{display:"flex",gap:1,padding:"6px 20px",borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {TABS.map(([k,ic])=><button key={k} onClick={()=>{setSub(k);
          if(k==="dna")ld(k,dna,setDna,setDnaL,()=>researchApi.dna({channelName:data.name,topVideos:data.topVideos,avgDuration:data.avgDuration,subscribers:data.subscribers,niche:data.niche}));
          if(k==="blueprint")ld(k,bp,setBp,setBpL,()=>researchApi.blueprint(data));
          if(k==="money")ld(k,money,setMoney,setMoneyL,()=>researchApi.monetization({niche:data.niche,country:data.country,videosPerWeek:data.uploadsPerWeek||3,avgViews:data.avgViews||10000,subscribers:data.subscribers}));
          if(k==="titles")ld(k,titles,setTitles,setTitlesL,()=>researchApi.generateTitles({channelName:data.name,niche:data.niche,topVideoTitles:data.topVideos?.map(v=>v.title),targetCountry:data.country,language:data.language}).then(r=>r.ideas||[]));
          if(k==="calendar")ld(k,cal,setCal,setCalL,()=>researchApi.calendar({niche:data.niche,subNiche:data.subNiche,videosPerWeek:data.uploadsPerWeek||3,style:data.contentType,targetCountry:data.country,language:data.language}).then(r=>r.calendar||[]));
          if(k==="mockup")ld(k,mockup,setMockup,setMockL,()=>researchApi.channelMockup({originalChannel:data.name,niche:data.niche,subNiche:data.subNiche,style:data.contentType,targetCountry:data.country,language:data.language}));
        }} style={{padding:"8px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,background:sub===k?`${C.red}15`:"transparent",color:sub===k?C.red:C.muted}}>{ic}</button>)}
      </div>
      <div style={{padding:"14px 20px"}}>
        {/* OVERVIEW */}
        {sub==="overview"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:14}}><Stat l="Inscritos" v={fmt(data.subscribers)} c={C.blue}/><Stat l="Views" v={fmt(data.totalViews)} c={C.green}/><Stat l="Vídeos" v={data.videoCount} c={C.purple}/><Stat l="Score" v={data.score} c={t.c}/><Stat l="Engaj." v={(data.engRate||0)+"%"} c={C.red}/></div>
          <Sec t="Nicho" i="🎯"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>{[["Nicho",data.niche],["Sub",data.subNiche],["Micro",data.microNiche]].map(([l,v])=><div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{fontSize:12,fontWeight:600}}>{v||"N/A"}</div></div>)}</div>
            {data.contentType&&<div style={{fontSize:11}}><b style={{color:C.blue}}>Tipo:</b> {data.contentType}</div>}
            {data.recommendation&&<div style={{fontSize:11,color:C.muted,lineHeight:1.6,fontStyle:"italic",marginTop:6,borderLeft:`2px solid ${t.c}`,paddingLeft:10}}>{data.recommendation}</div>}
          </Sec>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sec t="Produção" i="📊">{[["Uploads/sem",data.uploadsPerWeek],["Dia",data.bestDay],["Hora",data.bestHour],["Duração",data.avgDuration]].map(([l,v])=><Row key={l} l={l} v={v||"N/A"}/>)}</Sec>
            <Sec t="Modelagem" i="🌍"><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><span>{data.modelable?"✅":"❌"}</span><span style={{fontWeight:700,fontSize:12,color:data.modelable?C.green:C.red}}>{data.modelable?"Modelável":"Não recomendado"}</span></div>
              {data.modelableCountries?.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{data.modelableCountries.map(c=><span key={c} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${C.blue}15`,color:C.blue}}>{c}</span>)}</div>}</Sec>
          </div>
          {data.topVideos?.length>0&&<Sec t="Top Vídeos" i="🏆">{data.topVideos.map((v,i)=><div key={v.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:10,fontWeight:800,color:C.dim,width:16}}>{i+1}</span><div style={{flex:1,fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div><span style={{fontSize:10,fontWeight:700,color:C.green,fontFamily:"var(--mono)"}}>{fmt(v.views)}</span></div>)}</Sec>}
          <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><a href={`https://youtube.com/channel/${data.ytChannelId}`} target="_blank" style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.border}`,color:C.muted,fontSize:11,textDecoration:"none"}}>🔗</a><Btn onClick={()=>onSave(data)} disabled={saved}>{saved?"✅":"💾 Salvar"}</Btn></div>
        </div>}

        {/* DNA */}
        {sub==="dna"&&<div>{dnaL?<p style={{textAlign:"center",padding:30,color:C.dim}}>⏳ Analisando DNA... ~20s</p>:dna?<div>
          {[["Hook","🎯","hookPattern"],["Retenção","📈","retentionFormula"],["Títulos","✍️","titleFormula"],["Thumbnail","🖼️","thumbnailStyle"]].map(([t,i,k])=>dna[k]?<Sec key={k} t={t} i={i}><p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{dna[k]}</p></Sec>:null)}
          <Sec t="Estrutura" i="📋"><div style={{display:"flex",flexDirection:"column",gap:4}}>{(dna.contentStructure||[]).map((s,i)=><div key={i} style={{display:"flex",gap:6}}><span style={{fontSize:10,fontWeight:800,color:C.red,minWidth:16}}>{i+1}</span><span style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{s}</span></div>)}</div></Sec>
          {dna.viralElements&&<Sec t="Virais" i="🔥"><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{dna.viralElements.map((e,i)=><span key={i} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:`${C.red}10`,color:C.red}}>{e}</span>)}</div></Sec>}
          {dna.scriptTemplate&&<Sec t="Script" i="📝"><div style={{background:"rgba(0,0,0,.3)",borderRadius:8,padding:12,fontSize:11,color:"rgba(255,255,255,.7)",lineHeight:1.7,fontFamily:"var(--mono)",whiteSpace:"pre-wrap",maxHeight:250,overflowY:"auto"}}>{dna.scriptTemplate}</div><button onClick={()=>cp(dna.scriptTemplate)} style={{marginTop:6,padding:"5px 12px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10}}>📋 Copiar</button></Sec>}
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra analisar</p>}</div>}

        {/* BLUEPRINT */}
        {sub==="blueprint"&&<div>{bpL?<p style={{textAlign:"center",padding:30,color:C.dim}}>⏳ Gerando... ~30s</p>:bp?<div>
          {bp.channelSetup&&<Sec t="Setup" i="📺"><Row l="Nomes" v={bp.channelSetup.name}/><Row l="País" v={bp.channelSetup.targetCountry}/>{bp.channelSetup.description&&<p style={{fontSize:11,color:C.dim,marginTop:6}}>{bp.channelSetup.description}</p>}</Sec>}
          {bp.contentStrategy&&<Sec t="Estratégia" i="🎯"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}><div><div style={{fontSize:9,color:C.dim}}>Vids/sem</div><div style={{fontSize:14,fontWeight:800,color:C.blue}}>{bp.contentStrategy.videosPerWeek}</div></div><div><div style={{fontSize:9,color:C.dim}}>Duração</div><div style={{fontSize:12,fontWeight:700}}>{bp.contentStrategy.idealDuration}</div></div><div><div style={{fontSize:9,color:C.dim}}>Dias</div><div style={{fontSize:11}}>{(bp.contentStrategy.bestDays||[]).join(", ")}</div></div></div>{bp.contentStrategy.first30Videos&&<p style={{fontSize:11,color:C.muted,lineHeight:1.6,borderLeft:`2px solid ${C.green}`,paddingLeft:8}}>{bp.contentStrategy.first30Videos}</p>}</Sec>}
          {bp.timeline&&<Sec t="Timeline" i="📅">{bp.timeline.map((t,i)=><div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:10,fontWeight:800,color:C.red,minWidth:45}}>{t.month}</span><div><div style={{fontSize:11,fontWeight:600}}>{t.goal}</div><div style={{fontSize:10,color:C.dim}}>{t.action}</div></div></div>)}</Sec>}
          {bp.growthHacks&&<Sec t="Growth Hacks" i="🚀">{bp.growthHacks.map((h,i)=><div key={i} style={{fontSize:11,color:C.muted,marginBottom:3}}>🔥 {h}</div>)}</Sec>}
          <button onClick={()=>cp(JSON.stringify(bp,null,2))} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:11}}>📋 Copiar</button>
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra gerar</p>}</div>}

        {/* MONEY */}
        {sub==="money"&&<div>{moneyL?<p style={{textAlign:"center",padding:30,color:C.dim}}>⏳</p>:money?<div>
          <Sec t="Projeção" i="📈"><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>{(money.projections||[]).map(p=><div key={p.month} style={{background:`${C.green}08`,borderRadius:8,padding:8,textAlign:"center"}}><div style={{fontSize:9,color:C.dim}}>Mês {p.month}</div><div style={{fontSize:16,fontWeight:800,color:C.green}}>${fmt(p.revenue)}</div></div>)}</div></Sec>
          <Sec t="CPM" i="🌍">{(money.countries||[]).map(c=><div key={c.country} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:11,minWidth:90}}>{COUNTRIES[c.country]||c.country}</span><div style={{flex:1,height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:C.green,borderRadius:3,width:`${Math.min(100,c.monthlyRevenue/(money.countries[0]?.monthlyRevenue||1)*100)}%`}}/></div><span style={{fontSize:10,fontWeight:700,color:C.green,fontFamily:"var(--mono)",minWidth:30}}>${c.cpm}</span><span style={{fontSize:9,color:C.dim,fontFamily:"var(--mono)",minWidth:50,textAlign:"right"}}>${fmt(c.monthlyRevenue)}/m</span></div>)}</Sec>
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra calcular</p>}</div>}

        {/* TITLES */}
        {sub==="titles"&&<div>{titlesL?<p style={{textAlign:"center",padding:30,color:C.dim}}>⏳ ~15s</p>:titles?.length>0?<div style={{display:"grid",gap:8}}>{titles.map((t,i)=><div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`,padding:12}}><div style={{fontWeight:700,fontSize:13,marginBottom:3}}>{String(i+1).padStart(2,"0")}. {t.title}</div>{t.hook&&<div style={{fontSize:10,color:C.dim,fontStyle:"italic",marginBottom:4}}>🎣 {t.hook}</div>}{t.thumbnailPrompt&&<div style={{background:"rgba(0,0,0,.2)",borderRadius:6,padding:8,fontSize:10,fontFamily:"var(--mono)",color:"rgba(255,255,255,.4)",marginBottom:4}}>🖼️ {t.thumbnailPrompt}</div>}<div style={{display:"flex",gap:4}}><button onClick={()=>cp(t.title)} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>📋 Título</button><button onClick={()=>cp(t.thumbnailPrompt)} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:9}}>📋 Thumb</button></div></div>)}</div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra gerar</p>}</div>}

        {/* CALENDAR */}
        {sub==="calendar"&&<div>{calL?<p style={{textAlign:"center",padding:30,color:C.dim}}>⏳ Gerando calendário... ~25s</p>:cal?.length>0?<div>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>{cal.length} vídeos planejados para 30 dias</div>
          <div style={{display:"grid",gap:6}}>{cal.map((v,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{textAlign:"center",minWidth:40}}><div style={{fontSize:18,fontWeight:900,color:C.red,opacity:.4}}>D{v.day}</div><div style={{fontSize:9,color:C.dim}}>{v.weekday}</div></div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{v.title}</div>{v.hook&&<div style={{fontSize:10,color:C.dim,fontStyle:"italic"}}>🎣 {v.hook}</div>}{v.description&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>{v.description}</div>}<div style={{display:"flex",gap:8,marginTop:4,fontSize:9,color:C.dim}}><span>⏱{v.duration}</span><span>🕐{v.uploadTime}</span>{v.priority&&<span style={{color:v.priority==="alta"?C.red:C.muted}}>●{v.priority}</span>}</div></div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}><button onClick={()=>cp(v.title)} style={{padding:"2px 6px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:8}}>📋</button>{v.thumbnailPrompt&&<button onClick={()=>cp(v.thumbnailPrompt)} style={{padding:"2px 6px",borderRadius:4,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:8}}>🖼️</button>}</div>
          </div>)}</div>
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra gerar calendário</p>}</div>}

        {/* CHANNEL MOCKUP */}
        {sub==="mockup"&&<div>{mockL?<p style={{textAlign:"center",padding:30,color:C.dim}}>⏳ Criando identidade visual... ~20s</p>:mockup?<div>
          {/* YouTube-style channel preview */}
          <div style={{background:"#0f0f0f",borderRadius:14,overflow:"hidden",border:`1px solid ${C.border}`}}>
            {/* Banner */}
            <div style={{height:140,background:mockImgs.banner?`url(${mockImgs.banner}) center/cover`:`linear-gradient(135deg,${mockup.colors?.primary||"#1a1a2e"},${mockup.colors?.secondary||"#16213e"})`,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {!mockImgs.banner&&<button onClick={()=>genImage("banner",mockup.bannerPrompt)} disabled={genImg==="banner"} style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,.3)",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,backdropFilter:"blur(4px)"}}>{genImg==="banner"?"⏳ Gerando banner...":"🎨 Gerar Banner"}</button>}
            </div>
            {/* Channel info */}
            <div style={{padding:"16px 20px",display:"flex",gap:14,alignItems:"center"}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:mockImgs.logo?`url(${mockImgs.logo}) center/cover`:`linear-gradient(135deg,${mockup.colors?.primary||"#EF4444"},${mockup.colors?.accent||"#F59E0B"})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:"#fff",flexShrink:0,position:"relative"}}>
                {!mockImgs.logo&&<span>{mockup.channelName?.[0]||"C"}</span>}
                {!mockImgs.logo&&<button onClick={()=>genImage("logo",mockup.logoPrompt)} disabled={genImg==="logo"} style={{position:"absolute",inset:0,borderRadius:"50%",border:"none",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",fontSize:10,opacity:0}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0"}>{genImg==="logo"?"⏳":"🎨"}</button>}
              </div>
              <div><div style={{fontWeight:700,fontSize:16,color:"#fff"}}>{mockup.channelName}</div><div style={{fontSize:11,color:"#aaa"}}>{mockup.tagline}</div><div style={{fontSize:10,color:"#666",marginTop:2}}>0 inscritos · {mockup.videos?.length||5} vídeos</div></div>
            </div>
            {/* Videos grid */}
            <div style={{padding:"0 20px 20px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
              {(mockup.videos||[]).map((v,i)=><div key={i}>
                <div style={{aspectRatio:"16/9",borderRadius:8,overflow:"hidden",background:mockImgs[`thumb${i}`]?`url(${mockImgs[`thumb${i}`]}) center/cover`:"linear-gradient(135deg,#1a1a1a,#2a2a2a)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {!mockImgs[`thumb${i}`]&&<button onClick={()=>genImage(`thumb${i}`,v.thumbnailPrompt)} disabled={genImg===`thumb${i}`} style={{padding:"5px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,.2)",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",fontSize:9}}>{genImg===`thumb${i}`?"⏳":"🎨 Gerar"}</button>}
                  <div style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,.8)",color:"#fff",padding:"1px 4px",borderRadius:3,fontSize:9}}>{v.duration||"10:00"}</div>
                </div>
                <div style={{marginTop:6}}><div style={{fontSize:11,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div><div style={{fontSize:9,color:"#666",marginTop:1}}>{v.views||"0"} views</div></div>
              </div>)}
            </div>
          </div>
          {/* Actions */}
          <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
            <button onClick={async()=>{setGenImg("all");for(const k of ["logo","banner",...(mockup.videos||[]).map((_,i)=>`thumb${i}`)]){const prompt=k==="logo"?mockup.logoPrompt:k==="banner"?mockup.bannerPrompt:mockup.videos[Number(k.replace("thumb",""))]?.thumbnailPrompt;if(prompt&&!mockImgs[k]){try{const r=await aiApi.generateAsset({prompt});if(r.url)setMockImgs(p=>({...p,[k]:r.url}));}catch{}}};setGenImg(null);}} disabled={!!genImg} style={{padding:"8px 16px",borderRadius:8,border:"none",background:`${C.red}20`,color:C.red,cursor:"pointer",fontSize:11,fontWeight:600}}>{genImg==="all"?"⏳ Gerando tudo...":"🎨 Gerar Todas Imagens"}</button>
            <button onClick={()=>cp(JSON.stringify(mockup,null,2))} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:11}}>📋 Copiar dados</button>
          </div>
          {/* Description */}
          <Sec t="Descrição do Canal" i="📝"><p style={{fontSize:11,color:C.muted,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{mockup.description}</p></Sec>
          {mockup.keywords&&<div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:12}}>{mockup.keywords.map(k=><span key={k} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${C.blue}10`,color:C.blue}}>#{k}</span>)}</div>}
        </div>:<p style={{textAlign:"center",padding:30,color:C.dim}}>Clique pra criar preview do canal</p>}</div>}
      </div>
    </div>
  </div>
}

export default function Research(){
  const toast=useToast();
  const[tab,setTab]=useState("search");const[query,setQuery]=useState("");const[results,setResults]=useState([]);const[fc,setFc]=useState(0);
  const[loading,setLoading]=useState(false);const[azing,setAzing]=useState(null);const[analysis,setAnalysis]=useState(null);
  const[saved,setSaved]=useState([]);const[filterTier,setFilterTier]=useState("Todos");
  const[trending,setTrending]=useState([]);const[tPeriod,setTPeriod]=useState("week");const[tRegion,setTRegion]=useState("US");const[tLoad,setTLoad]=useState(false);
  const[emerging,setEmerging]=useState(null);const[eLoad,setELoad]=useState(false);
  const[spyData,setSpyData]=useState(null);const[spyLoad,setSpyLoad]=useState(false);
  const[abTitles,setAbTitles]=useState("");
  const[compIds,setCompIds]=useState([]);const[compData,setCompData]=useState(null);const[compLoad,setCompLoad]=useState(false);const[abNiche,setAbNiche]=useState("");const[abResults,setAbResults]=useState(null);const[abLoad,setAbLoad]=useState(false);

  useEffect(()=>{researchApi.listSaved().then(setSaved).catch(()=>{});},[]);

  const search=async q=>{const s=q||query;if(!s.trim())return;setLoading(true);try{const d=await researchApi.search(s);setResults(d.channels||[]);setFc(d.filtered||0);}catch(e){toast?.error(e.message);}setLoading(false);};
  const analyze=async id=>{setAzing(id);try{setAnalysis(await researchApi.analyze(id));}catch(e){toast?.error(e.message);}setAzing(null);};
  const saveC=async ch=>{try{const s=await researchApi.save(ch);setSaved(p=>[...p,s]);toast?.success("Salvo!");}catch(e){toast?.error(e.message);}};
  const delS=async id=>{try{await researchApi.deleteSaved(id);setSaved(p=>p.filter(s=>s.id!==id));}catch(e){toast?.error(e.message);}};
  const loadTrend=async(p,r)=>{setTLoad(true);try{setTrending((await researchApi.trending({period:p||tPeriod,regionCode:r||tRegion})).videos||[]);}catch(e){toast?.error(e.message);}setTLoad(false);};
  const loadEmerging=async()=>{setELoad(true);try{setEmerging(await researchApi.emerging());}catch(e){toast?.error(e.message);}setELoad(false);};
  const loadSpy=async()=>{if(!saved.length){toast?.error("Salve canais primeiro");return;}setSpyLoad(true);try{setSpyData(await researchApi.spy(saved.map(s=>s.ytChannelId)));}catch(e){toast?.error(e.message);}setSpyLoad(false);};
  const runAB=async()=>{if(!abTitles.trim())return;setAbLoad(true);try{const ts=abTitles.split("\n").filter(t=>t.trim());setAbResults((await researchApi.abTest({titles:ts,niche:abNiche})).results||[]);}catch(e){toast?.error(e.message);}setAbLoad(false);};
  const isSaved=id=>saved.some(s=>s.ytChannelId===id);
  const dR=filterTier==="Todos"?results:results.filter(r=>r.tier===filterTier);

  return<div className="page-enter" style={{maxWidth:1200,margin:"0 auto"}}>
    {analysis&&<AnalysisPanel data={analysis} onClose={()=>setAnalysis(null)} onSave={saveC} saved={isSaved(analysis.ytChannelId)} toast={toast}/>}
    <Hdr title="Inteligência de Mercado" sub="DNA · Blueprint · Monetização · Títulos · Calendário · Preview de Canal"/>
    <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:`1px solid ${C.border}`,overflowX:"auto",flexShrink:0}}>
      {[["search","🔍 Buscar"],["trending","📈 Hype"],["emerging","🔮 Tendências"],["viral","🔥 Nichos"],["spy","🕵️ Spy"],["abtest","🧪 A/B Test"],["saved","💾 ("+saved.length+")"],["compare","📊 Comparar"]].map(([k,l])=><button key={k} onClick={()=>{setTab(k);if(k==="trending"&&!trending.length)loadTrend();if(k==="emerging"&&!emerging)loadEmerging();if(k==="spy"&&!spyData)loadSpy();}} style={{padding:"10px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:"transparent",color:tab===k?C.red:C.muted,borderBottom:tab===k?`2px solid ${C.red}`:"2px solid transparent",whiteSpace:"nowrap"}}>{l}</button>)}
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
    {tab==="viral"&&<div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>{VIRAL_Q.map(q=><button key={q} onClick={async()=>{setQuery(q);setTab("search");setLoading(true);try{const d=await researchApi.search(q);setResults(d.channels||[]);setFc(d.filtered||0);}catch{}setLoading(false);}} style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bgCard,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.red+"50"} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}><span style={{fontSize:18}}>🔥</span><div><div style={{fontWeight:600,fontSize:12,color:C.text,textTransform:"capitalize"}}>{q.replace(/channels?|youtube|viral/gi,"").trim()}</div></div></button>)}</div></div>}

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
      {saved.length>0?<div style={{display:"grid",gap:6}}>{saved.map(ch=>{const t=TIERS[ch.tier]||TIERS.INICIANTE;let a=null;try{a=JSON.parse(ch.analysisJson||"{}");}catch{};return<div key={ch.id} style={{background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
        {ch.thumbnail?<img src={ch.thumbnail} style={{width:36,height:36,borderRadius:"50%"}}/>:<div style={{width:36,height:36,borderRadius:"50%",background:`${t.c}20`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:t.c,fontSize:12}}>{ch.name?.[0]}</div>}
        <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}><span style={{fontWeight:700,fontSize:12}}>{ch.name}</span><span style={{fontSize:8,fontWeight:800,color:t.c,background:t.bg,padding:"1px 5px",borderRadius:3}}>{t.i}{ch.tier}</span>{ch.modelable&&<span style={{fontSize:8,color:C.green,background:`${C.green}15`,padding:"1px 5px",borderRadius:3}}>✅</span>}</div>
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
        {compIds.length>=2&&<Btn onClick={async()=>{setCompLoad(true);try{setCompData(await researchApi.spy(compIds));}catch(e){toast?.error(e.message);}setCompLoad(false);}} disabled={compLoad}>{compLoad?"⏳":"📊 Comparar"}</Btn>}
        {compData?.channels?.length>=2&&<div style={{marginTop:16,display:"grid",gridTemplateColumns:`repeat(${compData.channels.length},1fr)`,gap:12}}>
          {compData.channels.map(ch=><div key={ch.ytChannelId} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,textAlign:"center"}}>
            {ch.thumbnail&&<img src={ch.thumbnail} style={{width:56,height:56,borderRadius:"50%",margin:"0 auto 8px"}}/>}
            <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{ch.name}</div>
            <div style={{fontSize:10,color:C.dim,marginBottom:12}}>{fmt(ch.subscribers)} subs</div>
            {[["Views Total",fmt(ch.totalViews),C.green],["Vídeos",ch.videoCount,C.blue],["Inscritos",fmt(ch.subscribers),C.purple]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:11,color:C.dim}}>{l}</span><span style={{fontSize:11,fontWeight:700,color:c}}>{v}</span></div>)}
            {ch.recentVideos?.length>0&&<div style={{marginTop:10}}><div style={{fontSize:10,fontWeight:700,color:C.red,marginBottom:6}}>Últimos vídeos:</div>{ch.recentVideos.slice(0,3).map(v=><div key={v.id} style={{fontSize:10,color:C.muted,padding:"3px 0",borderBottom:`1px solid ${C.border}`,textAlign:"left"}}>{v.title?.slice(0,40)}... <span style={{color:C.green}}>{fmt(v.views)}</span></div>)}</div>}
          </div>)}
        </div>}
      </div>}
    </div>}
  </div>
}
