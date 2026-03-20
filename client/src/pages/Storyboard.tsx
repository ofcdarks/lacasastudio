// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useConfirm } from "../context/ConfirmContext";
import { sceneApi, aiApi, videoApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input, Select, Card, SecTitle } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const SCENE_TYPES = {
  hook: { l: "Gancho", c: "#EF4444", bg: "#EF444415", i: "🎯", anim: "shake" },
  intro: { l: "Intro", c: "#A855F7", bg: "#A855F715", i: "🎬", anim: "fade-in" },
  problem: { l: "Problema", c: "#F59E0B", bg: "#F59E0B15", i: "⚡", anim: "pulse" },
  content: { l: "Conteúdo", c: "#3B82F6", bg: "#3B82F615", i: "📹", anim: "slide-up" },
  demo: { l: "Demo", c: "#06B6D4", bg: "#06B6D415", i: "🖥️", anim: "zoom" },
  reveal: { l: "Revelação", c: "#EC4899", bg: "#EC489915", i: "💎", anim: "glow" },
  transition: { l: "Transição", c: "#8B5CF6", bg: "#8B5CF615", i: "✨", anim: "spin" },
  cta: { l: "CTA", c: "#F59E0B", bg: "#F59E0B15", i: "👆", anim: "bounce" },
  outro: { l: "Outro", c: "#22C55E", bg: "#22C55E15", i: "🔚", anim: "fade-out" },
  broll: { l: "B-Roll", c: "#14B8A6", bg: "#14B8A615", i: "🎞️", anim: "pan" },
};

const ANIM_CSS = `
@keyframes sb-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px) rotate(-2deg)} 75%{transform:translateX(8px) rotate(2deg)} }
@keyframes sb-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.05);opacity:.85} }
@keyframes sb-slide-up { 0%{transform:translateY(20px);opacity:0} 100%{transform:translateY(0);opacity:1} }
@keyframes sb-zoom { 0%{transform:scale(.9);opacity:0} 100%{transform:scale(1);opacity:1} }
@keyframes sb-bounce { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-12px)} 60%{transform:translateY(-6px)} }
@keyframes sb-glow { 0%,100%{box-shadow:0 0 5px rgba(236,72,153,0.3)} 50%{box-shadow:0 0 30px rgba(236,72,153,0.6)} }
@keyframes sb-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes sb-fade-in { 0%{opacity:0;transform:scale(.95)} 100%{opacity:1;transform:scale(1)} }
@keyframes sb-fade-out { 0%{opacity:1} 100%{opacity:.3} }
@keyframes sb-pan { 0%{transform:translateX(-10px)} 100%{transform:translateX(10px)} }
@keyframes sb-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes sb-progress { 0%{width:0} 100%{width:100%} }
.sb-scene:hover .sb-anim-icon { animation-play-state: running !important; }
.sb-scene .sb-anim-icon { animation-play-state: paused; }
`;

