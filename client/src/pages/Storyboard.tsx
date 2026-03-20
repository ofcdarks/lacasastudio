// @ts-nocheck
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useConfirm } from "../context/ConfirmContext";
import { sceneApi, aiApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const ST = {
  hook:       { l:"GANCHO",     c:"#EF4444", bg:"linear-gradient(135deg,#1a0505,#2d0a0a)", i:"🎯", glow:"#EF444440" },
  intro:      { l:"INTRO",      c:"#A855F7", bg:"linear-gradient(135deg,#0d0520,#1a0a2d)", i:"🎬", glow:"#A855F740" },
  problem:    { l:"PROBLEMA",   c:"#F59E0B", bg:"linear-gradient(135deg,#1a1005,#2d1a0a)", i:"⚡", glow:"#F59E0B40" },
  content:    { l:"CONTEÚDO",   c:"#3B82F6", bg:"linear-gradient(135deg,#050d1a,#0a1a2d)", i:"📹", glow:"#3B82F640" },
  demo:       { l:"DEMO",       c:"#06B6D4", bg:"linear-gradient(135deg,#051a1a,#0a2d2d)", i:"🖥️", glow:"#06B6D440" },
  reveal:     { l:"REVELAÇÃO",  c:"#EC4899", bg:"linear-gradient(135deg,#1a0515,#2d0a20)", i:"💎", glow:"#EC489940" },
  transition: { l:"TRANSIÇÃO",  c:"#8B5CF6", bg:"linear-gradient(135deg,#0f0520,#1a0a35)", i:"✨", glow:"#8B5CF640" },
  cta:        { l:"CALL TO ACTION",c:"#F59E0B",bg:"linear-gradient(135deg,#1a1505,#2d200a)",i:"👆",glow:"#F59E0B40" },
  outro:      { l:"ENCERRAMENTO",c:"#22C55E",bg:"linear-gradient(135deg,#051a0d,#0a2d15)", i:"🔚", glow:"#22C55E40" },
  broll:      { l:"B-ROLL",     c:"#14B8A6", bg:"linear-gradient(135deg,#051a18,#0a2d28)", i:"🎞️", glow:"#14B8A640" },
};

const CSS = `
@keyframes sb-entrance{0%{opacity:0;transform:translateY(40px) scale(.95)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes sb-glow-pulse{0%,100%{box-shadow:0 0 20px var(--glow)}50%{box-shadow:0 0 40px var(--glow),0 0 80px var(--glow)}}
@keyframes sb-icon-float{0%,100%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-8px) rotate(-3deg)}75%{transform:translateY(-4px) rotate(3deg)}}
@keyframes sb-progress{0%{width:0%}100%{width:100%}}
@keyframes sb-line-draw{0%{height:0}100%{height:100%}}
@keyframes sb-number-pop{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}
@keyframes sb-badge-in{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
.sb-card{animation:sb-entrance .6s ease-out both;transition:all .4s cubic-bezier(.4,0,.2,1)}
.sb-card:hover{transform:translateY(-4px) scale(1.01)!important}
.sb-card:hover .sb-preview{animation:sb-glow-pulse 2s ease-in-out infinite}
.sb-card:hover .sb-icon{animation:sb-icon-float 2s ease-in-out infinite}
.sb-card:hover .sb-progress-fill{animation:sb-progress .8s ease-out forwards}
.sb-card:hover .sb-hover-label{opacity:0!important}
`;

function SceneCard({ scene, idx, total, onEdit, onDel }) {
  const [hov, setHov] = useState(false);
  const m = ST[scene.type] || ST.content;
  const isL = idx % 2 === 0;

  return (
    <div className="sb-card" style={{ display:"flex", gap:0, minHeight:300, animationDelay:`${idx*0.1}s` }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>

      {/* Info side */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center",
        padding:isL?"28px 36px 28px 0":"28px 0 28px 36px", order:isL?0:2 }}>

        {/* Scene number */}
        <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:6 }}>
          <span style={{ fontSize:52, fontWeight:900, color:m.c, opacity:.25, lineHeight:1,
            fontFamily:"'Bebas Neue',sans-serif", animation:hov?`sb-number-pop .4s ease-out`:undefined }}>
            {String(idx+1).padStart(2,"0")}
          </span>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:m.c, textTransform:"uppercase",
            background:`${m.c}15`, padding:"3px 10px", borderRadius:4,
            animation:hov?`sb-badge-in .3s ease-out`:undefined }}>
            {m.l}
          </span>
        </div>

        {/* Title */}
        <h3 style={{ fontSize:18, fontWeight:800, color:C.text, margin:"0 0 10px", textTransform:"uppercase",
          letterSpacing:.5, lineHeight:1.3 }}>
          {scene.title}
        </h3>

        {/* Narration */}
        {scene.notes && (
          <div style={{ borderLeft:`3px solid ${m.c}`, paddingLeft:16, marginBottom:14,
            fontSize:13.5, color:"rgba(255,255,255,.72)", lineHeight:1.7, fontStyle:"italic" }}>
            "{scene.notes}"
          </div>
        )}

        {/* Camera direction */}
        {scene.camera && (
          <div style={{ marginBottom:6, fontSize:12 }}>
            <span style={{ color:m.c, fontWeight:800, fontFamily:"var(--mono)", fontSize:10, letterSpacing:1 }}>CÂMERA: </span>
            <span style={{ color:"rgba(255,255,255,.55)" }}>{scene.camera}</span>
          </div>
        )}

        {/* Audio / SFX */}
        {scene.audio && (
          <div style={{ marginBottom:10, fontSize:12 }}>
            <span style={{ color:m.c, fontWeight:800, fontFamily:"var(--mono)", fontSize:10, letterSpacing:1 }}>SFX: </span>
            <span style={{ color:"rgba(255,255,255,.55)" }}>{scene.audio}</span>
          </div>
        )}

        {/* Duration + actions */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:4 }}>
          <span style={{ fontSize:11, fontFamily:"var(--mono)", color:C.dim, background:"rgba(255,255,255,.04)",
            padding:"4px 10px", borderRadius:6 }}>⏱ {scene.duration||"~5s"}</span>
          <div style={{ display:"flex", gap:4, opacity:hov?1:0, transition:"opacity .3s" }}>
            <button onClick={()=>onEdit(scene)} style={{ padding:"4px 10px", borderRadius:6,
              border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:10 }}>✏️ Editar</button>
            <button onClick={()=>onDel(scene.id)} style={{ padding:"4px 10px", borderRadius:6,
              border:`1px solid ${C.border}`, background:"transparent", color:"#EF4444", cursor:"pointer", fontSize:10 }}>🗑</button>
          </div>
        </div>
      </div>

      {/* Timeline center */}
      <div style={{ width:48, display:"flex", flexDirection:"column", alignItems:"center", position:"relative", order:1 }}>
        <div style={{ width:2, flex:1, background:idx===0?"transparent":`linear-gradient(180deg,${C.border},${m.c})`,
          animation:hov?`sb-line-draw .5s ease-out`:undefined }} />
        <div style={{ width:20, height:20, borderRadius:"50%", background:m.c, border:`4px solid ${C.bgCard}`, zIndex:2,
          boxShadow:hov?`0 0 20px ${m.glow}, 0 0 40px ${m.glow}`:"none", transition:"box-shadow .4s" }} />
        <div style={{ width:2, flex:1, background:idx===total-1?"transparent":`linear-gradient(180deg,${m.c},${C.border})` }} />
      </div>

      {/* Preview card */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:20, order:isL?2:0 }}>
        <div className="sb-preview" style={{
          "--glow":m.glow, width:"100%", maxWidth:420, height:220, borderRadius:16, overflow:"hidden",
          background:m.bg, border:`1px solid ${m.c}25`,
          display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10,
          position:"relative", transition:"all .4s cubic-bezier(.4,0,.2,1)",
          transform:hov?"scale(1.03)":"scale(1)",
        }}>
          {/* Animated icon */}
          <div className="sb-icon" style={{ fontSize:64, transition:"filter .3s",
            filter:hov?"drop-shadow(0 0 20px "+m.c+")":"grayscale(40%)" }}>
            {m.i}
          </div>
          {/* Type label */}
          <div style={{ fontSize:12, fontWeight:800, color:m.c, letterSpacing:3, textTransform:"uppercase" }}>
            {m.l}
          </div>
          {/* Hover label */}
          <div className="sb-hover-label" style={{ position:"absolute", bottom:10, fontSize:10, color:C.dim,
            opacity:0.4, display:"flex", alignItems:"center", gap:4, transition:"opacity .3s" }}>
            ▶ hover p/ animar
          </div>
          {/* Progress bar */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:`${m.c}15` }}>
            <div className="sb-progress-fill" style={{ height:"100%", background:`linear-gradient(90deg,${m.c},${m.c}80)`, width:0, borderRadius:2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ scene, onClose, onSave }) {
  const [f, setF] = useState({ ...scene });
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", backdropFilter:"blur(12px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:600, background:C.bgCard, borderRadius:20, border:`1px solid ${C.border}`, padding:32 }}>
        <div style={{ fontWeight:800, fontSize:20, marginBottom:24, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:28 }}>{(ST[f.type]||ST.content).i}</span> Editar Cena
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>
            <div><Label t="Tipo" /><Select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>{Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
            <div><Label t="Título da Cena" /><Input value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))} /></div>
          </div>
          <div><Label t="Narração / Script" />
            <textarea value={f.notes||""} onChange={e=>setF(p=>({...p,notes:e.target.value}))}
              style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontSize:13, outline:"none", minHeight:100, resize:"vertical", lineHeight:1.6 }}
              placeholder="Narração completa desta cena..." /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><Label t="Direção de Câmera / Animação" />
              <textarea value={f.camera||""} onChange={e=>setF(p=>({...p,camera:e.target.value}))}
                style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontSize:12, outline:"none", minHeight:60, resize:"vertical" }}
                placeholder="Close-up, zoom, pan, transição..." /></div>
            <div><Label t="Trilha Sonora / SFX" />
              <textarea value={f.audio||""} onChange={e=>setF(p=>({...p,audio:e.target.value}))}
                style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontSize:12, outline:"none", minHeight:60, resize:"vertical" }}
                placeholder="Bass drop, whoosh, trilha tensa..." /></div>
          </div>
          <div style={{ width:150 }}><Label t="Duração" /><Input value={f.duration||""} onChange={e=>setF(p=>({...p,duration:e.target.value}))} placeholder="~5s" /></div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
          <Btn vr="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={()=>{onSave(scene.id,f);onClose();}}>Salvar Cena</Btn>
        </div>
      </div>
    </div>
  );
}

