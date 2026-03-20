// @ts-nocheck
import { useState, useRef } from "react";
import { researchApi, aiApi } from "../lib/api";
import { C, Btn, Hdr, Input } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

function Sec({t,i,children}){return<div style={{background:"rgba(255,255,255,.02)",borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:12}}><div style={{fontWeight:700,fontSize:14,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>{i} {t}</div>{children}</div>}

export default function Analyzer(){
  const toast=useToast();
  const pg=useProgress();
  const fileRef=useRef(null);
  const[images,setImages]=useState([]);
  const[context,setContext]=useState("");
  const[result,setResult]=useState(null);
  const[loading,setLoading]=useState(false);
  const[genThumb,setGenThumb]=useState({});
  const[genningKey,setGenningKey]=useState(null);

  const compressImage=(file,maxW=800)=>new Promise(resolve=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{const c=document.createElement("canvas");const r=Math.min(1,maxW/img.width);c.width=img.width*r;c.height=img.height*r;c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL("image/jpeg",0.7));};img.src=url;});

  const addImages=async(files)=>{
    if(images.length>=4){toast?.error("Máximo 4 prints");return;}
    for(const f of Array.from(files).slice(0,4-images.length)){
      if(!f.type.startsWith("image/"))continue;
      const b64=await compressImage(f);
      setImages(p=>[...p,{id:Date.now()+Math.random(),src:b64,name:f.name}]);
    }
  };

  const removeImg=id=>setImages(p=>p.filter(i=>i.id!==id));

  const analyze=async()=>{
    if(!images.length){toast?.error("Adicione pelo menos 1 print");return;}
    setLoading(true);
    pg?.start("📸 Analisando Prints",["Processando imagens","IA analisando títulos","Analisando thumbnails","Gerando otimizações","Extraindo insights"]);
    try{
      pg?.update(1,"Enviando imagens pra IA...");
      const r=await researchApi.analyzeScreenshots(images.map(i=>i.src),context);
      pg?.done();
      setResult(r);
    }catch(e){pg?.fail(e.message);toast?.error(e.message);}
    setLoading(false);
  };

  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const genThumbImg=async(key,prompt)=>{setGenningKey(key);pg?.start("🎨 Gerando Thumbnail",["Enviando ao ImageFX","Imagen 3.5 processando"]);try{const r=await aiApi.generateAsset({prompt:prompt+", YouTube thumbnail, 16:9, high quality, viral"});if(r.url){setGenThumb(p=>({...p,[key]:r.url}));pg?.done();}else{pg?.fail("Sem resultado");}}catch(e){pg?.fail(e.message);}setGenningKey(null);};

  return<div className="page-enter" style={{maxWidth:1100,margin:"0 auto"}}>
    <Hdr title="Analisador de Prints" sub="Suba prints de canais e a IA analisa títulos, thumbs e descobre oportunidades"/>

    {/* Upload area */}
    <div style={{background:C.bgCard,borderRadius:16,border:`2px dashed ${C.border}`,padding:24,marginBottom:20,textAlign:"center",cursor:"pointer",transition:"border-color .2s"}}
      onClick={()=>fileRef.current?.click()}
      onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.red;}}
      onDragLeave={e=>e.currentTarget.style.borderColor=C.border}
      onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.border;addImages(e.dataTransfer.files);}}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>addImages(e.target.files)}/>
      <div style={{fontSize:40,marginBottom:8,opacity:.3}}>📸</div>
      <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Arraste prints aqui ou clique para selecionar</div>
      <div style={{fontSize:11,color:C.dim}}>Prints de canais, resultados de busca, thumbnails (máx 4, comprimidas automaticamente). Usa GPT-4o Vision.</div>
    </div>

    {/* Image previews */}
    {images.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:16}}>
      {images.map(img=><div key={img.id} style={{position:"relative",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>
        <img src={img.src} style={{width:"100%",height:120,objectFit:"cover",display:"block"}}/>
        <button onClick={()=>removeImg(img.id)} style={{position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",border:"none",background:"rgba(0,0,0,.7)",color:"#fff",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        <div style={{padding:"4px 8px",fontSize:9,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{img.name}</div>
      </div>)}
    </div>}

    {/* Context + Analyze */}
    <div style={{display:"flex",gap:10,marginBottom:24}}>
      <Input value={context} onChange={e=>setContext(e.target.value)} placeholder="Contexto (ex: 'nicho dark', 'canais de finanças', 'shorts ASMR')" style={{flex:1}}/>
      <Btn onClick={analyze} disabled={loading||!images.length}>{loading?"⏳ Analisando...":"🔍 Analisar "+images.length+" Print"+(images.length>1?"s":"")}</Btn>
    </div>

    {/* Results */}
    {result&&<div>
      {/* Strategy */}
      {result.strategy&&<div style={{background:`linear-gradient(135deg,${C.red}08,${C.orange}08)`,borderRadius:14,border:`1px solid ${C.red}20`,padding:18,marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>🎯 Estratégia</div>
        <p style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{result.strategy}</p>
      </div>}

      {/* Channels detected */}
      {result.channelsDetected?.length>0&&<Sec t="Canais Detectados" i="📺"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{result.channelsDetected.map((ch,i)=><div key={i} style={{padding:"8px 14px",borderRadius:8,background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`}}><div style={{fontWeight:700,fontSize:13}}>{ch.name||"Canal "+( i+1)}</div><div style={{fontSize:10,color:C.dim}}>{ch.subscribers||""} · {ch.niche||""}</div></div>)}</div></Sec>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {/* Title patterns */}
        {result.titlePatterns&&<Sec t="Padrões de Títulos" i="✍️">
          {result.titlePatterns.patterns?.map((p,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>📌 {p}</div>)}
          <div style={{marginTop:8}}>{result.titlePatterns.strengths?.map((s,i)=><span key={i} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.green}10`,color:C.green,marginRight:4}}>✅ {s}</span>)}</div>
          <div style={{marginTop:4}}>{result.titlePatterns.weaknesses?.map((w,i)=><span key={i} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.red}10`,color:C.red,marginRight:4}}>⚠️ {w}</span>)}</div>
        </Sec>}

        {/* Thumbnail analysis */}
        {result.thumbnailAnalysis&&<Sec t="Análise de Thumbnails" i="🖼️">
          <div style={{fontSize:12,color:C.muted,marginBottom:6}}><b style={{color:C.blue}}>Estilo:</b> {result.thumbnailAnalysis.style}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:6}}><b style={{color:C.purple}}>Cores:</b> {result.thumbnailAnalysis.colors}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:6}}><b style={{color:C.red}}>Gatilho:</b> {result.thumbnailAnalysis.emotionalTrigger}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:6}}><b>Texto:</b> {result.thumbnailAnalysis.textUsage}</div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:6}}>{result.thumbnailAnalysis.elements?.map((e,i)=><span key={i} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${C.blue}10`,color:C.blue}}>{e}</span>)}</div>
          <div style={{marginTop:6}}>{result.thumbnailAnalysis.strengths?.map((s,i)=><span key={i} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.green}10`,color:C.green,marginRight:4}}>✅ {s}</span>)}</div>
          <div style={{marginTop:4}}>{result.thumbnailAnalysis.weaknesses?.map((w,i)=><span key={i} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.red}10`,color:C.red,marginRight:4}}>⚠️ {w}</span>)}</div>
        </Sec>}
      </div>

      {/* Optimized titles */}
      {result.optimizedTitles?.length>0&&<Sec t="10 Títulos Otimizados" i="🎯">
        <div style={{display:"grid",gap:6}}>
          {result.optimizedTitles.map((t,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 10px",background:"rgba(255,255,255,.02)",borderRadius:8,border:`1px solid ${C.border}`}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:`${t.ctrScore>=85?C.green:t.ctrScore>=70?C.blue:C.red}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:t.ctrScore>=85?C.green:t.ctrScore>=70?C.blue:C.red,flexShrink:0}}>{t.ctrScore}</div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{t.title}</div><div style={{fontSize:10,color:C.dim}}>{t.improvement}</div></div>
            <button onClick={()=>cp(t.title)} style={{padding:"4px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9,flexShrink:0}}>📋</button>
          </div>)}
        </div>
        <button onClick={()=>cp(result.optimizedTitles.map(t=>t.title).join("\n"))} style={{marginTop:8,padding:"6px 14px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:11}}>📋 Copiar Todos os Títulos</button>
      </Sec>}

      {/* Thumbnail prompts with generation */}
      {result.thumbnailPrompts?.length>0&&<Sec t="Thumbnails Otimizadas" i="🎨">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {result.thumbnailPrompts.map((tp,i)=><div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{aspectRatio:"16/9",background:genThumb[`ss${i}`]?`url(${genThumb[`ss${i}`]}) center/cover`:"linear-gradient(135deg,#1a1a1a,#2a2a2a)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
              {!genThumb[`ss${i}`]?<button onClick={()=>genThumbImg(`ss${i}`,tp.description)} disabled={!!genningKey} style={{padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,.2)",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",fontSize:10}}>{genningKey===`ss${i}`?"⏳":"🎨 Gerar"}</button>
              :<a href={genThumb[`ss${i}`]} download={`thumb-opt-${i+1}.png`} style={{position:"absolute",top:4,right:4,padding:"3px 8px",borderRadius:4,background:"rgba(0,0,0,.7)",color:"#fff",fontSize:9,textDecoration:"none"}}>📥</a>}
            </div>
            <div style={{padding:10}}><div style={{fontSize:11,fontWeight:600,marginBottom:3}}>{tp.style}</div><div style={{fontSize:10,color:C.dim,lineHeight:1.5,fontFamily:"var(--mono)"}}>{tp.description?.slice(0,100)}...</div>
              <div style={{display:"flex",gap:4,marginTop:6}}>
                <button onClick={()=>cp(tp.description)} style={{flex:1,padding:"3px",borderRadius:4,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:9}}>📋 Prompt</button>
              </div>
            </div>
          </div>)}
        </div>
        <button onClick={async()=>{setGenningKey("all");pg?.start("🎨 Gerando Todas",result.thumbnailPrompts.map((_,i)=>`Thumb ${i+1}`));for(let i=0;i<result.thumbnailPrompts.length;i++){if(genThumb[`ss${i}`])continue;pg?.update(i,`Gerando thumb ${i+1}...`);try{const r=await aiApi.generateAsset({prompt:result.thumbnailPrompts[i].description+", YouTube thumbnail, 16:9"});if(r.url)setGenThumb(p=>({...p,[`ss${i}`]:r.url}));}catch{}}pg?.done();setGenningKey(null);}} disabled={!!genningKey} style={{marginTop:10,padding:"8px 16px",borderRadius:8,border:"none",background:`${C.red}20`,color:C.red,cursor:"pointer",fontSize:11,fontWeight:600}}>{genningKey==="all"?"⏳ Gerando...":"🎨 Gerar Todas as Thumbnails"}</button>
      </Sec>}

      {/* Insights */}
      {result.insights?.length>0&&<Sec t="💡 Insights — O que Ninguém Está Fazendo" i="🕳️">
        <div style={{display:"grid",gap:8}}>
          {result.insights.map((ins,i)=><div key={i} style={{padding:"12px 14px",background:ins.impact==="alto"?`${C.green}06`:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${ins.impact==="alto"?`${C.green}20`:C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>💡</span>
              <div style={{flex:1,fontWeight:700,fontSize:13}}>{ins.insight}</div>
              <span style={{fontSize:9,fontWeight:800,color:ins.impact==="alto"?C.green:C.blue,background:ins.impact==="alto"?`${C.green}15`:`${C.blue}15`,padding:"2px 8px",borderRadius:4}}>●{ins.impact}</span>
            </div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginLeft:26}}>📋 {ins.actionable}</div>
            {ins.examples?.length>0&&<div style={{marginLeft:26,marginTop:8,background:"rgba(255,255,255,.03)",borderRadius:8,padding:"8px 10px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:9,fontWeight:700,color:C.green,marginBottom:4}}>📌 Exemplos prontos pra usar:</div>
              {ins.examples.map((ex,j)=><div key={j} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:`1px solid rgba(255,255,255,.04)`}}><span style={{color:C.green,fontSize:12}}>▸</span><span style={{color:C.text,fontWeight:600,fontSize:12,flex:1}}>{ex}</span><button onClick={()=>cp(ex)} style={{padding:"2px 8px",borderRadius:4,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:9,flexShrink:0}}>📋</button></div>)}
            </div>}
          </div>)}
        </div>
      </Sec>}

      {/* Copy all */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>cp(JSON.stringify(result,null,2))} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:11}}>📋 Copiar Análise Completa</button>
        <button onClick={()=>{setResult(null);setImages([]);setGenThumb({});}} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:11}}>🔄 Nova Análise</button>
      </div>
    </div>}
  </div>
}