function SceneCard({ scene, index, total, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const meta = SCENE_TYPES[scene.type] || SCENE_TYPES.content;
  const isLeft = index % 2 === 0;
  const progress = ((index + 1) / total) * 100;

  return (
    <div style={{ display: "flex", gap: 0, alignItems: "stretch", minHeight: 280 }}
      className="sb-scene" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      
      {/* Left side */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: isLeft ? "24px 32px 24px 0" : "24px 0 24px 32px", order: isLeft ? 0 : 2 }}>
        {/* Number */}
        <div style={{ fontSize: 48, fontWeight: 800, color: meta.c, opacity: 0.3, fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}>
          {String(index + 1).padStart(2, "0")}
        </div>
        {/* Title */}
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {scene.title}
        </div>
        {/* Narration */}
        {scene.notes && (
          <div style={{ borderLeft: `3px solid ${meta.c}`, paddingLeft: 14, marginBottom: 12, fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.6, fontStyle: "italic" }}>
            "{scene.notes}"
          </div>
        )}
        {/* Camera / Animation */}
        {scene.camera && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
            <span style={{ color: meta.c, fontWeight: 700, fontFamily: "var(--mono)", fontSize: 11 }}>ANIM:</span>{" "}
            {scene.camera}
          </div>
        )}
        {/* Audio / SFX */}
        {scene.audio && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            <span style={{ color: meta.c, fontWeight: 700, fontFamily: "var(--mono)", fontSize: 11 }}>SFX:</span>{" "}
            {scene.audio}
          </div>
        )}
        {/* Duration */}
        <div style={{ fontSize: 11, color: C.dim, fontFamily: "var(--mono)" }}>
          ⏱ {scene.duration || "~5s"}
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 6, marginTop: 10, opacity: hov ? 1 : 0, transition: "opacity .2s" }}>
          <button onClick={() => onEdit(scene)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 11 }}>Editar</button>
          <button onClick={() => onDelete(scene.id)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.red, cursor: "pointer", fontSize: 11 }}>Remover</button>
        </div>
      </div>

      {/* Center timeline line */}
      <div style={{ width: 40, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", order: 1 }}>
        <div style={{ width: 2, flex: 1, background: index === 0 ? "transparent" : `linear-gradient(to bottom, ${C.border}, ${meta.c})` }} />
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: meta.c, border: `3px solid ${C.bgCard}`, zIndex: 2, boxShadow: hov ? `0 0 12px ${meta.c}60` : "none", transition: "box-shadow .3s" }} />
        <div style={{ width: 2, flex: 1, background: index === total - 1 ? "transparent" : `linear-gradient(to bottom, ${meta.c}, ${C.border})` }} />
      </div>

      {/* Right side — animated preview */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, order: isLeft ? 2 : 0 }}>
        <div style={{
          width: "100%", maxWidth: 380, height: 200, borderRadius: 14, overflow: "hidden",
          background: meta.bg, border: `1px solid ${meta.c}30`,
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8,
          position: "relative",
          animation: hov ? `sb-${meta.anim} 0.6s ease-in-out infinite` : "none",
          transition: "transform .3s, box-shadow .3s",
          transform: hov ? "scale(1.02)" : "scale(1)",
          boxShadow: hov ? `0 8px 32px ${meta.c}30` : "none",
        }}>
          {/* Big icon */}
          <div className="sb-anim-icon" style={{
            fontSize: 56, filter: hov ? "none" : "grayscale(50%)", transition: "filter .3s",
            animation: hov ? `sb-float 2s ease-in-out infinite` : "none",
          }}>
            {meta.i}
          </div>
          {/* Type label */}
          <div style={{ fontSize: 13, fontWeight: 700, color: meta.c, textTransform: "uppercase", letterSpacing: 1 }}>{meta.l}</div>
          {/* Hover instruction */}
          <div style={{
            position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
            fontSize: 10, color: C.dim, opacity: hov ? 0 : 0.5, transition: "opacity .3s",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            ▶ hover p/ animar
          </div>
          {/* Progress bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `${meta.c}20` }}>
            <div style={{ height: "100%", background: meta.c, width: hov ? "100%" : "0%", transition: "width 0.8s ease-out" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ scene, onClose, onSave }) {
  const [f, setF] = useState({ ...scene });
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, background: C.bgCard, borderRadius: 18, border: `1px solid ${C.border}`, padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Editar Cena</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <div><Label t="Tipo" /><Select value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}>{Object.entries(SCENE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
            <div><Label t="Título" /><Input value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} /></div>
          </div>
          <div><Label t="Narração / Script" /><textarea value={f.notes || ""} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px", color: C.text, fontSize: 13, outline: "none", minHeight: 80, resize: "vertical" }} placeholder="O que será falado nesta cena..." /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><Label t="Animação" /><Input value={f.camera || ""} onChange={e => setF(p => ({ ...p, camera: e.target.value }))} placeholder="pop-in, zoom..." /></div>
            <div><Label t="SFX / Áudio" /><Input value={f.audio || ""} onChange={e => setF(p => ({ ...p, audio: e.target.value }))} placeholder="whoosh, beat..." /></div>
            <div><Label t="Duração" /><Input value={f.duration || ""} onChange={e => setF(p => ({ ...p, duration: e.target.value }))} placeholder="~5s" /></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn vr="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => { onSave(scene.id, f); onClose(); }}>Salvar</Btn>
        </div>
      </div>
    </div>
  );
}

export default function Storyboard() {
  const { channels, videos } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const [selV, setSelV] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [editScene, setEditScene] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [ns, setNs] = useState({ type: "content", title: "", duration: "", notes: "", camera: "", audio: "" });
  const [viewMode, setViewMode] = useState("animated"); // animated | list

  // Auto-select first video
  useEffect(() => { if (videos.length && !selV) setSelV(videos[0].id); }, [videos]);
  useEffect(() => { if (!selV) return; sceneApi.listByVideo(selV).then(setScenes).catch(() => setScenes([])); }, [selV]);

  const vid = videos.find(v => v.id === selV);

  const addScene = async () => {
    if (!ns.title.trim()) return;
    const tm = SCENE_TYPES[ns.type] || SCENE_TYPES.content;
    const scene = await sceneApi.create({ ...ns, videoId: selV, color: tm.c });
    setScenes(p => [...p, scene]);
    setNs({ type: "content", title: "", duration: "", notes: "", camera: "", audio: "" });
    setShowAdd(false);
    toast?.success("Cena adicionada");
  };

  const saveEdit = async (id, data) => {
    const tm = SCENE_TYPES[data.type] || SCENE_TYPES.content;
    await sceneApi.update(id, { ...data, color: tm.c });
    setScenes(p => p.map(s => s.id === id ? { ...s, ...data, color: tm.c } : s));
    toast?.success("Cena atualizada");
  };

  const delScene = async (id) => {
    const ok = await confirm({ title: "Remover Cena", message: "Remover esta cena do storyboard?" });
    if (!ok) return;
    await sceneApi.del(id); setScenes(p => p.filter(s => s.id !== id));
  };

  const generateAI = async () => {
    if (!selV) { toast?.error("Selecione um vídeo primeiro"); return; }
    setAiLoading(true);
    try {
      const topic = aiTopic || vid?.title || "Vídeo";
      const data = await aiApi.storyboard({ title: topic, duration: vid?.duration || "10:00", style: "viral com alta retenção, com animações e efeitos visuais detalhados, SFX para cada cena, narração completa" });
      if (data.error) { toast?.error(data.error); return; }
      const newScenes = [];
      for (const s of (data.scenes || [])) {
        const saved = await sceneApi.create({ videoId: selV, type: s.type || "content", title: s.title, duration: s.duration || "", notes: s.notes || "", camera: s.camera || "", audio: s.audio || "", color: (SCENE_TYPES[s.type] || SCENE_TYPES.content).c });
        newScenes.push(saved);
      }
      setScenes(prev => [...prev, ...newScenes]);
      toast?.success(`${newScenes.length} cenas geradas com IA!`);
      setShowAI(false); setAiTopic("");
    } catch (err) { toast?.error(err.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <style>{ANIM_CSS}</style>
      {editScene && <EditModal scene={editScene} onClose={() => setEditScene(null)} onSave={saveEdit} />}

      {/* Header */}
      <Hdr title="Storyboard Interativo" sub="Timeline visual animada com geração IA" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Btn vr="ghost" onClick={() => setViewMode(viewMode === "animated" ? "list" : "animated")} style={{ fontSize: 11 }}>
            {viewMode === "animated" ? "📋 Lista" : "🎬 Animado"}
          </Btn>
          <Btn vr="ghost" onClick={() => setShowAI(true)} style={{ fontSize: 11 }}>🤖 Gerar com IA</Btn>
          <Btn onClick={() => setShowAdd(true)}>+ Nova Cena</Btn>
        </div>
      } />

      {/* Video selector */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <Select value={selV || ""} onChange={e => setSelV(Number(e.target.value))} style={{ minWidth: 220 }}>
          <option value="">Selecione um vídeo</option>
          {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
        </Select>
        {vid && <span style={{ fontSize: 12, color: C.dim }}>{scenes.length} cenas · {vid.duration || "?"}</span>}
      </div>

      {!selV && (
        <div style={{ textAlign: "center", padding: 60, color: C.dim }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🎬</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione um vídeo para criar o storyboard</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Ou crie um novo vídeo no Planner Kanban</div>
        </div>
      )}

      {selV && scenes.length === 0 && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>✨</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Storyboard vazio</div>
          <div style={{ fontSize: 13, color: C.dim, marginBottom: 20 }}>Gere com IA ou adicione cenas manualmente</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn onClick={() => setShowAI(true)}>🤖 Gerar com IA</Btn>
            <Btn vr="ghost" onClick={() => setShowAdd(true)}>+ Manual</Btn>
          </div>
        </div>
      )}

      {/* ANIMATED VIEW */}
      {selV && scenes.length > 0 && viewMode === "animated" && (
        <div>
          {/* Title banner */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: C.text, fontFamily: "'Bebas Neue', sans-serif", margin: 0 }}>
              {vid?.title || "Storyboard"}
            </h2>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>
              {scenes.length} cenas · animações no hover · background {vid?.channel?.color || "#0B0C14"}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background: `${C.border}`, borderRadius: 4, height: 4, marginBottom: 32, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, #EF4444, #F59E0B, #22C55E, #3B82F6, #A855F7)", borderRadius: 4, width: "100%", animation: "sb-progress 2s ease-out" }} />
          </div>

          <div style={{ fontSize: 11, textAlign: "center", color: "#EF4444", marginBottom: 24, fontWeight: 600, letterSpacing: 1 }}>
            ⚡ PASSE O MOUSE SOBRE CADA CENA PARA PRÉVIA DA ANIMAÇÃO
          </div>

          {/* Scenes */}
          {scenes.map((scene, i) => (
            <SceneCard key={scene.id} scene={scene} index={i} total={scenes.length} onEdit={setEditScene} onDelete={delScene} />
          ))}
        </div>
      )}

      {/* LIST VIEW */}
      {selV && scenes.length > 0 && viewMode === "list" && (
        <div style={{ display: "grid", gap: 8 }}>
          {scenes.map((scene, i) => {
            const meta = SCENE_TYPES[scene.type] || SCENE_TYPES.content;
            return (
              <div key={scene.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${meta.c}30` }}>{meta.i}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{String(i + 1).padStart(2, "0")}. {scene.title}</div>
                  {scene.notes && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{scene.notes.slice(0, 80)}{scene.notes.length > 80 ? "..." : ""}</div>}
                </div>
                <span style={{ fontSize: 10, color: meta.c, fontWeight: 600, fontFamily: "var(--mono)" }}>{scene.duration || "~5s"}</span>
                <button onClick={() => setEditScene(scene)} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10 }}>Editar</button>
                <button onClick={() => delScene(scene.id)} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.red, cursor: "pointer", fontSize: 10 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* AI MODAL */}
      {showAI && (
        <div onClick={() => setShowAI(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 520, background: C.bgCard, borderRadius: 18, border: `1px solid ${C.border}`, padding: 28 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>🤖 Gerar Storyboard com IA</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>A IA vai criar cenas completas com narração, animações e efeitos sonoros</div>
            <div style={{ marginBottom: 16 }}>
              <Label t="Tema / Descrição do vídeo" />
              <textarea value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                placeholder={`Ex: "${vid?.title || "5 erros que todo youtuber iniciante comete"}"\nOu descreva: "Vídeo sobre produtividade para empreendedores, estilo motivacional com cortes rápidos"`}
                style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px", color: C.text, fontSize: 13, outline: "none", minHeight: 100, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn vr="ghost" onClick={() => setShowAI(false)}>Cancelar</Btn>
              <Btn onClick={generateAI} disabled={aiLoading} style={{ opacity: aiLoading ? 0.6 : 1 }}>
                {aiLoading ? "Gerando storyboard..." : "🚀 Gerar Storyboard"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ADD SCENE MODAL */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 520, background: C.bgCard, borderRadius: 18, border: `1px solid ${C.border}`, padding: 28 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Nova Cena</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div><Label t="Tipo" /><Select value={ns.type} onChange={e => setNs(p => ({ ...p, type: e.target.value }))}>{Object.entries(SCENE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.i} {v.l}</option>)}</Select></div>
                <div><Label t="Título" /><Input value={ns.title} onChange={e => setNs(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Abertura impactante" /></div>
              </div>
              <div><Label t="Narração" /><textarea value={ns.notes} onChange={e => setNs(p => ({ ...p, notes: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px", color: C.text, fontSize: 13, outline: "none", minHeight: 60, resize: "vertical" }} placeholder="O que será falado..." /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><Label t="Animação" /><Input value={ns.camera} onChange={e => setNs(p => ({ ...p, camera: e.target.value }))} placeholder="zoom-in, pop..." /></div>
                <div><Label t="SFX" /><Input value={ns.audio} onChange={e => setNs(p => ({ ...p, audio: e.target.value }))} placeholder="whoosh, ding..." /></div>
                <div><Label t="Duração" /><Input value={ns.duration} onChange={e => setNs(p => ({ ...p, duration: e.target.value }))} placeholder="~5s" /></div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <Btn vr="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
              <Btn onClick={addScene}>Adicionar Cena</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
