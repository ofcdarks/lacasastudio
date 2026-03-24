// @ts-nocheck
import { useState } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const LANGS=[["en","🇺🇸 Inglês"],["es","🇪🇸 Espanhol"],["pt","🇧🇷 Português"],["fr","🇫🇷 Francês"],["de","🇩🇪 Alemão"],["it","🇮🇹 Italiano"],["ja","🇯🇵 Japonês"],["ko","🇰🇷 Coreano"],["hi","🇮🇳 Hindi"],["ar","🇸🇦 Árabe"],["ru","🇷🇺 Russo"],["zh","🇨🇳 Chinês"]];

export default function MultiLang(){
  const toast=useToast();const pg=useProgress();
  const[title,setTitle]=useState("");const[desc,setDesc]=useState("");const[tags,setTags]=useState("");
  const[selLangs,setSelLangs]=useState(["en","es","pt","fr","de"]);
  const[result,setResult]=useState(null);const[loading,setLoading]=useState(false);
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};
  const toggleLang=l=>setSelLangs(p=>p.includes(l)?p.filter(x=>x!==l):[...p,l]);

  const generate=async()=>{
    if(!title.trim()){toast?.error("Título obrigatório");return;}
    setLoading(true);pg?.start("🌐 Traduzindo",selLangs.map(l=>LANGS.find(x=>x[0]===l)?.[1]||l));
    try{const r=await researchApi.multiLanguage({title,description:desc,tags,languages:selLangs});pg?.done();setResult(r);}
    catch(e){pg?.fail(e.message);toast?.error(e.message);}setLoading(false);
  };

  const copyAll=()=>{const txt=Object.entries(result||{}).map(([lang,d])=>`=== ${lang.toUpperCase()} ===\nTitle: ${d.title}\nDescription: ${d.description}\nTags: ${d.tags?.join(", ")}\nHashtags: ${d.hashtags?.join(" ")}`).join("\n\n");cp(txt);};

  return<div className="page-enter" role="main" aria-label="MultiLang" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Multi-Idioma Automático" sub="Traduza e otimize título, descrição e tags em múltiplos idiomas"/>
    <div style={{marginBottom:12}}><Label t="Título do Vídeo *"/><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título original do vídeo..."/></div>
    <div style={{marginBottom:12}}><Label t="Descrição"/><textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Descrição..." style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:C.text,fontSize:13,outline:"none",minHeight:60,resize:"vertical"}}/></div>
    <div style={{marginBottom:12}}><Label t="Tags (vírgula)"/><Input value={tags} onChange={e=>setTags(e.target.value)} placeholder="tag1, tag2, tag3..."/></div>
    <div style={{marginBottom:16}}><Label t="Idiomas (clique pra selecionar)"/><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{LANGS.map(([k,l])=><button key={k} onClick={()=>toggleLang(k)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${selLangs.includes(k)?C.green:C.border}`,background:selLangs.includes(k)?`${C.green}15`:"transparent",color:selLangs.includes(k)?C.green:C.dim,cursor:"pointer",fontSize:11,fontWeight:600}}>{l}</button>)}</div></div>
    <Btn onClick={generate} disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:24}}>{loading?"⏳":`🌐 Traduzir para ${selLangs.length} idiomas`}</Btn>

    {result&&<div>
      <button onClick={copyAll} style={{marginBottom:12,padding:"8px 16px",borderRadius:8,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:11,fontWeight:600}}>📋 Copiar Tudo</button>
      <div style={{display:"grid",gap:12}}>
        {Object.entries(result).map(([lang,d])=>{const flag=LANGS.find(l=>l[0]===lang)?.[1]||lang;return<div key={lang} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:15}}>{flag}</div>
            <button onClick={()=>cp(`${d.title}\n\n${d.description}\n\n${d.tags?.join(", ")}\n\n${d.hashtags?.join(" ")}`)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:10}}>📋 Copiar Tudo</button>
          </div>
          <div style={{marginBottom:8}}><div style={{fontSize:10,fontWeight:700,color:C.red,marginBottom:2}}>Título</div><div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:14,fontWeight:700,flex:1}}>{d.title}</span><button onClick={()=>cp(d.title)} style={{padding:"2px 6px",borderRadius:3,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9}}>📋</button></div></div>
          <div style={{marginBottom:8}}><div style={{fontSize:10,fontWeight:700,color:C.blue,marginBottom:2}}>Descrição</div><div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{d.description}</div></div>
          <div style={{marginBottom:6}}><div style={{fontSize:10,fontWeight:700,color:C.green,marginBottom:2}}>Tags</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{d.tags?.map(t=><span key={t} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.green}10`,color:C.green}}>{t}</span>)}</div></div>
          {d.hashtags&&<div><div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:2}}>Hashtags</div><div style={{fontSize:11,color:C.purple}}>{d.hashtags?.join(" ")}</div></div>}
        </div>})}
      </div>
    </div>}
  </div>
}
