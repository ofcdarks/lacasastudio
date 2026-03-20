// @ts-nocheck
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useConfirm } from "../context/ConfirmContext";
import { sceneApi, aiApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const ST = {
  hook:       { l:"GANCHO",     c:"#EF4444", bg:"linear-gradient(135deg,#1a0505,#2d0a0a)", i:"🎯", retention:"Pattern interrupt — quebre expectativa nos primeiros 3s" },
  intro:      { l:"INTRO",      c:"#A855F7", bg:"linear-gradient(135deg,#0d0520,#1a0a2d)", i:"🎬", retention:"Apresente o contexto rápido — max 15s" },
  problem:    { l:"PROBLEMA",   c:"#F59E0B", bg:"linear-gradient(135deg,#1a1005,#2d1a0a)", i:"⚡", retention:"Crie tensão — o público precisa sentir a dor" },
  content:    { l:"CONTEÚDO",   c:"#3B82F6", bg:"linear-gradient(135deg,#050d1a,#0a1a2d)", i:"📹", retention:"Entregue valor — dados, fatos, demonstrações" },
  demo:       { l:"DEMO",       c:"#06B6D4", bg:"linear-gradient(135deg,#051a1a,#0a2d2d)", i:"🖥️", retention:"Show don't tell — mostre visualmente" },
  reveal:     { l:"REVELAÇÃO",  c:"#EC4899", bg:"linear-gradient(135deg,#1a0515,#2d0a20)", i:"💎", retention:"Plot twist — surpreenda com informação nova" },
  transition: { l:"TRANSIÇÃO",  c:"#8B5CF6", bg:"linear-gradient(135deg,#0f0520,#1a0a35)", i:"✨", retention:"Reengaje — mini-hook a cada 30s" },
  cta:        { l:"CTA",        c:"#F59E0B", bg:"linear-gradient(135deg,#1a1505,#2d200a)", i:"👆", retention:"Urgência + escassez + prova social" },
  outro:      { l:"ENCERRAMENTO",c:"#22C55E",bg:"linear-gradient(135deg,#051a0d,#0a2d15)", i:"🔚", retention:"Open loop — deixe gancho pro próximo vídeo" },
  broll:      { l:"B-ROLL",     c:"#14B8A6", bg:"linear-gradient(135deg,#051a18,#0a2d28)", i:"🎞️", retention:"Visual variety — mude o estímulo visual" },
};

const CSS = `
@keyframes sb-in{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:translateY(0)}}
@keyframes sb-glow{0%,100%{box-shadow:0 0 15px var(--gc)}50%{box-shadow:0 0 40px var(--gc),0 0 80px var(--gc)}}
@keyframes sb-scan{0%{top:-2px}100%{top:calc(100% - 2px)}}
@keyframes sb-bar{0%{width:0}100%{width:100%}}
@keyframes sb-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
.sb-s{animation:sb-in .5s ease-out both;transition:all .35s ease}
.sb-s:hover{transform:translateY(-3px)!important}
.sb-s:hover .sb-pv{animation:sb-glow 2s ease-in-out infinite}
.sb-s:hover .sb-cam{opacity:.7!important}
.sb-s:hover .sb-grid{opacity:.12!important}
.sb-s:hover .sb-pbar{animation:sb-bar .6s ease-out forwards}
.sb-gen-spin{animation:sb-spin 1.2s linear infinite}
`;

function buildPrompt(scene){
  const m=ST[scene.type]||ST.content;
  return `2D animated storyboard frame for "${scene.title}": ${scene.camera||scene.notes||"dramatic scene"}. Style: Netflix animation, cinematic composition, ${m.l.toLowerCase()} mood, vibrant ${m.c} color accent on dark background, professional production quality, wide shot 16:9, digital art`;
}

function SceneCard({scene,idx,total,onEdit,onDel,onAsset,onGenerate,generating}){
  const m=ST[scene.type]||ST.content;
  const isL=idx%2===0;
  const hasThumb=!!scene.thumbnail;
  const isGen=generating===scene.id;

  return(
    <div className="sb-s" style={{display:"flex",minHeight:hasThumb?300:280,animationDelay:`${idx*.08}s`,marginBottom:8}}>
      {/* Info */}
      <div style={{flex:1.1,display:"flex",flexDirection:"column",justifyContent:"center",
        padding:isL?"22px 28px 22px 0":"22px 0 22px 28px",order:isL?0:2}}>
        <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:6}}>
          <span style={{fontSize:48,fontWeight:900,color:m.c,opacity:.18,lineHeight:1,fontFamily:"'Bebas Neue',sans-serif"}}>{String(idx+1).padStart(2,"0")}</span>
          <span style={{fontSize:9,fontWeight:800,letterSpacing:2,color:m.c,background:`${m.c}12`,padding:"3px 10px",borderRadius:4}}>{m.l}</span>
        </div>
        <h3 style={{fontSize:16,fontWeight:800,color:C.text,margin:"0 0 8px",textTransform:"uppercase",letterSpacing:.3,lineHeight:1.3}}>{scene.title}</h3>
        {scene.notes&&<div style={{borderLeft:`3px solid ${m.c}`,paddingLeft:14,marginBottom:10,fontSize:12.5,color:"rgba(255,255,255,.65)",lineHeight:1.7,fontStyle:"italic"}}>"{scene.notes}"</div>}
        {scene.camera&&<div style={{marginBottom:4,fontSize:11}}><span style={{color:m.c,fontWeight:800,fontFamily:"var(--mono)",fontSize:9.5,letterSpacing:1}}>CÂMERA: </span><span style={{color:"rgba(255,255,255,.45)"}}>{scene.camera}</span></div>}
        {scene.audio&&<div style={{marginBottom:8,fontSize:11}}><span style={{color:m.c,fontWeight:800,fontFamily:"var(--mono)",fontSize:9.5,letterSpacing:1}}>SFX: </span><span style={{color:"rgba(255,255,255,.45)"}}>{scene.audio}</span></div>}
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,padding:"5px 9px",background:`${m.c}06`,borderRadius:6,border:`1px solid ${m.c}10`,width:"fit-content"}}>
          <span style={{fontSize:10}}>📊</span><span style={{fontSize:9,color:m.c,fontWeight:700}}>RETENÇÃO:</span><span style={{fontSize:9,color:"rgba(255,255,255,.45)"}}>{scene.retention||m.retention}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontFamily:"var(--mono)",color:C.dim,background:"rgba(255,255,255,.04)",padding:"3px 8px",borderRadius:5}}>⏱ {scene.duration||"~5s"}</span>
          <button onClick={()=>onEdit(scene)} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>✏️ Editar</button>
          <button onClick={()=>onGenerate(scene)} disabled={isGen} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${m.c}30`,background:isGen?`${m.c}20`:`${m.c}08`,color:m.c,cursor:isGen?"wait":"pointer",fontSize:9,fontWeight:600}}>
            {isGen?<span><span className="sb-gen-spin" style={{display:"inline-block"}}>⏳</span> Gerando...</span>:"🎨 Gerar Asset"}
          </button>
          <button onClick={()=>onAsset(scene)} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>📋 Prompts</button>
          <button onClick={()=>onDel(scene.id)} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:"#EF4444",cursor:"pointer",fontSize:9}}>🗑</button>
        </div>
      </div>

      {/* Timeline */}
      <div style={{width:40,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",order:1}}>
        <div style={{width:2,flex:1,background:idx===0?"transparent":`linear-gradient(180deg,${C.border},${m.c})`}}/>
        <div style={{width:16,height:16,borderRadius:"50%",background:m.c,border:`3px solid ${C.bgCard}`,zIndex:2}}/>
        <div style={{width:2,flex:1,background:idx===total-1?"transparent":`linear-gradient(180deg,${m.c},${C.border})`}}/>
      </div>

      {/* Preview frame */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:12,order:isL?2:0}}>
        <div className="sb-pv" style={{"--gc":`${m.c}40`,width:"100%",maxWidth:420,borderRadius:12,overflow:"hidden",
          background:hasThumb?"#000":m.bg,border:`1px solid ${m.c}15`,position:"relative",
          aspectRatio:hasThumb?"16/9":"auto",height:hasThumb?"auto":240,display:"flex",flexDirection:"column"}}>

          {/* If has generated thumbnail */}
          {hasThumb ? (
            <div style={{position:"relative",width:"100%",height:"100%"}}>
              <img src={scene.thumbnail} alt={scene.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
              {/* Overlay with scene info */}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.7) 100%)"}}>
                <div style={{position:"absolute",top:8,left:10,fontSize:24,fontWeight:900,color:m.c,opacity:.4,fontFamily:"'Bebas Neue',sans-serif"}}>{String(idx+1).padStart(2,"0")}</div>
                <div style={{position:"absolute",top:8,right:8,fontSize:8,fontWeight:800,letterSpacing:1.5,color:"#fff",background:`${m.c}cc`,padding:"3px 8px",borderRadius:4}}>{m.l}</div>
                <div style={{position:"absolute",bottom:8,left:10,right:10}}>
                  <div style={{fontSize:12,fontWeight:800,color:"#fff",textTransform:"uppercase",letterSpacing:.5,textShadow:"0 2px 8px rgba(0,0,0,.8)"}}>{scene.title}</div>
                  <div style={{fontSize:8,color:"rgba(255,255,255,.6)",fontFamily:"var(--mono)",marginTop:2}}>{scene.duration||"~5s"}</div>
                </div>
              </div>
              {/* Regenerate button */}
              <button onClick={()=>onGenerate(scene)} disabled={isGen} style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,.3)",background:"rgba(0,0,0,.6)",color:"#fff",cursor:isGen?"wait":"pointer",fontSize:9,fontWeight:600,opacity:.7,backdropFilter:"blur(4px)"}}>
                {isGen?"⏳ Gerando...":"🔄 Regenerar"}
              </button>
            </div>
          ) : (
            /* Empty state - no thumbnail yet */
            <>
              <div className="sb-grid" style={{position:"absolute",inset:0,opacity:.04,transition:"opacity .3s",pointerEvents:"none"}}>
                {[33,66].map(p=><div key={"v"+p} style={{position:"absolute",left:p+"%",top:0,bottom:0,width:1,background:m.c}}/>)}
                {[33,66].map(p=><div key={"h"+p} style={{position:"absolute",top:p+"%",left:0,right:0,height:1,background:m.c}}/>)}
              </div>
              <div className="sb-scanline" style={{position:"absolute",left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${m.c}30,transparent)`,top:-2,pointerEvents:"none"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",zIndex:2}}>
                <span style={{fontSize:28,fontWeight:900,color:m.c,opacity:.12,fontFamily:"'Bebas Neue',sans-serif",lineHeight:1}}>{String(idx+1).padStart(2,"0")}</span>
                <span style={{fontSize:8,fontWeight:800,letterSpacing:1.5,color:m.c,background:`${m.c}15`,padding:"3px 8px",borderRadius:4}}>{m.l}</span>
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:2,padding:"0 16px",gap:6}}>
                {isGen ? (
                  <>
                    <div className="sb-gen-spin" style={{fontSize:32,display:"inline-block"}}>🎨</div>
                    <div style={{fontSize:11,color:m.c,fontWeight:600}}>Gerando asset...</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>Pode levar 10-30 segundos</div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:34,filter:"grayscale(20%)"}}>{m.i}</div>
                    <div style={{fontSize:12,fontWeight:800,color:"rgba(255,255,255,.7)",textTransform:"uppercase",letterSpacing:1,textAlign:"center",lineHeight:1.3}}>{scene.title}</div>
                    <button onClick={()=>onGenerate(scene)} style={{marginTop:4,padding:"5px 14px",borderRadius:6,border:`1px dashed ${m.c}40`,background:`${m.c}08`,color:m.c,cursor:"pointer",fontSize:10,fontWeight:600}}>🎨 Gerar Imagem com IA</button>
                  </>
                )}
              </div>
              <div style={{padding:"8px 10px",zIndex:2,borderTop:`1px solid ${m.c}10`,background:`${m.c}05`}}>
                <div className="sb-cam" style={{fontSize:9,fontFamily:"var(--mono)",color:m.c,opacity:.45,transition:"opacity .3s",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>📷 {scene.camera||scene.notes?.slice(0,100)||"Composição padrão"}</div>
              </div>
            </>
          )}
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:`${m.c}08`}}>
            <div className="sb-pbar" style={{height:"100%",background:`linear-gradient(90deg,transparent,${m.c})`,width:0}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({scene,onClose,onSave}){
  const[f,setF]=useState({...scene});const m=ST[f.type]||ST.content;
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} style={{width:620,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,padding:30,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{fontWeight:800,fontSize:18,marginBottom:20,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:24}}>{m.i}</span>Editar Cena</div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12}}><div><Label t="Tipo"/><Select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>{Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div><div><Label t="Título"/><Input value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))}/></div></div>
        <div><Label t="Narração / Script"/><textarea value={f.notes||""} onChange={e=>setF(p=>({...p,notes:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",color:C.text,fontSize:13,outline:"none",minHeight:90,resize:"vertical",lineHeight:1.6}} placeholder="Narração completa..."/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><Label t="Câmera / Animação"/><textarea value={f.camera||""} onChange={e=>setF(p=>({...p,camera:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px",color:C.text,fontSize:12,outline:"none",minHeight:56,resize:"vertical"}}/></div>
          <div><Label t="Trilha / SFX"/><textarea value={f.audio||""} onChange={e=>setF(p=>({...p,audio:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px",color:C.text,fontSize:12,outline:"none",minHeight:56,resize:"vertical"}}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12}}><div><Label t="Duração"/><Input value={f.duration||""} onChange={e=>setF(p=>({...p,duration:e.target.value}))} placeholder="~5s"/></div><div><Label t="Nota de Retenção"/><Input value={f.retention||""} onChange={e=>setF(p=>({...p,retention:e.target.value}))} placeholder="Técnica..."/></div></div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}><Btn vr="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={()=>{onSave(scene.id,f);onClose();}}>Salvar</Btn></div>
    </div>
  </div>);
}

function AssetModal({scene,onClose}){
  const m=ST[scene.type]||ST.content;
  const[copied,setCopied]=useState(null);
  const copy=(t,i)=>{try{const ta=document.createElement("textarea");ta.value=t;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);setCopied(i);setTimeout(()=>setCopied(null),2000);}catch{}};
  const prompts=[
    {label:"Personagem Principal",prompt:`2D animated character for scene "${scene.title}", ${scene.notes?.slice(0,40)||"dramatic"}, unique character design, Netflix animation quality, dynamic pose, ${m.l.toLowerCase()} mood, vibrant colors, digital art --ar 1:1 --v 6`},
    {label:"Cenário / Background",prompt:`cinematic background "${scene.title}", ${scene.camera?.slice(0,40)||"wide shot"}, 2D animation style, atmospheric, moody ${m.c} color palette, professional production, digital painting --ar 16:9 --v 6`},
    {label:"Key Frame / Thumbnail",prompt:`storyboard key frame "${scene.title}", dramatic composition, ${m.l.toLowerCase()} energy, cinematic lighting, 2D illustration, bold visual storytelling --ar 16:9 --v 6`},
    {label:"Props / Elementos",prompt:`2D animated props for "${scene.title}", clean vector style, ${m.c} accent, isolated on dark background, sticker sheet, animation assets --ar 1:1 --v 6`},
    {label:"Expressões Faciais",prompt:`character expression sheet for "${scene.title}", ${m.l.toLowerCase()} emotion, multiple angles, 2D animation reference, clean lineart, Netflix quality --ar 1:1 --v 6`},
  ];
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} style={{width:680,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,padding:30,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}><span style={{fontSize:26}}>🎨</span><div><div style={{fontWeight:800,fontSize:17}}>Prompts de Assets — {scene.title}</div><div style={{fontSize:11,color:C.dim}}>Copie e use no Midjourney, DALL-E, Leonardo AI</div></div></div>
      <div style={{display:"grid",gap:10}}>
        {prompts.map((p,i)=>(<div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:11,fontWeight:700,color:m.c}}>{p.label}</span><button onClick={()=>copy(p.prompt,i)} style={{padding:"4px 12px",borderRadius:5,border:`1px solid ${m.c}30`,background:copied===i?`${m.c}30`:`${m.c}08`,color:copied===i?"#fff":m.c,cursor:"pointer",fontSize:10,fontWeight:600,transition:"all .2s"}}>{copied===i?"✅ Copiado!":"📋 Copiar"}</button></div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.5,fontFamily:"var(--mono)",background:"rgba(0,0,0,.2)",padding:"8px 10px",borderRadius:6,userSelect:"all"}}>{p.prompt}</div>
        </div>))}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
        <button onClick={()=>{const all=prompts.map(p=>p.label+":\n"+p.prompt).join("\n\n");copy(all,99);}} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${m.c}30`,background:copied===99?`${m.c}30`:`${m.c}08`,color:copied===99?"#fff":m.c,cursor:"pointer",fontSize:11,fontWeight:600}}>{copied===99?"✅ Todos Copiados!":"📋 Copiar Todos"}</button>
        <Btn vr="ghost" onClick={onClose}>Fechar</Btn>
      </div>
    </div>
  </div>);
}

export default function Storyboard(){
  const{videos}=useApp();const confirm=useConfirm();const toast=useToast();const pg=useProgress();
  const[selV,setSelV]=useState(null);const[scenes,setScenes]=useState([]);const[editScene,setEditScene]=useState(null);const[assetScene,setAssetScene]=useState(null);
  const[aiLoading,setAiLoading]=useState(false);const[aiTopic,setAiTopic]=useState("");const[aiStyle,setAiStyle]=useState("cinematográfico viral com alta retenção");
  const[showAI,setShowAI]=useState(false);const[showAdd,setShowAdd]=useState(false);const[generating,setGenerating]=useState(null);
  const[ns,setNs]=useState({type:"content",title:"",duration:"",notes:"",camera:"",audio:""});const[view,setView]=useState("animated");

  useEffect(()=>{if(videos.length&&!selV)setSelV(videos[0].id);},[videos]);
  useEffect(()=>{if(!selV)return;sceneApi.listByVideo(selV).then(setScenes).catch(()=>setScenes([]));},[selV]);
  const vid=videos.find(v=>v.id===selV);

  const addScene=async()=>{if(!ns.title.trim())return;const tm=ST[ns.type]||ST.content;const s=await sceneApi.create({...ns,videoId:selV,color:tm.c});setScenes(p=>[...p,s]);setNs({type:"content",title:"",duration:"",notes:"",camera:"",audio:""});setShowAdd(false);toast?.success("Cena adicionada");};
  const saveEdit=async(id,d)=>{const tm=ST[d.type]||ST.content;await sceneApi.update(id,{...d,color:tm.c});setScenes(p=>p.map(s=>s.id===id?{...s,...d,color:tm.c}:s));toast?.success("Salvo");};
  const delScene=async id=>{const ok=await confirm({title:"Remover",message:"Remover esta cena?"});if(!ok)return;await sceneApi.del(id);setScenes(p=>p.filter(s=>s.id!==id));};
  const clearAll=async()=>{const ok=await confirm({title:"Limpar",message:"Remover TODAS?"});if(!ok)return;for(const s of scenes)await sceneApi.del(s.id).catch(()=>{});setScenes([]);};

  const generateAsset=async(scene)=>{
    setGenerating(scene.id);
    try{
      const prompt=buildPrompt(scene);
      const result=await aiApi.generateAsset({prompt,sceneId:scene.id});
      const url=result.url||(result.b64?`data:image/png;base64,${result.b64}`:"");
      if(url){setScenes(p=>p.map(s=>s.id===scene.id?{...s,thumbnail:url}:s));toast?.success("Asset gerado!");}
      else{toast?.error("Nenhuma imagem retornada");}
    }catch(err){toast?.error("Erro: "+(err.message||"Falha na geração"));}
    setGenerating(null);
  };

  const generateAllAssets=async()=>{
    const empty=scenes.filter(s=>!s.thumbnail);
    if(!empty.length){toast?.info?.("Todas as cenas já têm assets");return;}
    pg?.start("🎨 Gerando Assets",empty.map(s=>s.title?.slice(0,20)));
    for(let i=0;i<empty.length;i++){
      const s=empty[i];
      setGenerating(s.id);pg?.update(i,`Cena ${i+1}/${empty.length}: ${s.title?.slice(0,25)}`);
      try{
        const prompt=buildPrompt(s);
        const result=await aiApi.generateAsset({prompt,sceneId:s.id});
        const url=result.url||(result.b64?`data:image/png;base64,${result.b64}`:"");
        if(url)setScenes(p=>p.map(sc=>sc.id===s.id?{...sc,thumbnail:url}:sc));
      }catch{}
      setGenerating(null);
    }
    pg?.done();toast?.success("Todos os assets gerados!");
  };

  const generateAI=async()=>{if(!selV){toast?.error("Selecione um vídeo");return;}setAiLoading(true);pg?.start("🎬 Gerando Storyboard Completo",["Estruturando cenas","Escrevendo narração","Câmera e SFX","Finalizando"]);try{const data=await aiApi.storyboard({title:aiTopic||vid?.title||"Vídeo",duration:vid?.duration||"10:00",style:aiStyle});if(data.error){pg?.fail(data.error);toast?.error(data.error);setAiLoading(false);return;}const sl=Array.isArray(data.scenes)?data.scenes:[];const ns=[];for(const s of sl){try{const sv=await sceneApi.create({videoId:selV,type:s.type||"content",title:s.title||"Cena",duration:s.duration||"",notes:s.notes||"",camera:s.camera||"",audio:s.audio||"",color:(ST[s.type]||ST.content).c});ns.push(sv);}catch{}}setScenes(p=>[...p,...ns]);pg?.done();toast?.success(`${ns.length} cenas geradas!`);setShowAI(false);setAiTopic("");}catch(e){pg?.fail(e.message);toast?.error("Erro: "+e.message);}setAiLoading(false);};

  // 🎙️ Export narration only
  const exportNarration=()=>{
    const txt=scenes.map((s,i)=>{const m=ST[s.type]||ST.content;return`[CENA ${i+1}] ${m.l} — ${s.title}\n${s.notes||"(sem narração)"}\n`;}).join("\n---\n\n");
    const ta=document.createElement("textarea");ta.value=`NARRAÇÃO: ${vid?.title}\n${scenes.length} cenas\n\n${txt}`;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Narração copiada!");
  };

  // 📤 Export PDF
  const exportPDF=()=>{
    const w=window.open("","_blank");
    if(!w)return;
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Storyboard - ${vid?.title}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0a0a0a;color:#fff;padding:40px}
    .header{text-align:center;margin-bottom:40px;border-bottom:2px solid #EF4444;padding-bottom:20px}
    .header h1{font-size:32px;letter-spacing:4px;text-transform:uppercase}
    .header p{color:#888;font-size:12px;margin-top:8px}
    .scene{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px;page-break-inside:avoid;border:1px solid #222;border-radius:12px;overflow:hidden}
    .scene-left{padding:24px}
    .scene-right{background:#111;padding:24px;display:flex;align-items:center;justify-content:center;min-height:200px}
    .scene-right img{width:100%;border-radius:8px}
    .scene-num{font-size:48px;font-weight:900;opacity:.15;line-height:1}
    .scene-type{display:inline-block;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1px;margin-bottom:8px}
    .scene-title{font-size:20px;font-weight:700;margin-bottom:12px}
    .narration{font-style:italic;color:#ccc;line-height:1.8;border-left:3px solid #EF4444;padding-left:12px;margin-bottom:12px}
    .meta{font-size:11px;color:#666;margin-top:8px}
    .meta b{color:#999}
    .timeline{display:flex;margin-bottom:30px;border-radius:8px;overflow:hidden}
    .timeline-seg{padding:8px;text-align:center;font-size:9px;font-weight:700;color:#fff}
    @media print{body{background:#fff;color:#000}.scene{border-color:#ddd}.narration{color:#333;border-color:#EF4444}.meta{color:#666}.meta b{color:#333}.scene-right{background:#f5f5f5}.header{border-color:#EF4444}}
    </style></head><body>
    <div class="header"><h1>${vid?.title||"Storyboard"}</h1><p>LaCasaStudio · ${scenes.length} cenas · ${vid?.duration||""} · Gerado em ${new Date().toLocaleDateString("pt-BR")}</p></div>
    <div class="timeline">${scenes.map((s,i)=>{const m=ST[s.type]||ST.content;return`<div class="timeline-seg" style="flex:1;background:${m.c}">${m.l}</div>`;}).join("")}</div>
    ${scenes.map((s,i)=>{const m=ST[s.type]||ST.content;return`
    <div class="scene">
      <div class="scene-left">
        <div class="scene-num">${String(i+1).padStart(2,"0")}</div>
        <div class="scene-type" style="background:${m.c}">${m.l}</div>
        <div class="scene-title">${s.title}</div>
        <div class="narration">"${(s.notes||"").replace(/"/g,"&quot;")}"</div>
        <div class="meta"><b>CÂMERA:</b> ${s.camera||"—"}</div>
        <div class="meta"><b>SFX:</b> ${s.audio||"—"}</div>
        <div class="meta"><b>DURAÇÃO:</b> ${s.duration||"—"}</div>
        <div class="meta"><b>RETENÇÃO:</b> ${m.retention}</div>
      </div>
      <div class="scene-right">${s.thumbnail?`<img src="${s.thumbnail}"/>`:`<div style="color:#444;font-size:14px">🎬 ${s.title}</div>`}</div>
    </div>`;}).join("")}
    <div style="text-align:center;padding:30px;color:#444;font-size:12px">— FIM — LaCasaStudio ©</div>
    <script>setTimeout(()=>window.print(),500)</script></body></html>`;
    w.document.write(html);w.document.close();
  };

  return(<div className="page-enter" style={{maxWidth:1100,margin:"0 auto"}}>
    <style>{CSS}</style>
    {editScene&&<EditModal scene={editScene} onClose={()=>setEditScene(null)} onSave={saveEdit}/>}
    {assetScene&&<AssetModal scene={assetScene} onClose={()=>setAssetScene(null)}/>}

    <Hdr title="Storyboard Cinematográfico" sub="Linha de montagem — produção Netflix · Assets com IA" action={<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {scenes.length>0&&<Btn vr="ghost" onClick={()=>setView(view==="animated"?"list":"animated")} style={{fontSize:11}}>{view==="animated"?"📋 Lista":"🎬 Cinema"}</Btn>}
      {scenes.length>0&&<Btn vr="ghost" onClick={generateAllAssets} disabled={!!generating} style={{fontSize:11,color:"#EC4899"}}>{generating?"⏳ Gerando...":"🎨 Gerar Todos Assets"}</Btn>}
      {scenes.length>0&&<Btn vr="ghost" onClick={exportNarration} style={{fontSize:11}}>🎙️ Narração</Btn>}
      {scenes.length>0&&<Btn vr="ghost" onClick={exportPDF} style={{fontSize:11}}>📤 PDF</Btn>}
      {scenes.length>0&&<Btn vr="ghost" onClick={clearAll} style={{fontSize:11,color:C.red}}>🗑 Limpar</Btn>}
      <Btn vr="ghost" onClick={()=>setShowAI(true)} style={{fontSize:11}}>🤖 IA</Btn><Btn onClick={()=>setShowAdd(true)}>+ Cena</Btn>
    </div>}/>

    <div style={{display:"flex",gap:12,marginBottom:24,alignItems:"center"}}>
      <Select value={selV||""} onChange={e=>setSelV(Number(e.target.value))} style={{minWidth:240}}><option value="">Selecione um vídeo</option>{videos.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</Select>
      {vid&&<span style={{fontSize:11,color:C.dim,fontFamily:"var(--mono)"}}>{scenes.length} cenas · {scenes.filter(s=>s.thumbnail).length} com assets</span>}
    </div>

    {!selV&&<div style={{textAlign:"center",padding:80,color:C.dim}}><div style={{fontSize:48,marginBottom:12,opacity:.2}}>🎬</div><div style={{fontSize:16,fontWeight:700,color:C.text}}>Selecione um vídeo</div></div>}
    {selV&&scenes.length===0&&<div style={{textAlign:"center",padding:60}}>
      <div style={{fontSize:48,marginBottom:12,opacity:.2}}>✨</div>
      <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>Storyboard vazio</div>
      <div style={{fontSize:12,color:C.dim,marginBottom:20}}>Gere automaticamente todas as cenas com narração, câmera e SFX</div>
      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
        <Btn onClick={()=>{setAiTopic(vid?.title||"");generateAI();}} disabled={aiLoading} style={{fontSize:13,padding:"12px 24px"}}>{aiLoading?"⏳ Gerando...":"🎬 Gerar Storyboard Completo com IA"}</Btn>
        <Btn vr="ghost" onClick={()=>setShowAI(true)}>🤖 Personalizar</Btn>
        <Btn vr="ghost" onClick={()=>setShowAdd(true)}>+ Manual</Btn>
      </div>
    </div>}

    {selV&&scenes.length>0&&view==="animated"&&<div>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:9,letterSpacing:4,color:C.dim,textTransform:"uppercase",marginBottom:6}}>STORYBOARD</div>
        <h2 style={{fontSize:28,fontWeight:900,textTransform:"uppercase",letterSpacing:2,color:C.text,fontFamily:"'Bebas Neue',sans-serif",margin:0}}>{vid?.title}</h2>
        <div style={{fontSize:10,color:C.dim,marginTop:8}}>{scenes.length} cenas · {scenes.filter(s=>s.thumbnail).length}/{scenes.length} assets · {vid?.duration||"10:00"}</div>
      </div>
      <div style={{background:C.border,borderRadius:3,height:2,marginBottom:6,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#EF4444,#F59E0B,#22C55E,#3B82F6,#A855F7)",width:"100%",animation:"sb-bar 1.5s ease-out"}}/></div>
      <div style={{fontSize:9,textAlign:"center",color:"#EF4444",marginBottom:16,fontWeight:700,letterSpacing:1.5}}>⚡ CLIQUE EM "GERAR ASSET" PARA CRIAR A IMAGEM DA CENA COM IA</div>
      
      {/* ⏱️ Timeline Visual */}
      <div style={{display:"flex",marginBottom:24,borderRadius:8,overflow:"hidden",border:`1px solid ${C.border}`}}>
        {scenes.map((s,i)=>{const m=ST[s.type]||ST.content;const durStr=s.duration||"";const secs=durStr.includes("m")?parseInt(durStr)*60:durStr.includes("s")?parseInt(durStr):parseInt(durStr)||10;return<div key={s.id} style={{flex:Math.max(1,secs/10),background:`${m.c}20`,borderRight:i<scenes.length-1?`1px solid ${C.border}`:"none",padding:"8px 4px",textAlign:"center",minWidth:30,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.background=`${m.c}40`} onMouseLeave={e=>e.currentTarget.style.background=`${m.c}20`} title={`${s.title} — ${s.duration||"?"}`}>
          <div style={{fontSize:7,fontWeight:800,color:m.c,letterSpacing:1}}>{m.l}</div>
          <div style={{fontSize:10,fontWeight:700,color:C.text,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.title?.slice(0,12)}</div>
          <div style={{fontSize:8,color:C.dim,marginTop:1}}>{s.duration||"~10s"}</div>
        </div>})}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,fontSize:10,color:C.dim}}>
        <span>0:00</span>
        <span>Duração total: {scenes.reduce((a,s)=>{const d=s.duration||"";const n=d.includes("m")?parseInt(d)*60:parseInt(d)||10;return a+n;},0)>60?Math.round(scenes.reduce((a,s)=>{const d=s.duration||"";return a+(d.includes("m")?parseInt(d)*60:parseInt(d)||10);},0)/60)+"min":scenes.reduce((a,s)=>{const d=s.duration||"";return a+(d.includes("m")?parseInt(d)*60:parseInt(d)||10);},0)+"s"}</span>
      </div>
      {scenes.map((s,i)=><SceneCard key={s.id} scene={s} idx={i} total={scenes.length} onEdit={setEditScene} onDel={delScene} onAsset={setAssetScene} onGenerate={generateAsset} generating={generating}/>)}
      <div style={{textAlign:"center",padding:"28px 0",color:C.dim}}><div style={{width:2,height:30,background:C.border,margin:"0 auto 8px"}}/><div style={{width:10,height:10,borderRadius:"50%",background:C.border,margin:"0 auto 8px"}}/><div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>FIM</div></div>
    </div>}

    {selV&&scenes.length>0&&view==="list"&&<div style={{display:"grid",gap:6}}>
      {scenes.map((s,i)=>{const m=ST[s.type]||ST.content;return(<div key={s.id} style={{display:"flex",gap:12,alignItems:"center",padding:"12px 16px",background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`}}>
        {s.thumbnail?<img src={s.thumbnail} style={{width:64,height:36,borderRadius:6,objectFit:"cover"}}/>:<div style={{width:64,height:36,borderRadius:6,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{m.i}</div>}
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12}}>{String(i+1).padStart(2,"0")}. {s.title}</div>{s.notes&&<div style={{fontSize:10,color:C.dim,marginTop:1}}>{s.notes.slice(0,90)}...</div>}</div>
        <span style={{fontSize:9,color:m.c,fontWeight:700,fontFamily:"var(--mono)"}}>{s.duration||"~5s"}</span>
        <button onClick={()=>generateAsset(s)} disabled={generating===s.id} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${m.c}30`,background:`${m.c}08`,color:m.c,cursor:"pointer",fontSize:9}}>{generating===s.id?"⏳":"🎨"}</button>
        <button onClick={()=>setAssetScene(s)} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>📋</button>
        <button onClick={()=>setEditScene(s)} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>✏️</button>
        <button onClick={()=>delScene(s.id)} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:"#EF4444",cursor:"pointer",fontSize:9}}>✕</button>
      </div>);})}
    </div>}

    {showAI&&<div onClick={()=>!aiLoading&&setShowAI(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(16px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{width:540,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,padding:30}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}><div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#EF4444,#F59E0B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div><div><div style={{fontWeight:800,fontSize:17}}>Gerar Storyboard</div><div style={{fontSize:11,color:C.dim}}>IA cria cenas com narração + câmera + SFX + retenção</div></div></div>
      <div style={{marginBottom:14}}><Label t="Tema"/><textarea value={aiTopic} onChange={e=>setAiTopic(e.target.value)} placeholder={vid?.title||"Descreva o vídeo..."} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",color:C.text,fontSize:13,outline:"none",minHeight:90,resize:"vertical"}}/></div>
      <div style={{marginBottom:18}}><Label t="Estilo"/><Select value={aiStyle} onChange={e=>setAiStyle(e.target.value)}>
        <option value="cinematográfico viral com alta retenção">🎬 Cinematográfico Viral</option>
        <option value="documentário Netflix com narração profunda e trilha épica">🎥 Documentário Netflix</option>
        <option value="animação 2D estilo canal dark com narração grave">🌙 Canal Dark 2D</option>
        <option value="vlog dinâmico com cortes rápidos">📱 Vlog</option>
        <option value="tutorial educativo passo-a-passo">📚 Tutorial</option>
        <option value="storytelling emocional com arco narrativo">💫 Storytelling</option>
        <option value="shorts/reels com ganchos a cada 3s">⚡ Shorts</option>
      </Select></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn vr="ghost" onClick={()=>setShowAI(false)} disabled={aiLoading}>Cancelar</Btn><Btn onClick={generateAI} disabled={aiLoading} style={{opacity:aiLoading?.6:1,minWidth:160}}>{aiLoading?"⏳ Gerando...":"🚀 Gerar"}</Btn></div>
      {aiLoading&&<div style={{marginTop:14,padding:"10px",background:"rgba(59,130,246,.08)",borderRadius:8,fontSize:11,color:C.blue}}>Criando storyboard cinematográfico... ~20s</div>}
    </div></div>}

    {showAdd&&<div onClick={()=>setShowAdd(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(12px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{width:540,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,padding:30}}>
      <div style={{fontWeight:800,fontSize:17,marginBottom:20}}>Nova Cena</div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}><div><Label t="Tipo"/><Select value={ns.type} onChange={e=>setNs(p=>({...p,type:e.target.value}))}>{Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div><div><Label t="Título"/><Input value={ns.title} onChange={e=>setNs(p=>({...p,title:e.target.value}))} placeholder="Nome da cena"/></div></div>
        <div><Label t="Narração"/><textarea value={ns.notes} onChange={e=>setNs(p=>({...p,notes:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px",color:C.text,fontSize:12,outline:"none",minHeight:50,resize:"vertical"}} placeholder="O que será falado..."/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}><div><Label t="Câmera"/><Input value={ns.camera} onChange={e=>setNs(p=>({...p,camera:e.target.value}))} placeholder="zoom..."/></div><div><Label t="SFX"/><Input value={ns.audio} onChange={e=>setNs(p=>({...p,audio:e.target.value}))} placeholder="whoosh..."/></div><div><Label t="Duração"/><Input value={ns.duration} onChange={e=>setNs(p=>({...p,duration:e.target.value}))} placeholder="~5s"/></div></div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn vr="ghost" onClick={()=>setShowAdd(false)}>Cancelar</Btn><Btn onClick={addScene}>Adicionar</Btn></div>
    </div></div>}
  </div>);
}
