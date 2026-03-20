// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api={
  generate:(d)=>fetch("/api/algorithm/community/generate",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(d)}).then(r=>r.json()),
  list:()=>fetch("/api/algorithm/community/list",{headers:{Authorization:`Bearer ${localStorage.getItem("lc_token")}`}}).then(r=>r.json()),
  save:(d)=>fetch("/api/algorithm/community/save",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(d)}).then(r=>r.json()),
};
const TYPES={poll:{i:"📊",c:C.blue},text:{i:"💬",c:C.green},teaser:{i:"🎬",c:C.red},behind:{i:"🎥",c:C.purple}};
const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}catch{}};

export default function CommunityPlanner(){
  const toast=useToast();const pg=useProgress();
  const[videoTitle,setVideoTitle]=useState("");const[niche,setNiche]=useState("");
  const[r,setR]=useState(null);const[loading,setLoading]=useState(false);
  const[saved,setSaved]=useState([]);

  useEffect(()=>{api.list().then(d=>setSaved(Array.isArray(d)?d:[])).catch(()=>{});},[]);

  const generate=async()=>{
    setLoading(true);pg?.start("💬 Gerando Community Posts",["Criando posts","Templates de resposta","Estratégia"]);
    try{const d=await api.generate({videoTitle,niche});if(d.error)throw new Error(d.error);pg?.done();setR(d);}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Community Planner" sub="Posts de comunidade + templates de resposta a comentários"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,marginBottom:20,alignItems:"end"}}>
      <div><Label t="Próximo Vídeo"/><Input value={videoTitle} onChange={e=>setVideoTitle(e.target.value)} placeholder="Título do vídeo..."/></div>
      <div><Label t="Nicho"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="história, dark..."/></div>
      <Btn onClick={generate} disabled={loading}>{loading?"⏳":"💬 Gerar Posts"}</Btn>
    </div>

    {r?.posts&&<div>
      {r.schedule&&<div style={{background:`${C.blue}06`,borderRadius:12,border:`1px solid ${C.blue}20`,padding:14,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:13,color:C.blue,marginBottom:4}}>📅 Estratégia</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{r.schedule}</div>
      </div>}
      <div style={{display:"grid",gap:10,marginBottom:20}}>
        {r.posts.map((p,i)=>{const t=TYPES[p.type]||TYPES.text;return<div key={i} style={{background:C.bgCard,border:`1px solid ${C.border}`,padding:16,borderLeft:`4px solid ${t.c}`,borderRadius:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16}}>{t.i}</span><span style={{fontWeight:700,fontSize:13}}>{p.type}</span><span style={{fontSize:10,color:C.dim}}>· {p.timing}</span></div>
            <button onClick={()=>{cp(p.content);toast?.success("Copiado!");}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:10}}>📋</button>
          </div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:4}}>{p.content}</div>
          {p.options?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{p.options.map((o,j)=><span key={j} style={{padding:"4px 10px",borderRadius:6,background:`${C.blue}10`,color:C.blue,fontSize:11}}>{o}</span>)}</div>}
          {p.why&&<div style={{fontSize:11,color:C.dim,marginTop:4}}>💡 {p.why}</div>}
        </div>})}
      </div>

      {r.commentTemplates&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.green}20`,padding:16}}>
        <div style={{fontWeight:700,fontSize:14,color:C.green,marginBottom:10}}>💬 Templates de Resposta</div>
        {r.commentTemplates.map((t,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
          <div><span style={{fontSize:10,fontWeight:700,color:C.blue,textTransform:"uppercase"}}>{t.type}</span><div style={{fontSize:12,color:C.muted,marginTop:2}}>{t.template}</div></div>
          <button onClick={()=>{cp(t.template);toast?.success("Copiado!");}} style={{padding:"4px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9,flexShrink:0}}>📋</button>
        </div>)}
      </div>}
    </div>}
  </div>;
}
