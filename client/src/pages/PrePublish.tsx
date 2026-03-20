// @ts-nocheck
import { useState } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

function ScoreRing({score,size=80,color}){const r=size/2-6,circ=2*Math.PI*r,off=circ-(score/100)*circ;const c=color||(score>=80?C.green:score>=60?C.blue:score>=40?"#F59E0B":C.red);return<svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset .8s ease"}}/><text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size*.28} fontWeight="800">{score}</text></svg>}

export default function PrePublish(){
  const toast=useToast();const pg=useProgress();
  const[title,setTitle]=useState("");const[desc,setDesc]=useState("");const[tags,setTags]=useState("");const[niche,setNiche]=useState("");const[thumbPrompt,setThumbPrompt]=useState("");
  const[result,setResult]=useState(null);const[loading,setLoading]=useState(false);
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const analyze=async()=>{
    if(!title.trim()){toast?.error("Título obrigatório");return;}
    setLoading(true);pg?.start("💎 Analisando Vídeo",["Checando título","Avaliando SEO","Pontuando CTR","Gerando melhorias"]);
    try{const r=await researchApi.prePublishScore({title,description:desc,tags,niche,thumbnailPrompt:thumbPrompt});pg?.done();setResult(r);}
    catch(e){pg?.fail(e.message);toast?.error(e.message);}setLoading(false);
  };

  return<div className="page-enter" style={{maxWidth:900,margin:"0 auto"}}>
    <Hdr title="Score Pré-Publicação" sub="Analise título + descrição + tags antes de publicar — receba nota 0-100"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      <div><Label t="Título do Vídeo *"/><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Cole o título aqui..."/></div>
      <div><Label t="Nicho"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="Ex: finanças, dark, ASMR"/></div>
    </div>
    <div style={{marginBottom:12}}><Label t="Descrição"/><textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Descrição do vídeo..." style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:C.text,fontSize:13,outline:"none",minHeight:80,resize:"vertical"}}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
      <div><Label t="Tags (vírgula)"/><Input value={tags} onChange={e=>setTags(e.target.value)} placeholder="tag1, tag2, tag3..."/></div>
      <div><Label t="Conceito da Thumbnail"/><Input value={thumbPrompt} onChange={e=>setThumbPrompt(e.target.value)} placeholder="Descrição da thumb..."/></div>
    </div>
    <Btn onClick={analyze} disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:24}}>{loading?"⏳":"💎 Analisar Vídeo"}</Btn>

    {result&&<div>
      {/* Overall Score */}
      <div style={{display:"flex",gap:20,alignItems:"center",justifyContent:"center",marginBottom:24,background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24}}>
        <ScoreRing score={result.overallScore||0} size={120}/>
        <div><div style={{fontSize:24,fontWeight:800,color:result.overallScore>=80?C.green:result.overallScore>=60?C.blue:C.red}}>Score Geral: {result.overallScore}/100</div>
          <div style={{fontSize:13,color:C.muted,marginTop:4}}>Potencial viral: <b style={{color:result.viralPotential==="alto"?C.green:C.blue}}>{result.viralPotential}</b> · CTR estimado: <b>{result.estimatedCTR}</b></div></div>
      </div>

      {/* Individual scores */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["Título",result.titleScore],["Descrição",result.descriptionScore],["Tags",result.tagsScore],["Thumbnail",result.thumbnailScore]].map(([l,s])=>s?<div key={l} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,textAlign:"center"}}>
          <ScoreRing score={s.score||0} size={60}/>
          <div style={{fontWeight:700,fontSize:13,marginTop:6}}>{l}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:4,lineHeight:1.5}}>{s.feedback}</div>
        </div>:null)}
      </div>

      {/* Improved versions */}
      {result.titleScore?.improved&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>✨ Título Melhorado</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{flex:1,fontSize:14,fontWeight:600,color:C.green}}>{result.titleScore.improved}</span><button onClick={()=>cp(result.titleScore.improved)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10}}>📋</button></div>
      </div>}
      {result.descriptionScore?.improved&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>✨ Descrição Otimizada</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{result.descriptionScore.improved}</div>
        <button onClick={()=>cp(result.descriptionScore.improved)} style={{marginTop:6,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10}}>📋 Copiar</button>
      </div>}
      {result.tagsScore?.suggested&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>🏷️ Tags Sugeridas</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{result.tagsScore.suggested.map(t=><span key={t} style={{padding:"3px 8px",borderRadius:6,background:`${C.blue}10`,color:C.blue,fontSize:11}}>{t}</span>)}</div>
        <button onClick={()=>cp(result.tagsScore.suggested.join(", "))} style={{marginTop:8,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:10}}>📋 Copiar tags</button>
      </div>}

      {/* SEO Checklist */}
      {result.seoChecklist&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>✅ SEO Checklist</div>
        {result.seoChecklist.map((c,i)=><div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:14}}>{c.pass?"✅":"❌"}</span>
          <div><div style={{fontSize:12,fontWeight:600,color:c.pass?C.green:C.red}}>{c.item}</div><div style={{fontSize:10,color:C.dim}}>{c.tip}</div></div>
        </div>)}
      </div>}

      {result.improvements&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>🚀 Melhorias</div>
        {result.improvements.map((m,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>💡 {m}</div>)}
      </div>}
    </div>}
  </div>
}
