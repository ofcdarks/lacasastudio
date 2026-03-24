// @ts-nocheck
import { useState, useEffect } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";
import MagicTabs from "../components/shared/MagicTabs";

const hdr=()=>({Authorization:`Bearer ${localStorage.getItem("lc_token")}`});
const ICONS={short:"📱",tweet:"🐦",carousel:"📸",blog:"📝",newsletter:"✉️",linkedin:"💼",tiktok:"🎵",thread:"🧵",pinterest:"📌",quora:"❓",reddit:"🔴"};
const COLORS={short:C.red,tweet:C.blue,carousel:"#E1306C",blog:C.green,newsletter:"#F59E0B",linkedin:"#0077B5",tiktok:C.purple,thread:C.purple,pinterest:"#E60023",quora:"#B92B27",reddit:"#FF4500"};
const cp=txt=>{try{navigator.clipboard.writeText(txt)}catch{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}};

export default function Repurpose(){
  const toast=useToast();const pg=useProgress();
  const[title,setTitle]=useState("");const[script,setScript]=useState("");const[niche,setNiche]=useState("");
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);
  const[latestVids,setLatestVids]=useState([]);const[tab,setTab]=useState("generate");

  // Pull latest videos from OAuth
  useEffect(()=>{
    fetch("/api/algorithm/my-channel/latest-video",{headers:hdr()}).then(r=>r.json())
      .then(d=>{if(d.videos?.length)setLatestVids(d.videos);}).catch(()=>{});
  },[]);

  const generate=async()=>{
    if(!title.trim()){toast?.error("Título obrigatório");return;}
    setLoading(true);pg?.start("♻️ Multiplicando Conteúdo",["Shorts","Tweets","Carrossel","Blog + newsletter","TikTok + LinkedIn"]);
    try{const d=await researchApi.repurpose({title,script,niche});pg?.done();setR(d);setTab("results");}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  const copyAll=()=>{if(!r)return;cp(r.pieces?.map(p=>`[${p.platform}] ${p.title||""}\n${p.content||p.slides?.join("\n")||""}`).join("\n\n---\n\n"));toast?.success("Tudo copiado!");};

  const selectVideo=(v)=>{setTitle(v.title);setTab("generate");};

  return<div className="page-enter" role="main" aria-label="Repurpose" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Repurpose Machine" sub="1 vídeo → 10+ peças · Shorts · Tweets · Carrossel · Blog · Newsletter · LinkedIn · TikTok"/>

    <MagicTabs tabs={[
      {key:"generate",icon:"♻️",label:"Gerar",color:C.blue},
      ...(r?[{key:"results",icon:"📦",label:`Resultado (${r.pieces?.length||0})`,color:C.green}]:[]),
    ]} active={tab} onChange={setTab}/>

    {tab==="generate"&&<div>
      {/* Latest videos from OAuth */}
      {latestVids.length>0&&<div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:C.dim,marginBottom:6}}>SEUS ÚLTIMOS VÍDEOS (clique para repurpose)</div>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {latestVids.map((v,i)=><button key={i} onClick={()=>selectVideo(v)}
            style={{display:"flex",gap:8,padding:8,borderRadius:10,border:`1px solid ${C.border}`,background:title===v.title?"rgba(59,130,246,0.08)":"rgba(255,255,255,.02)",cursor:"pointer",minWidth:220,textAlign:"left",flexShrink:0}}>
            {v.thumbnail&&<img src={v.thumbnail} style={{width:60,height:34,borderRadius:6,objectFit:"cover"}}/>}
            <div><div style={{fontSize:11,fontWeight:600,color:C.text,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div>
              <div style={{fontSize:9,color:C.dim}}>{v.publishedAt?.slice(0,10)}</div></div>
          </button>)}
        </div>
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><Label t="Título do Vídeo *"/><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título do vídeo original..."/></div>
        <div><Label t="Nicho"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="história, finanças..."/></div>
      </div>
      <div style={{marginBottom:16}}><Label t="Roteiro/Resumo (opcional — melhora qualidade)"/><textarea value={script} onChange={e=>setScript(e.target.value)} placeholder="Cole o roteiro ou resumo do vídeo..." style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:C.text,fontSize:13,outline:"none",minHeight:80,resize:"vertical"}}/></div>
      <Btn onClick={generate} disabled={loading} style={{width:"100%",justifyContent:"center"}}>{loading?"⏳":"♻️ Gerar 10+ Peças de Conteúdo"}</Btn>
    </div>}

    {tab==="results"&&r?.pieces&&<div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <Btn onClick={copyAll} style={{fontSize:11}}>📋 Copiar TUDO</Btn>
        <span style={{fontSize:11,color:C.dim}}>{r.pieces.length} peças geradas</span>
        <Btn onClick={()=>setTab("generate")} vr="ghost" style={{fontSize:11}}>← Voltar</Btn>
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
            <button onClick={()=>{cp(p.content||p.slides?.join("\n\n")||"");toast?.success(`${p.platform} copiado!`);}} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${color}30`,background:`${color}08`,color,cursor:"pointer",fontSize:11,fontWeight:600}}>📋 Copiar</button>
          </div>
          <div style={{padding:16}}>
            {p.hook&&<div style={{fontSize:11,color:C.red,fontWeight:700,marginBottom:6}}>🎣 Hook: {p.hook}</div>}
            {p.content&&<div style={{fontSize:12,color:C.muted,lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto"}}>{p.content}</div>}
            {p.slides&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:6,marginTop:6}}>{p.slides.map((s,j)=><div key={j} style={{padding:8,borderRadius:6,background:"rgba(255,255,255,.03)",border:`1px solid ${C.border}`,fontSize:10,color:C.muted}}><span style={{fontWeight:700,color}}>Slide {j+1}</span><br/>{s}</div>)}</div>}
            {p.outline&&<div style={{marginTop:6}}>{p.outline.map((o,j)=><div key={j} style={{fontSize:11,color:C.muted,padding:"2px 0"}}>• {o}</div>)}</div>}
            {p.subject&&<div style={{fontSize:11,color:"#F59E0B",marginTop:6}}>📧 Subject: {p.subject}</div>}
          </div>
        </div>})}
      </div>
    </div>}
  </div>
}
