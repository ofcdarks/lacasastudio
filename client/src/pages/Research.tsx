// @ts-nocheck
import { useState, useEffect } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const TIERS={OURO:{c:"#F59E0B",bg:"#F59E0B15",i:"💎"},PRATA:{c:"#94A3B8",bg:"#94A3B815",i:"🥈"},PROMISSOR:{c:"#22C55E",bg:"#22C55E15",i:"⭐"},INICIANTE:{c:"#6B7280",bg:"#6B728015",i:"🌱"}};
function fmt(n){if(!n&&n!==0)return"0";if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);}
function ageStr(months){if(!months)return"Novo";if(months>=24)return Math.floor(months/12)+" anos";if(months>=12)return"1 ano e "+(months-12)+" meses";return months+" meses";}
const VIRAL_Q=["faceless youtube channels viral","dark channels mystery horror","factory process satisfying","AI generated content channels","cash cow channels 2025","storytelling channels viral","shorts channels millions views","educational animated channels","true crime documentary channels","ASMR satisfying channels","finance investing channels growth","tech review faceless channels"];
const NICHES=["Todos","Tecnologia","Finanças","Educação","Games","Culinária","Fitness","Factory","Dark/Mistério","Humor","True Crime","ASMR","Kids","Shorts"];
const REGIONS=[["US","🇺🇸 EUA"],["BR","🇧🇷 Brasil"],["GB","🇬🇧 UK"],["IN","🇮🇳 Índia"],["MX","🇲🇽 México"],["DE","🇩🇪 Alemanha"],["FR","🇫🇷 França"],["JP","🇯🇵 Japão"],["ES","🇪🇸 Espanha"],["KR","🇰🇷 Coreia"]];
const COUNTRIES={"US":"🇺🇸 EUA","GB":"🇬🇧 UK","CA":"🇨🇦 Canadá","AU":"🇦🇺 Austrália","DE":"🇩🇪 Alemanha","BR":"🇧🇷 Brasil","MX":"🇲🇽 México","IN":"🇮🇳 Índia","ES":"🇪🇸 Espanha","FR":"🇫🇷 França","JP":"🇯🇵 Japão","KR":"🇰🇷 Coreia","PT":"🇵🇹 Portugal","IT":"🇮🇹 Itália","SA":"🇸🇦 Arábia"};

function Stat({l,v,c}){return<div style={{background:`${c||C.blue}08`,borderRadius:8,padding:"10px 6px",textAlign:"center",border:`1px solid ${c||C.blue}12`}}><div style={{fontSize:8,color:C.dim,marginBottom:2}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:c||C.text}}>{v}</div></div>}
function Sec({title,icon,children}){return<div style={{background:"rgba(255,255,255,.02)",borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:12}}><div style={{fontWeight:700,fontSize:14,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>{icon} {title}</div>{children}</div>}
function Row({l,v}){return<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:11,color:C.dim}}>{l}</span><span style={{fontSize:11,fontWeight:600}}>{v}</span></div>}

function ChCard({ch,onAnalyze,onSave,saved,busy}){
  const t=TIERS[ch.tier]||TIERS.INICIANTE;
  return<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,display:"flex",flexDirection:"column",gap:8}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      {ch.thumbnail?<img src={ch.thumbnail} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover"}}/>:<div style={{width:42,height:42,borderRadius:"50%",background:`${t.c}20`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:t.c}}>{ch.name?.[0]}</div>}
      <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</div><div style={{fontSize:10,color:C.dim}}>{fmt(ch.subscribers)} inscritos</div></div>
      <span style={{fontSize:9,fontWeight:800,color:t.c,background:t.bg,padding:"3px 8px",borderRadius:4}}>{t.i} {ch.tier}</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,textAlign:"center"}}>{[["Views",fmt(ch.totalViews)],["Vídeos",ch.videoCount],["Score",ch.score]].map(([l,v])=><div key={l} style={{background:"rgba(255,255,255,.03)",borderRadius:6,padding:"5px 0"}}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:l==="Score"?t.c:C.text}}>{v}</div></div>)}</div>
    <div style={{display:"flex",alignItems:"center",gap:8,fontSize:10,color:C.dim}}>
      {ch.country&&ch.country!=="N/A"&&<span>🌍 {ch.country}</span>}
      {ch.channelAge>0&&<span>📅 {ageStr(ch.channelAge)}</span>}
    </div>
    <div style={{display:"flex",gap:6}}><button onClick={()=>onAnalyze(ch.ytChannelId)} disabled={busy} style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:`${C.blue}20`,color:C.blue,cursor:"pointer",fontSize:11,fontWeight:600}}>{busy?"⏳":"🔍 Analisar"}</button><button onClick={()=>saved?null:onSave(ch)} disabled={saved} style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:saved?`${C.green}20`:"rgba(255,255,255,.04)",color:saved?C.green:C.muted,cursor:saved?"default":"pointer",fontSize:11,fontWeight:600}}>{saved?"✅ Salvo":"♡ Salvar"}</button></div>
  </div>
}

