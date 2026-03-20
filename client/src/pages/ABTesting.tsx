// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";
import MagicTabs from "../components/shared/MagicTabs";

const api={
  create:(d)=>fetch("/api/algorithm/ab-test/create",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(d)}).then(r=>r.json()),
  list:()=>fetch("/api/algorithm/ab-test/list",{headers:{Authorization:`Bearer ${localStorage.getItem("lc_token")}`}}).then(r=>r.json()),
  rotate:(id,d)=>fetch(`/api/algorithm/ab-test/${id}/rotate`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(d)}).then(r=>r.json()),
  complete:(id,d)=>fetch(`/api/algorithm/ab-test/${id}/complete`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("lc_token")}`},body:JSON.stringify(d)}).then(r=>r.json()),
};

export default function ABTesting(){
  const toast=useToast();const pg=useProgress();
  const[tab,setTab]=useState("create");
  const[tests,setTests]=useState([]);
  const[videoId,setVideoId]=useState("");const[type,setType]=useState("title");
  const[v1,setV1]=useState("");const[v2,setV2]=useState("");const[v3,setV3]=useState("");
  const[loading,setLoading]=useState(false);

  useEffect(()=>{api.list().then(r=>setTests(Array.isArray(r)?r:[])).catch(()=>{});},[]);

  const create=async()=>{
    if(!videoId||!v1||!v2){toast?.error("Preencha videoId e pelo menos 2 variantes");return;}
    const variants=[{label:"A",value:v1},{label:"B",value:v2}];
    if(v3.trim())variants.push({label:"C",value:v3});
    setLoading(true);pg?.start("🧪 Criando A/B Test",["Configurando variantes","Iniciando rotação"]);
    try{const d=await api.create({videoId:videoId.trim(),type,variants});if(d.error)throw new Error(d.error);pg?.done();toast?.success("Teste criado!");api.list().then(r=>setTests(Array.isArray(r)?r:[])).catch(()=>{});}
    catch(e){pg?.fail(e.message);}setLoading(false);
  };

  const running=tests.filter(t=>t.status==="running");
  const completed=tests.filter(t=>t.status==="completed");

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="A/B Testing Engine" sub="Teste thumbnails, títulos e descrições com dados reais via YouTube API"/>
    <MagicTabs tabs={[{key:"create",icon:"🧪",label:"Novo Teste",color:C.red},{key:"running",icon:"🔄",label:`Rodando (${running.length})`,color:C.green},{key:"history",icon:"📊",label:"Histórico",color:C.blue}]} active={tab} onChange={setTab}/>

    {tab==="create"&&<div style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div><Label t="Video ID ou URL *"/><Input value={videoId} onChange={e=>setVideoId(e.target.value)} placeholder="ID do vídeo publicado..."/></div>
        <div><Label t="Tipo de teste"/><div style={{display:"flex",gap:6}}>
          {[["title","✍️ Título"],["thumbnail","🖼️ Thumbnail"],["description","📝 Descrição"]].map(([k,l])=>
            <button key={k} onClick={()=>setType(k)} style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1px solid ${type===k?C.red:C.border}`,background:type===k?`${C.red}12`:"transparent",color:type===k?C.red:C.dim,cursor:"pointer",fontSize:12,fontWeight:600}}>{l}</button>
          )}
        </div></div>
      </div>
      <div style={{display:"grid",gap:10,marginBottom:20}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16,fontWeight:800,color:C.red,minWidth:30}}>A</span><Input value={v1} onChange={e=>setV1(e.target.value)} placeholder={`Variante A — ${type==="title"?"título original":"URL da thumbnail"}`}/></div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16,fontWeight:800,color:C.blue,minWidth:30}}>B</span><Input value={v2} onChange={e=>setV2(e.target.value)} placeholder="Variante B"/></div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16,fontWeight:800,color:C.green,minWidth:30}}>C</span><Input value={v3} onChange={e=>setV3(e.target.value)} placeholder="Variante C (opcional)"/></div>
      </div>
      <div style={{background:`${C.red}06`,borderRadius:12,border:`1px solid ${C.red}15`,padding:14,marginBottom:16}}>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>O teste troca a variante a cada hora via YouTube API e mede impressões + cliques de cada uma. Após ~48h com dados suficientes, declara vencedor com significância estatística.</div>
      </div>
      <Btn onClick={create} disabled={loading} style={{width:"100%",justifyContent:"center"}}>{loading?"⏳":"🧪 Iniciar A/B Test"}</Btn>
    </div>}

    {tab==="running"&&<div style={{display:"grid",gap:10}}>
      {running.length===0&&<div style={{textAlign:"center",padding:40,color:C.dim}}>Nenhum teste rodando</div>}
      {running.map(t=><div key={t.id} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.green}20`,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div><div style={{fontWeight:700,fontSize:14}}>Teste #{t.id} — {t.type}</div><div style={{fontSize:11,color:C.dim}}>Vídeo: {t.videoId} · Desde: {new Date(t.startedAt).toLocaleDateString("pt-BR")}</div></div>
          <span style={{fontSize:10,padding:"4px 10px",borderRadius:6,background:`${C.green}12`,color:C.green,fontWeight:700}}>Rodando</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${t.variants.length},1fr)`,gap:8}}>
          {t.variants.map((v,i)=><div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`,padding:12,textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:[C.red,C.blue,C.green][i]}}>{v.label}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>{v.value?.slice(0,50)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginTop:8,fontSize:10}}>
              <div><div style={{fontWeight:700}}>{fmt(v.impressions||0)}</div><div style={{color:C.dim}}>impr.</div></div>
              <div><div style={{fontWeight:700,color:C.green}}>{(v.ctr||0).toFixed(1)}%</div><div style={{color:C.dim}}>CTR</div></div>
            </div>
          </div>)}
        </div>
      </div>)}
    </div>}

    {tab==="history"&&<div style={{display:"grid",gap:8}}>
      {completed.length===0&&<div style={{textAlign:"center",padding:40,color:C.dim}}>Nenhum teste concluído ainda</div>}
      {completed.map(t=><div key={t.id} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontWeight:700,fontSize:13}}>Teste #{t.id} — {t.type}</div><div style={{fontSize:10,color:C.dim}}>{t.videoId}</div></div>
        <span style={{fontSize:11,color:C.green,fontWeight:700}}>Vencedor: {t.variants[t.winnerId||0]?.label||"?"}</span>
      </div>)}
    </div>}
  </div>;
}
