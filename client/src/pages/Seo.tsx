// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { aiApi, seoResultApi, researchApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Select, Badge, SecTitle, PBar, C } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const LANGS=[["pt","🇧🇷 Português"],["en","🇺🇸 Inglês"],["es","🇪🇸 Espanhol"],["fr","🇫🇷 Francês"],["de","🇩🇪 Alemão"],["it","🇮🇹 Italiano"],["ja","🇯🇵 Japonês"],["ko","🇰🇷 Coreano"],["hi","🇮🇳 Hindi"]];

function ScoreRing({score,size=70}){const r=size/2-5,circ=2*Math.PI*r,off=circ-(score/100)*circ;const c=score>=80?C.green:score>=60?"#F59E0B":C.red;return<svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset .8s ease"}}/><text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size*.26} fontWeight="800">{score}</text></svg>}

export default function Seo(){
  const{videos,channels}=useApp();const nav=useNavigate();const toast=useToast();const pg=useProgress();
  const[selV,setSelV]=useState(videos[0]?.id);const[topic,setTopic]=useState("");const[competitors,setCompetitors]=useState("");
  const[language,setLanguage]=useState("pt");const[loading,setLoading]=useState(false);const[results,setResults]=useState(null);
  const[history,setHistory]=useState([]);const[error,setError]=useState("");
  const[translations,setTranslations]=useState(null);const[transLangs,setTransLangs]=useState(["en","es"]);const[transLoading,setTransLoading]=useState(false);
  const vid=videos.find(v=>v.id===selV);const ch=vid?.channel||channels.find(c=>c.id===vid?.channelId);
  useEffect(()=>{if(!selV)return;seoResultApi.listByVideo(selV).then(setHistory).catch(()=>setHistory([]));},[selV]);
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const generate=async()=>{
    setLoading(true);setError("");setResults(null);setTranslations(null);
    pg?.start("🚀 Gerando SEO Viral",["Analisando tópico","Criando 10 títulos","Otimizando descrição","Tags e timestamps","Scores e dicas"]);
    try{
      const data=await aiApi.seo({title:vid?.title||topic,topic:topic||vid?.title||"",channelName:ch?.name||"",language,competitors});
      if(data.error){pg?.fail(data.error);setError(data.error);return;}
      pg?.done();setResults(data);
      await seoResultApi.create({videoId:selV,titles:(data.titles||[]).map(t=>t.text||t),description:data.description,tags:data.tags,score:data.score,tips:Array.isArray(data.tips)?data.tips.join("\n"):data.tips}).catch(()=>{});
      seoResultApi.listByVideo(selV).then(setHistory).catch(()=>{});
    }catch(err){pg?.fail(err.message);setError(err.message);}
    finally{setLoading(false);}
  };

  const translate=async()=>{
    if(!results)return;setTransLoading(true);
    pg?.start("🌐 Traduzindo",transLangs.map(l=>LANGS.find(x=>x[0]===l)?.[1]||l));
    try{const best=results.titles?.[0]?.text||results.titles?.[0]||topic;
      const r=await researchApi.multiLanguage({title:best,description:results.description||"",tags:(results.tags||[]).join(", "),languages:transLangs});
      pg?.done();setTranslations(r);}catch(e){pg?.fail(e.message);}setTransLoading(false);
  };

  const copyAll=()=>{if(!results)return;const t=(results.titles||[]).map(t=>t.text||t).join("\n");cp(`TÍTULOS:\n${t}\n\nDESCRIÇÃO:\n${results.description||""}\n\nTAGS:\n${(results.tags||[]).join(", ")}\n\nHASHTAGS:\n${(results.hashtags||[]).join(" ")}\n\nTIMESTAMPS:\n${(results.timestamps||[]).join("\n")}\n\nHOOK:\n${results.hookScript||""}\n\nCOMENTÁRIO FIXADO:\n${results.pinComment||""}\n\nEND SCREEN:\n${results.endScreen||""}`);};

  return<div className="page-enter">
    <Hdr title="SEO Viral Completo" sub="10 títulos · descrição · 15 tags · timestamps · hook · multi-idioma"/>

    <Card style={{marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🚀 Gerar SEO que SUPERA a concorrência</div>
      <div style={{display:"grid",gridTemplateColumns:"180px 1fr 1fr",gap:10,marginBottom:10,alignItems:"end"}}>
        <div><Label t="Vídeo"/><Select value={selV||""} onChange={e=>setSelV(Number(e.target.value))}>{videos.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</Select></div>
        <div><Label t="Tópico / Palavras-chave *"/><Input placeholder="Ex: maias x astecas..." value={topic} onChange={e=>setTopic(e.target.value)}/></div>
        <div><Label t="Idioma"/><Select value={language} onChange={e=>setLanguage(e.target.value)}>{LANGS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</Select></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}>
        <div><Label t="Concorrentes a superar (opcional)"/><Input placeholder="Nomes de canais ou títulos concorrentes..." value={competitors} onChange={e=>setCompetitors(e.target.value)}/></div>
        <Btn onClick={generate} disabled={loading} style={{height:38}}>{loading?"⏳":"🚀 Gerar SEO Viral"}</Btn>
      </div>
    </Card>

    {error&&<Card style={{marginBottom:16,borderColor:`${C.red}30`,padding:14}}><div style={{fontSize:13,color:C.red}}>{error}</div></Card>}

    {results&&<div>
      {/* Actions */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        <Btn onClick={copyAll} style={{fontSize:11}}>📋 Copiar TUDO</Btn>
        {[["Títulos",(results.titles||[]).map(t=>t.text||t).join("\n")],["Descrição",results.description],["Tags",(results.tags||[]).join(", ")],["Hashtags",(results.hashtags||[]).join(" ")],["Timestamps",(results.timestamps||[]).join("\n")]].map(([l,v])=>v?<button key={l} onClick={()=>cp(v)} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:10}}>📋 {l}</button>:null)}
      </div>

      {/* Scores */}
      {results.score&&<Card style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:12}}>
        {[["SEO",results.score.seo],["CTR",results.score.ctr],["Alcance",results.score.reach],["Retenção",results.score.retention],["Viral",results.score.viral]].filter(([,v])=>v).map(([l,v])=><div key={l} style={{textAlign:"center"}}><ScoreRing score={v||0}/><div style={{fontSize:10,color:C.muted,marginTop:4}}>{l}</div></div>)}
      </div></Card>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        {/* Titles */}
        <Card color={C.orange}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><SecTitle t="10 Títulos Virais"/><button onClick={()=>cp((results.titles||[]).map(t=>t.text||t).join("\n"))} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9}}>📋</button></div>
          {(results.titles||[]).map((t,i)=>{const text=t.text||t,score=t.ctrScore,hook=t.hook;return<div key={i} style={{padding:"8px 10px",background:i===0?`${C.orange}08`:"transparent",borderRadius:8,marginBottom:3,border:i===0?`1px solid ${C.orange}20`:"1px solid transparent",display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{fontFamily:"var(--mono)",fontSize:11,color:C.dim,minWidth:16}}>{i+1}.</span>
            <div style={{flex:1}}><span style={{fontSize:13,fontWeight:i===0?700:400,color:i===0?C.text:C.muted}}>{text}</span>{hook&&<div style={{fontSize:9,color:C.dim,marginTop:2}}>💡 {hook}</div>}</div>
            {score&&<span style={{fontSize:10,fontWeight:700,color:score>=85?C.green:C.blue,flexShrink:0}}>{score}</span>}
            <button onClick={()=>cp(text)} style={{padding:"2px 6px",borderRadius:3,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:8,flexShrink:0}}>📋</button>
          </div>})}
        </Card>

        {/* Right */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card color={C.purple}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><SecTitle t="15 Tags SEO"/><button onClick={()=>cp((results.tags||[]).join(", "))} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9}}>📋</button></div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(results.tags||[]).map((tag,i)=><Badge key={i} text={tag} color={i<3?C.purple:C.muted} v="tag"/>)}</div></Card>
          {results.hashtags?.length>0&&<Card color={C.blue}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><SecTitle t="Hashtags"/><button onClick={()=>cp((results.hashtags||[]).join(" "))} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9}}>📋</button></div><div style={{fontSize:13,color:C.blue}}>{(results.hashtags||[]).join(" ")}</div></Card>}
          {results.timestamps?.length>0&&<Card color={C.teal}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><SecTitle t="Timestamps"/><button onClick={()=>cp((results.timestamps||[]).join("\n"))} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9}}>📋</button></div>{results.timestamps.map((ts,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"2px 0"}}>{ts}</div>)}</Card>}
          {results.thumbnailIdeas?.length>0&&<Card color={C.orange}><SecTitle t="🎨 Ideias de Thumb"/>{results.thumbnailIdeas.map((id,i)=><div key={i} style={{fontSize:11,color:C.muted,padding:"3px 0",borderBottom:`1px solid ${C.border}`}}>🖼️ {id}</div>)}</Card>}
        </div>
      </div>

      {/* Description */}
      <Card color={C.blue} style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><SecTitle t="Descrição SEO"/><button onClick={()=>cp(results.description||"")} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10}}>📋 Copiar</button></div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7,whiteSpace:"pre-wrap",background:"rgba(255,255,255,0.02)",borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>{results.description||""}</div>
        {results.shortDescription&&<div style={{marginTop:8}}><div style={{fontSize:10,fontWeight:700,color:C.dim,marginBottom:3}}>📱 Versão mobile:</div><div style={{fontSize:12,color:C.muted}}>{results.shortDescription}</div></div>}
      </Card>

      {/* Hook + End Screen + Pin */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
        {results.hookScript&&<Card color={C.red}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><SecTitle t="🎣 Hook (5s)"/><button onClick={()=>cp(results.hookScript)} style={{padding:"2px 6px",borderRadius:3,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:8}}>📋</button></div><div style={{fontSize:13,color:C.text,fontWeight:600,lineHeight:1.6}}>"{results.hookScript}"</div></Card>}
        {results.endScreen&&<Card color={C.green}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><SecTitle t="📺 End Screen"/><button onClick={()=>cp(results.endScreen)} style={{padding:"2px 6px",borderRadius:3,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:8}}>📋</button></div><div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{results.endScreen}</div></Card>}
        {results.pinComment&&<Card color={C.purple}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><SecTitle t="📌 Fixado"/><button onClick={()=>cp(results.pinComment)} style={{padding:"2px 6px",borderRadius:3,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:8}}>📋</button></div><div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{results.pinComment}</div></Card>}
      </div>

      {/* Tips */}
      {results.tips&&<Card color={C.teal} style={{marginBottom:16}}><SecTitle t="💡 Dicas para Viralizar"/>{Array.isArray(results.tips)?results.tips.map((t,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>🔥 {t}</div>):<div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{results.tips}</div>}</Card>}

      {/* Multi-lang */}
      <Card style={{marginBottom:16,borderColor:`${C.blue}20`}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>🌐 Traduzir pra Outros Idiomas</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
          {LANGS.filter(([k])=>k!==language).map(([k,l])=><button key={k} onClick={()=>setTransLangs(p=>p.includes(k)?p.filter(x=>x!==k):[...p,k])} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${transLangs.includes(k)?C.green:C.border}`,background:transLangs.includes(k)?`${C.green}15`:"transparent",color:transLangs.includes(k)?C.green:C.dim,cursor:"pointer",fontSize:10,fontWeight:600}}>{l}</button>)}
        </div>
        <Btn onClick={translate} disabled={transLoading||!transLangs.length} style={{fontSize:11}}>{transLoading?"⏳":`🌐 Traduzir para ${transLangs.length} idiomas`}</Btn>
        {translations&&<div style={{marginTop:12,display:"grid",gap:10}}>{Object.entries(translations).map(([lang,d])=>{const flag=LANGS.find(l=>l[0]===lang)?.[1]||lang;return<div key={lang} style={{background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontWeight:700,fontSize:13}}>{flag}</span><button onClick={()=>cp(`${d.title}\n\n${d.description}\n\nTags: ${d.tags?.join(", ")}\n\n${d.hashtags?.join(" ")}`)} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>📋</button></div>
          <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{d.title}</div>
          <div style={{fontSize:11,color:C.muted,marginBottom:6,lineHeight:1.5}}>{d.description?.slice(0,150)}...</div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{d.tags?.map(t=><span key={t} style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:`${C.blue}10`,color:C.blue}}>{t}</span>)}{d.hashtags?.map(h=><span key={h} style={{fontSize:9,color:C.purple}}>{h}</span>)}</div>
        </div>})}</div>}
      </Card>
    </div>}

    {/* History */}
    {history.length>0&&<><SecTitle t="📚 Histórico Salvo"/><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>{history.map((h,i)=><Card key={h.id} hov onClick={()=>setResults({titles:(h.titles||[]).map(t=>typeof t==="string"?{text:t}:t),description:h.description,tags:h.tags,score:h.score,tips:h.tips})} style={{padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,fontWeight:600}}>V{history.length-i}</span><span style={{fontFamily:"var(--mono)",fontSize:10,color:C.dim}}>{new Date(h.createdAt).toLocaleString("pt-BR")}</span></div>
      {h.titles?.length>0&&<div style={{fontSize:12,color:C.orange,fontWeight:600,marginBottom:4}}>{h.titles[0]?.text||h.titles[0]}</div>}
      {h.score&&<div style={{display:"flex",gap:6}}><Badge text={`SEO ${h.score.seo}`} color={C.green} v="tag"/><Badge text={`CTR ${h.score.ctr}`} color={C.orange} v="tag"/>{h.score.viral&&<Badge text={`Viral ${h.score.viral}`} color={C.purple} v="tag"/>}</div>}
    </Card>)}</div></>}
  </div>
}