export default function Storyboard() {
  const { videos } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const [selV, setSelV] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [editScene, setEditScene] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiStyle, setAiStyle] = useState("cinematográfico viral com alta retenção");
  const [showAI, setShowAI] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [ns, setNs] = useState({ type:"content", title:"", duration:"", notes:"", camera:"", audio:"" });
  const [view, setView] = useState("animated");

  useEffect(()=>{ if(videos.length && !selV) setSelV(videos[0].id); },[videos]);
  useEffect(()=>{ if(!selV) return; sceneApi.listByVideo(selV).then(setScenes).catch(()=>setScenes([])); },[selV]);
  const vid = videos.find(v=>v.id===selV);

  const addScene = async () => {
    if(!ns.title.trim()) return;
    const tm = ST[ns.type]||ST.content;
    const scene = await sceneApi.create({...ns, videoId:selV, color:tm.c, order:scenes.length});
    setScenes(p=>[...p,scene]); setNs({type:"content",title:"",duration:"",notes:"",camera:"",audio:""}); setShowAdd(false);
    toast?.success("Cena adicionada");
  };

  const saveEdit = async (id,data) => {
    const tm = ST[data.type]||ST.content;
    await sceneApi.update(id,{...data,color:tm.c});
    setScenes(p=>p.map(s=>s.id===id?{...s,...data,color:tm.c}:s));
    toast?.success("Cena atualizada");
  };

  const delScene = async id => {
    const ok = await confirm({title:"Remover Cena",message:"Remover esta cena do storyboard?"});
    if(!ok)return; await sceneApi.del(id); setScenes(p=>p.filter(s=>s.id!==id));
  };

  const generateAI = async () => {
    if(!selV){toast?.error("Selecione um vídeo");return;}
    setAiLoading(true);
    try {
      const data = await aiApi.storyboard({
        title: aiTopic || vid?.title || "Vídeo",
        duration: vid?.duration || "10:00",
        style: aiStyle
      });
      if(data.error){toast?.error(data.error);setAiLoading(false);return;}
      const newScenes = [];
      const sceneList = Array.isArray(data.scenes) ? data.scenes : [];
      for(const s of sceneList){
        try {
          const saved = await sceneApi.create({
            videoId:selV, type:s.type||"content", title:s.title||"Cena",
            duration:s.duration||"", notes:s.notes||"", camera:s.camera||"",
            audio:s.audio||"", color:(ST[s.type]||ST.content).c, order:scenes.length+newScenes.length
          });
          newScenes.push(saved);
        } catch {}
      }
      setScenes(prev=>[...prev,...newScenes]);
      toast?.success(`${newScenes.length} cenas cinematográficas geradas!`);
      setShowAI(false); setAiTopic("");
    } catch(err) { toast?.error("Erro: "+err.message); }
    setAiLoading(false);
  };

  const clearAll = async () => {
    const ok = await confirm({title:"Limpar Storyboard",message:"Remover TODAS as cenas?"});
    if(!ok)return;
    for(const s of scenes) await sceneApi.del(s.id).catch(()=>{});
    setScenes([]);
  };

  return (
    <div className="page-enter" style={{ maxWidth:1100, margin:"0 auto" }}>
      <style>{CSS}</style>
      {editScene && <EditModal scene={editScene} onClose={()=>setEditScene(null)} onSave={saveEdit} />}

      <Hdr title="Storyboard Cinematográfico" sub="Linha de montagem para vídeos de alta produção" action={
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {scenes.length>0 && <Btn vr="ghost" onClick={()=>setView(view==="animated"?"list":"animated")} style={{fontSize:11}}>{view==="animated"?"📋 Lista":"🎬 Animado"}</Btn>}
          {scenes.length>0 && <Btn vr="ghost" onClick={clearAll} style={{fontSize:11,color:C.red}}>🗑 Limpar</Btn>}
          <Btn vr="ghost" onClick={()=>setShowAI(true)} style={{fontSize:11}}>🤖 Gerar com IA</Btn>
          <Btn onClick={()=>setShowAdd(true)}>+ Nova Cena</Btn>
        </div>
      } />

      {/* Video selector */}
      <div style={{ display:"flex", gap:12, marginBottom:28, flexWrap:"wrap", alignItems:"center" }}>
        <Select value={selV||""} onChange={e=>setSelV(Number(e.target.value))} style={{ minWidth:240 }}>
          <option value="">Selecione um vídeo</option>
          {videos.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}
        </Select>
        {vid && <span style={{ fontSize:12, color:C.dim, fontFamily:"var(--mono)" }}>{scenes.length} cenas · {vid.duration||"?"}</span>}
      </div>

      {/* Empty states */}
      {!selV && <div style={{ textAlign:"center", padding:80, color:C.dim }}>
        <div style={{ fontSize:56, marginBottom:16, opacity:.2 }}>🎬</div>
        <div style={{ fontSize:18, fontWeight:700, color:C.text }}>Selecione um vídeo</div>
        <div style={{ fontSize:13, marginTop:8 }}>Crie vídeos no Planner Kanban primeiro</div>
      </div>}

      {selV && scenes.length===0 && <div style={{ textAlign:"center", padding:80 }}>
        <div style={{ fontSize:56, marginBottom:16, opacity:.2 }}>✨</div>
        <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:8 }}>Storyboard vazio</div>
        <div style={{ fontSize:13, color:C.dim, marginBottom:24 }}>Gere um storyboard cinematográfico com IA ou adicione cenas manualmente</div>
        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <Btn onClick={()=>setShowAI(true)}>🤖 Gerar com IA</Btn>
          <Btn vr="ghost" onClick={()=>setShowAdd(true)}>+ Manual</Btn>
        </div>
      </div>}

      {/* ─── ANIMATED VIEW ─── */}
      {selV && scenes.length>0 && view==="animated" && <div>
        {/* Title banner */}
        <div style={{ textAlign:"center", marginBottom:32, padding:"24px 0" }}>
          <div style={{ fontSize:10, letterSpacing:4, color:C.dim, textTransform:"uppercase", marginBottom:8 }}>STORYBOARD INTERATIVO</div>
          <h2 style={{ fontSize:32, fontWeight:900, textTransform:"uppercase", letterSpacing:3, color:C.text,
            fontFamily:"'Bebas Neue',sans-serif", margin:0, lineHeight:1.2 }}>
            {vid?.title || "Storyboard"}
          </h2>
          <div style={{ fontSize:11, color:C.dim, marginTop:10, display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
            <span>🎬 {scenes.length} cenas</span>
            <span>⏱ {vid?.duration||"10:00"}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background:C.border, borderRadius:4, height:3, marginBottom:12, overflow:"hidden" }}>
          <div style={{ height:"100%", background:"linear-gradient(90deg,#EF4444,#F59E0B,#22C55E,#3B82F6,#A855F7,#EC4899)",
            borderRadius:4, width:"100%", animation:"sb-progress 2s ease-out" }} />
        </div>
        <div style={{ fontSize:10, textAlign:"center", color:"#EF4444", marginBottom:28, fontWeight:700, letterSpacing:2 }}>
          ⚡ PASSE O MOUSE SOBRE CADA CENA PARA PRÉVIA DA ANIMAÇÃO
        </div>

        {/* Scenes */}
        {scenes.map((s,i)=><SceneCard key={s.id} scene={s} idx={i} total={scenes.length} onEdit={setEditScene} onDel={delScene} />)}

        {/* End marker */}
        <div style={{ textAlign:"center", padding:"32px 0", color:C.dim }}>
          <div style={{ width:2, height:40, background:C.border, margin:"0 auto 12px" }} />
          <div style={{ width:12, height:12, borderRadius:"50%", background:C.border, margin:"0 auto 12px" }} />
          <div style={{ fontSize:11, letterSpacing:2, textTransform:"uppercase" }}>FIM DO STORYBOARD</div>
        </div>
      </div>}

      {/* ─── LIST VIEW ─── */}
      {selV && scenes.length>0 && view==="list" && <div style={{ display:"grid", gap:8 }}>
        {scenes.map((s,i)=>{const m=ST[s.type]||ST.content;return(
          <div key={s.id} style={{ display:"flex", gap:14, alignItems:"center", padding:"14px 18px",
            background:C.bgCard, borderRadius:12, border:`1px solid ${C.border}`, transition:"all .2s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=m.c+"50"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{ width:40, height:40, borderRadius:10, background:m.bg, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:20, border:`1px solid ${m.c}30` }}>{m.i}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{String(i+1).padStart(2,"0")}. {s.title}</div>
              {s.notes && <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>{s.notes.slice(0,100)}{s.notes.length>100?"...":""}</div>}
            </div>
            <span style={{ fontSize:10, color:m.c, fontWeight:700, fontFamily:"var(--mono)" }}>{s.duration||"~5s"}</span>
            <button onClick={()=>setEditScene(s)} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:10 }}>Editar</button>
            <button onClick={()=>delScene(s.id)} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:"#EF4444", cursor:"pointer", fontSize:10 }}>✕</button>
          </div>
        );})}
      </div>}

      {/* ─── AI MODAL ─── */}
      {showAI && <div onClick={()=>!aiLoading&&setShowAI(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", backdropFilter:"blur(16px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div onClick={e=>e.stopPropagation()} style={{ width:560, background:C.bgCard, borderRadius:20, border:`1px solid ${C.border}`, padding:32, boxShadow:"0 24px 80px rgba(0,0,0,.6)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#EF4444,#F59E0B)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🤖</div>
            <div><div style={{ fontWeight:800, fontSize:18 }}>Gerar Storyboard com IA</div>
              <div style={{ fontSize:12, color:C.dim }}>A IA criará cenas cinematográficas completas</div></div>
          </div>
          <div style={{ marginTop:20, marginBottom:16 }}>
            <Label t="Tema / Descrição do vídeo" />
            <textarea value={aiTopic} onChange={e=>setAiTopic(e.target.value)}
              placeholder={`Ex: "${vid?.title||"5 erros que todo youtuber comete"}"\n\nOu descreva em detalhes:\n"Documentário sobre civilizações antigas, estilo cinematográfico Netflix com narração grave e trilha épica"`}
              style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", color:C.text, fontSize:13, outline:"none", minHeight:120, resize:"vertical", lineHeight:1.5 }} />
          </div>
          <div style={{ marginBottom:20 }}>
            <Label t="Estilo de produção" />
            <Select value={aiStyle} onChange={e=>setAiStyle(e.target.value)}>
              <option value="cinematográfico viral com alta retenção">🎬 Cinematográfico Viral (YouTube)</option>
              <option value="documentário Netflix com narração profunda e trilha épica">🎥 Documentário Netflix</option>
              <option value="vlog dinâmico com cortes rápidos e humor">📱 Vlog Dinâmico</option>
              <option value="tutorial educativo passo-a-passo com demonstrações">📚 Tutorial Educativo</option>
              <option value="storytelling emocional com arco narrativo completo">💫 Storytelling Emocional</option>
              <option value="review/análise com comparações e dados visuais">📊 Review / Análise</option>
              <option value="shorts/reels vertical com ganchos rápidos a cada 3 segundos">⚡ Shorts / Reels</option>
            </Select>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn vr="ghost" onClick={()=>setShowAI(false)} disabled={aiLoading}>Cancelar</Btn>
            <Btn onClick={generateAI} disabled={aiLoading} style={{ opacity:aiLoading?.6:1, minWidth:180 }}>
              {aiLoading?"⏳ Gerando cenas...":"🚀 Gerar Storyboard"}
            </Btn>
          </div>
          {aiLoading && <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(59,130,246,.1)", borderRadius:10, fontSize:12, color:C.blue }}>
            A IA está criando seu storyboard cinematográfico com narração, direção de câmera e trilha sonora para cada cena. Isso pode levar 15-30 segundos...
          </div>}
        </div>
      </div>}

      {/* ─── ADD SCENE MODAL ─── */}
      {showAdd && <div onClick={()=>setShowAdd(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", backdropFilter:"blur(12px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div onClick={e=>e.stopPropagation()} style={{ width:560, background:C.bgCard, borderRadius:20, border:`1px solid ${C.border}`, padding:32 }}>
          <div style={{ fontWeight:800, fontSize:18, marginBottom:24 }}>Nova Cena</div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>
              <div><Label t="Tipo" /><Select value={ns.type} onChange={e=>setNs(p=>({...p,type:e.target.value}))}>{Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
              <div><Label t="Título" /><Input value={ns.title} onChange={e=>setNs(p=>({...p,title:e.target.value}))} placeholder="Nome da cena" /></div>
            </div>
            <div><Label t="Narração" /><textarea value={ns.notes} onChange={e=>setNs(p=>({...p,notes:e.target.value}))} style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px", color:C.text, fontSize:13, outline:"none", minHeight:60, resize:"vertical" }} placeholder="O que será falado..." /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <div><Label t="Câmera" /><Input value={ns.camera} onChange={e=>setNs(p=>({...p,camera:e.target.value}))} placeholder="close-up, zoom..." /></div>
              <div><Label t="SFX" /><Input value={ns.audio} onChange={e=>setNs(p=>({...p,audio:e.target.value}))} placeholder="whoosh, ding..." /></div>
              <div><Label t="Duração" /><Input value={ns.duration} onChange={e=>setNs(p=>({...p,duration:e.target.value}))} placeholder="~5s" /></div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
            <Btn vr="ghost" onClick={()=>setShowAdd(false)}>Cancelar</Btn>
            <Btn onClick={addScene}>Adicionar Cena</Btn>
          </div>
        </div>
      </div>}
    </div>
  );
}
