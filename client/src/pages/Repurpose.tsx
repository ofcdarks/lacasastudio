// @ts-nocheck
import { useState } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const ICONS={short:"📱",tweet:"🐦",carousel:"📸",blog:"📝",newsletter:"✉️",linkedin:"💼",tiktok:"🎵",thread:"🧵"};
const COLORS={short:C.red,tweet:C.blue,carousel:"#E1306C",blog:C.green,newsletter:"#F59E0B",linkedin:"#0077B5",tiktok:"#000",thread:C.purple};

export default function Repurpose(){
  const toast=useToast();const pg=useProgress();
  const[title,setTitle]=useState("");const[script,setScript]=useState("");const[niche,setNiche]=useState("");
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const generate=async()=>{
    if(!title.trim()){toast?.error("Título obrigatório");return;}
    setLoading(true);pg?.start("♻️ Multiplicando Conteúdo",["Criando Shorts","Gerando tweets","Montando carrossel","Blog + newsletter","TikTok + LinkedIn"]);
    try{const d=await researchApi.repurpose({title,script,niche});pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  const copyAll=()=>{if(!r)return;cp(r.pieces?.map(p=>`[${p.platform}] ${p.title||""}\n${p.content||p.slides?.join("\n")||""}`).join("\n\n---\n\n"));};

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Repurpose Machine" sub="1 vídeo → 10+ peças · Shorts · Tweets · Carrossel · Blog · Newsletter · LinkedIn · TikTok"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
      <div><Label t="Título do Vídeo *"/><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título do vídeo original..."/></div>
      <div><Label t="Nicho"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="história, finanças..."/></div>
    </div>
    <div style={{marginBottom:16}}><Label t="Roteiro/Resumo (opcional — melhora qualidade)"/><textarea value={script} onChange={e=>setScript(e.target.value)} placeholder="Cole o roteiro ou resumo do vídeo..." style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:C.text,fontSize:13,outline:"none",minHeight:60,resize:"vertical"}}/></div>
    <Btn onClick={generate} disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:24}}>{loading?"⏳":"♻️ Gerar 10+ Peças de Conteúdo"}</Btn>

    {r?.pieces&&<div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        <Btn onClick={copyAll} style={{fontSize:11}}>📋 Copiar TUDO</Btn>
        <span style={{fontSize:11,color:C.dim,display:"flex",alignItems:"center"}}>{r.pieces.length} peças geradas</span>
      </div>

      {r.strategy&&<div style={{background:`linear-gradient(135deg,${C.blue}06,${C.purple}06)`,borderRadius:12,border:`1px solid ${C.blue}20`,padding:14,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>📋 Estratégia de Distribuição</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{r.strategy}</div>
      </div>}

      <div style={{display:"grid",gap:12}}>
        {r.pieces.map((p,i)=>{const icon=ICONS[p.type]||"📄";const color=COLORS[p.type]||C.muted;return<div key={i} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:`${color}08`,borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:20}}>{icon}</span>
              <div><div style={{fontWeight:700,fontSize:13}}>{p.title||p.type}</div><div style={{fontSize:10,color:C.dim}}>{p.platform}</div></div>
            </div>
            <button onClick={()=>cp(p.content||p.slides?.join("\n\n")||"")} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${color}30`,background:`${color}08`,color,cursor:"pointer",fontSize:10,fontWeight:600}}>📋 Copiar</button>
          </div>
          <div style={{padding:16}}>
            {p.hook&&<div style={{fontSize:11,color:C.red,fontWeight:700,marginBottom:6}}>🎣 Hook: {p.hook}</div>}
            {p.content&&<div style={{fontSize:12,color:C.muted,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{p.content}</div>}
            {p.slides&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:6,marginTop:6}}>{p.slides.map((s,j)=><div key={j} style={{padding:8,borderRadius:6,background:"rgba(255,255,255,.03)",border:`1px solid ${C.border}`,fontSize:10,color:C.muted}}><span style={{fontWeight:700,color}}>Slide {j+1}</span><br/>{s}</div>)}</div>}
            {p.outline&&<div style={{marginTop:6}}>{p.outline.map((o,j)=><div key={j} style={{fontSize:11,color:C.muted,padding:"2px 0"}}>• {o}</div>)}</div>}
            {p.subject&&<div style={{fontSize:11,color:"#F59E0B",marginTop:6}}>📧 Subject: {p.subject}</div>}
            {p.excerpt&&<div style={{fontSize:11,color:C.dim,marginTop:4,fontStyle:"italic"}}>{p.excerpt}</div>}
          </div>
        </div>})}
      </div>
    </div>}
  </div>
}