function AnalysisPanel({data,onClose,onSave,saved,toast}){
  if(!data)return null;
  const t=TIERS[data.tier]||TIERS.INICIANTE;
  const[subTab,setSubTab]=useState("overview");
  const[dna,setDna]=useState(null);const[dnaL,setDnaL]=useState(false);
  const[bp,setBp]=useState(null);const[bpL,setBpL]=useState(false);
  const[money,setMoney]=useState(null);const[moneyL,setMoneyL]=useState(false);
  const[titles,setTitles]=useState(null);const[titlesL,setTitlesL]=useState(false);
  const loadDna=async()=>{if(dna)return;setDnaL(true);try{setDna(await researchApi.dna({channelName:data.name,topVideos:data.topVideos,avgDuration:data.avgDuration,subscribers:data.subscribers,niche:data.niche}));}catch(e){toast?.error(e.message);}setDnaL(false);};
  const loadBp=async()=>{if(bp)return;setBpL(true);try{setBp(await researchApi.blueprint(data));}catch(e){toast?.error(e.message);}setBpL(false);};
  const loadMoney=async()=>{if(money)return;setMoneyL(true);try{setMoney(await researchApi.monetization({niche:data.niche,country:data.country,videosPerWeek:data.uploadsPerWeek||3,avgViews:data.avgViews||10000,subscribers:data.subscribers}));}catch(e){toast?.error(e.message);}setMoneyL(false);};
  const loadTitles=async()=>{if(titles)return;setTitlesL(true);try{const r=await researchApi.generateTitles({channelName:data.name,niche:data.niche,topVideoTitles:data.topVideos?.map(v=>v.title),targetCountry:data.country,language:data.language});setTitles(r.ideas||[]);}catch(e){toast?.error(e.message);}setTitlesL(false);};
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};
  const TABS=[["overview","📊 Geral"],["dna","🧬 DNA"],["blueprint","📐 Blueprint"],["money","💰 $$$"],["titles","🎯 Títulos"]];

  return<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{width:850,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,maxHeight:"95vh",overflowY:"auto"}}>
      <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
        {data.thumbnail&&<img src={data.thumbnail} style={{width:48,height:48,borderRadius:"50%"}}/>}
        <div style={{flex:1}}><div style={{fontWeight:800,fontSize:16,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{data.name}<span style={{fontSize:10,fontWeight:800,color:t.c,background:t.bg,padding:"2px 8px",borderRadius:4}}>{t.i}{data.score}pts</span></div><div style={{fontSize:11,color:C.dim}}>{data.handle} · {fmt(data.subscribers)} subs · {data.country} · {ageStr(data.channelAge||0)}</div></div>
        <button onClick={onClose} style={{width:30,height:30,borderRadius:8,border:"none",background:"rgba(255,255,255,.06)",color:C.muted,cursor:"pointer",fontSize:14}}>✕</button>
      </div>
      <div style={{display:"flex",gap:2,padding:"8px 24px",borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {TABS.map(([k,l])=><button key={k} onClick={()=>{setSubTab(k);if(k==="dna")loadDna();if(k==="blueprint")loadBp();if(k==="money")loadMoney();if(k==="titles")loadTitles();}} style={{padding:"8px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",background:subTab===k?`${C.red}15`:"transparent",color:subTab===k?C.red:C.muted}}>{l}</button>)}
      </div>
      <div style={{padding:"16px 24px"}}>
        {subTab==="overview"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}><Stat l="Inscritos" v={fmt(data.subscribers)} c={C.blue}/><Stat l="Views" v={fmt(data.totalViews)} c={C.green}/><Stat l="Vídeos" v={data.videoCount} c={C.purple}/><Stat l="Score" v={data.score} c={t.c}/><Stat l="Engajamento" v={(data.engRate||0)+"%"} c={C.red}/></div>
          <Sec title="Nicho" icon="🎯"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>{[["Nicho",data.niche],["Sub",data.subNiche],["Micro",data.microNiche]].map(([l,v])=><div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{fontSize:13,fontWeight:600}}>{v||"N/A"}</div></div>)}</div>
            {data.contentType&&<div style={{fontSize:12,marginBottom:3}}><b style={{color:C.blue}}>Tipo:</b> {data.contentType}</div>}
            {data.growthPotential&&<div style={{fontSize:12,marginBottom:3}}><b style={{color:C.green}}>Potencial:</b> {data.growthPotential}</div>}
            {data.recommendation&&<div style={{fontSize:11,color:C.muted,lineHeight:1.6,fontStyle:"italic",marginTop:8,borderLeft:`2px solid ${t.c}`,paddingLeft:10}}>{data.recommendation}</div>}
          </Sec>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Sec title="Produção" icon="📊">{[["Uploads/sem",data.uploadsPerWeek],["Melhor dia",data.bestDay],["Horário",data.bestHour],["Duração",data.avgDuration],["Views médias",fmt(data.avgViews||0)]].map(([l,v])=><Row key={l} l={l} v={v||"N/A"}/>)}</Sec>
            <Sec title="Modelagem" icon="🌍"><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:18}}>{data.modelable?"✅":"❌"}</span><span style={{fontWeight:700,color:data.modelable?C.green:C.red}}>{data.modelable?"Vale modelar":"Não recomendado"}</span></div>
              {data.modelableCountries?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{data.modelableCountries.map(c=><span key={c} style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:`${C.blue}15`,color:C.blue}}>{c}</span>)}</div>}</Sec>
          </div>
          {data.topVideos?.length>0&&<Sec title="Top Vídeos" icon="🏆">{data.topVideos.map((v,i)=><div key={v.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:11,fontWeight:800,color:C.dim,width:18}}>{i+1}</span><div style={{flex:1,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div><span style={{fontSize:11,fontWeight:700,color:C.green,fontFamily:"var(--mono)"}}>{fmt(v.views)}</span></div>)}</Sec>}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><a href={`https://youtube.com/channel/${data.ytChannelId}`} target="_blank" rel="noopener" style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,color:C.muted,fontSize:12,textDecoration:"none"}}>🔗 YouTube</a><Btn onClick={()=>onSave(data)} disabled={saved}>{saved?"✅":"💾 Salvar"}</Btn></div>
        </div>}
        {subTab==="dna"&&<div>{dnaL?<div style={{textAlign:"center",padding:40,color:C.dim}}>⏳ Analisando DNA viral... ~20s</div>:dna?<div>
          <Sec title="Hook" icon="🎯"><p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{dna.hookPattern}</p></Sec>
          <Sec title="Retenção" icon="📈"><p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{dna.retentionFormula}</p></Sec>
          <Sec title="Títulos" icon="✍️"><p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{dna.titleFormula}</p></Sec>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Sec title="Thumbnail" icon="🖼️"><p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{dna.thumbnailStyle}</p></Sec><Sec title="Produção" icon="🎬">{[["Duração",dna.idealDuration],["Frequência",dna.uploadFrequency],["Música",dna.musicStyle],["Edição",dna.editingPace]].map(([l,v])=><Row key={l} l={l} v={v||"N/A"}/>)}</Sec></div>
          <Sec title="Estrutura" icon="📋"><div style={{display:"flex",flexDirection:"column",gap:6}}>{(dna.contentStructure||[]).map((s,i)=><div key={i} style={{display:"flex",gap:8}}><span style={{fontSize:10,fontWeight:800,color:C.red,minWidth:18}}>{String(i+1).padStart(2,"0")}</span><span style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{s}</span></div>)}</div></Sec>
          <Sec title="Elementos Virais" icon="🔥"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(dna.viralElements||[]).map((e,i)=><span key={i} style={{fontSize:11,padding:"4px 10px",borderRadius:6,background:`${C.red}10`,color:C.red,border:`1px solid ${C.red}20`}}>{e}</span>)}</div></Sec>
          <Sec title="Script Template" icon="📝"><div style={{background:"rgba(0,0,0,.3)",borderRadius:8,padding:14,fontSize:12,color:"rgba(255,255,255,.7)",lineHeight:1.8,fontFamily:"var(--mono)",whiteSpace:"pre-wrap",maxHeight:300,overflowY:"auto"}}>{dna.scriptTemplate}</div><button onClick={()=>cp(dna.scriptTemplate)} style={{marginTop:8,padding:"6px 14px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:11,fontWeight:600}}>📋 Copiar Script</button></Sec>
        </div>:<div style={{textAlign:"center",padding:40,color:C.dim}}>Clique na aba pra analisar</div>}</div>}
        {subTab==="blueprint"&&<div>{bpL?<div style={{textAlign:"center",padding:40,color:C.dim}}>⏳ Gerando Blueprint... ~30s</div>:bp?<div>
          <Sec title="Setup do Canal" icon="📺">{bp.channelSetup&&<div><Row l="Nomes" v={bp.channelSetup.name}/><Row l="País" v={bp.channelSetup.targetCountry}/><Row l="Idioma" v={bp.channelSetup.language}/><div style={{marginTop:6,fontSize:11,color:C.dim}}>{bp.channelSetup.description}</div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>{(bp.channelSetup.keywords||[]).map(k=><span key={k} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.blue}10`,color:C.blue}}>#{k}</span>)}</div></div>}</Sec>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Sec title="Equipamento" icon="📷"><div style={{display:"flex",flexDirection:"column",gap:3}}>{(bp.equipment?.minimum||[]).map((e,i)=><div key={i} style={{fontSize:11,color:C.muted}}>• {e}</div>)}</div></Sec><Sec title="Software" icon="💻"><div style={{display:"flex",flexDirection:"column",gap:3}}>{(bp.equipment?.software||[]).map((e,i)=><div key={i} style={{fontSize:11,color:C.muted}}>• {e}</div>)}</div></Sec></div>
          <Sec title="Estratégia" icon="🎯">{bp.contentStrategy&&<div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}><div><div style={{fontSize:9,color:C.dim}}>Vídeos/sem</div><div style={{fontSize:16,fontWeight:800,color:C.blue}}>{bp.contentStrategy.videosPerWeek}</div></div><div><div style={{fontSize:9,color:C.dim}}>Duração</div><div style={{fontSize:14,fontWeight:700}}>{bp.contentStrategy.idealDuration}</div></div><div><div style={{fontSize:9,color:C.dim}}>Dias</div><div style={{fontSize:12,fontWeight:600}}>{(bp.contentStrategy.bestDays||[]).join(", ")}</div></div></div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.7,borderLeft:`2px solid ${C.green}`,paddingLeft:10}}>{bp.contentStrategy.first30Videos}</div></div>}</Sec>
          <Sec title="Timeline" icon="📅"><div style={{display:"grid",gap:6}}>{(bp.timeline||[]).map((t,i)=><div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:11,fontWeight:800,color:C.red,minWidth:50}}>{t.month}</span><div><div style={{fontSize:12,fontWeight:600}}>{t.goal}</div><div style={{fontSize:11,color:C.dim}}>{t.action}</div></div></div>)}</div></Sec>
          <Sec title="Growth Hacks" icon="🚀"><div style={{display:"flex",flexDirection:"column",gap:4}}>{(bp.growthHacks||[]).map((h,i)=><div key={i} style={{fontSize:12,color:C.muted}}>🔥 {h}</div>)}</div></Sec>
          <button onClick={()=>cp(JSON.stringify(bp,null,2))} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:12,fontWeight:600}}>📋 Copiar Blueprint</button>
        </div>:<div style={{textAlign:"center",padding:40,color:C.dim}}>Clique na aba pra gerar</div>}</div>}
        {subTab==="money"&&<div>{moneyL?<div style={{textAlign:"center",padding:40,color:C.dim}}>⏳ Calculando...</div>:money?<div>
          <Sec title="Projeção" icon="📈"><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>{(money.projections||[]).map(p=><div key={p.month} style={{background:`${C.green}08`,borderRadius:8,padding:10,textAlign:"center",border:`1px solid ${C.green}12`}}><div style={{fontSize:9,color:C.dim}}>Mês {p.month}</div><div style={{fontSize:18,fontWeight:800,color:C.green}}>${fmt(p.revenue)}</div><div style={{fontSize:9,color:C.dim}}>{fmt(p.views)} views</div></div>)}</div></Sec>
          <Sec title="CPM por País" icon="🌍"><div style={{display:"grid",gap:4}}>{(money.countries||[]).map(c=><div key={c.country} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:12,minWidth:100}}>{COUNTRIES[c.country]||c.country}</span><div style={{flex:1,height:8,background:"rgba(255,255,255,.06)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",background:c.country===money.selected?.country?C.green:C.blue,borderRadius:4,width:`${Math.min(100,c.monthlyRevenue/(money.countries[0]?.monthlyRevenue||1)*100)}%`}}/></div><span style={{fontSize:11,fontWeight:700,color:C.green,fontFamily:"var(--mono)",minWidth:35,textAlign:"right"}}>${c.cpm}</span><span style={{fontSize:10,color:C.dim,fontFamily:"var(--mono)",minWidth:55,textAlign:"right"}}>${fmt(c.monthlyRevenue)}/m</span></div>)}</div></Sec>
        </div>:<div style={{textAlign:"center",padding:40,color:C.dim}}>Clique na aba pra calcular</div>}</div>}
        {subTab==="titles"&&<div>{titlesL?<div style={{textAlign:"center",padding:40,color:C.dim}}>⏳ Gerando títulos... ~15s</div>:titles?.length>0?<div style={{display:"grid",gap:10}}>{titles.map((t,i)=><div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:12,border:`1px solid ${C.border}`,padding:14}}>
          <div style={{display:"flex",gap:8,marginBottom:6}}><span style={{fontSize:18,fontWeight:900,color:C.red,opacity:.3}}>{String(i+1).padStart(2,"0")}</span><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{t.title}</div><div style={{fontSize:11,color:C.dim,fontStyle:"italic"}}>🎣 {t.hook}</div>{t.tags?.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:4}}>{t.tags.map(tag=><span key={tag} style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:`${C.blue}10`,color:C.blue}}>#{tag}</span>)}</div>}</div></div>
          <div style={{background:"rgba(0,0,0,.2)",borderRadius:8,padding:10}}><div style={{fontSize:10,fontWeight:700,color:"#EC4899",marginBottom:3}}>🖼️ Thumbnail:</div><div style={{fontSize:11,color:"rgba(255,255,255,.5)",lineHeight:1.5,fontFamily:"var(--mono)"}}>{t.thumbnailPrompt}</div></div>
          <div style={{display:"flex",gap:6,marginTop:6}}><button onClick={()=>cp(t.title)} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:10}}>📋 Título</button><button onClick={()=>cp(t.thumbnailPrompt)} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10}}>📋 Thumb</button></div>
        </div>)}</div>:<div style={{textAlign:"center",padding:40,color:C.dim}}>Clique na aba pra gerar</div>}</div>}
      </div>
    </div>
  </div>
}

export default function Research(){
  const toast=useToast();
  const[tab,setTab]=useState("search");const[query,setQuery]=useState("");const[results,setResults]=useState([]);const[filteredCount,setFilteredCount]=useState(0);
  const[loading,setLoading]=useState(false);const[analyzing,setAnalyzing]=useState(null);const[analysis,setAnalysis]=useState(null);
  const[saved,setSaved]=useState([]);const[filterNiche,setFilterNiche]=useState("Todos");const[filterTier,setFilterTier]=useState("Todos");
  const[trending,setTrending]=useState([]);const[trendPeriod,setTrendPeriod]=useState("week");const[trendRegion,setTrendRegion]=useState("US");const[trendLoading,setTrendLoading]=useState(false);

  useEffect(()=>{researchApi.listSaved().then(setSaved).catch(()=>{});},[]);

  const search=async(q)=>{const sq=q||query;if(!sq.trim())return;setLoading(true);try{const d=await researchApi.search(sq);setResults(d.channels||[]);setFilteredCount(d.filtered||0);}catch(e){toast?.error(e.message);}setLoading(false);};
  const analyze=async(channelId)=>{setAnalyzing(channelId);try{setAnalysis(await researchApi.analyze(channelId));}catch(e){toast?.error(e.message);}setAnalyzing(null);};
  const saveChannel=async(ch)=>{try{const s=await researchApi.save(ch);setSaved(p=>[...p,s]);toast?.success("Salvo!");}catch(e){toast?.error(e.message);}};
  const deleteSaved=async(id)=>{try{await researchApi.deleteSaved(id);setSaved(p=>p.filter(s=>s.id!==id));}catch(e){toast?.error(e.message);}};
  const loadTrending=async(p,r)=>{setTrendLoading(true);try{const d=await researchApi.trending({period:p||trendPeriod,regionCode:r||trendRegion});setTrending(d.videos||[]);}catch(e){toast?.error(e.message);}setTrendLoading(false);};
  const isSaved=ytId=>saved.some(s=>s.ytChannelId===ytId);

  // Apply tier filter to search results
  const displayResults=filterTier==="Todos"?results:results.filter(r=>r.tier===filterTier);
  const filteredSaved=filterNiche==="Todos"?saved:saved.filter(s=>(s.niche||"").includes(filterNiche)||(s.subNiche||"").includes(filterNiche));

  return<div className="page-enter" style={{maxWidth:1200,margin:"0 auto"}}>
    {analysis&&<AnalysisPanel data={analysis} onClose={()=>setAnalysis(null)} onSave={saveChannel} saved={isSaved(analysis.ytChannelId)} toast={toast}/>}
    <Hdr title="Inteligência de Mercado" sub="Nichos virais · DNA viral · Blueprint · Monetização · Títulos"/>
    <div style={{display:"flex",gap:4,marginBottom:24,borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
      {[["search","🔍 Buscar"],["trending","📈 Hype"],["viral","🔥 Nichos"],["saved","💾 Salvos ("+saved.length+")"]].map(([k,l])=><button key={k} onClick={()=>{setTab(k);if(k==="trending"&&!trending.length)loadTrending();}} style={{padding:"10px 16px",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:"transparent",color:tab===k?C.red:C.muted,borderBottom:tab===k?`2px solid ${C.red}`:"2px solid transparent",whiteSpace:"nowrap"}}>{l}</button>)}
    </div>

    {/* SEARCH */}
    {tab==="search"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <Input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="Buscar nicho, canal ou tema..." style={{flex:1,minWidth:200}}/>
        <Btn onClick={()=>search()} disabled={loading}>{loading?"⏳":"🔍"}</Btn>
      </div>
      {results.length>0&&<div style={{display:"flex",gap:6,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:11,color:C.dim}}>Filtrar:</span>
        {["Todos","OURO","PRATA","PROMISSOR"].map(t=><button key={t} onClick={()=>setFilterTier(t)} style={{padding:"4px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:filterTier===t?(TIERS[t]?.bg||`${C.red}15`):"rgba(255,255,255,.04)",color:filterTier===t?(TIERS[t]?.c||C.red):C.dim}}>{TIERS[t]?.i||"📊"} {t}</button>)}
        <span style={{fontSize:10,color:C.dim,marginLeft:8}}>{displayResults.length} canais{filteredCount>0?` (${filteredCount} fracos ocultados)`:""}</span>
      </div>}
      {displayResults.length>0?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>{displayResults.map(ch=><ChCard key={ch.ytChannelId} ch={ch} onAnalyze={analyze} onSave={saveChannel} saved={isSaved(ch.ytChannelId)} busy={analyzing===ch.ytChannelId}/>)}</div>
      :<div style={{textAlign:"center",padding:60,color:C.dim}}><div style={{fontSize:48,marginBottom:12,opacity:.2}}>🔍</div><div style={{fontSize:16,fontWeight:700,color:C.text}}>Pesquise nichos e canais</div><div style={{fontSize:12,marginTop:6}}>Só aparecem canais modeláveis (score 40+, 5+ vídeos)</div></div>}
    </div>}

    {/* TRENDING */}
    {tab==="trending"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:3}}>{[["day","Hoje"],["week","Semana"],["month","Mês"]].map(([k,l])=><button key={k} onClick={()=>{setTrendPeriod(k);loadTrending(k);}} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:trendPeriod===k?`${C.red}15`:"rgba(255,255,255,.04)",color:trendPeriod===k?C.red:C.dim}}>{l}</button>)}</div>
        <Select value={trendRegion} onChange={e=>{setTrendRegion(e.target.value);loadTrending(trendPeriod,e.target.value);}} style={{minWidth:140}}>{REGIONS.map(([c,l])=><option key={c} value={c}>{l}</option>)}</Select>
        {trendLoading&&<span style={{fontSize:11,color:C.dim}}>⏳ Carregando...</span>}
      </div>
      {trending.length>0?<div style={{display:"grid",gap:8}}>{trending.map((v,i)=><div key={v.id} style={{display:"flex",gap:14,alignItems:"center",padding:"12px 16px",background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`}}>
        <span style={{fontSize:16,fontWeight:900,color:C.red,opacity:.3,minWidth:24}}>{String(i+1).padStart(2,"0")}</span>
        <img src={v.thumbnail} style={{width:120,height:68,borderRadius:8,objectFit:"cover"}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div>
          <div style={{fontSize:11,color:C.dim,marginTop:2}}>{v.channelTitle}</div>
          <div style={{display:"flex",gap:10,marginTop:4,fontSize:10,color:C.dim}}>
            <span>👁 {fmt(v.views)}</span><span>❤️ {fmt(v.likes)}</span><span>💬 {fmt(v.comments)}</span>
            <span>⏱ {Math.floor(v.durationSecs/60)}:{String(v.durationSecs%60).padStart(2,"0")}</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <button onClick={()=>analyze(v.channelId)} style={{padding:"5px 10px",borderRadius:6,border:"none",background:`${C.blue}20`,color:C.blue,cursor:"pointer",fontSize:10,fontWeight:600}}>🔍 Canal</button>
          <a href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener" style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",fontSize:10,textDecoration:"none",textAlign:"center"}}>▶ Ver</a>
        </div>
      </div>)}</div>
      :<div style={{textAlign:"center",padding:60,color:C.dim}}>{trendLoading?"⏳":"Selecione período e região"}</div>}
    </div>}

    {/* VIRAL NICHES */}
    {tab==="viral"&&<div>
      <div style={{fontSize:13,color:C.muted,marginBottom:16}}>Clique pra buscar canais virais nesse nicho</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>{VIRAL_Q.map(q=><button key={q} onClick={async()=>{setQuery(q);setTab("search");setLoading(true);try{const d=await researchApi.search(q);setResults(d.channels||[]);setFilteredCount(d.filtered||0);}catch(e){toast?.error(e.message);}setLoading(false);}} style={{padding:"14px 16px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bgCard,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.red+"50"} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}><span style={{fontSize:20}}>🔥</span><div><div style={{fontWeight:600,fontSize:13,color:C.text,textTransform:"capitalize"}}>{q.replace(/channels?|youtube|viral/gi,"").trim()}</div><div style={{fontSize:10,color:C.dim}}>Clique para buscar</div></div></button>)}</div>
    </div>}

    {/* SAVED */}
    {tab==="saved"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}><Select value={filterNiche} onChange={e=>setFilterNiche(e.target.value)} style={{minWidth:140}}>{NICHES.map(n=><option key={n} value={n}>{n}</option>)}</Select><span style={{fontSize:11,color:C.dim}}>{filteredSaved.length} canais</span></div>
      {filteredSaved.length>0?<div style={{display:"grid",gap:8}}>{filteredSaved.map(ch=>{const t=TIERS[ch.tier]||TIERS.INICIANTE;let a=null;try{a=JSON.parse(ch.analysisJson||"{}");}catch{};return<div key={ch.id} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        {ch.thumbnail?<img src={ch.thumbnail} style={{width:40,height:40,borderRadius:"50%"}}/>:<div style={{width:40,height:40,borderRadius:"50%",background:`${t.c}20`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:t.c}}>{ch.name?.[0]}</div>}
        <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontWeight:700,fontSize:13}}>{ch.name}</span><span style={{fontSize:9,fontWeight:800,color:t.c,background:t.bg,padding:"2px 6px",borderRadius:3}}>{t.i}{ch.tier}</span>{ch.modelable&&<span style={{fontSize:9,color:C.green,background:`${C.green}15`,padding:"2px 6px",borderRadius:3}}>✅Model</span>}</div>
          <div style={{fontSize:10,color:C.dim,marginTop:1}}>{fmt(ch.subscribers)} subs · {ch.videoCount} vids · Score {ch.score}{ch.niche?` · ${ch.niche}`:""}</div></div>
        <button onClick={()=>{if(a?.ytChannelId)setAnalysis(a);else analyze(ch.ytChannelId);}} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:10}}>🔍</button>
        <a href={`https://youtube.com/channel/${ch.ytChannelId}`} target="_blank" rel="noopener" style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,fontSize:10,textDecoration:"none"}}>🔗</a>
        <button onClick={()=>deleteSaved(ch.id)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:"#EF4444",cursor:"pointer",fontSize:10}}>🗑</button>
      </div>})}</div>
      :<div style={{textAlign:"center",padding:60,color:C.dim}}>Nenhum canal salvo</div>}
    </div>}
  </div>
}
