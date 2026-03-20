// @ts-nocheck
import { useState } from "react";
import { researchApi, aiApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const STEPS=[{k:"setup",i:"⚙️",t:"Nicho & Estilo"},{k:"identity",i:"🎨",t:"Identidade"},{k:"scripts",i:"📝",t:"5 Roteiros"},{k:"calendar",i:"📅",t:"Calendário"},{k:"done",i:"🚀",t:"Pronto!"}];

export default function Pipeline(){
  const toast=useToast();const pg=useProgress();
  const[step,setStep]=useState(0);
  const[niche,setNiche]=useState("");const[subNiche,setSubNiche]=useState("");const[style,setStyle]=useState("educativo");const[country,setCountry]=useState("BR");const[language,setLanguage]=useState("pt");
  const[identity,setIdentity]=useState(null);const[scripts,setScripts]=useState(null);const[calendar,setCalendar]=useState(null);
  const[loading,setLoading]=useState(false);
  const[genImgs,setGenImgs]=useState({});const[genningKey,setGenningKey]=useState(null);
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const genStep=async(s)=>{
    setLoading(true);
    const titles={"identity":"🎨 Gerando Identidade","scripts":"📝 Criando 5 Roteiros","calendar":"📅 Planejando 30 Dias"};
    pg?.start(titles[s]||"Processando",["Analisando nicho","IA criando","Otimizando","Finalizando"]);
    try{
      const r=await researchApi.pipeline({niche,subNiche,style,country,language,step:s,context:identity?{channelName:identity.channelName}:undefined});
      pg?.done();
      if(s==="identity"){setIdentity(r);setStep(1);}
      else if(s==="scripts"){console.log("[Pipeline] Scripts response:", JSON.stringify(r).slice(0,200));const arr=Array.isArray(r)?r:r?.scripts?r.scripts:r?.data?r.data:typeof r==="object"?Object.values(r).find(v=>Array.isArray(v))||[r]:[];setScripts(arr.length?arr:[r]);setStep(2);}
      else if(s==="calendar"){const arr=Array.isArray(r)?r:r?.calendar?r.calendar:r?.data?r.data:typeof r==="object"?Object.values(r).find(v=>Array.isArray(v))||[r]:[];setCalendar(arr.length?arr:[r]);setStep(3);}
    }catch(e){pg?.fail(e.message);toast?.error(e.message);}
    setLoading(false);
  };

  const genImg=async(key,prompt)=>{setGenningKey(key);try{const r=await aiApi.generateAsset({prompt});if(r.url)setGenImgs(p=>({...p,[key]:r.url}));}catch{}setGenningKey(null);};

  const exportAll=()=>{
    const data={identity,scripts,calendar,images:genImgs};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${identity?.channelName||"canal"}-pipeline.json`;a.click();URL.revokeObjectURL(url);
    toast?.success("Pipeline exportado!");
  };

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Pipeline: Ideia → Canal" sub="Do zero ao canal pronto em 4 passos"/>

    {/* Progress steps */}
    <div style={{display:"flex",gap:0,marginBottom:28,position:"relative"}}>
      <div style={{position:"absolute",top:18,left:"10%",right:"10%",height:3,background:"rgba(255,255,255,.06)",borderRadius:2,zIndex:0}}/>
      <div style={{position:"absolute",top:18,left:"10%",height:3,background:`linear-gradient(90deg,${C.red},${C.green})`,borderRadius:2,zIndex:1,width:`${Math.min(100,(step/4)*100)*0.8}%`,transition:"width .5s ease"}}/>
      {STEPS.map((s,i)=><div key={s.k} style={{flex:1,textAlign:"center",position:"relative",zIndex:2}}>
        <div style={{width:36,height:36,borderRadius:"50%",margin:"0 auto 6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,background:i<=step?`linear-gradient(135deg,${C.red},${C.orange})`:C.bgCard,border:i<=step?"none":`2px solid ${C.border}`,color:i<=step?"#fff":C.dim,fontWeight:700,transition:"all .3s"}}>{i<step?"✓":s.i}</div>
        <div style={{fontSize:10,fontWeight:i===step?700:400,color:i<=step?C.text:C.dim}}>{s.t}</div>
      </div>)}
    </div>

    {/* Step 0: Setup */}
    {step===0&&<div style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24}}>
      <div style={{fontSize:18,fontWeight:800,marginBottom:16}}>⚙️ Defina o Canal</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><Label t="Nicho Principal *"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="Ex: história, dark, finanças, ASMR"/></div>
        <div><Label t="Sub-nicho"/><Input value={subNiche} onChange={e=>setSubNiche(e.target.value)} placeholder="Ex: civilizações antigas, mistérios"/></div>
        <div><Label t="Estilo"/><Select value={style} onChange={e=>setStyle(e.target.value)}><option value="educativo">Educativo</option><option value="entretenimento">Entretenimento</option><option value="storytelling">Storytelling</option><option value="tutorial">Tutorial</option><option value="dark">Dark/Mistério</option><option value="ASMR">ASMR</option><option value="compilacao">Compilação</option><option value="react">React/Comentário</option></Select></div>
        <div><Label t="País alvo"/><Select value={country} onChange={e=>setCountry(e.target.value)}><option value="BR">Brasil</option><option value="US">EUA</option><option value="ES">Espanha</option><option value="MX">México</option><option value="global">Global</option></Select></div>
      </div>
      <Btn onClick={()=>{if(!niche.trim()){toast?.error("Escolha um nicho");return;}setStep(1);genStep("identity");}} disabled={loading} style={{width:"100%",justifyContent:"center",marginTop:16}}>{loading?"⏳":"🚀 Começar Pipeline"}</Btn>
    </div>}

    {/* Step 1: Identity */}
    {step>=1&&identity&&<div style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
      <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>🎨 Identidade: {identity.channelName}</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:8}}>"{identity.tagline}"</div>
      
      {/* Banner + Logo */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,marginBottom:12}}>
        <div style={{position:"relative",aspectRatio:"16/4",borderRadius:10,overflow:"hidden",background:genImgs.banner?`url(${genImgs.banner}) center/cover`:`linear-gradient(135deg,${identity.colors?.primary||"#1a1a2e"},${identity.colors?.secondary||"#16213e"})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {!genImgs.banner?<button onClick={()=>genImg("banner",identity.bannerPrompt)} disabled={!!genningKey} style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,.3)",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",fontSize:11}}>{genningKey==="banner"?"⏳":"🎨 Gerar Banner"}</button>
          :<div style={{position:"absolute",top:6,right:6,display:"flex",gap:4}}><a href={genImgs.banner} download="banner.png" style={{padding:"4px 10px",borderRadius:6,background:"rgba(0,0,0,.7)",color:"#fff",fontSize:10,textDecoration:"none"}}>📥</a><button onClick={()=>{setGenImgs(p=>({...p,banner:undefined}));genImg("banner",identity.bannerPrompt);}} disabled={!!genningKey} style={{padding:"4px 10px",borderRadius:6,background:"rgba(0,0,0,.7)",color:"#fff",border:"none",cursor:"pointer",fontSize:10}}>🔄</button></div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:genImgs.logo?`url(${genImgs.logo}) center/cover`:`linear-gradient(135deg,${identity.colors?.primary||"#EF4444"},${identity.colors?.secondary||"#F59E0B"})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:900,color:"#fff",cursor:"pointer",border:"3px solid rgba(255,255,255,.1)"}} onClick={()=>!genImgs.logo&&genImg("logo",identity.logoPrompt)}>
            {!genImgs.logo&&(identity.channelName?.[0]||"C")}
          </div>
          {genImgs.logo?<div style={{display:"flex",gap:3,marginTop:4}}><a href={genImgs.logo} download="logo.png" style={{padding:"2px 6px",borderRadius:4,background:"rgba(255,255,255,.06)",color:C.blue,fontSize:8,textDecoration:"none"}}>📥</a><button onClick={()=>{setGenImgs(p=>({...p,logo:undefined}));genImg("logo",identity.logoPrompt);}} disabled={!!genningKey} style={{padding:"2px 6px",borderRadius:4,background:"rgba(255,255,255,.06)",color:C.muted,border:"none",cursor:"pointer",fontSize:8}}>🔄</button></div>
          :<div style={{fontSize:8,color:C.dim,textAlign:"center",marginTop:3}}>Clique pra gerar</div>}
        </div>
      </div>
      <button onClick={async()=>{setGenningKey("all");for(const[k,p] of [["logo",identity.logoPrompt],["banner",identity.bannerPrompt]]){if(!genImgs[k]&&p){try{const r=await aiApi.generateAsset({prompt:p});if(r.url)setGenImgs(prev=>({...prev,[k]:r.url}));}catch{}}}setGenningKey(null);}} disabled={!!genningKey} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.red}30`,background:`${C.red}08`,color:C.red,cursor:"pointer",fontSize:11,fontWeight:600,marginBottom:8,width:"100%"}}>{genningKey?"⏳ Gerando...":"🎨 Gerar Logo + Banner de uma vez"}</button>
      <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:8}}>{identity.description?.slice(0,200)}...</div>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{identity.keywords?.map(k=><span key={k} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.blue}10`,color:C.blue}}>#{k}</span>)}</div>
      {step===1&&<div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>{setIdentity(null);genStep("identity");}} disabled={loading} style={{fontSize:11}}>🔄 Regenerar</Btn><Btn onClick={()=>genStep("scripts")} disabled={loading}>📝 Próximo: Roteiros →</Btn></div>}
    </div>}

    {/* Step 2: Scripts */}
    {step>=2&&<div style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
      <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>📝 {scripts?.length||0} Roteiros</div>
      {scripts?.length>0?<div style={{display:"grid",gap:8}}>
        {scripts.map((s,i)=><div key={i} style={{padding:"12px",background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16,fontWeight:900,color:C.red,opacity:.4}}>#{s.number||i+1}</span><span style={{fontWeight:700,fontSize:14}}>{s.title}</span></div>
              <div style={{fontSize:11,color:C.dim,marginTop:3}}>🎣 {s.hook}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>{s.outline?.join(" → ")}</div>
              <div style={{display:"flex",gap:3,marginTop:4}}>{s.tags?.map(t=><span key={t} style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:"rgba(255,255,255,.04)",color:C.dim}}>{t}</span>)}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:10,color:C.dim}}>{s.duration}</div><button onClick={()=>cp(`${s.title}\n\nHook: ${s.hook}\n\n${s.outline?.map((o,i)=>`${i+1}. ${o}`).join("\n")}\n\nTags: ${s.tags?.join(", ")}`)} style={{marginTop:4,padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>📋</button></div>
          </div>
        </div>)}
      </div>:<div style={{textAlign:"center",padding:20,color:C.dim}}>⏳ Gerando roteiros...</div>}
      {step===2&&<div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>{setScripts(null);genStep("scripts");}} disabled={loading} style={{fontSize:11}}>🔄 Regenerar</Btn><Btn onClick={()=>genStep("calendar")} disabled={loading}>📅 Próximo: Calendário →</Btn></div>}
    </div>}

    {/* Step 3: Calendar */}
    {step>=3&&calendar?.length>0&&<div style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
      <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>📅 Calendário 30 Dias</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.dim,padding:"4px 0"}}>{d}</div>)}
        {calendar.slice(0,30).map((d,i)=><div key={i} style={{padding:"6px 4px",borderRadius:6,background:d.title?`${C.red}08`:"rgba(255,255,255,.02)",border:`1px solid ${d.title?`${C.red}15`:C.border}`,minHeight:50,cursor:d.title?"pointer":"default"}} onClick={()=>d.title&&cp(d.title)} title={d.title||""}>
          <div style={{fontSize:9,fontWeight:700,color:C.dim}}>{d.day||i+1}</div>
          {d.title&&<div style={{fontSize:8,fontWeight:600,color:C.text,lineHeight:1.3,marginTop:2}}>{d.title?.slice(0,30)}</div>}
          {d.uploadTime&&<div style={{fontSize:7,color:C.green,marginTop:1}}>🕐 {d.uploadTime}</div>}
        </div>)}
      </div>
      {step===3&&<Btn onClick={()=>setStep(4)} style={{marginTop:12,width:"100%",justifyContent:"center"}}>🚀 Finalizar Pipeline</Btn>}
    </div>}

    {/* Step 4: Done */}
    {step===4&&<div style={{background:`linear-gradient(135deg,${C.green}08,${C.blue}08)`,borderRadius:16,border:`1px solid ${C.green}20`,padding:28,textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:8}}>🚀</div>
      <div style={{fontSize:22,fontWeight:800,marginBottom:8}}>Canal Pronto!</div>
      <div style={{fontSize:14,color:C.muted,marginBottom:16}}>
        {identity?.channelName} · {scripts?.length||0} roteiros · {calendar?.filter(d=>d.title)?.length||0} dias com conteúdo
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
        <Btn onClick={exportAll}>📥 Exportar Tudo (JSON)</Btn>
        <Btn onClick={()=>cp(JSON.stringify({identity,scripts,calendar},null,2))} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted}}>📋 Copiar Tudo</Btn>
        <Btn onClick={()=>{setStep(0);setIdentity(null);setScripts(null);setCalendar(null);setGenImgs({});}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.dim}}>🔄 Novo Pipeline</Btn>
      </div>
    </div>}
  </div>
}
