// @ts-nocheck
import { useState } from "react";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api={
  scan:()=>fetch("/api/algorithm/catalog/scan",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:"{}"}).then(r=>r.json()),
  fix:(d)=>fetch("/api/algorithm/catalog/fix",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(d)}).then(r=>r.json()),
};
const fmt=n=>{if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);};
const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}catch{}};

export default function CatalogOptimizer(){
  const toast=useToast();const pg=useProgress();
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);
  const[fixing,setFixing]=useState(null);const[fix,setFix]=useState(null);

  const scan=async()=>{
    setLoading(true);pg?.start("🔍 Escaneando Catálogo",["Buscando vídeos","Auditando SEO","Identificando problemas"]);
    try{const d=await api.scan();if(d.error)throw new Error(d.error);pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  const fixVideo=async(v)=>{
    setFixing(v.videoId);pg?.start("🔧 Corrigindo SEO",["Analisando problemas","Gerando correções"]);
    try{const d=await api.fix({videoId:v.videoId,issues:v.issues,title:v.title});if(d.error)throw new Error(d.error);pg?.done();setFix({videoId:v.videoId,...d});}
    catch(e){pg?.fail(e.message);}setFixing(null);
  };

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Catalog Re-Optimizer" sub="Escaneie todos os vídeos e corrija SEO fraco automaticamente"/>
    <Btn onClick={scan} disabled={loading} style={{marginBottom:24}}>{loading?"⏳":"🔍 Escanear Meu Catálogo (50 vídeos)"}</Btn>

    {r&&<div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,textAlign:"center"}}><div style={{fontSize:24,fontWeight:800,color:C.blue}}>{r.totalScanned}</div><div style={{fontSize:10,color:C.dim}}>Escaneados</div></div>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.red}20`,padding:14,textAlign:"center"}}><div style={{fontSize:24,fontWeight:800,color:C.red}}>{r.needsWork}</div><div style={{fontSize:10,color:C.dim}}>Precisam correção</div></div>
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.green}20`,padding:14,textAlign:"center"}}><div style={{fontSize:24,fontWeight:800,color:C.green}}>{r.totalScanned-r.needsWork}</div><div style={{fontSize:10,color:C.dim}}>OK</div></div>
      </div>

      <div style={{display:"grid",gap:8}}>
        {(r.videos||[]).map(v=><div key={v.videoId} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${v.seoScore<50?`${C.red}25`:C.border}`,padding:16,display:"flex",gap:12,alignItems:"center"}}>
          {v.thumbnail&&<img src={v.thumbnail} style={{width:100,height:56,borderRadius:8,objectFit:"cover"}}/>}
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{v.title}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{v.issues.map((iss,i)=><span key={i} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${C.red}12`,color:C.red}}>{iss}</span>)}</div>
          </div>
          <div style={{textAlign:"center",minWidth:50}}>
            <div style={{fontSize:20,fontWeight:800,color:v.seoScore>=70?C.green:v.seoScore>=40?"#F59E0B":C.red}}>{v.seoScore}</div>
            <div style={{fontSize:9,color:C.dim}}>SEO</div>
          </div>
          <Btn onClick={()=>fixVideo(v)} vr="ghost" disabled={fixing===v.videoId}>{fixing===v.videoId?"⏳":"🔧 Fix"}</Btn>
        </div>)}
      </div>
    </div>}

    {fix&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(8px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setFix(null)}>
      <div onClick={e=>e.stopPropagation()} style={{width:700,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,padding:24,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontWeight:800,fontSize:16,marginBottom:16}}>🔧 Correções para: {fix.videoId}</div>
        {fix.newTitle&&<div style={{marginBottom:12}}><div style={{fontSize:11,color:C.green,fontWeight:700}}>Novo Título:</div><div style={{fontSize:14,fontWeight:600}}>{fix.newTitle}</div><button onClick={()=>{cp(fix.newTitle);toast?.success("Copiado!");}} style={{marginTop:4,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.green}30`,background:`${C.green}08`,color:C.green,cursor:"pointer",fontSize:10}}>📋 Copiar</button></div>}
        {fix.newTags&&<div style={{marginBottom:12}}><div style={{fontSize:11,color:C.blue,fontWeight:700,marginBottom:4}}>Novas Tags:</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{fix.newTags.map((t,i)=><span key={i} style={{padding:"3px 8px",borderRadius:6,background:`${C.blue}10`,color:C.blue,fontSize:11}}>{t}</span>)}</div><button onClick={()=>{cp(fix.newTags.join(", "));toast?.success("Copiado!");}} style={{marginTop:6,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10}}>📋 Copiar Tags</button></div>}
        {fix.changes?.map((c,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0"}}>✅ {c}</div>)}
        <Btn onClick={()=>setFix(null)} style={{marginTop:16}}>Fechar</Btn>
      </div>
    </div>}
  </div>;
}
