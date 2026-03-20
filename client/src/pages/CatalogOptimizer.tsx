// @ts-nocheck
import { useState } from "react";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const hdr=()=>({"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`});
const api={
  scan:()=>fetch("/api/algorithm/catalog/scan",{method:"POST",headers:hdr(),body:"{}"}).then(r=>r.json()),
  fix:(d)=>fetch("/api/algorithm/catalog/fix",{method:"POST",headers:hdr(),body:JSON.stringify(d)}).then(r=>r.json()),
};
const fmt=n=>{if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);};
const cp=txt=>{try{navigator.clipboard.writeText(txt)}catch{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}};

export default function CatalogOptimizer(){
  const toast=useToast();const pg=useProgress();
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);
  const[fixing,setFixing]=useState(null);const[fix,setFix]=useState(null);

  const scan=async()=>{
    setLoading(true);pg?.start("🔍 Escaneando Catálogo",["Buscando vídeos","Auditando SEO","Classificando"]);
    try{const d=await api.scan();if(d.error)throw new Error(d.error);pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  const fixVideo=async(v)=>{
    setFixing(v.videoId);pg?.start("🤖 IA Corrigindo SEO",["Buscando dados reais do vídeo","Analisando título e descrição","Gerando correções otimizadas","Tags + timestamps + CTA"]);
    try{const d=await api.fix({videoId:v.videoId,issues:v.issues,title:v.title});if(d.error)throw new Error(d.error);pg?.done();setFix({videoId:v.videoId,originalTitle:v.title,...d});}
    catch(e){pg?.fail(e.message);}setFixing(null);
  };

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Catalog Re-Optimizer" sub="Escaneie todos os vídeos — IA corrige SEO de cada um com dados reais"/>
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
            <div style={{fontSize:10,color:C.dim,marginTop:4}}>{fmt(v.views)} views · {v.tagCount} tags · {v.descWordCount} palavras desc</div>
          </div>
          <div style={{textAlign:"center",minWidth:50}}>
            <div style={{fontSize:20,fontWeight:800,color:v.seoScore>=70?C.green:v.seoScore>=40?"#F59E0B":C.red}}>{v.seoScore}</div>
            <div style={{fontSize:9,color:C.dim}}>SEO</div>
          </div>
          <Btn onClick={()=>fixVideo(v)} vr="ghost" disabled={fixing===v.videoId}>{fixing===v.videoId?"⏳":"🤖 Fix"}</Btn>
        </div>)}
      </div>
    </div>}

    {/* Fix modal */}
    {fix&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(10px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setFix(null)}>
      <div onClick={e=>e.stopPropagation()} style={{width:800,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,padding:28,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontWeight:800,fontSize:18,marginBottom:6}}>🤖 Correções IA para:</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:20}}>{fix.originalTitle||fix.videoId}</div>

        {/* New Title */}
        {fix.newTitle&&<div style={{background:`${C.blue}06`,borderRadius:14,border:`1px solid ${C.blue}20`,padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontWeight:700,fontSize:14,color:C.blue}}>✍️ Novo Título</div>
            <button onClick={()=>{cp(fix.newTitle);toast?.success("Título copiado!");}} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${C.blue}40`,background:`${C.blue}12`,color:C.blue,cursor:"pointer",fontSize:12,fontWeight:700}}>📋 Copiar Título</button>
          </div>
          <div style={{fontSize:16,fontWeight:700}}>{fix.newTitle}</div>
        </div>}

        {/* New Description */}
        {fix.newDescription&&<div style={{background:`${C.green}06`,borderRadius:14,border:`1px solid ${C.green}20`,padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontWeight:700,fontSize:14,color:C.green}}>📝 Nova Descrição</div>
            <button onClick={()=>{cp(fix.newDescription);toast?.success("Descrição copiada! Cole no YouTube Studio.");}} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${C.green}40`,background:`${C.green}12`,color:C.green,cursor:"pointer",fontSize:12,fontWeight:700}}>📋 Copiar Descrição</button>
          </div>
          <div style={{fontSize:12,color:C.text,lineHeight:1.8,whiteSpace:"pre-wrap",maxHeight:250,overflowY:"auto",padding:12,background:"rgba(255,255,255,.02)",borderRadius:8,border:`1px solid ${C.border}`}}>{fix.newDescription}</div>
        </div>}

        {/* New Tags */}
        {fix.newTags?.length>0&&<div style={{background:`${C.purple}06`,borderRadius:14,border:`1px solid ${C.purple}20`,padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontWeight:700,fontSize:14,color:C.purple}}>🏷️ Novas Tags ({fix.newTags.length})</div>
            <button onClick={()=>{cp(fix.newTags.join(", "));toast?.success("Tags copiadas!");}} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${C.purple}40`,background:`${C.purple}12`,color:C.purple,cursor:"pointer",fontSize:12,fontWeight:700}}>📋 Copiar Tags</button>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{fix.newTags.map((t,i)=><span key={i} style={{padding:"4px 10px",borderRadius:6,background:`${C.purple}10`,color:C.purple,fontSize:12,cursor:"pointer"}} onClick={()=>{cp(t);toast?.success(`"${t}" copiada`);}}>{t}</span>)}</div>
        </div>}

        {/* Changes */}
        {fix.changes?.length>0&&<div style={{marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>O que mudou e por quê:</div>
          {fix.changes.map((c,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`,lineHeight:1.6}}>✅ {c}</div>)}
        </div>}

        {/* Copy ALL button */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{cp(`TÍTULO:\n${fix.newTitle}\n\nDESCRIÇÃO:\n${fix.newDescription}\n\nTAGS:\n${(fix.newTags||[]).join(", ")}`);toast?.success("Tudo copiado!");}} style={{flex:1,padding:"10px 16px",borderRadius:10,border:`1px solid ${C.red}40`,background:`${C.red}12`,color:C.red,cursor:"pointer",fontSize:13,fontWeight:700}}>📦 Copiar TUDO (título + desc + tags)</button>
          <Btn onClick={()=>setFix(null)} vr="ghost">Fechar</Btn>
        </div>
      </div>
    </div>}
  </div>;
}
