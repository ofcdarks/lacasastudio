// @ts-nocheck
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useConfirm } from "../context/ConfirmContext";
import { sceneApi, aiApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const ST = {
  hook:       { l:"GANCHO",     c:"#EF4444", bg:"linear-gradient(135deg,#1a0505,#2d0a0a)", i:"🎯", glow:"#EF444440", retention:"Pattern interrupt — quebre expectativa nos primeiros 3s" },
  intro:      { l:"INTRO",      c:"#A855F7", bg:"linear-gradient(135deg,#0d0520,#1a0a2d)", i:"🎬", glow:"#A855F740", retention:"Apresente o contexto rápido — max 15s" },
  problem:    { l:"PROBLEMA",   c:"#F59E0B", bg:"linear-gradient(135deg,#1a1005,#2d1a0a)", i:"⚡", glow:"#F59E0B40", retention:"Crie tensão — o público precisa sentir a dor" },
  content:    { l:"CONTEÚDO",   c:"#3B82F6", bg:"linear-gradient(135deg,#050d1a,#0a1a2d)", i:"📹", glow:"#3B82F640", retention:"Entregue valor — dados, fatos, demonstrações" },
  demo:       { l:"DEMO",       c:"#06B6D4", bg:"linear-gradient(135deg,#051a1a,#0a2d2d)", i:"🖥️", glow:"#06B6D440", retention:"Show don't tell — mostre visualmente" },
  reveal:     { l:"REVELAÇÃO",  c:"#EC4899", bg:"linear-gradient(135deg,#1a0515,#2d0a20)", i:"💎", glow:"#EC489940", retention:"Plot twist — surpreenda com informação inesperada" },
  transition: { l:"TRANSIÇÃO",  c:"#8B5CF6", bg:"linear-gradient(135deg,#0f0520,#1a0a35)", i:"✨", glow:"#8B5CF640", retention:"Reengaje — mini-hook a cada 30s" },
  cta:        { l:"CTA",        c:"#F59E0B", bg:"linear-gradient(135deg,#1a1505,#2d200a)", i:"👆", glow:"#F59E0B40", retention:"Urgência + escassez + prova social" },
  outro:      { l:"ENCERRAMENTO",c:"#22C55E",bg:"linear-gradient(135deg,#051a0d,#0a2d15)", i:"🔚", glow:"#22C55E40", retention:"Open loop — deixe gancho pro próximo vídeo" },
  broll:      { l:"B-ROLL",     c:"#14B8A6", bg:"linear-gradient(135deg,#051a18,#0a2d28)", i:"🎞️", glow:"#14B8A640", retention:"Visual variety — mude o estímulo visual" },
};

// 2D Character SVGs for scene types
const CHAR={
  hook:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="35" r="28" fill="#F59E0B"/><circle cx="50" cy="30" r="4" fill="#1a1a1a"/><circle cx="70" cy="30" r="4" fill="#1a1a1a"/><path d="M48 42 Q60 54 72 42" stroke="#1a1a1a" stroke-width="3" fill="none"/><rect x="42" y="63" width="36" height="45" rx="8" fill="#EF4444"/><rect x="35" y="68" width="12" height="30" rx="5" fill="#EF4444" transform="rotate(-20 41 83)"/><rect x="73" y="68" width="12" height="30" rx="5" fill="#EF4444" transform="rotate(20 79 83)"/><rect x="45" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><rect x="62" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><text x="60" y="82" text-anchor="middle" fill="white" font-size="16" font-weight="bold">!</text></svg>`,
  intro:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="35" r="28" fill="#F59E0B"/><circle cx="50" cy="30" r="4" fill="#1a1a1a"/><circle cx="70" cy="30" r="4" fill="#1a1a1a"/><path d="M50 44 L70 44" stroke="#1a1a1a" stroke-width="2"/><rect x="42" y="63" width="36" height="45" rx="8" fill="#A855F7"/><rect x="30" y="70" width="14" height="8" rx="3" fill="#A855F7" transform="rotate(-30 37 74)"/><rect x="76" y="70" width="14" height="8" rx="3" fill="#A855F7" transform="rotate(10 83 74)"/><rect x="82" y="62" width="22" height="16" rx="3" fill="#374151" stroke="#9CA3AF" stroke-width="1"/><rect x="84" y="65" width="18" height="10" rx="1" fill="#60A5FA"/><rect x="45" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><rect x="62" y="108" width="13" height="25" rx="5" fill="#3B82F6"/></svg>`,
  problem:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="35" r="28" fill="#F59E0B"/><circle cx="48" cy="28" r="4" fill="#1a1a1a"/><circle cx="68" cy="28" r="4" fill="#1a1a1a"/><path d="M48 46 Q60 38 72 46" stroke="#1a1a1a" stroke-width="3" fill="none"/><line x1="42" y1="20" x2="48" y2="25" stroke="#1a1a1a" stroke-width="2"/><line x1="78" y1="20" x2="72" y2="25" stroke="#1a1a1a" stroke-width="2"/><rect x="42" y="63" width="36" height="45" rx="8" fill="#F59E0B"/><rect x="45" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><rect x="62" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><path d="M20 50 L35 65 L25 65 L40 85" stroke="#EF4444" stroke-width="3" fill="none"/></svg>`,
  content:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="35" r="28" fill="#F59E0B"/><circle cx="50" cy="30" r="4" fill="#1a1a1a"/><circle cx="70" cy="30" r="4" fill="#1a1a1a"/><path d="M50 42 Q60 50 70 42" stroke="#1a1a1a" stroke-width="2" fill="none"/><rect x="42" y="63" width="36" height="45" rx="8" fill="#3B82F6"/><rect x="75" y="58" width="30" height="22" rx="4" fill="#1F2937" stroke="#4B5563" stroke-width="1"/><rect x="78" y="62" width="24" height="14" rx="2" fill="#10B981"/><rect x="80" y="65" width="8" height="3" rx="1" fill="white"/><rect x="80" y="70" width="12" height="3" rx="1" fill="white" opacity="0.6"/><rect x="45" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><rect x="62" y="108" width="13" height="25" rx="5" fill="#3B82F6"/></svg>`,
  demo:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="35" r="28" fill="#F59E0B"/><circle cx="50" cy="30" r="4" fill="#1a1a1a"/><circle cx="70" cy="30" r="4" fill="#1a1a1a"/><ellipse cx="60" cy="42" rx="8" ry="5" fill="#1a1a1a" opacity="0.3"/><rect x="42" y="63" width="36" height="45" rx="8" fill="#06B6D4"/><rect x="30" y="72" width="15" height="8" rx="3" fill="#06B6D4" transform="rotate(-50 37 76)"/><circle cx="28" cy="62" r="8" fill="#374151" stroke="#06B6D4" stroke-width="2"/><line x1="28" y1="58" x2="28" y2="66" stroke="#06B6D4" stroke-width="2"/><line x1="24" y1="62" x2="32" y2="62" stroke="#06B6D4" stroke-width="2"/><rect x="45" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><rect x="62" y="108" width="13" height="25" rx="5" fill="#3B82F6"/></svg>`,
  reveal:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="35" r="28" fill="#F59E0B"/><circle cx="48" cy="30" r="5" fill="#1a1a1a"/><circle cx="72" cy="30" r="5" fill="#1a1a1a"/><circle cx="48" cy="29" r="2" fill="white"/><circle cx="72" cy="29" r="2" fill="white"/><ellipse cx="60" cy="44" rx="10" ry="7" fill="#1a1a1a"/><rect x="42" y="63" width="36" height="45" rx="8" fill="#EC4899"/><polygon points="60,55 64,63 72,63 66,69 68,77 60,73 52,77 54,69 48,63 56,63" fill="#FDE047"/><rect x="45" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><rect x="62" y="108" width="13" height="25" rx="5" fill="#3B82F6"/></svg>`,
  transition:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="35" r="28" fill="#F59E0B"/><line x1="48" y1="30" x2="56" y2="30" stroke="#1a1a1a" stroke-width="2"/><line x1="64" y1="30" x2="72" y2="30" stroke="#1a1a1a" stroke-width="2"/><path d="M52 42 L68 42" stroke="#1a1a1a" stroke-width="2"/><rect x="42" y="63" width="36" height="45" rx="8" fill="#8B5CF6"/><rect x="45" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><rect x="62" y="108" width="13" height="25" rx="5" fill="#3B82F6"/></svg>`,
  cta:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="35" r="28" fill="#F59E0B"/><circle cx="50" cy="30" r="4" fill="#1a1a1a"/><circle cx="70" cy="30" r="4" fill="#1a1a1a"/><path d="M48 42 Q60 54 72 42" stroke="#1a1a1a" stroke-width="3" fill="none"/><rect x="42" y="63" width="36" height="45" rx="8" fill="#F59E0B"/><rect x="73" y="58" width="25" height="14" rx="4" fill="#EF4444"/><text x="85" y="69" text-anchor="middle" fill="white" font-size="8" font-weight="bold">CTA</text><rect x="30" y="72" width="14" height="8" rx="3" fill="#F59E0B" transform="rotate(-20 37 76)"/><rect x="45" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><rect x="62" y="108" width="13" height="25" rx="5" fill="#3B82F6"/></svg>`,
  outro:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="35" r="28" fill="#F59E0B"/><circle cx="50" cy="30" r="4" fill="#1a1a1a"/><circle cx="70" cy="30" r="4" fill="#1a1a1a"/><path d="M50 42 Q60 50 70 42" stroke="#1a1a1a" stroke-width="2" fill="none"/><rect x="42" y="63" width="36" height="45" rx="8" fill="#22C55E"/><rect x="30" y="72" width="14" height="8" rx="3" fill="#22C55E" transform="rotate(10 37 76)"/><rect x="76" y="72" width="14" height="8" rx="3" fill="#22C55E" transform="rotate(-10 83 76)"/><rect x="45" y="108" width="13" height="25" rx="5" fill="#3B82F6"/><rect x="62" y="108" width="13" height="25" rx="5" fill="#3B82F6"/></svg>`,
  broll:`<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="20" width="70" height="50" rx="6" fill="#1F2937" stroke="#14B8A6" stroke-width="2"/><circle cx="60" cy="45" r="12" fill="#14B8A640" stroke="#14B8A6" stroke-width="2"/><polygon points="56,39 56,51 68,45" fill="#14B8A6"/><rect x="30" y="80" width="60" height="8" rx="3" fill="#374151"/><rect x="30" y="80" width="35" height="8" rx="3" fill="#14B8A6"/><rect x="30" y="95" width="60" height="4" rx="2" fill="#374151"/><rect x="30" y="105" width="45" height="4" rx="2" fill="#374151"/><rect x="30" y="115" width="55" height="4" rx="2" fill="#374151"/></svg>`,
};

const CSS = `
@keyframes sb-entrance{0%{opacity:0;transform:translateY(40px) scale(.95)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes sb-glow{0%,100%{box-shadow:0 0 20px var(--glow)}50%{box-shadow:0 0 50px var(--glow),0 0 100px var(--glow)}}
@keyframes sb-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes sb-char-bounce{0%,100%{transform:translateY(0) scale(1)}30%{transform:translateY(-12px) scale(1.05)}60%{transform:translateY(-4px) scale(1.02)}}
@keyframes sb-progress{0%{width:0}100%{width:100%}}
@keyframes sb-retention-pulse{0%,100%{opacity:.6}50%{opacity:1}}
.sb-card{animation:sb-entrance .6s ease-out both;transition:all .4s cubic-bezier(.4,0,.2,1)}
.sb-card:hover{transform:translateY(-4px) scale(1.005)!important}
.sb-card:hover .sb-preview{animation:sb-glow 2s ease-in-out infinite}
.sb-card:hover .sb-char{animation:sb-char-bounce .8s ease-out}
.sb-card:hover .sb-progress-bar{animation:sb-progress .8s ease-out forwards}
.sb-card:hover .sb-retention{animation:sb-retention-pulse 1.5s ease-in-out infinite}
`;

function SceneCard({ scene, idx, total, onEdit, onDel, onGenPrompt }) {
  const [hov, setHov] = useState(false);
  const m = ST[scene.type] || ST.content;
  const isL = idx % 2 === 0;
  const charSvg = CHAR[scene.type] || CHAR.content;

  return (
    <div className="sb-card" style={{ display:"flex", gap:0, minHeight:320, animationDelay:`${idx*.12}s` }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>

      {/* Info side */}
      <div style={{ flex:1.2, display:"flex", flexDirection:"column", justifyContent:"center",
        padding:isL?"28px 32px 28px 0":"28px 0 28px 32px", order:isL?0:2 }}>

        <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:8 }}>
          <span style={{ fontSize:52, fontWeight:900, color:m.c, opacity:.2, lineHeight:1, fontFamily:"'Bebas Neue',sans-serif" }}>
            {String(idx+1).padStart(2,"0")}
          </span>
          <span style={{ fontSize:9, fontWeight:800, letterSpacing:2, color:m.c, background:`${m.c}15`, padding:"3px 10px", borderRadius:4 }}>
            {m.l}
          </span>
        </div>

        <h3 style={{ fontSize:17, fontWeight:800, color:C.text, margin:"0 0 10px", textTransform:"uppercase", letterSpacing:.5, lineHeight:1.3 }}>
          {scene.title}
        </h3>

        {scene.notes && <div style={{ borderLeft:`3px solid ${m.c}`, paddingLeft:14, marginBottom:12,
          fontSize:13, color:"rgba(255,255,255,.7)", lineHeight:1.7, fontStyle:"italic" }}>"{scene.notes}"</div>}

        {scene.camera && <div style={{ marginBottom:5, fontSize:11.5 }}>
          <span style={{ color:m.c, fontWeight:800, fontFamily:"var(--mono)", fontSize:10, letterSpacing:1 }}>CÂMERA: </span>
          <span style={{ color:"rgba(255,255,255,.5)" }}>{scene.camera}</span>
        </div>}

        {scene.audio && <div style={{ marginBottom:8, fontSize:11.5 }}>
          <span style={{ color:m.c, fontWeight:800, fontFamily:"var(--mono)", fontSize:10, letterSpacing:1 }}>SFX: </span>
          <span style={{ color:"rgba(255,255,255,.5)" }}>{scene.audio}</span>
        </div>}

        {/* Retention note */}
        <div className="sb-retention" style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10,
          padding:"6px 10px", background:`${m.c}08`, borderRadius:6, border:`1px solid ${m.c}15` }}>
          <span style={{ fontSize:12 }}>📊</span>
          <span style={{ fontSize:10, color:m.c, fontWeight:600 }}>RETENÇÃO: </span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,.5)" }}>{scene.retention || m.retention}</span>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginTop:4 }}>
          <span style={{ fontSize:10, fontFamily:"var(--mono)", color:C.dim, background:"rgba(255,255,255,.04)", padding:"4px 8px", borderRadius:5 }}>⏱ {scene.duration||"~5s"}</span>
          <div style={{ display:"flex", gap:3, opacity:hov?1:0, transition:"opacity .3s" }}>
            <button onClick={()=>onEdit(scene)} style={{ padding:"3px 8px", borderRadius:5, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:9 }}>✏️ Editar</button>
            <button onClick={()=>onGenPrompt(scene)} style={{ padding:"3px 8px", borderRadius:5, border:`1px solid ${m.c}40`, background:`${m.c}10`, color:m.c, cursor:"pointer", fontSize:9, fontWeight:600 }}>🎨 Gerar Assets</button>
            <button onClick={()=>onDel(scene.id)} style={{ padding:"3px 8px", borderRadius:5, border:`1px solid ${C.border}`, background:"transparent", color:"#EF4444", cursor:"pointer", fontSize:9 }}>🗑</button>
          </div>
        </div>
      </div>

      {/* Timeline center */}
      <div style={{ width:44, display:"flex", flexDirection:"column", alignItems:"center", position:"relative", order:1 }}>
        <div style={{ width:2, flex:1, background:idx===0?"transparent":`linear-gradient(180deg,${C.border},${m.c})` }} />
        <div style={{ width:18, height:18, borderRadius:"50%", background:m.c, border:`3px solid ${C.bgCard}`, zIndex:2,
          boxShadow:hov?`0 0 16px ${m.glow}`:"none", transition:"box-shadow .4s" }} />
        <div style={{ width:2, flex:1, background:idx===total-1?"transparent":`linear-gradient(180deg,${m.c},${C.border})` }} />
      </div>

      {/* Preview with 2D character */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:16, order:isL?2:0 }}>
        <div className="sb-preview" style={{
          "--glow":m.glow, width:"100%", maxWidth:360, height:240, borderRadius:16, overflow:"hidden",
          background:m.bg, border:`1px solid ${m.c}20`,
          display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column",
          position:"relative", transition:"all .4s",
        }}>
          {/* 2D Character */}
          <div className="sb-char" style={{ width:90, height:105, marginBottom:4 }}
            dangerouslySetInnerHTML={{ __html: charSvg }} />

          {/* Scene label */}
          <div style={{ fontSize:11, fontWeight:800, color:m.c, letterSpacing:3, textTransform:"uppercase", marginBottom:2 }}>
            {m.l}
          </div>

          {/* Mini scene description */}
          <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", maxWidth:"80%", textAlign:"center", lineHeight:1.4 }}>
            {(scene.notes||"").slice(0,60)}{(scene.notes||"").length>60?"...":""}
          </div>

          {/* Duration badge */}
          <div style={{ position:"absolute", top:10, right:10, fontSize:9, fontFamily:"var(--mono)", color:m.c,
            background:`${m.c}15`, padding:"2px 8px", borderRadius:10 }}>{scene.duration||"~5s"}</div>

          {/* Scene number */}
          <div style={{ position:"absolute", top:8, left:12, fontSize:18, fontWeight:900, color:m.c, opacity:.15, fontFamily:"'Bebas Neue',sans-serif" }}>
            {String(idx+1).padStart(2,"0")}
          </div>

          {/* Progress bar */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:`${m.c}10` }}>
            <div className="sb-progress-bar" style={{ height:"100%", background:m.c, width:0, borderRadius:2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ scene, onClose, onSave }) {
  const [f, setF] = useState({ ...scene });
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", backdropFilter:"blur(12px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:620, background:C.bgCard, borderRadius:20, border:`1px solid ${C.border}`, padding:32, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontWeight:800, fontSize:20, marginBottom:24, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:28 }}>{(ST[f.type]||ST.content).i}</span> Editar Cena
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>
            <div><Label t="Tipo" /><Select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>{Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
            <div><Label t="Título" /><Input value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))} /></div>
          </div>
          <div><Label t="Narração / Script" /><textarea value={f.notes||""} onChange={e=>setF(p=>({...p,notes:e.target.value}))} style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px", color:C.text, fontSize:13, outline:"none", minHeight:100, resize:"vertical", lineHeight:1.6 }} placeholder="Narração completa..." /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><Label t="Câmera / Animação" /><textarea value={f.camera||""} onChange={e=>setF(p=>({...p,camera:e.target.value}))} style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px", color:C.text, fontSize:12, outline:"none", minHeight:60, resize:"vertical" }} /></div>
            <div><Label t="Trilha / SFX" /><textarea value={f.audio||""} onChange={e=>setF(p=>({...p,audio:e.target.value}))} style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px", color:C.text, fontSize:12, outline:"none", minHeight:60, resize:"vertical" }} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>
            <div><Label t="Duração" /><Input value={f.duration||""} onChange={e=>setF(p=>({...p,duration:e.target.value}))} placeholder="~5s" /></div>
            <div><Label t="Nota de Retenção" /><Input value={f.retention||""} onChange={e=>setF(p=>({...p,retention:e.target.value}))} placeholder="Técnica de retenção..." /></div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
          <Btn vr="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={()=>{onSave(scene.id,f);onClose();}}>Salvar</Btn>
        </div>
      </div>
    </div>
  );
}

function AssetPromptModal({ scene, onClose }) {
  const m = ST[scene.type]||ST.content;
  const prompts = [
    { label:"Personagem 2D (Midjourney/DALL-E)", prompt:`2D animated character, ${scene.title}, cartoon style, vibrant colors, Netflix animation quality, ${m.l.toLowerCase()} mood, digital art, clean lines, expressive face, dynamic pose, studio lighting --ar 1:1 --v 6` },
    { label:"Background / Cenário", prompt:`cinematic background for "${scene.title}", ${scene.notes?.slice(0,50)||"dramatic scene"}, 2D animation style, atmospheric lighting, moody color palette with ${m.c} tones, wide shot, Netflix production quality, digital painting --ar 16:9 --v 6` },
    { label:"Thumbnail / Key Frame", prompt:`YouTube thumbnail key frame, "${scene.title}", dramatic lighting, bold composition, ${m.l.toLowerCase()} energy, cinematic color grading, 2D illustration mixed with 3D depth, ultra detailed --ar 16:9 --v 6` },
    { label:"Props / Elementos", prompt:`2D animated props and elements for "${scene.title}", clean vector style, ${m.c} accent color, Netflix animation quality, isolated on transparent background, sticker sheet style --ar 1:1 --v 6` },
    { label:"Expressão do Personagem", prompt:`2D character facial expression sheet, ${m.l.toLowerCase()} emotion, ${scene.notes?.slice(0,30)||"intense"} feeling, cartoon style, multiple angles, animation reference, clean lineart --ar 1:1 --v 6` },
  ];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", backdropFilter:"blur(12px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:700, background:C.bgCard, borderRadius:20, border:`1px solid ${C.border}`, padding:32, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <span style={{ fontSize:28 }}>🎨</span>
          <div><div style={{ fontWeight:800, fontSize:18 }}>Prompts de Assets — Cena {scene.title}</div>
            <div style={{ fontSize:12, color:C.dim }}>Copie e use no Midjourney, DALL-E, Leonardo AI, etc</div></div>
        </div>
        <div style={{ display:"grid", gap:12, marginTop:20 }}>
          {prompts.map((p,i)=>(
            <div key={i} style={{ background:"rgba(255,255,255,.03)", borderRadius:12, border:`1px solid ${C.border}`, padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:m.c, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                {p.label}
                <button onClick={()=>{navigator.clipboard.writeText(p.prompt);}} style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${m.c}40`, background:`${m.c}10`, color:m.c, cursor:"pointer", fontSize:10, fontWeight:600 }}>📋 Copiar</button>
              </div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,.55)", lineHeight:1.6, fontFamily:"var(--mono)", background:"rgba(0,0,0,.3)", padding:"10px 12px", borderRadius:8 }}>
                {p.prompt}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:20 }}>
          <Btn vr="ghost" onClick={onClose}>Fechar</Btn>
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
  const [assetScene, setAssetScene] = useState(null);
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

  const addScene = async()=>{if(!ns.title.trim())return;const tm=ST[ns.type]||ST.content;const scene=await sceneApi.create({...ns,videoId:selV,color:tm.c,order:scenes.length});setScenes(p=>[...p,scene]);setNs({type:"content",title:"",duration:"",notes:"",camera:"",audio:""});setShowAdd(false);toast?.success("Cena adicionada");};
  const saveEdit = async(id,data)=>{const tm=ST[data.type]||ST.content;await sceneApi.update(id,{...data,color:tm.c});setScenes(p=>p.map(s=>s.id===id?{...s,...data,color:tm.c}:s));toast?.success("Salvo");};
  const delScene = async id=>{const ok=await confirm({title:"Remover Cena",message:"Remover esta cena?"});if(!ok)return;await sceneApi.del(id);setScenes(p=>p.filter(s=>s.id!==id));};
  const clearAll = async()=>{const ok=await confirm({title:"Limpar Tudo",message:"Remover TODAS as cenas?"});if(!ok)return;for(const s of scenes)await sceneApi.del(s.id).catch(()=>{});setScenes([]);};

  const generateAI = async()=>{
    if(!selV){toast?.error("Selecione um vídeo");return;}
    setAiLoading(true);
    try{const data=await aiApi.storyboard({title:aiTopic||vid?.title||"Vídeo",duration:vid?.duration||"10:00",style:aiStyle});
      if(data.error){toast?.error(data.error);setAiLoading(false);return;}
      const sceneList=Array.isArray(data.scenes)?data.scenes:[];const newScenes=[];
      for(const s of sceneList){try{const saved=await sceneApi.create({videoId:selV,type:s.type||"content",title:s.title||"Cena",duration:s.duration||"",notes:s.notes||"",camera:s.camera||"",audio:s.audio||"",color:(ST[s.type]||ST.content).c,order:scenes.length+newScenes.length});newScenes.push(saved);}catch{}}
      setScenes(prev=>[...prev,...newScenes]);toast?.success(`${newScenes.length} cenas geradas!`);setShowAI(false);setAiTopic("");
    }catch(err){toast?.error("Erro: "+err.message);}setAiLoading(false);
  };

  return(
    <div className="page-enter" style={{maxWidth:1100,margin:"0 auto"}}>
      <style>{CSS}</style>
      {editScene && <EditModal scene={editScene} onClose={()=>setEditScene(null)} onSave={saveEdit}/>}
      {assetScene && <AssetPromptModal scene={assetScene} onClose={()=>setAssetScene(null)}/>}

      <Hdr title="Storyboard Cinematográfico" sub="Linha de montagem para produção Netflix" action={
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {scenes.length>0&&<Btn vr="ghost" onClick={()=>setView(view==="animated"?"list":"animated")} style={{fontSize:11}}>{view==="animated"?"📋 Lista":"🎬 Animado"}</Btn>}
          {scenes.length>0&&<Btn vr="ghost" onClick={clearAll} style={{fontSize:11,color:C.red}}>🗑 Limpar</Btn>}
          <Btn vr="ghost" onClick={()=>setShowAI(true)} style={{fontSize:11}}>🤖 Gerar com IA</Btn>
          <Btn onClick={()=>setShowAdd(true)}>+ Nova Cena</Btn>
        </div>
      }/>

      <div style={{display:"flex",gap:12,marginBottom:28,flexWrap:"wrap",alignItems:"center"}}>
        <Select value={selV||""} onChange={e=>setSelV(Number(e.target.value))} style={{minWidth:240}}>
          <option value="">Selecione um vídeo</option>
          {videos.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}
        </Select>
        {vid&&<span style={{fontSize:12,color:C.dim,fontFamily:"var(--mono)"}}>{scenes.length} cenas · {vid.duration||"?"}</span>}
      </div>

      {!selV&&<div style={{textAlign:"center",padding:80,color:C.dim}}><div style={{fontSize:56,marginBottom:16,opacity:.2}}>🎬</div><div style={{fontSize:18,fontWeight:700,color:C.text}}>Selecione um vídeo</div></div>}
      {selV&&scenes.length===0&&<div style={{textAlign:"center",padding:80}}><div style={{fontSize:56,marginBottom:16,opacity:.2}}>✨</div><div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>Storyboard vazio</div><div style={{display:"flex",gap:12,justifyContent:"center",marginTop:20}}><Btn onClick={()=>setShowAI(true)}>🤖 Gerar com IA</Btn><Btn vr="ghost" onClick={()=>setShowAdd(true)}>+ Manual</Btn></div></div>}

      {selV&&scenes.length>0&&view==="animated"&&<div>
        <div style={{textAlign:"center",marginBottom:32,padding:"20px 0"}}>
          <div style={{fontSize:10,letterSpacing:4,color:C.dim,textTransform:"uppercase",marginBottom:8}}>STORYBOARD INTERATIVO</div>
          <h2 style={{fontSize:32,fontWeight:900,textTransform:"uppercase",letterSpacing:3,color:C.text,fontFamily:"'Bebas Neue',sans-serif",margin:0}}>{vid?.title||"Storyboard"}</h2>
          <div style={{fontSize:11,color:C.dim,marginTop:10,display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
            <span>🎬 {scenes.length} cenas</span><span>⏱ {vid?.duration||"10:00"}</span><span>🎯 Alta Retenção</span>
          </div>
        </div>
        <div style={{background:C.border,borderRadius:4,height:3,marginBottom:8,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#EF4444,#F59E0B,#22C55E,#3B82F6,#A855F7,#EC4899)",borderRadius:4,width:"100%",animation:"sb-progress 2s ease-out"}}/></div>
        <div style={{fontSize:10,textAlign:"center",color:"#EF4444",marginBottom:28,fontWeight:700,letterSpacing:2}}>⚡ PASSE O MOUSE SOBRE CADA CENA PARA PRÉVIA DA ANIMAÇÃO</div>
        {scenes.map((s,i)=><SceneCard key={s.id} scene={s} idx={i} total={scenes.length} onEdit={setEditScene} onDel={delScene} onGenPrompt={setAssetScene}/>)}
        <div style={{textAlign:"center",padding:"32px 0",color:C.dim}}><div style={{width:2,height:40,background:C.border,margin:"0 auto 12px"}}/><div style={{width:12,height:12,borderRadius:"50%",background:C.border,margin:"0 auto 12px"}}/><div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>FIM DO STORYBOARD</div></div>
      </div>}

      {selV&&scenes.length>0&&view==="list"&&<div style={{display:"grid",gap:8}}>{scenes.map((s,i)=>{const m=ST[s.type]||ST.content;return(<div key={s.id} style={{display:"flex",gap:14,alignItems:"center",padding:"14px 18px",background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`}}><div style={{width:40,height:40,borderRadius:10,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{m.i}</div><div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{String(i+1).padStart(2,"0")}. {s.title}</div>{s.notes&&<div style={{fontSize:11,color:C.dim,marginTop:2}}>{s.notes.slice(0,100)}...</div>}</div><span style={{fontSize:10,color:m.c,fontWeight:700,fontFamily:"var(--mono)"}}>{s.duration||"~5s"}</span><button onClick={()=>setAssetScene(s)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${m.c}40`,background:`${m.c}10`,color:m.c,cursor:"pointer",fontSize:9}}>🎨</button><button onClick={()=>setEditScene(s)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:10}}>Editar</button><button onClick={()=>delScene(s.id)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:"#EF4444",cursor:"pointer",fontSize:10}}>✕</button></div>);})}</div>}

      {showAI&&<div onClick={()=>!aiLoading&&setShowAI(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(16px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{width:560,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,padding:32}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#EF4444,#F59E0B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🤖</div><div><div style={{fontWeight:800,fontSize:18}}>Gerar Storyboard com IA</div><div style={{fontSize:12,color:C.dim}}>Cenas cinematográficas com narração + câmera + SFX + retenção</div></div></div>
        <div style={{marginTop:20,marginBottom:16}}><Label t="Tema / Descrição"/><textarea value={aiTopic} onChange={e=>setAiTopic(e.target.value)} placeholder={`Ex: "${vid?.title||"Documentário sobre civilizações antigas"}"`} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",color:C.text,fontSize:13,outline:"none",minHeight:100,resize:"vertical"}}/></div>
        <div style={{marginBottom:20}}><Label t="Estilo de produção"/><Select value={aiStyle} onChange={e=>setAiStyle(e.target.value)}>
          <option value="cinematográfico viral com alta retenção">🎬 Cinematográfico Viral</option>
          <option value="documentário Netflix com narração profunda e trilha épica">🎥 Documentário Netflix</option>
          <option value="animação 2D estilo canal dark com narração grave">🌙 Canal Dark 2D</option>
          <option value="vlog dinâmico com cortes rápidos">📱 Vlog Dinâmico</option>
          <option value="tutorial educativo passo-a-passo">📚 Tutorial</option>
          <option value="storytelling emocional com arco narrativo">💫 Storytelling</option>
          <option value="shorts/reels com ganchos a cada 3s">⚡ Shorts/Reels</option>
        </Select></div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn vr="ghost" onClick={()=>setShowAI(false)} disabled={aiLoading}>Cancelar</Btn><Btn onClick={generateAI} disabled={aiLoading} style={{opacity:aiLoading?.6:1,minWidth:180}}>{aiLoading?"⏳ Gerando cenas...":"🚀 Gerar Storyboard"}</Btn></div>
        {aiLoading&&<div style={{marginTop:16,padding:"12px",background:"rgba(59,130,246,.1)",borderRadius:10,fontSize:12,color:C.blue}}>Criando storyboard cinematográfico com narração, câmera, trilha e notas de retenção... 15-30s</div>}
      </div></div>}

      {showAdd&&<div onClick={()=>setShowAdd(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(12px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{width:560,background:C.bgCard,borderRadius:20,border:`1px solid ${C.border}`,padding:32}}>
        <div style={{fontWeight:800,fontSize:18,marginBottom:24}}>Nova Cena</div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12}}><div><Label t="Tipo"/><Select value={ns.type} onChange={e=>setNs(p=>({...p,type:e.target.value}))}>{Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div><div><Label t="Título"/><Input value={ns.title} onChange={e=>setNs(p=>({...p,title:e.target.value}))} placeholder="Nome da cena"/></div></div>
          <div><Label t="Narração"/><textarea value={ns.notes} onChange={e=>setNs(p=>({...p,notes:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",color:C.text,fontSize:13,outline:"none",minHeight:60,resize:"vertical"}} placeholder="Narração..."/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}><div><Label t="Câmera"/><Input value={ns.camera} onChange={e=>setNs(p=>({...p,camera:e.target.value}))} placeholder="zoom, pan..."/></div><div><Label t="SFX"/><Input value={ns.audio} onChange={e=>setNs(p=>({...p,audio:e.target.value}))} placeholder="whoosh..."/></div><div><Label t="Duração"/><Input value={ns.duration} onChange={e=>setNs(p=>({...p,duration:e.target.value}))} placeholder="~5s"/></div></div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24}}><Btn vr="ghost" onClick={()=>setShowAdd(false)}>Cancelar</Btn><Btn onClick={addScene}>Adicionar</Btn></div>
      </div></div>}
    </div>
  );
}
