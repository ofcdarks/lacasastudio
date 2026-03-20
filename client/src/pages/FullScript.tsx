// @ts-nocheck
import { useState } from "react";
import { researchApi, aiApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const TYPES={hook:"🎣",intro:"📢",content:"📝",climax:"⚡",cta:"🎯",outro:"👋"};

export default function FullScript(){
  const toast=useToast();const pg=useProgress();
  const[title,setTitle]=useState("");const[niche,setNiche]=useState("");const[duration,setDuration]=useState("10:00");
  const[style,setStyle]=useState("educativo");const[language,setLanguage]=useState("pt");const[hook,setHook]=useState("");
  const[result,setResult]=useState(null);const[loading,setLoading]=useState(false);
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const generate=async()=>{
    if(!title.trim()){toast?.error("Título obrigatório");return;}
    setLoading(true);pg?.start("📜 Criando Roteiro Completo",["Estruturando seções","Escrevendo narração","Adicionando cues visuais","Finalizando"]);
    try{const r=await researchApi.fullScript({title,niche,duration,style,language,hook});pg?.done();setResult(r);}
    catch(e){pg?.fail(e.message);toast?.error(e.message);}setLoading(false);
  };

  const copyFull=()=>{if(!result)return;const txt=result.sections?.map(s=>`[${s.timestamp}] ${s.title}\n🎙️ ${s.narration}\n🎬 Visual: ${s.visualCue}\n📹 B-roll: ${s.broll}\n🎵 Música: ${s.music}\n✂️ Edição: ${s.editNote}`).join("\n\n---\n\n");cp(`ROTEIRO: ${result.title}\nDuração: ${result.totalDuration}\n\n${txt}`);};
  const copyNarration=()=>{if(!result)return;cp(result.sections?.map(s=>`[${s.timestamp}] ${s.narration}`).join("\n\n"));};

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Roteiro Completo" sub="Palavra por palavra · cues visuais · B-roll · música · edição"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
      <div><Label t="Título do Vídeo *"/><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex: A Queda de Roma..."/></div>
      <div><Label t="Nicho"/><Input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="Ex: história, dark..."/></div>
      <div><Label t="Duração"/><Select value={duration} onChange={e=>setDuration(e.target.value)}><option value="5:00">5 min (Short)</option><option value="8:00">8 min</option><option value="10:00">10 min</option><option value="15:00">15 min</option><option value="20:00">20 min</option></Select></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
      <div><Label t="Estilo"/><Select value={style} onChange={e=>setStyle(e.target.value)}><option value="educativo">Educativo</option><option value="storytelling">Storytelling</option><option value="dark">Dark/Mistério</option><option value="tutorial">Tutorial</option><option value="react">React/Comentário</option><option value="documental">Documental</option></Select></div>
      <div><Label t="Idioma"/><Select value={language} onChange={e=>setLanguage(e.target.value)}><option value="pt">Português</option><option value="en">English</option><option value="es">Español</option></Select></div>
      <div><Label t="Hook (opcional)"/><Input value={hook} onChange={e=>setHook(e.target.value)} placeholder="Frase inicial..."/></div>
    </div>
    <Btn onClick={generate} disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:24}}>{loading?"⏳":"📜 Gerar Roteiro Completo"}</Btn>

    {result?.sections&&<div>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        <Btn onClick={copyFull} style={{fontSize:11}}>📋 Copiar TUDO</Btn>
        <Btn onClick={copyNarration} style={{fontSize:11,background:"transparent",border:`1px solid ${C.border}`,color:C.muted}}>🎙️ Só Narração</Btn>
        <Btn onClick={async()=>{try{await researchApi.saveScriptVersion({videoId:0,title:result.title||title,content:result.sections?.map(s=>s.narration).join("\n\n"),sections:result.sections,notes:result.retentionTips?.join("\n")});toast?.success("Versão salva!");}catch(e){toast?.error(e.message);}}} style={{fontSize:11,background:`${C.green}15`,color:C.green,border:`1px solid ${C.green}30`}}>💾 Salvar Versão</Btn>
        <span style={{fontSize:11,color:C.dim,display:"flex",alignItems:"center",gap:4}}>📊 ~{result.wordCount||"1500"} palavras · {result.sections.length} seções</span>
      </div>

      <div style={{display:"grid",gap:0}}>
        {result.sections.map((s,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"70px 1fr",borderBottom:`1px solid ${C.border}`}}>
          <div style={{padding:"16px 8px",textAlign:"center",borderRight:`1px solid ${C.border}`,background:"rgba(255,255,255,.01)"}}>
            <div style={{fontSize:20}}>{TYPES[s.type]||"📝"}</div>
            <div style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:"var(--mono)"}}>{s.timestamp}</div>
            <div style={{fontSize:9,color:C.dim}}>{s.duration}</div>
          </div>
          <div style={{padding:16}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:8,display:"flex",justifyContent:"space-between"}}>{s.title}<button onClick={()=>cp(s.narration)} style={{padding:"2px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9}}>📋</button></div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.8,marginBottom:10,background:"rgba(255,255,255,.02)",borderRadius:8,padding:12,borderLeft:`3px solid ${C.red}`}}>{s.narration}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:10,color:C.dim}}>
              <div>🎬 {s.visualCue}</div>
              <div>📹 {s.broll}</div>
              <div>🎵 {s.music}</div>
              <div>✂️ {s.editNote}</div>
            </div>
          </div>
        </div>)}
      </div>

      {result.retentionTips&&<div style={{background:`${C.green}06`,borderRadius:12,border:`1px solid ${C.green}20`,padding:14,marginTop:16}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>📈 Dicas de Retenção</div>
        {result.retentionTips.map((t,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"3px 0"}}>💡 {t}</div>)}
      </div>}
    </div>}
  </div>
}
