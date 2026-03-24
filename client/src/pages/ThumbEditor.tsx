// @ts-nocheck
import { useProgress } from "../components/shared/ProgressModal";
import { useState, useRef, useEffect, useCallback } from "react";
import { aiApi, chatApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

// AI call with auto-retry — wraps chatApi.sendWithRetry with progress integration
// Supports combo mode: Step 1 (analysis model) → Step 2 (prompt model)
async function aiCall(messages, pg, opts = {}) {
  const { reply } = await chatApi.sendWithRetry(messages, undefined, {
    timeout: opts.timeout || 180000,
    maxRetries: opts.maxRetries || 3,
    maxTokens: opts.maxTokens || 4000,
    onRetry: (attempt, max) => {
      if (pg?.retry) pg.retry(attempt, max);
    },
  });
  return reply;
}

// Combo AI call — uses 2 models in sequence for superior analysis
async function aiComboCall(
  analysisSystem, analysisUser, promptSystem, promptTemplate,
  comboSettings, pg, opts = {}
) {
  if (pg?.update) pg.update(0, "Modelo 1: Análise profunda...");
  const result = await chatApi.combo({
    analysisModel: comboSettings.analysisModel,
    promptModel: comboSettings.promptModel,
    analysisSystem,
    analysisUser,
    promptSystem,
    promptTemplate,
    maxTokens: opts.maxTokens || 4000,
  }, {
    maxRetries: 2,
    onRetry: (attempt, max) => { if (pg?.retry) pg.retry(attempt, max); },
  });
  return result;
}

// Check if combo is enabled via settings
async function getComboSettings() {
  try {
    const token = localStorage.getItem("lc_token");
    const res = await fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const s = await res.json();
    if (s.combo_enabled === "true" && s.combo_analysis_model && s.combo_prompt_model) {
      return { analysisModel: s.combo_analysis_model, promptModel: s.combo_prompt_model };
    }
  } catch {}
  return null;
}

// Sanitize prompt for ImageFX safety filters
function sanitizePrompt(prompt: string): string {
  const replacements: [RegExp, string][] = [
    [/\bsangue\b/gi, "tinta vermelha"], [/\bblood\b/gi, "red liquid"],
    [/\bsangrento\b/gi, "intenso"], [/\bbloody\b/gi, "intense"],
    [/\barma\b/gi, "objeto"], [/\barmas\b/gi, "objetos"],
    [/\bweapon[s]?\b/gi, "object"], [/\bgun[s]?\b/gi, "device"],
    [/\brifle[s]?\b/gi, "long device"], [/\bpistol[a]?\b/gi, "device"],
    [/\bespada[s]?\b/gi, "bastão metálico"], [/\bsword[s]?\b/gi, "metal staff"],
    [/\bfaca[s]?\b/gi, "objeto cortante"], [/\bknife\b/gi, "sharp object"],
    [/\bnavalha\b/gi, "lâmina"], [/\bblade\b/gi, "edge"],
    [/\bviolência\b/gi, "tensão"], [/\bviolence\b/gi, "tension"],
    [/\bmatar\b/gi, "confrontar"], [/\bkill\b/gi, "confront"],
    [/\bmorte\b/gi, "destino"], [/\bdeath\b/gi, "fate"],
    [/\bmorto[s]?\b/gi, "caído"], [/\bdead\b/gi, "fallen"],
    [/\bgore\b/gi, "dramatic"], [/\bhorror\b/gi, "suspense"],
    [/\btortura\b/gi, "tensão"], [/\btorture\b/gi, "tension"],
    [/\bexplosão\b/gi, "onda de energia"], [/\bexplosion\b/gi, "energy wave"],
    [/\bexplod\w*/gi, "energy burst"], [/\bbomb[a]?\b/gi, "orb"],
    [/\bdestru[iíç]\w*/gi, "transformação"], [/\bdestr\w+/gi, "transformation"],
    [/\bnude\b/gi, ""], [/\bnaked\b/gi, ""], [/\bsexy\b/gi, "elegant"],
    [/\bdripping blood\b/gi, "dripping liquid"], [/\bescorrendo sangue\b/gi, "escorrendo tinta"],
    [/\bferimento\b/gi, "marca"], [/\bwound\b/gi, "mark"],
    [/\bcadáver\b/gi, "figura"], [/\bcorpse\b/gi, "figure"],
    [/\bcombate\b/gi, "confronto"], [/\bcombat\b/gi, "confrontation"],
    [/\bbatalha\b/gi, "cena épica"], [/\bbattle\b/gi, "epic scene"],
    [/\battack\w*/gi, "action"], [/\bataqu\w*/gi, "ação"],
  ];
  let clean = prompt;
  for (const [pattern, replacement] of replacements) {
    clean = clean.replace(pattern, replacement);
  }
  return clean.replace(/\s{2,}/g, " ").trim();
}

// Auto-save generated thumbnails to history
function saveToHistory(data: { niche?: string; prompt?: string; imageUrl?: string; title?: string; style?: string; score?: number }) {
  const token = localStorage.getItem("lc_token");
  fetch("/api/trends/thumb-history", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  }).catch(() => {});
}

const NICHES = [
  { id: "gaming", l: "Gaming", i: "🎮" }, { id: "reviews", l: "Reviews", i: "⭐" },
  { id: "podcast", l: "Podcast", i: "🎙️" }, { id: "musica", l: "Música", i: "🎵" },
  { id: "tutoriais", l: "Tutoriais", i: "📖" }, { id: "fitness", l: "Fitness / Saúde", i: "💪" },
  { id: "financas", l: "Finanças", i: "💰" }, { id: "tecnologia", l: "Tecnologia", i: "💻" },
  { id: "motivacional", l: "Motivacional", i: "🔥" }, { id: "comedia", l: "Comédia", i: "😂" },
  { id: "unboxing", l: "Unboxing", i: "📦" }, { id: "slideshow", l: "Slideshow Story", i: "📸" },
  { id: "dark", l: "Dark / Psicologia", i: "🧠" }, { id: "noticias", l: "Notícias / Urgente", i: "📰" },
  { id: "terror", l: "Terror", i: "👻" }, { id: "dramatico", l: "Dramático", i: "🎭" },
  { id: "cinema", l: "Cinematográfico", i: "🎬" }, { id: "esportes", l: "Esportes", i: "⚽" },
  { id: "geek", l: "Geek / Nerd", i: "🤓" }, { id: "misterio", l: "Mistério", i: "🔍" },
  { id: "historia", l: "História", i: "🏛️" }, { id: "educacao", l: "Educação", i: "🎓" }, { id: "empreendedorismo", l: "Empreendedorismo", i: "🚀" },
  { id: "espiritualidade", l: "Espiritualidade", i: "🙏" }, { id: "ia", l: "Inteligência Artificial", i: "🤖" },
  { id: "outro", l: "Outro", i: "📎" },
];

const TITLE_STYLES = [
  // ── Clássicos ──
  { id: "impacto", l: "Impacto", desc: "Grande, bold, sombra forte", ex: "TÍTULO", font: "Impact, sans-serif", size: 72, weight: 900, stroke: true, shadow: true, color: "#FFFFFF" },
  { id: "clean", l: "Clean", desc: "Minimalista, elegante", ex: "Título", font: "'Montserrat', sans-serif", size: 60, weight: 700, stroke: false, shadow: true, color: "#FFFFFF" },
  { id: "fire", l: "Fogo", desc: "Gradiente quente, agressivo", ex: "TÍTULO", font: "Impact, sans-serif", size: 76, weight: 900, stroke: true, shadow: true, color: "#FF4500" },
  // ── Neon / Futurista ──
  { id: "neon", l: "Neon", desc: "Glow cyan futurista", ex: "Título", font: "'Bebas Neue', sans-serif", size: 68, weight: 400, stroke: false, shadow: false, glow: true, color: "#00FFFF" },
  { id: "neon-pink", l: "Neon Rosa", desc: "Glow magenta vibrante", ex: "Título", font: "'Bebas Neue', sans-serif", size: 68, weight: 400, stroke: false, shadow: false, glow: true, color: "#FF00FF" },
  { id: "hologram", l: "Holograma", desc: "Multi-cor iridescente, sci-fi", ex: "TÍTULO", font: "'Orbitron', sans-serif", size: 64, weight: 900, stroke: true, shadow: false, glow: true, color: "#00FFB3" },
  // ── Premium / Luxo ──
  { id: "elegant", l: "Elegante", desc: "Serif dourado, premium", ex: "Título", font: "Georgia, serif", size: 58, weight: 700, stroke: false, shadow: true, color: "#FFD700" },
  { id: "chrome", l: "Chrome", desc: "Metálico prateado, 3D", ex: "TÍTULO", font: "'Oswald', sans-serif", size: 72, weight: 700, stroke: true, shadow: true, color: "#C0C0C0" },
  { id: "royal", l: "Royal", desc: "Serif clássico com ornamentos", ex: "Título", font: "'Playfair Display', serif", size: 62, weight: 900, stroke: false, shadow: true, color: "#E8D5B7" },
  // ── Agressivo / Dark ──
  { id: "glitch", l: "Glitch", desc: "Distorcido, cyberpunk", ex: "Título", font: "'Courier New', monospace", size: 64, weight: 700, stroke: true, shadow: true, color: "#FF00FF" },
  { id: "horror", l: "Terror", desc: "Sangrento, dripping", ex: "TÍTULO", font: "'Creepster', cursive", size: 70, weight: 400, stroke: true, shadow: true, color: "#8B0000" },
  { id: "grunge", l: "Grunge", desc: "Sujo, rasgado, punk", ex: "TÍTULO", font: "'Permanent Marker', cursive", size: 66, weight: 400, stroke: true, shadow: true, color: "#C4A000" },
  { id: "toxic", l: "Tóxico", desc: "Verde radioativo, danger", ex: "TÍTULO", font: "Impact, sans-serif", size: 74, weight: 900, stroke: true, shadow: true, color: "#39FF14" },
  // ── Estiloso / Moderno ──
  { id: "retro", l: "Retrô", desc: "Anos 80, synthwave", ex: "TÍTULO", font: "'Righteous', cursive", size: 66, weight: 400, stroke: false, shadow: true, glow: true, color: "#FF6EC7" },
  { id: "brush", l: "Pincel", desc: "Brush stroke, orgânico", ex: "Título", font: "'Caveat', cursive", size: 72, weight: 700, stroke: false, shadow: true, color: "#FFFFFF" },
  { id: "stencil", l: "Stencil", desc: "Militar, tático, bold", ex: "TÍTULO", font: "'Black Ops One', cursive", size: 64, weight: 400, stroke: true, shadow: true, color: "#4ADE80" },
  { id: "anime", l: "Anime", desc: "Estilo manga japonês", ex: "TÍTULO", font: "'Bangers', cursive", size: 70, weight: 400, stroke: true, shadow: false, glow: true, color: "#FFE500" },
  { id: "3d-pop", l: "3D Pop", desc: "Extrusão 3D colorida", ex: "TÍTULO", font: "'Bungee', cursive", size: 64, weight: 400, stroke: true, shadow: true, color: "#FF3366" },
];

const CHAR_POSITIONS = ["Esquerda", "Centro", "Direita", "Cima", "Baixo"];
const TEXT_POSITIONS = ["Esquerda", "Centro", "Direita", "Topo", "Rodapé"];
const CHAR_FRAMES = ["Automático", "Rosto/Close-up", "Meio Corpo", "Corpo Inteiro"];
const EFFECTS = [
  // ── Luz ──
  { id: "feixe", l: "Feixe de Luz", i: "💥" },
  { id: "brilho", l: "Brilho Neon", i: "✨" },
  { id: "lens", l: "Lens Flare", i: "🔆" },
  { id: "godrays", l: "God Rays", i: "☀️" },
  { id: "spotlight", l: "Spotlight", i: "🔦" },
  { id: "aura", l: "Aura Energética", i: "💫" },
  // ── Atmosfera ──
  { id: "fumaca", l: "Fumaça", i: "🌫️" },
  { id: "bokeh", l: "Bokeh", i: "⭕" },
  { id: "rain", l: "Chuva", i: "🌧️" },
  { id: "snow", l: "Neve / Partículas", i: "❄️" },
  { id: "fire-fx", l: "Chamas", i: "🔥" },
  { id: "sparks", l: "Faíscas", i: "⚡" },
  // ── Distorção ──
  { id: "glitch", l: "Glitch Digital", i: "🌀" },
  { id: "chromatic", l: "Aberração Cromática", i: "🌈" },
  { id: "shatter", l: "Vidro Quebrado", i: "💎" },
  { id: "motion", l: "Motion Blur", i: "💨" },
  // ── Overlay ──
  { id: "vignette", l: "Vinheta Escura", i: "🖤" },
  { id: "grain", l: "Grain / Noise", i: "📺" },
  { id: "duotone", l: "Duotone", i: "🎨" },
  { id: "halftone", l: "Halftone / Comics", i: "📰" },
  { id: "neon-border", l: "Borda Neon", i: "🔲" },
  { id: "light-leak", l: "Light Leak", i: "🟡" },
];

const TEMPLATES_CANVAS = [
  { name: "Impacto", bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", textColor: "#fff", accentColor: "#EF4444" },
  { name: "Clean", bg: "linear-gradient(135deg,#1a1a2e,#16213e)", textColor: "#fff", accentColor: "#3B82F6" },
  { name: "Energia", bg: "linear-gradient(135deg,#f12711,#f5af19)", textColor: "#fff", accentColor: "#000" },
  { name: "Dark", bg: "linear-gradient(135deg,#0a0a0a,#1a0a0a)", textColor: "#EF4444", accentColor: "#F59E0B" },
  { name: "Neon", bg: "linear-gradient(135deg,#0a0a2e,#000)", textColor: "#0ff", accentColor: "#f0f" },
  { name: "Nature", bg: "linear-gradient(135deg,#134e5e,#71b280)", textColor: "#fff", accentColor: "#FDE047" },
  { name: "Luxo", bg: "linear-gradient(135deg,#1a1a1a,#2d1b00)", textColor: "#FFD700", accentColor: "#fff" },
  { name: "Urgente", bg: "linear-gradient(135deg,#8B0000,#FF0000)", textColor: "#fff", accentColor: "#FFFF00" },
];

/* ── Shared ── */
function Pill({ active, onClick, children, color = C.blue }) {
  return (<button onClick={onClick} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${active ? color + "50" : C.border}`, background: active ? color + "15" : "rgba(255,255,255,0.02)", color: active ? "#fff" : C.muted, cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400, transition: "0.2s" }}>{children}</button>);
}
function Sec({ title, icon, children, open: initOpen = true }) {
  const [open, setOpen] = useState(initOpen);
  return (<div style={{ background: "rgba(255,255,255,0.015)", borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 14 }}>
    <div onClick={() => setOpen(!open)} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{title}</span>
      <span style={{ color: C.dim, fontSize: 10, transform: open ? "none" : "rotate(-90deg)", transition: "0.2s" }}>▼</span>
    </div>
    {open && <div style={{ padding: "0 18px 16px" }}>{children}</div>}
  </div>);
}
function Drop({ onFile, label, sub, accept = "image/*" }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const stop = e => { e.preventDefault(); e.stopPropagation(); };
  return (<div onDragEnter={e => { stop(e); setDrag(true); }} onDragLeave={e => { stop(e); setDrag(false); }} onDragOver={stop}
    onDrop={e => { stop(e); setDrag(false); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
    onClick={() => ref.current?.click()}
    style={{ border: `2px dashed ${drag ? C.blue : C.border}`, borderRadius: 12, padding: "28px 16px", textAlign: "center", cursor: "pointer", background: drag ? C.blue + "06" : "rgba(255,255,255,0.01)" }}>
    <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
    <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
    <div style={{ fontSize: 13, fontWeight: 600 }}>{label || "Clique para enviar"}</div>
    <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{sub || "JPG, PNG, WEBP (Máx 4MB)"}</div>
  </div>);
}

/* ── Image Modal (shared) ── */
function ImageModal({ src, onClose, title = "Imagem Gerada" }) {
  if (!src) return null;
  const download = () => {
    const a = document.createElement("a");
    a.href = src; a.download = "thumbnail-" + Date.now() + ".png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: "100%", background: "#111", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <img src={src} style={{ width: "100%", borderRadius: 10, display: "block" }} />
        </div>
        <div style={{ padding: "12px 20px 18px", display: "flex", gap: 10 }}>
          <button onClick={download} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #22C55E, #16A34A)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>💾 Baixar PNG (1280x720)</button>
          <button onClick={() => { const hd = document.createElement("canvas"); hd.width = 2560; hd.height = 1440; const ctx = hd.getContext("2d"); const img = new Image(); img.crossOrigin = "anonymous"; img.src = src; img.onload = () => { ctx.drawImage(img, 0, 0, 2560, 1440); const a = document.createElement("a"); a.href = hd.toDataURL("image/png"); a.download = "thumb-2K-" + Date.now() + ".png"; a.click(); }; }} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#93C5FD", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📐 2K HD</button>
          <button onClick={onClose} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB 1: CRIADOR NINJA
   ═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   NICHE COLOR PALETTES (auto-suggest)
   ═══════════════════════════════════════ */
const NICHE_PALETTES = {
  gaming: { bg: "#0A0A1A", colors: ["#00FF88", "#7B2FFF", "#FF0055", "#00D4FF", "#FFFF00"], tip: "Neon saturado + fundo escuro. RGB gamer." },
  reviews: { bg: "#F5F5F5", colors: ["#FF6B00", "#1A1A1A", "#FFD700", "#FFFFFF", "#333333"], tip: "Fundo clean, produto em destaque, estrelas douradas." },
  podcast: { bg: "#1A0F00", colors: ["#FF8C00", "#FFD700", "#8B4513", "#FFF8DC", "#D2691E"], tip: "Tons quentes âmbar, intimista." },
  musica: { bg: "#0A001A", colors: ["#FF00FF", "#00FFFF", "#FF6EC7", "#7B68EE", "#FFD700"], tip: "Neon vibrante, luzes de palco." },
  tutoriais: { bg: "#0D1B2A", colors: ["#3B82F6", "#10B981", "#FFFFFF", "#F59E0B", "#1E293B"], tip: "Azul confiável + verde sucesso." },
  fitness: { bg: "#1A0000", colors: ["#FF4500", "#FFD700", "#FF6347", "#000000", "#FFFFFF"], tip: "Laranja/vermelho energético, alto contraste." },
  financas: { bg: "#001A00", colors: ["#00FF00", "#FFD700", "#006400", "#FFFFFF", "#000000"], tip: "Verde dinheiro + dourado premium." },
  tecnologia: { bg: "#000A1A", colors: ["#00BFFF", "#00FFFF", "#4169E1", "#FFFFFF", "#7B68EE"], tip: "Azul/ciano tech, futurista." },
  motivacional: { bg: "#1A0A00", colors: ["#FF6B00", "#FFD700", "#FF4500", "#FFFFFF", "#FF8C00"], tip: "Dourado/laranja quente, sunrise energy." },
  comedia: { bg: "#FFFF00", colors: ["#FF0000", "#0000FF", "#00FF00", "#FF69B4", "#FFFFFF"], tip: "Cores saturadas e vivas, divertido." },
  dark: { bg: "#000000", colors: ["#8B0000", "#4B0082", "#191970", "#C0C0C0", "#FF0000"], tip: "Escuro total, vermelho/roxo pontual." },
  terror: { bg: "#0A0000", colors: ["#8B0000", "#FF0000", "#2F2F2F", "#FFFFFF", "#000000"], tip: "Preto + vermelho sangue, dessaturado." },
  cinema: { bg: "#0A1520", colors: ["#E07020", "#1A8090", "#FFD700", "#FFFFFF", "#2C3E50"], tip: "Teal & orange cinematográfico." },
  esportes: { bg: "#001A00", colors: ["#00FF00", "#FFFFFF", "#FF0000", "#FFD700", "#000000"], tip: "Cores do time, gramado verde, energia." },
  ia: { bg: "#000A1A", colors: ["#00FFFF", "#7B2FFF", "#00FF88", "#FFFFFF", "#0000FF"], tip: "Ciano/roxo digital, Matrix vibes." },
  noticias: { bg: "#8B0000", colors: ["#FFFFFF", "#FFFF00", "#FF0000", "#000000", "#FF6347"], tip: "Vermelho urgente + amarelo alerta." },
  historia: { bg: "#1A0F00", colors: ["#C4956A", "#FFD700", "#8B6914", "#2C1810", "#D4A574"], tip: "Sépia + dourado envelhecido + pedra. Épico e antigo." },
  outro: { bg: "#1A1A2E", colors: ["#FFFFFF", "#3B82F6", "#F59E0B", "#EF4444", "#10B981"], tip: "Versátil, alto contraste." },
};

const LAYOUT_TEMPLATES = [
  { id: "mrbeast", name: "MrBeast", desc: "Rosto + texto grande + fundo colorido", layout: { textPos: "left", facePos: "right", faceSize: 60, textSize: 40 }, colors: ["#FF0000", "#FFFF00", "#000000"] },
  { id: "finance", name: "Finance", desc: "Número grande + gráfico + badge", layout: { textPos: "center", facePos: "none", textSize: 50 }, colors: ["#00FF00", "#FFD700", "#000000"] },
  { id: "dark-minimal", name: "Dark Minimal", desc: "Fundo escuro + 1 elemento + texto neon", layout: { textPos: "top-left", facePos: "center", faceSize: 40, textSize: 30 }, colors: ["#000000", "#FF0000", "#FFFFFF"] },
  { id: "tutorial-clean", name: "Tutorial Clean", desc: "Tela + setas + texto claro", layout: { textPos: "top", facePos: "bottom-right", faceSize: 30, textSize: 35 }, colors: ["#3B82F6", "#FFFFFF", "#1E293B"] },
  { id: "reaction", name: "Reaction", desc: "Rosto chocado grande + emoji + texto curto", layout: { textPos: "top-left", facePos: "center", faceSize: 70, textSize: 25 }, colors: ["#FF4500", "#FFFFFF", "#000000"] },
  { id: "versus", name: "VS / Compare", desc: "Dois lados divididos + VS no centro", layout: { textPos: "center", facePos: "both", textSize: 35 }, colors: ["#FF0000", "#0000FF", "#FFFFFF"] },
  { id: "before-after", name: "Antes/Depois", desc: "Split screen + seta + transformação", layout: { textPos: "top", facePos: "split", textSize: 30 }, colors: ["#EF4444", "#22C55E", "#FFFFFF"] },
  { id: "breaking", name: "Breaking News", desc: "Barra vermelha + texto urgente + alerta", layout: { textPos: "center", facePos: "none", textSize: 45 }, colors: ["#DC2626", "#FFFFFF", "#FFFF00"] },
  { id: "cinema-wide", name: "Cinematic", desc: "Letterbox + color grade + texto elegante", layout: { textPos: "bottom-left", facePos: "center", faceSize: 50, textSize: 30 }, colors: ["#E07020", "#1A8090", "#FFFFFF"] },
  { id: "list-number", name: "Top/Lista", desc: "Número enorme + item + badge", layout: { textPos: "right", facePos: "left", faceSize: 40, textSize: 50 }, colors: ["#FFD700", "#FFFFFF", "#000000"] },
];

const STICKERS = [
  { id: "arrow-red", name: "Seta Vermelha", svg: "M10,25 L40,25 L35,15 L50,30 L35,45 L40,35 L10,35Z", color: "#EF4444" },
  { id: "circle-yellow", name: "Círculo Destaque", svg: "circle", color: "#FBBF24" },
  { id: "badge-new", name: "NOVO", text: "NOVO", bg: "#EF4444", color: "#fff" },
  { id: "badge-free", name: "GRÁTIS", text: "GRÁTIS", bg: "#22C55E", color: "#fff" },
  { id: "badge-top", name: "TOP", text: "TOP", bg: "#F59E0B", color: "#000" },
  { id: "badge-viral", name: "VIRAL", text: "VIRAL", bg: "#7C3AED", color: "#fff" },
  { id: "badge-urgent", name: "URGENTE", text: "URGENTE", bg: "#DC2626", color: "#fff" },
  { id: "emoji-fire", name: "🔥", text: "🔥", emoji: true },
  { id: "emoji-shock", name: "😱", text: "😱", emoji: true },
  { id: "emoji-money", name: "💰", text: "💰", emoji: true },
  { id: "emoji-100", name: "💯", text: "💯", emoji: true },
  { id: "emoji-star", name: "⭐", text: "⭐", emoji: true },
];
function CriadorNinja({ toast, pg }) {
  const [niche, setNiche] = useState("gaming");
  const [title, setTitle] = useState("");
  const [titleStyle, setTitleStyle] = useState("impacto");
  const [subtitle, setSubtitle] = useState("");
  const [charDesc, setCharDesc] = useState("");
  const [charImgs, setCharImgs] = useState([]);
  const addCharImg = (f) => { if (charImgs.length >= 3) return; setCharImgs(p => [...p, URL.createObjectURL(f)]); };
  const rmCharImg = (i) => setCharImgs(p => p.filter((_, j) => j !== i));
  const [charPos, setCharPos] = useState("Direita");
  const [textPos, setTextPos] = useState("Esquerda");
  const [charFrame, setCharFrame] = useState("Automático");
  const [charCount, setCharCount] = useState(1);
  const [mainColor, setMainColor] = useState("#FF0000");
  const [effects, setEffects] = useState([]);
  const [bgDesc, setBgDesc] = useState("");
  const [bgImg, setBgImg] = useState(null);
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genImages, setGenImages] = useState({});
  const [modalImg, setModalImg] = useState(null);
  const [genImgLoading, setGenImgLoading] = useState({});
  const genImage = async (key, prompt) => {
    setGenImgLoading(p => ({ ...p, [key]: true }));
    pg?.start("Gerando Imagem", ["ImageFX processando", "Finalizando"]);
    try {
      const r = await aiApi.generateAsset({ prompt: sanitizePrompt(prompt + ", YouTube thumbnail, 16:9 landscape, no text, ultra quality, 8K") });
      if (r.url || r.b64) { const imgUrl = r.url || ("data:image/png;base64," + r.b64); setGenImages(p => ({ ...p, [key]: imgUrl })); setModalImg(imgUrl); saveToHistory({ niche, prompt: prompt.slice(0, 500), imageUrl: imgUrl.startsWith("data:") ? "" : imgUrl, title, style: titleStyle, score: 0 }); pg?.done(); toast?.success("Imagem gerada!"); }
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
    setGenImgLoading(p => ({ ...p, [key]: false }));
  };

  const toggle = id => setEffects(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const generate = async () => {
    if (!title.trim()) { toast?.error("Digite o título"); return; }
    setLoading(true);
    pg?.start("🎨 Gerando Prompt Pro", ["Analisando nicho e referências", "Construindo composição visual", "Otimizando para CTR máximo"]);
    try {
      const nicheObj = NICHES.find(n => n.id === niche) || NICHES[0];
      const styleObj = TITLE_STYLES.find(s => s.id === titleStyle) || TITLE_STYLES[0];
      const fxList = effects.map(e => EFFECTS.find(x => x.id === e)?.l).filter(Boolean);

      // Niche visual DNA — tells the AI exactly what each niche LOOKS like
      const NICHE_DNA = {
        gaming: "cenário de jogo, luzes RGB neon, setup gamer, explosões, partículas digitais, HUD overlay sutil, cores vibrantes saturadas (azul elétrico, verde neon, roxo), iluminação dramática de monitor, atmosfera competitiva",
        reviews: "produto em destaque com iluminação de estúdio, fundo limpo com gradiente suave, reflexo no chão, estrelas/rating visual, composição de unboxing premium, iluminação de 3 pontos",
        podcast: "microfone profissional em primeiro plano, iluminação quente/âmbar, estúdio com painéis acústicos, atmosfera intimista, bokeh suave, tons quentes (marrom, dourado, vermelho escuro)",
        musica: "ondas sonoras visuais, equalizer, luzes de palco/show, atmosfera de concert, smoke machine, iluminação colorida dinâmica, vibes de festival",
        tutoriais: "tela de computador/código em segundo plano, setas e ícones didáticos, composição limpa e organizada, cores confiáveis (azul, verde), iluminação neutra profissional",
        fitness: "academia/treino como fundo, suor e determinação, iluminação dura/contraste alto, músculos definidos, cores energéticas (laranja, vermelho, preto), piso de academia, kettlebells/halteres",
        financas: "gráficos de ações subindo, notas de dinheiro, moedas douradas, fundo escuro sofisticado, tons de verde/dourado/preto, iluminação premium, estética Wall Street",
        tecnologia: "circuitos, chips, telas holográficas, interface futurista, luzes azuis/ciano, reflexos metálicos, estética sci-fi, gadgets flutuantes",
        motivacional: "nascer do sol épico, topo de montanha, paisagem grandiosa, raios de luz divinos, céu dramático, cores quentes intensas, sensação de conquista, golden hour",
        comedia: "cores vibrantes e saturadas, expressões faciais exageradas, elementos cartoon, fundo caótico/divertido, efeitos de quadrinhos, iluminação flat alegre",
        unboxing: "caixa sendo aberta com luz saindo de dentro, fundo escuro contrastante, produto brilhando, reflexos, embalagem premium, suspense visual",
        slideshow: "moldura cinematográfica, fundo escuro com spotlight, foto em destaque, bordas estilizadas, vinheta, tons sépia/noir",
        dark: "sombras profundas, silhueta, iluminação lateral dramática, fundo completamente escuro, olhos brilhando na escuridão, atmosfera psicológica perturbadora, tons frios (azul escuro, roxo escuro), fog",
        noticias: "fundo vermelho urgente, breaking news visual, linhas de transmissão, texto bold, atmosfera de plantão jornalístico, composição de TV news, relógio/mapa mundi",
        terror: "escuridão total, sombras distorcidas, olhos vermelhos brilhando, sangue/gore sutil, árvores mortas, nevoeiro denso, casa abandonada, tons dessaturados com vermelho pontual",
        dramatico: "iluminação Rembrandt (luz lateral), expressão intensa, fundo escuro com bokeh, composição cinematográfica 2.39:1, contraste extremo chiaroscuro, sensação de tensão",
        cinema: "aspect ratio cinematográfico, color grading estilo filme (teal and orange), lens flare anamórfico, DOF raso, composição regra dos terços, iluminação de set de filmagem, câmera RED/ARRI visual",
        esportes: "estádio lotado, gramado verde, iluminação de arena, movimento congelado (splash, suor), cores do time, composição dinâmica com ângulo baixo, energia atlética",
        geek: "estante de colecionáveis, quadrinhos, figuras de ação, logos de franquias, luzes de LED coloridas, setup nerd, pôsters no fundo, atmosfera de comic-con",
        misterio: "lupa, pegadas, detetive silhueta, fundo nebuloso, cena do crime com fita amarela, tons de azul escuro/cinza, iluminação low-key, suspense visual",
        historia: "ruínas antigas, templos, pirâmides, estátuas de pedra desgastadas, mapas antigos, pergaminhos, armaduras, espadas, artefatos arqueológicos, composição épica como poster de documentário, iluminação golden hour dramática, tons de sépia, dourado envelhecido, pedra, areia do deserto, céu dramático, sensação de grandiosidade e mistério do passado",
        educacao: "lousa/quadro branco, livros empilhados, sala de aula moderna, ícones didáticos, composição organizada e limpa, cores confiáveis e profissionais, iluminação neutra",
        empreendedorismo: "arranha-céus, gráficos subindo, homem de terno confiante, laptop, escritório moderno, skyline urbana, tons de azul marinho/dourado, iluminação corporativa premium",
        espiritualidade: "raios de luz celestiais, meditação, natureza serena, mandala, cores etéreas (branco, dourado, lilás), atmosfera transcendental, nuvens divinas, aura luminosa",
        ia: "rede neural visual, cérebro digital, circuitos azuis brilhantes, interface holográfica, robô/android, código Matrix caindo, tons de azul/ciano/preto, partículas de dados flutuantes",
        outro: "fundo gradiente cinza escuro, iluminação neutra profissional, composição centralizada, estilo versátil e adaptável",
      };

      // Title style rendering instructions
      const STYLE_DNA = {
        impacto: "Texto: letras ENORMES capitalizadas, fonte Impact espessa, sombra preta profunda projetada, stroke branco grosso ao redor, máximo contraste com fundo. Ocupa 40% da thumbnail.",
        clean: "Texto: fonte Montserrat moderna sem serifa, peso bold, sombra sutil, sem stroke, alinhamento elegante, espaçamento generoso entre letras, tons brancos clean sobre fundo escuro.",
        fire: "Texto: letras em chamas laranja-vermelho-amarelo, efeito de fogo real subindo das letras, gradiente quente, stroke escuro para legibilidade, centelhas ao redor.",
        neon: "Texto: glow de neon ciano intenso, como letreiro de Las Vegas, reflexo no chão molhado, halo de luz ao redor de cada letra, fundo escuro obrigatório para brilhar.",
        "neon-pink": "Texto: neon magenta/rosa vibrante brilhando, efeito de tubo de neon, reflexo rosa no ambiente, glow suave disperso, estilo cyberpunk noturno.",
        hologram: "Texto: efeito holograma iridescente (muda de cor verde-azul-roxo), linhas de scan, transparência parcial, glitch sutil, estilo sci-fi futurista.",
        elegant: "Texto: fonte serif clássica (Playfair/Georgia), cor dourada metalizada, sombra refinada discreta, pode ter ornamento sutil, estilo revista de luxo.",
        chrome: "Texto: efeito cromado/metálico prateado com reflexo do ambiente, extrusão 3D, iluminação especular, aspecto industrial premium.",
        royal: "Texto: serif ornamentado dourado sobre fundo escuro, com coroa ou ornamentos sutis, estilo brasão de família, premium e sofisticado, tom bege/champagne.",
        glitch: "Texto: distorção digital RGB split (vermelho-verde-azul desalinhados), efeito de TV com defeito, ruído visual, deslocamento horizontal, fonte monospace.",
        horror: "Texto: letras sangrenta escorrendo, fonte irregular assustadora, cor vermelho escuro/sangue, rachado/quebrado, atmosfera de filme de terror, dripping effect.",
        grunge: "Texto: fonte manuscrita suja/rasgada, textura de papel amassado, manchas, imperfeições intencionais, visual punk/underground, tom amarelado/sujo.",
        toxic: "Texto: verde radioativo neon brilhante (#39FF14), símbolos de perigo/biohazard ao redor, glow tóxico, fundo escuro, estilo Warning/Danger zone.",
        retro: "Texto: estilo synthwave anos 80, gradiente rosa-roxo-azul, linhas de grid em perspectiva, sol neon no horizonte, chrome retro, fonte arredondada bold.",
        brush: "Texto: como pintado com pincel largo, traços orgânicos visíveis, tinta escorrendo, textura de aquarela, artístico e humano, imperfeições bonitas.",
        stencil: "Texto: fonte militar/tática, como estampado com stencil, textura de metal/caixote militar, tom verde army/oliva, marcas de desgaste.",
        anime: "Texto: estilo manga/anime japonês, linhas de velocidade (speed lines) ao redor, onomatopeia visual, cores saturadas vibrantes, efeito de impacto.",
        "3d-pop": "Texto: extrusão 3D colorida com sombra projetada, efeito pop art, cores contrastantes vibrantes, como se as letras saltassem da tela, perspectiva dinâmica.",
      };

      // Effects rendering
      const FX_DNA = {
        "feixe": "feixe de luz concentrado apontando para o personagem/texto, volumetric light rays",
        "brilho": "partículas brilhantes de neon flutuando ao redor, glow difuso, sparkle",
        "lens": "lens flare anamórfico azul/dourado cruzando a imagem diagonalmente",
        "godrays": "raios de luz divinos descendo de cima (god rays), volumetric fog",
        "spotlight": "holofote focado no personagem principal, resto em sombra",
        "aura": "aura de energia luminosa envolvendo o personagem, como super-saiyan, power glow",
        "fumaca": "fumaça cinematográfica densa, smoke machine, atmosfera misteriosa",
        "bokeh": "círculos de bokeh no fundo desfocado, luzes circulares coloridas",
        "rain": "gotas de chuva congeladas no ar, reflexos no chão molhado, atmosfera chuvosa",
        "snow": "partículas de neve/cinzas flutuando suavemente, efeito delicado",
        "fire-fx": "chamas reais nas bordas ou ao redor do personagem, fogo vivo",
        "sparks": "faíscas elétricas voando, como soldagem ou raio, partículas brilhantes",
        "glitch": "distorção digital glitch, aberração RGB, linhas de scan, pixel artifacts",
        "chromatic": "aberração cromática forte (split RGB vermelho-ciano nos contornos)",
        "shatter": "efeito de vidro/espelho se quebrando, fragmentos voando, rachadura central",
        "motion": "motion blur direcional sugerindo velocidade, rastro de movimento",
        "vignette": "vinheta escura forte nas bordas, foco central",
        "grain": "grain de filme analógico, ruído sutil, textura cinematográfica vintage",
        "duotone": "efeito duotone (apenas 2 cores dominantes), estilização cromática",
        "halftone": "efeito de halftone/retícula de jornal, estilo pop art/comics, pontilhismo",
        "neon-border": "borda neon brilhante ao redor da thumbnail ou do personagem",
        "light-leak": "vazamento de luz quente (light leak) nas bordas, tom laranja/amarelo overexposure",
      };

      const nicheDNA = NICHE_DNA[niche] || NICHE_DNA.outro;
      const styleDNA = STYLE_DNA[titleStyle] || STYLE_DNA.impacto;
      const fxDNA = fxList.map(fx => {
        const found = EFFECTS.find(e => e.l === fx);
        return found ? (FX_DNA[found.id] || fx) : fx;
      }).join(". ");

      const reply = await aiCall([{ role: "system", content: `Você é o MAIOR ESPECIALISTA DO MUNDO em thumbnails virais para YouTube em 2026. Você treinou analisando +100.000 thumbnails dos canais com maior CTR do planeta (MrBeast, Mark Rober, Kurzgesagt, Felipe Neto, Primo Rico, Alanzoka).

SEU CONHECIMENTO DE TENDÊNCIAS 2026 (DADOS REAIS):
- NEO-MINIMALISMO domina: thumbnails com MUITO espaço negativo e 1 único ponto focal claro. Canais que mudaram para esse estilo viram CTR saltar de 2.8% para 7.2%.
- TEXTO MÁXIMO 5 PALAVRAS. Mais que isso é ruído visual em mobile. 87% das top thumbs de 2025/2026 usam texto no CANTO SUPERIOR ESQUERDO (primeiro lugar que os olhos escaneiam no celular).
- MOBILE-FIRST obrigatório: 70% do tráfego é mobile. O viewer decide em 0.5 SEGUNDO se clica. Design para "selo postal", não para "outdoor". 68% dos mobile viewers decidem em 1 segundo.
- ROSTOS COM EMOÇÃO EXTREMA aumentam CTR em 20-30% (dados VidIQ 2025). Close-up shots com expressões exageradas (surpresa, choque, raiva, alegria extrema) AINDA funcionam em 2026.
- CONTRASTE é REI: cores bold (amarelo, laranja, neon) sobre fundo escuro param o scroll. Paletas de alto contraste neon são tendência forte.
- Evitar BOTTOM-RIGHT corner — o timestamp do YouTube cobre essa área. Nunca colocar elementos importantes ali.
- Before/After e números grandes ("99% ERRAM ISSO") são gatilhos de curiosidade comprovados.
- Color grading cinematográfico (teal & orange) continua premium. Mas neo-minimalismo com 1-2 cores é a nova onda.
- A/B Testing é padrão: YouTube Test & Compare permite 3 variações. Sempre pensar em thumbnails que são testáveis.
- MrBeast gasta $10.000 por thumbnail com testes extensivos — o nível de qualidade é esse.

REGRAS DE OURO DO SEU TRABALHO:
1. NUNCA gere texto/letras/palavras dentro da imagem. A thumbnail é SÓ background visual — texto será sobreposto depois.
2. TODOS OS PROMPTS ImageFX DEVEM SER EM INGLÊS — o Google ImageFX só funciona com prompts em inglês. Escreva cada prompt inteiro em inglês técnico.
3. Cada prompt DEVE ter 120-150 palavras ultra-específicas em INGLÊS: composição, iluminação (tipo exato: Rembrandt, rim light, butterfly, split), paleta de cores em hex, câmera (ângulo, lens, DOF), textura, atmosfera.
4. RESPEITE o nicho — cada nicho tem DNA visual próprio que o viewer reconhece inconscientemente.
5. COMPOSIÇÃO: deixe espaço clean onde o texto será sobreposto (baseado na posição informada). Use regra dos terços. Ponto focal único.
6. EFEITOS devem estar INTEGRADOS na cena de forma orgânica, não como filtro jogado por cima.
7. PENSE MOBILE: a imagem precisa ser impactante mesmo em 120x68 pixels (tamanho no feed mobile).
8. Os prompts devem funcionar no Google ImageFX / Imagen 3.5 — seja técnico, visual e cinematográfico. SEMPRE EM INGLÊS.
9. Cada variação deve ser genuinamente DIFERENTE em composição e ângulo, não apenas troca de cor.
10. SEGURANÇA ImageFX: NUNCA use palavras como blood, weapon, violence, death, explosion, combat, knife, sword, gun, bomb. Use safe alternatives (energy wave, tension, red paint, dramatic marks).` },
      { role: "user", content: `BRIEFING DA THUMBNAIL:

NICHO: ${nicheObj.l} (${nicheObj.i})
REFERÊNCIA VISUAL DO NICHO: ${nicheDNA}

TÍTULO QUE SERÁ SOBREPOSTO: "${title}"
ESTILO DO TÍTULO: ${styleObj.l} — ${styleDNA}
POSIÇÃO DO TEXTO: ${textPos} (deixe espaço limpo nessa área para o texto)
${subtitle ? `SUBTÍTULO: "${subtitle}"` : ""}

PERSONAGEM: ${charDesc || "sem personagem específico — use composição do nicho"}
${charImgs.length ? `REFERÊNCIAS VISUAIS: ${charImgs.length} imagem(ns) enviada(s) do personagem` : ""}
POSIÇÃO DO PERSONAGEM NA COMPOSIÇÃO: ${charPos}
ENQUADRAMENTO: ${charFrame}
NÚMERO DE PERSONAGENS: ${charCount}

COR DOMINANTE: ${mainColor}
${fxDNA ? `EFEITOS OBRIGATÓRIOS NA CENA: ${fxDNA}` : "SEM efeitos especiais — composição limpa"}

FUNDO: ${bgImg ? "o usuário enviou uma imagem de fundo — descreva uma cena que complementaria esse fundo" : bgDesc || "escolha o fundo mais impactante para este nicho"}

GERE 3 VARIAÇÕES:
1. PRINCIPAL — a thumbnail mais provável de viralizar neste nicho, seguindo as referências visuais exatas
2. ALTERNATIVA — mesmo conceito mas com ângulo/perspectiva/composição diferente
3. OUSADA — conceito visual criativo e inesperado que quebra padrões do nicho

RESPONDA APENAS este JSON (sem markdown, sem backticks):
{"promptImageFX":"[ENGLISH prompt 1 - minimum 120 words, ultra specific, NO text in image, 16:9 landscape, photorealistic 8K, include exact lighting, hex palette, composition]","promptVariation2":"[ENGLISH prompt 2 - minimum 120 words, different angle]","promptVariation3":"[ENGLISH prompt 3 - minimum 120 words, bold creative]","textOverlay":{"title":"${title}","titleStyle":"${styleObj.l}: como posicionar o texto sobre esta imagem para máximo impacto","subtitle":"${subtitle || "sugestão de subtítulo"}","badge":"sugestão de badge contextual (ex: NOVO, TOP, VIRAL, GRÁTIS)","emoji":"1 emoji que representa o vídeo"},"tips":["dica 1 específica para ${nicheObj.l}","dica 2 sobre composição","dica 3 sobre cores/CTR"],"ctrEstimate":85}` }], pg);
      const parsed = JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      setOutput(parsed); pg?.done();
    } catch (e) { pg?.fail(e.message, () => generate()); toast?.error(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <ImageModal src={modalImg} onClose={() => setModalImg(null)} title="Thumbnail Gerada — Criador Pro" />
      <div>
        <Sec title="1. Escolha um Tema" icon="🎯">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {NICHES.map(n => (<Pill key={n.id} active={niche === n.id} onClick={() => setNiche(n.id)} color="#DC2626"><div style={{ fontSize: 16 }}>{n.i}</div><div style={{ fontSize: 9, marginTop: 2 }}>{n.l}</div></Pill>))}
          </div>
        </Sec>

        <Sec title="2. Detalhe sua Thumbnail" icon="✏️">
          <Label t="Título" />
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: A MELHOR JOGADA DA MINHA VIDA" style={{ marginBottom: 10 }} />
          <Label t="Estilo de Título" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginBottom: 10 }}>
            {TITLE_STYLES.map(s => (<button key={s.id} onClick={() => setTitleStyle(s.id)} style={{ padding: "8px 4px", borderRadius: 8, cursor: "pointer", textAlign: "center", border: `2px solid ${titleStyle === s.id ? "#DC2626" : C.border}`, background: titleStyle === s.id ? "#DC262612" : "rgba(255,255,255,0.02)" }}>
              <div style={{ fontFamily: s.font, fontSize: 13, fontWeight: s.weight, color: s.color, textShadow: s.shadow ? "2px 2px 4px rgba(0,0,0,0.8)" : "none", lineHeight: 1.2 }}>{s.ex}</div>
              <div style={{ fontSize: 8, color: C.dim, marginTop: 2, lineHeight: 1.2 }}>{s.l}</div>
            </button>))}
          </div>
          <Label t="Subtítulo (opcional)" />
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Ex: Gameplay de Fortnite" style={{ marginBottom: 10 }} />
          <Label t="Descrição do Personagem" />
          <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: C.dim }}>Faz upload de 1-3 imagens para auxiliar as características do personagem.</span>
            <label style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.orange}40`, background: `${C.orange}10`, cursor: "pointer", fontSize: 10, color: C.orange, fontWeight: 600, whiteSpace: "nowrap" }}>📷 Usar Imagens
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) addCharImg(e.target.files[0]); }} />
            </label>
          </div>
          {/* Image grid with + buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {charImgs.map((img, i) => (
              <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                <img src={img} style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover", border: `2px solid ${C.orange}40` }} />
                <button onClick={() => rmCharImg(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: C.red, border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ))}
            {charImgs.length < 3 && (
              <label style={{ width: 80, height: 80, borderRadius: 10, border: `2px dashed ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(255,255,255,0.02)" }}>
                <span style={{ fontSize: 24, color: C.dim }}>+</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) addCharImg(e.target.files[0]); }} />
              </label>
            )}
          </div>
          <Label t="Auxiliar Imagens" />
          <Input value={charDesc} onChange={e => setCharDesc(e.target.value)} placeholder="Ex: jovem com hoodie neon, cara de surpreso" style={{ marginBottom: 10 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><Label t="Posição Personagem" /><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{CHAR_POSITIONS.map(p => <Pill key={p} active={charPos===p} onClick={() => setCharPos(p)} color={C.orange}>{p}</Pill>)}</div></div>
            <div><Label t="Posição Texto" /><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{TEXT_POSITIONS.map(p => <Pill key={p} active={textPos===p} onClick={() => setTextPos(p)} color={C.purple}>{p}</Pill>)}</div></div>
          </div>
          <Label t="Enquadramento" />
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>{CHAR_FRAMES.map(f => <Pill key={f} active={charFrame===f} onClick={() => setCharFrame(f)} color={C.cyan}>{f}</Pill>)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><Label t="Cor Principal" /><div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="color" value={mainColor} onChange={e => setMainColor(e.target.value)} style={{ width: 32, height: 32, border: "none", borderRadius: 6, cursor: "pointer" }} /><span style={{ fontSize: 10, fontFamily: "var(--mono)", color: C.dim }}>{mainColor}</span></div></div>
            <div><Label t="Nº Personagens" /><div style={{ display: "flex", gap: 4 }}>{[1,2,3,4,5].map(n => <Pill key={n} active={charCount===n} onClick={() => setCharCount(n)} color={C.green}>{n}</Pill>)}</div></div>
          </div>
          <Label t="Fundo (opcional)" />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Input value={bgDesc} onChange={e => setBgDesc(e.target.value)} placeholder="Descreva o fundo ou deixe vazio para auto" style={{ flex: 1 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.purple}40`, background: `${C.purple}10`, cursor: "pointer", fontSize: 10, color: C.purple, fontWeight: 600, whiteSpace: "nowrap" }}>🖼️ Enviar
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setBgImg(URL.createObjectURL(e.target.files[0])); }} />
            </label>
          </div>
          {bgImg && (
            <div style={{ position: "relative", marginBottom: 10 }}>
              <img src={bgImg} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 10, border: `2px solid ${C.purple}40` }} />
              <button onClick={() => setBgImg(null)} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer" }}>✕</button>
              <div style={{ position: "absolute", bottom: 6, left: 8, fontSize: 9, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "2px 8px", borderRadius: 4 }}>Fundo enviado</div>
            </div>
          )}
          {/* Quick background presets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 4 }}>
            {[
              { bg: "linear-gradient(135deg,#0f0c29,#302b63)", l: "Roxo" },
              { bg: "linear-gradient(135deg,#1a1a2e,#16213e)", l: "Azul" },
              { bg: "linear-gradient(135deg,#f12711,#f5af19)", l: "Fogo" },
              { bg: "linear-gradient(135deg,#0a0a0a,#1a0a0a)", l: "Dark" },
              { bg: "linear-gradient(135deg,#134e5e,#71b280)", l: "Verde" },
              { bg: "linear-gradient(135deg,#1a1a1a,#2d1b00)", l: "Gold" },
              { bg: "linear-gradient(135deg,#8B0000,#FF0000)", l: "Red" },
              { bg: "linear-gradient(135deg,#0a0a2e,#000)", l: "Neon" },
            ].map((p, i) => (
              <button key={i} onClick={() => setBgDesc(p.l.toLowerCase() + " gradient background")} style={{ height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: p.bg, cursor: "pointer" }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: "#fff" }}>{p.l}</span>
              </button>
            ))}
          </div>
        </Sec>

        <Sec title="3. Efeitos Especiais" icon="✨" open={false}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, marginBottom: 6, letterSpacing: "0.05em" }}>💡 LUZ</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, marginBottom: 10 }}>
            {EFFECTS.slice(0, 6).map(e => <Pill key={e.id} active={effects.includes(e.id)} onClick={() => toggle(e.id)} color="#EC4899"><span style={{ fontSize: 14 }}>{e.i}</span><div style={{ fontSize: 9 }}>{e.l}</div></Pill>)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, marginBottom: 6, letterSpacing: "0.05em" }}>🌫️ ATMOSFERA</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, marginBottom: 10 }}>
            {EFFECTS.slice(6, 12).map(e => <Pill key={e.id} active={effects.includes(e.id)} onClick={() => toggle(e.id)} color="#8B5CF6"><span style={{ fontSize: 14 }}>{e.i}</span><div style={{ fontSize: 9 }}>{e.l}</div></Pill>)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, marginBottom: 6, letterSpacing: "0.05em" }}>🌀 DISTORÇÃO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 5, marginBottom: 10 }}>
            {EFFECTS.slice(12, 16).map(e => <Pill key={e.id} active={effects.includes(e.id)} onClick={() => toggle(e.id)} color="#06B6D4"><span style={{ fontSize: 14 }}>{e.i}</span><div style={{ fontSize: 9 }}>{e.l}</div></Pill>)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, marginBottom: 6, letterSpacing: "0.05em" }}>🎨 OVERLAY</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
            {EFFECTS.slice(16).map(e => <Pill key={e.id} active={effects.includes(e.id)} onClick={() => toggle(e.id)} color="#F59E0B"><span style={{ fontSize: 14 }}>{e.i}</span><div style={{ fontSize: 9 }}>{e.l}</div></Pill>)}
          </div>
        </Sec>

        <button onClick={generate} disabled={loading} style={{ width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: loading ? "wait" : "pointer", background: "linear-gradient(135deg, #DC2626, #F97316)", color: "#fff", fontSize: 16, fontWeight: 800, opacity: loading ? 0.5 : 1 }}>
          {loading ? "⏳ Gerando..." : "🎨 Gerar Prompt ThumbStudio"}
        </button>
      </div>

      {/* Output */}
      <div>
        <Sec title="4. Prompts Gerados" icon="📋">
          {!output ? (
            <div style={{ textAlign: "center", padding: 30, color: C.dim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>Sua Saída Aparecerá Aqui</div>
              <div style={{ fontSize: 12 }}>Preencha os detalhes e clique em "Gerar" para ver a magia acontecer!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[{ k: "promptImageFX", t: "🎨 Prompt Principal", c: C.orange }, { k: "promptVariation2", t: "🔄 Variação 2", c: C.purple }, { k: "promptVariation3", t: "🚀 Variação 3 Ousada", c: C.cyan }].map(p => output[p.k] && (
                <div key={p.k}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: p.c, marginBottom: 6 }}>{p.t}</div>
                  <div style={{ padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, fontSize: 12, lineHeight: 1.6 }}>{output[p.k]}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => { navigator.clipboard.writeText(output[p.k]); toast?.success("Copiado!"); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10 }}>📋 Copiar</button>
                    <button onClick={() => genImage(p.k, output[p.k])} disabled={genImgLoading[p.k]} style={{ flex: 1, padding: "6px 14px", borderRadius: 6, border: "none", background: `linear-gradient(135deg, ${p.c}, ${p.c}99)`, color: "#fff", cursor: genImgLoading[p.k] ? "wait" : "pointer", fontSize: 11, fontWeight: 700, opacity: genImgLoading[p.k] ? 0.6 : 1 }}>
                      {genImgLoading[p.k] ? "⏳ Gerando..." : "🎨 Gerar Imagem (ImageFX)"}
                    </button>
                  </div>
                  {genImages[p.k] && (
                    <div style={{ marginTop: 8 }}>
                      <img src={genImages[p.k]} onClick={() => setModalImg(genImages[p.k])} style={{ width: "100%", borderRadius: 10, border: `2px solid ${p.c}40`, cursor: "pointer" }} title="Clique para ampliar" />
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <a href={genImages[p.k]} download={`thumb-${p.k}.png`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 6, background: "#22D35E15", color: "#22D35E", textDecoration: "none", fontSize: 11, fontWeight: 600, border: "1px solid #22D35E30" }}>💾 Baixar PNG</a>
                        <button onClick={() => genImage(p.k, output[p.k])} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10 }}>🔄 Refazer</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {output.textOverlay && (
                <div style={{ padding: 14, borderRadius: 10, background: C.green + "06", border: `1px solid ${C.green}20` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8 }}>📝 Texto Sugerido</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                    <div><span style={{ color: C.dim }}>Título:</span> <strong>{output.textOverlay.title}</strong></div>
                    <div><span style={{ color: C.dim }}>Sub:</span> {output.textOverlay.subtitle}</div>
                    <div><span style={{ color: C.dim }}>Badge:</span> <span style={{ color: C.red }}>{output.textOverlay.badge}</span></div>
                    <div><span style={{ color: C.dim }}>Emoji:</span> <span style={{ fontSize: 20 }}>{output.textOverlay.emoji}</span></div>
                  </div>
                </div>
              )}
              {output.ctrEstimate && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: (output.ctrEstimate >= 80 ? C.green : C.orange) + "15", border: `2px solid ${output.ctrEstimate >= 80 ? C.green : C.orange}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: output.ctrEstimate >= 80 ? C.green : C.orange }}>{output.ctrEstimate}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>CTR Score estimado</div>
                </div>
              )}
              {output.tips?.length > 0 && <div>{output.tips.map((t, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "4px 0 4px 12px", borderLeft: `2px solid ${C.orange}30`, marginBottom: 4 }}>{t}</div>)}</div>}
            </div>
          )}
        </Sec>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB 2: REMIX AI
   ═══════════════════════════════════════ */
function RemixAI({ toast, pg }) {
  const [thumbUrl, setThumbUrl] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genImages, setGenImages] = useState({});
  const [genImgLoading, setGenImgLoading] = useState({});
  const [modalImg, setModalImg] = useState(null);
  const genImage = async (key, prompt) => {
    setGenImgLoading(p => ({ ...p, [key]: true }));
    pg?.start("Gerando Remix", ["ImageFX processando"]);
    try {
      const r = await aiApi.generateAsset({ prompt: sanitizePrompt(prompt + ", YouTube thumbnail, 16:9, no text, ultra quality") });
      if (r.url || r.b64) { const imgUrl = r.url || ("data:image/png;base64," + r.b64); setGenImages(p => ({ ...p, [key]: imgUrl })); setModalImg(imgUrl); saveToHistory({ niche: "remix", prompt: prompt.slice(0, 500), imageUrl: imgUrl.startsWith("data:") ? "" : imgUrl, title: "Remix", style: "remix", score: 0 }); pg?.done(); toast?.success("Remix gerado!"); }
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
    setGenImgLoading(p => ({ ...p, [key]: false }));
  };

  const analyze = async () => {
    if (!thumbUrl) { toast?.error("Envie uma thumbnail"); return; }
    setLoading(true);
    pg?.start("🔄 Engenharia Reversa", ["Analisando composição", "Extraindo estilo", "Gerando variações"]);
    try {
      const reply = await aiCall([{ role: "system", content: "You are the WORLD'S #1 EXPERT in reverse-engineering viral YouTube thumbnails (2026). You decompose thumbnails into their EXACT composite layers. ALL PROMPTS MUST BE IN ENGLISH for Google ImageFX. Identify: exact hex palette, lighting type (Rembrandt/rim/butterfly/split), composition (rule of thirds/diagonal/central), DOF, style (neo-minimal/cinematic/flat/3D), psychological mood. Prompts: 120+ words, 16:9, photorealistic composite, NO text in image, ultra technical for ImageFX. REPLICATE the exact same layer structure — same number of layers, same spatial arrangement, same scale tricks." },
      { role: "user", content: `Do a COMPLETE REVERSE ENGINEERING of this YouTube thumbnail.

Extract: visual style (cinematic? flat? 3D? illustration?), EXACT hex color palette, composition and layout with all LAYERS identified (background layer, main subject cutout, secondary overlaid elements, effects layer), lighting style, mood/atmosphere, and any visual effects (bokeh, smoke, glitch, etc).

Then generate 3 ENGLISH PROMPTS for Google ImageFX/Imagen 3.5 that recreate variations KEEPING THE EXACT SAME COMPOSITE STRUCTURE:
1. FAITHFUL — same style, composition, and layer arrangement, subtle subject variation
2. REINTERPRETATION — same concept and layout with different angle/lighting
3. TRANSFORMATION — completely reimagined while keeping the same mood and composite formula

RESPOND JSON (no backticks):
{"analysis":{"style":"detailed visual style description","colors":["#hex1","#hex2","#hex3","#hex4","#hex5"],"composition":"how elements are layered and positioned, rule of thirds, focal point, scale relationships","lighting":"specific lighting type and direction","mood":"psychological atmosphere"},"remixPrompts":[{"name":"Faithful Variation","prompt":"ENGLISH ImageFX prompt 120+ words, 16:9 landscape, photorealistic composite, NO text, complete scene description with exact layer positions, lighting, colors, camera, atmosphere","changes":"what changes from original"},{"name":"Reinterpretation","prompt":"ENGLISH 120+ words with new angle but same layout","changes":"changes"},{"name":"Creative Transformation","prompt":"ENGLISH 120+ words completely reimagined but same composite formula","changes":"changes"}],"improvements":["specific actionable improvement 1","improvement 2","improvement 3"]}` }], pg);
      setOutput(JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()));
      pg?.done();
    } catch (e) { pg?.fail(e.message, () => analyze()); toast?.error(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <ImageModal src={modalImg} onClose={() => setModalImg(null)} title="Thumbnail Gerada — Remix AI" />
      <div>
        <Sec title="🔄 Engenharia Reversa (Remix)" icon="">
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>Faça upload de uma thumbnail existente. A IA irá extrair o estilo, texto e personagem para você criar variações baseadas nela.</p>
          {!thumbUrl ? <Drop onFile={f => setThumbUrl(URL.createObjectURL(f))} label="Clique para enviar uma Thumbnail" sub="Suporta JPG, PNG, WEBP (Máx 4MB)" /> : (
            <div style={{ position: "relative" }}><img src={thumbUrl} style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}` }} />
              <button onClick={() => { setThumbUrl(""); setOutput(null); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>)}
          <button onClick={analyze} disabled={loading || !thumbUrl} style={{ width: "100%", marginTop: 14, padding: "14px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#fff", fontSize: 14, fontWeight: 700, opacity: loading || !thumbUrl ? 0.5 : 1 }}>
            {loading ? "⏳ Analisando..." : "🔄 Remixar Thumbnail"}
          </button>
        </Sec>
      </div>
      <div>
        <Sec title="Prompts Gerados" icon="📋">
          {!output ? <div style={{ textAlign: "center", padding: 30, color: C.dim }}><div style={{ fontSize: 40, marginBottom: 12 }}>✨</div><div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Sua Saída Aparecerá Aqui</div><div style={{ fontSize: 12, marginTop: 6 }}>Faça upload de uma referência e clique em "Gerar"</div></div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {output.analysis && <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 8 }}>🔍 Análise</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                  <div><strong style={{ color: C.text }}>Estilo:</strong> {output.analysis.style}</div>
                  <div><strong style={{ color: C.text }}>Composição:</strong> {output.analysis.composition}</div>
                  <div><strong style={{ color: C.text }}>Mood:</strong> {output.analysis.mood}</div>
                  {output.analysis.colors?.length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 6 }}>{output.analysis.colors.map((c, i) => <div key={i} style={{ width: 24, height: 24, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.1)" }} />)}</div>}
                </div>
              </div>}
              {output.remixPrompts?.map((r, i) => { const k = "remix"+i; const clr = [C.orange, C.purple, C.cyan][i]; return <div key={i}>
                <div style={{ fontSize: 11, fontWeight: 700, color: clr, marginBottom: 6 }}>{r.name}</div>
                <div style={{ padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, fontSize: 12, lineHeight: 1.6 }}>{r.prompt}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={() => { navigator.clipboard.writeText(r.prompt); toast?.success("Copiado!"); }} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10 }}>📋 Copiar</button>
                  <button onClick={() => genImage(k, r.prompt)} disabled={genImgLoading[k]} style={{ flex: 1, padding: "6px 14px", borderRadius: 6, border: "none", background: `linear-gradient(135deg, ${clr}, ${clr}99)`, color: "#fff", cursor: genImgLoading[k] ? "wait" : "pointer", fontSize: 11, fontWeight: 700, opacity: genImgLoading[k] ? 0.6 : 1 }}>
                    {genImgLoading[k] ? "⏳ Gerando..." : "🎨 Gerar Imagem"}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>Mudança: {r.changes}</div>
                {genImages[k] && (
                  <div style={{ marginTop: 8 }}>
                    <img src={genImages[k]} onClick={() => setModalImg(genImages[k])} style={{ width: "100%", borderRadius: 10, border: `2px solid ${clr}40`, cursor: "pointer" }} title="Clique para ampliar" />
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <a href={genImages[k]} download={"remix-"+(i+1)+".png"} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 6, background: "#22D35E15", color: "#22D35E", textDecoration: "none", fontSize: 11, fontWeight: 600, border: "1px solid #22D35E30" }}>💾 Baixar PNG</a>
                      <button onClick={() => genImage(k, r.prompt)} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10 }}>🔄 Refazer</button>
                    </div>
                  </div>
                )}
              </div>; })}
              {output.improvements?.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6 }}>💡 Melhorias</div>{output.improvements.map((t, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "4px 0 4px 12px", borderLeft: `2px solid ${C.green}30`, marginBottom: 4 }}>{t}</div>)}</div>}
            </div>)}
        </Sec>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB 3: ANALISADOR VIRAL
   ═══════════════════════════════════════ */
function AnalisadorViral({ toast, pg }) {
  const [thumbUrls, setThumbUrls] = useState(["", "", ""]);
  const [titles, setTitles] = useState(["", "", ""]);
  const [niche, setNiche] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const setThumb = (i, f) => { const u = [...thumbUrls]; u[i] = URL.createObjectURL(f); setThumbUrls(u); };
  const sc = s => s >= 80 ? C.green : s >= 60 ? C.orange : C.red;

  const analyze = async () => {
    if (!titles[0].trim()) { toast?.error("Preencha o Título 1"); return; }
    setLoading(true);
    pg?.start("🔍 Analisando Viralização", ["Avaliando thumbnails", "Analisando títulos", "Score viral"]);
    try {
      const reply = await aiCall([{ role: "system", content: "Voce e o MAIOR ESPECIALISTA DO MUNDO em CTR e viralizacao no YouTube (2026). Dados que voce domina: MrBeast gasta $10.000/thumb com A/B testing extensivo. Top creators atingem 5-10% CTR, media e 3-4%. Thumbnails com emocao extrema +30% CTR (VidIQ 2025). Neo-minimalismo e tendencia 2026: espaco negativo, 1 ponto focal, max 5 palavras. 70% trafego e mobile, viewer decide em 0.5s. Texto deve estar no canto SUPERIOR ESQUERDO (87% dos top thumbnails). Bottom-right e zona morta (timestamp). Alto contraste neon e padrao 2026. Regra dos 12 caracteres: thumbs com menos de 12 chars performam MUITO melhor. Seja BRUTALMENTE HONESTO. Nota 90+ SO para thumbs que competem com top 0.1% do YouTube. Cada sugestao deve ser ESPECIFICA, ACIONAVEL e baseada em dados reais de 2026." },
      { role: "user", content: `ANALISE DE VIRALIZACAO COMPLETA (padrao 2026):

TITULOS PARA ANALISAR:
${titles.filter(Boolean).map((t, i) => (i+1)+". "+t).join("\n")}

NICHO: ${niche ? (NICHES.find(n => n.id === niche)?.l || niche) : "geral"}
THUMBNAILS: ${thumbUrls.filter(Boolean).length} thumbnail(s) enviada(s)

ANALISE CADA TITULO com base nos criterios 2026:
- Tem max 12 caracteres visivel na thumb? (regra dos 12 chars)
- Cria curiosity gap forte?
- Funciona em mobile (0.5s de decisao)?
- O titulo + thumb juntos contam uma historia?
- Compete com MrBeast/top creators do nicho?

A versao melhorada DEVE ser concretamente superior: mais curta, mais curiosa, mais emocional, max 5 palavras para thumb.

JSON (sem backticks):
{"overallScore":72,"titleAnalysis":[{"title":"titulo","score":68,"strengths":["ponto forte real e especifico"],"weaknesses":["fraqueza real com dados de porque prejudica CTR"],"improvedVersion":"VERSAO MELHORADA - max 5 palavras, curiosity gap forte, emocional"}],"viralFactors":{"curiosityGap":70,"emotionalImpact":65,"clarity":85,"uniqueness":55,"clickability":68},"thumbnailTips":["dica visual 2026 especifica sobre composicao","dica sobre cores/contraste baseada em dados","dica mobile-first acionavel"],"competitorInsight":"como esta thumb se compara com top 10 do nicho em 2026","actionPlan":["acao #1 mais impactante com dados de porque funciona","acao #2","acao #3"]}` }], pg);
      setOutput(JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()));
      pg?.done();
    } catch (e) { pg?.fail(e.message, () => analyze()); toast?.error(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}><div style={{ fontSize: 32 }}>🔍</div><div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>Analisador Viral</div><div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Cole suas thumbnails e títulos — a IA dá uma nota e sugere o que melhorar.</div></div>

      <Sec title="Thumbnails (até 3 opções)" icon="🖼️">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[0,1,2].map(i => !thumbUrls[i] ? <Drop key={i} onFile={f => setThumb(i, f)} label={`Thumb ${i+1}${i===0?" *":""}`} sub="JPG, PNG, WEBP" /> : (
            <div key={i} style={{ position: "relative" }}><img src={thumbUrls[i]} style={{ width: "100%", borderRadius: 10, border: `1px solid ${C.border}` }} />
              <button onClick={() => { const u=[...thumbUrls]; u[i]=""; setThumbUrls(u); }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>))}
        </div>
      </Sec>

      <Sec title="Títulos (até 3 opções)" icon="✏️">
        {[0,1,2].map(i => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Input value={titles[i]} onChange={e => { const t=[...titles]; t[i]=e.target.value; setTitles(t); }} placeholder={i===0?"Título 1 (Obrigatório)":`Título ${i+1} (Opcional)`} style={{ flex: 1, borderColor: i===0?C.red+"40":C.border }} />
          <span style={{ fontSize: 11, color: C.dim, width: 40, textAlign: "right", alignSelf: "center" }}>{titles[i].length}/100</span>
        </div>)}
      </Sec>

      <Sec title="Nicho (opcional — melhora a análise)" icon="🎯">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{NICHES.slice(0,15).map(n => <Pill key={n.id} active={niche===n.id} onClick={() => setNiche(niche===n.id?"":n.id)} color="#DC2626">{n.l}</Pill>)}</div>
      </Sec>

      <button onClick={analyze} disabled={loading||!titles[0].trim()} style={{ width: "100%", padding: "18px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #DC2626, #991B1B)", color: "#fff", fontSize: 16, fontWeight: 800, opacity: loading||!titles[0].trim()?0.5:1, marginBottom: 20 }}>
        {loading ? "⏳ Analisando..." : "🔍 Analisar Viralização"}
      </button>

      {output && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center", padding: 24, background: "rgba(255,255,255,0.02)", borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", border: `4px solid ${sc(output.overallScore)}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 28, fontWeight: 900, color: sc(output.overallScore) }}>{output.overallScore}</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Score de Viralização</div>
        </div>
        {output.viralFactors && <div style={{ padding: 18, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📊 Fatores</div>
          {Object.entries(output.viralFactors).map(([k,v]) => {
            const labels = { curiosityGap: "Curiosity Gap", emotionalImpact: "Impacto Emocional", clarity: "Clareza", uniqueness: "Originalidade", clickability: "Clickability" };
            return <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, color: C.muted }}>{labels[k]||k}</span><span style={{ fontSize: 12, fontWeight: 700, color: sc(v) }}>{v}%</span></div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}><div style={{ width: v+"%", height: "100%", borderRadius: 3, background: sc(v), transition: "width 0.8s" }} /></div>
            </div>;
          })}
        </div>}
        {output.titleAnalysis?.map((ta, i) => <div key={i} style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: sc(ta.score)+"15", border: `2px solid ${sc(ta.score)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: sc(ta.score) }}>{ta.score}</div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>"{ta.title}"</div>
          </div>
          {ta.strengths?.map((s, j) => <span key={j} style={{ display: "inline-block", marginRight: 4, marginBottom: 4, padding: "3px 8px", borderRadius: 6, background: C.green+"10", fontSize: 11, color: C.green }}>✓ {s}</span>)}
          {ta.weaknesses?.map((w, j) => <span key={j} style={{ display: "inline-block", marginRight: 4, marginBottom: 4, padding: "3px 8px", borderRadius: 6, background: C.red+"10", fontSize: 11, color: C.red }}>✕ {w}</span>)}
          {ta.improvedVersion && <div style={{ padding: "8px 12px", borderRadius: 8, background: C.blue+"08", border: `1px solid ${C.blue}20`, fontSize: 12, marginTop: 6 }}><span style={{ color: C.blue, fontWeight: 600 }}>Sugestão:</span> {ta.improvedVersion}</div>}
        </div>)}
        {output.thumbnailTips?.length > 0 && <div style={{ padding: 16, borderRadius: 12, background: C.purple+"06", border: `1px solid ${C.purple}20`, marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.purple, marginBottom: 10 }}>🖼️ Dicas da Thumbnail (2026)</div>
          {output.thumbnailTips.map((t, i) => <div key={i} style={{ fontSize: 12, color: C.text, padding: "6px 0 6px 16px", borderLeft: `3px solid ${C.purple}`, marginBottom: 6, lineHeight: 1.5 }}>{t}</div>)}
        </div>}
        {output.competitorInsight && <div style={{ padding: 16, borderRadius: 12, background: C.blue+"06", border: `1px solid ${C.blue}20`, marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 8 }}>🏆 vs Concorrentes</div>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{output.competitorInsight}</div>
        </div>}
        {output.actionPlan?.length > 0 && <div style={{ padding: 16, borderRadius: 12, background: C.orange+"06", border: `1px solid ${C.orange}20` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, marginBottom: 10 }}>🎯 Plano de Ação</div>
          {output.actionPlan.map((a, i) => <div key={i} style={{ fontSize: 12, padding: "6px 0 6px 16px", borderLeft: `3px solid ${C.orange}`, marginBottom: 6 }}>{i+1}. {a}</div>)}
        </div>}
      </div>}
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB 4: EDITOR CANVAS
   ═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   TAB 5: TRENDS — Thumbnails virais do YouTube
   ═══════════════════════════════════════ */
function TrendsTab({ toast, pg }) {
  const [niche, setNiche] = useState("gaming");
  const [format, setFormat] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [modalImg, setModalImg] = useState(null);
  const [genImgLoading, setGenImgLoading] = useState({});
  const [autoNiche, setAutoNiche] = useState(null);
  const BASE = "/api";
  const getToken = () => localStorage.getItem("lc_token");

  // Auto-detect user's niche on mount
  useEffect(() => {
    fetch(`${BASE}/trends/my-niche`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.niche) {
          setNiche(d.niche);
          setAutoNiche(d);
        }
      }).catch(() => {});
  }, []);

  const fetchTrends = async () => {
    setLoading(true); setData(null); setSelected(null); setAnalysis(null);
    try {
      const res = await fetch(`${BASE}/trends/thumbnails/${niche}?format=${format}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
    } catch (e) { toast?.error(e.message); }
    setLoading(false);
  };

  const analyzeThumb = async (video) => {
    setSelected(video); setAnalyzing(true); setAnalysis(null);
    const combo = await getComboSettings();
    const isCombo = !!combo;

    pg?.start(
      isCombo ? `Combo IA: Analisando thumbnail` : "Analisando thumbnail viral",
      isCombo
        ? [`Modelo 1 (${combo.analysisModel.split("-").slice(0,2).join("-")}): Análise visual profunda`, `Modelo 2 (${combo.promptModel.split("-").slice(0,2).join("-")}): Gerando prompts ImageFX`, "Finalizando"]
        : ["Decompondo layers frame-a-frame", "Extraindo DNA visual + composição", "Gerando prompts em inglês"]
    );

    try {
      const nicheLabel = NICHES.find(n => n.id === niche)?.l || niche;
      const formatLabel = video.format === "portrait" ? "9:16 portrait (Short)" : "16:9 landscape";
      const formatPrompt = video.format === "portrait" ? "9:16 portrait vertical" : "16:9 landscape";

      const ANALYSIS_SYSTEM = `You are the WORLD'S #1 EXPERT in reverse-engineering viral YouTube thumbnails. You understand that viral thumbnails are NOT photos — they are PHOTOSHOP COMPOSITES with multiple layers.

YOUR JOB: Decompose the thumbnail into its EXACT layers, then generate ImageFX prompts that REPLICATE THE SAME LAYER STRUCTURE with different subjects.

STEP 1 — IDENTIFY THUMBNAIL TYPE:
- TYPE A (COMPOSITE/MONTAGE): Cutout person + overlaid elements + separate background. MOST viral thumbnails are this type.
- TYPE B (SINGLE SCENE): One unified cinematic image without layer compositing.

STEP 2 — FOR TYPE A (COMPOSITE), decompose EVERY LAYER:
1. BACKGROUND LAYER: What image/gradient? Color temperature, blur level, atmosphere
2. MAIN SUBJECT LAYER: Who/what is cut out? EXACT position (left/center/right, what % of frame). Expression if person. Scale relative to background (impossible scale = viral trick).
3. SECONDARY ELEMENTS LAYER: What else is overlaid? (movie scenes, objects, logos, other smaller characters). EXACT position of each.
4. EFFECTS LAYER: Glow, drop shadow, artificial rim light, color grading, vignette, particles, fog
5. SPATIAL LAYOUT: How are elements distributed? (triangular, symmetrical, rule of thirds, Z-pattern, diagonal)
6. PALETTE: Dominant hex colors. Contrast between warm/cold layers.

CRITICAL RULES FOR PROMPTS:
- ALL PROMPTS MUST BE IN ENGLISH (ImageFX only works with English prompts)
- REPLICATE the EXACT SAME LAYOUT/FORMULA but with DIFFERENT subjects and scenery
- If original is "person cutout center + pyramids behind + movie scenes on sides" → your prompt must describe EXACTLY that structure: "person in heroic pose centered, large architectural element behind, two thematic scenes flanking left and right"
- PRESERVE impossible scale, layer overlapping, compositing style
- If original has person at 60% of frame with background at impossible scale → keep that ratio
- MINIMUM 150 words per prompt — ultra specific
- NEVER include text/letters in the image
- SAFETY: No blood, weapons, violence, death, explosion. Use alternatives (energy wave, tension, paint, mark).`;

      const ANALYSIS_USER = `REVERSE-ENGINEER this viral thumbnail and generate prompts that CLONE ITS FORMULA:

VIDEO: "${video.title}"
CHANNEL: "${video.channel}"
VIEWS: ${(video.views/1000).toFixed(0)}K
NICHE: ${nicheLabel}
FORMAT: ${formatLabel}

Decompose EVERY SINGLE LAYER: what is the background, what is cut out in front, what secondary elements are overlaid, what effects unify the composite, what is the exact spatial arrangement and scale relationship.

Then generate prompts that use the EXACT SAME composite structure/layout/scale-tricks but with a COMPLETELY DIFFERENT subject while maintaining the same visual impact.

RESPOND ONLY with this JSON (no markdown, no backticks):
{"thumbType":"COMPOSITE or SINGLE SCENE","formula":"EXACT formula description: how many layers, what each layer contains, positions, scale relationships. E.g.: 'Person cutout at 60% frame right side + ancient ruins at impossible scale behind left + fire particles overlay + sepia-gold color grade + heavy vignette'","whyItWorks":"Why this formula works: visual triggers, psychological tricks, contrast techniques. Minimum 3 sentences.","composition":"DETAILED DECOMPOSITION: foreground (what, % of frame, position), midground (what, % of frame), background (what). Focal point. Leading lines. Compositional rule. Depth of field simulation.","lightingAnalysis":"Exact lighting type, direction, color temperature, ratio, atmospheric effects, how it unifies the composite layers","colorPalette":["#hex1","#hex2","#hex3","#hex4","#hex5"],"promptRecreate":"ENGLISH PROMPT 150+ words for ImageFX. REPLICATE THE EXACT SAME COMPOSITE LAYOUT: same number of layers, same spatial arrangement, same scale relationships, same lighting direction. CHANGE the subject/characters/scenery but KEEP the formula identical. Include: exact position of each element (left/center/right, % of frame), size relationships, lighting (type + color temp + direction), color palette in hex, atmospheric effects, render style. ${formatPrompt}, photorealistic composite, no text, 8K resolution.","promptVariation":"ENGLISH PROMPT 150+ words. RADICAL VARIATION: same cinematographic technique but completely different visual genre. If original is ancient history, do sci-fi. If action, do noir. Keep the SAME IMPACT and SAME LAYOUT STRUCTURE but transform everything else. ${formatPrompt}, no text, 8K.","textSuggestion":"Where to position text overlay on this composition for maximum CTR (corner, center, size, text color vs background contrast)","ctrTips":["technical tip 1 based on this thumb decomposition","tip 2 about what the original does better than 90% of the niche","tip 3: how to SURPASS this original"]}`;

      let reply;

      if (isCombo) {
        const PROMPT_SYSTEM = `You are an expert PROMPT ENGINEER for Google ImageFX / Imagen 3.5. You receive a detailed visual analysis of a thumbnail and transform it into PERFECT ImageFX prompts.
RULES: ALL OUTPUT IN ENGLISH. Minimum 150 words per prompt. NEVER text/letters. Describe as COMPOSITE with layers if it's a montage. Include exact position, relative size, lighting, hex palette, atmosphere. SAFETY: no blood, weapons, violence.`;

        const PROMPT_TEMPLATE = `Based on this DEEP VISUAL ANALYSIS by a specialist AI:

---ANALYSIS---
{analysis}
---END ANALYSIS---

NOW generate ImageFX prompts that REPLICATE THE EXACT SAME FORMULA/LAYOUT but with DIFFERENT subjects and SUPERIOR execution.

RESPOND ONLY with this JSON (no markdown, no backticks):
{"thumbType":"COMPOSITE or SINGLE SCENE","formula":"exact formula","whyItWorks":"why it works","composition":"detailed decomposition","lightingAnalysis":"lighting details","colorPalette":["#hex1","#hex2","#hex3","#hex4","#hex5"],"promptRecreate":"ENGLISH PROMPT 150+ words, ${formatPrompt}, no text, 8K","promptVariation":"ENGLISH RADICAL VARIATION 150+ words, ${formatPrompt}, no text, 8K","textSuggestion":"text positioning advice","ctrTips":["tip1","tip2","tip3"]}`;

        const result = await aiComboCall(
          ANALYSIS_SYSTEM, ANALYSIS_USER, PROMPT_SYSTEM, PROMPT_TEMPLATE,
          combo, pg
        );
        reply = result.reply;
      } else {
        reply = await aiCall([
          { role: "system", content: ANALYSIS_SYSTEM },
          { role: "user", content: ANALYSIS_USER }
        ], pg);
      }

      setAnalysis(JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()));
      pg?.done();
    } catch (e) { pg?.fail(e.message, () => analyzeThumb(video)); toast?.error(e.message); }
    setAnalyzing(false);
  };

  const fmtViews = v => v >= 1000000 ? (v/1000000).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(0)+"K" : v;

  return (
    <div>
      <ImageModal src={modalImg} onClose={() => setModalImg(null)} title="Thumbnail Gerada — Trends" />

      {/* Auto-niche banner */}
      {autoNiche && autoNiche.niche ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, background: C.green + "08", border: `1px solid ${C.green}20`, marginBottom: 12, fontSize: 12 }}>
          <span style={{ color: C.green, fontWeight: 700 }}>🎯 Nicho detectado:</span>
          <span style={{ color: C.text, fontWeight: 600 }}>{NICHES.find(n => n.id === autoNiche.niche)?.l || autoNiche.niche}</span>
          {autoNiche.channel && <span style={{ color: C.dim }}>({autoNiche.channel})</span>}
          <span style={{ fontSize: 10, color: C.dim, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)" }}>{
            autoNiche.source === "channel" ? "Salvo no canal" :
            autoNiche.source === "detected" ? "Auto-detectado dos videos" :
            autoNiche.source === "youtube-api" ? "Via YouTube API" : ""
          }</span>
          <button onClick={() => { setAutoNiche(null); }} style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 10 }}>Mudar</button>
        </div>
      ) : autoNiche && !autoNiche.niche ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, background: C.orange + "06", border: `1px solid ${C.orange}15`, marginBottom: 12, fontSize: 12 }}>
          <span style={{ color: C.orange }}>💡</span>
          <span style={{ color: C.muted }}>Nao detectamos o nicho do seu canal automaticamente. Selecione manualmente acima para resultados mais relevantes.</span>
        </div>
      ) : null}

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <select value={niche} onChange={e => setNiche(e.target.value)} style={{ padding: "8px 14px", borderRadius: 8, background: "#1a1a2e", border: `1px solid ${C.border}`, color: "#fff", fontSize: 13 }}>
          {NICHES.map(n => <option key={n.id} value={n.id}>{n.i} {n.l}</option>)}
        </select>

        {/* Format filter */}
        <div style={{ display: "flex", gap: 2, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
          {[
            { v: "all", l: "Todos", i: "📺" },
            { v: "landscape", l: "Paisagem", i: "🖥️" },
            { v: "portrait", l: "Shorts", i: "📱" },
          ].map(f => (
            <button key={f.v} onClick={() => setFormat(f.v)} style={{
              padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: format === f.v ? 700 : 400,
              background: format === f.v ? C.blue + "20" : "rgba(255,255,255,0.02)",
              color: format === f.v ? C.blue : C.muted,
            }}>{f.i} {f.l}</button>
          ))}
        </div>

        <button onClick={fetchTrends} disabled={loading} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #DC2626, #F97316)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Buscando..." : "🔍 Buscar Thumbnails Virais"}
        </button>
        {data && <span style={{ fontSize: 11, color: C.dim }}>Busca: "{data.query}" · {data.videos?.length} resultados {data.format !== "all" ? `(${data.format})` : ""}</span>}
      </div>

      {/* Niche palette */}
      {NICHE_PALETTES[niche] && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: C.dim }}>Paleta {NICHES.find(n=>n.id===niche)?.l}:</span>
          <div style={{ display: "flex", gap: 4 }}>{NICHE_PALETTES[niche].colors.map((c, i) => <div key={i} style={{ width: 24, height: 24, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }} title={c} onClick={() => { navigator.clipboard.writeText(c); toast?.success("Cor copiada: "+c); }} />)}</div>
          <span style={{ fontSize: 10, color: C.muted, flex: 1 }}>{NICHE_PALETTES[niche].tip}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
        {/* Video grid */}
        <div>
          {data?.videos?.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: format === "portrait" ? "repeat(auto-fill, minmax(160px, 1fr))" : "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {data.videos.map(v => (
                <div key={v.id} style={{ borderRadius: 12, overflow: "hidden", border: `2px solid ${selected?.id === v.id ? C.orange : C.border}`, background: "rgba(255,255,255,0.02)", transition: "0.2s" }}>
                  <div onClick={() => analyzeThumb(v)} style={{ cursor: "pointer", position: "relative" }}>
                    <img src={v.thumbnail || v.thumbnailDefault} style={{ width: "100%", aspectRatio: v.format === "portrait" ? "9/16" : "16/9", objectFit: "cover", display: "block" }} />
                    {v.isShort && <span style={{ position: "absolute", top: 6, left: 6, background: "#FF0000", color: "#fff", fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>SHORT</span>}
                    <span style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 3 }}>{v.duration?.replace("PT","").replace("H",":").replace("M",":").replace("S","") || ""}</span>
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <div onClick={() => analyzeThumb(v)} style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, alignItems: "center" }}>
                      <span style={{ color: C.muted }}>{v.channel}</span>
                      <span style={{ color: C.green, fontWeight: 700 }}>{fmtViews(v.views)} views</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      <button onClick={(e) => { e.stopPropagation(); analyzeThumb(v); }} style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.orange}30`, background: `${C.orange}08`, color: C.orange, cursor: "pointer", fontSize: 9, fontWeight: 600 }}>🔍 Analisar</button>
                      <button onClick={(e) => { e.stopPropagation(); const url = v.thumbnail || v.thumbnailDefault; if (!url) return; fetch(url).then(r => r.blob()).then(blob => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `thumb-${v.channel.replace(/[^a-z0-9]/gi,"_")}-${v.id}.jpg`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href); toast?.success("Thumbnail baixada!"); }).catch(() => { window.open(url, "_blank"); }); }} style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.green}30`, background: `${C.green}08`, color: C.green, cursor: "pointer", fontSize: 9, fontWeight: 600 }}>💾 Baixar Thumb</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div style={{ textAlign: "center", padding: 40, color: C.dim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Descubra o que esta viralizando</div>
              <div style={{ fontSize: 12 }}>Selecione nicho e formato, clique em "Buscar" para ver thumbnails com mais views.</div>
            </div>
          )}
        </div>

        {/* Analysis panel */}
        {selected && (
          <div>
            <Sec title={`Analise: ${selected.title.slice(0,50)}...`} icon="🔍">
              {analyzing ? (
                <div style={{ textAlign: "center", padding: 20, color: C.dim }}>Analisando...</div>
              ) : analysis ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Type badge + Formula */}
                  {analysis.thumbType && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 6, background: analysis.thumbType?.includes("MONTAGEM") ? C.purple+"20" : C.blue+"20", color: analysis.thumbType?.includes("MONTAGEM") ? C.purple : C.blue }}>{analysis.thumbType?.includes("MONTAGEM") ? "🎭 MONTAGEM" : "📸 CENA ÚNICA"}</span>
                    </div>
                  )}
                  {analysis.formula && (
                    <div style={{ padding: 12, borderRadius: 8, background: C.purple+"06", border: `1px solid ${C.purple}20` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 6 }}>Formula da Thumbnail</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{analysis.formula}</div>
                    </div>
                  )}
                  <div style={{ padding: 12, borderRadius: 8, background: C.green+"08", border: `1px solid ${C.green}20` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6 }}>Porque esta viral</div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{analysis.whyItWorks}</div>
                  </div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}><strong>Composicao:</strong> {analysis.composition}</div>
                  {analysis.lightingAnalysis && <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginTop: 4 }}><strong style={{ color: C.orange }}>Iluminacao:</strong> {analysis.lightingAnalysis}</div>}
                  {analysis.colorPalette?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: C.dim }}>Paleta:</span>
                      {analysis.colorPalette.map((c, i) => <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.1)" }} title={c} />)}
                    </div>
                  )}
                  {[{ k: "promptRecreate", t: "Prompt para Recriar", c: C.orange }, { k: "promptVariation", t: "Variacao Ousada", c: C.purple }].map(p => analysis[p.k] && (
                    <div key={p.k}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: p.c, marginBottom: 4 }}>{p.t}</div>
                      <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, fontSize: 12, lineHeight: 1.6 }}>{analysis[p.k]}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <button onClick={() => { navigator.clipboard.writeText(analysis[p.k]); toast?.success("Copiado!"); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10 }}>Copiar</button>
                        <button onClick={async () => { const k = p.k; setGenImgLoading(prev => ({...prev, [k]: true})); pg?.start("Gerando", ["ImageFX processando"]); try { const r = await aiApi.generateAsset({ prompt: sanitizePrompt(analysis[p.k] + ", YouTube thumbnail, " + (selected.format === "portrait" ? "9:16 portrait" : "16:9 landscape") + ", no text, ultra quality, 8K") }); if (r.url || r.b64) { const url = r.url || ("data:image/png;base64," + r.b64); setModalImg(url); saveToHistory({ niche, prompt: analysis[p.k]?.slice(0, 500) || "", imageUrl: url.startsWith("data:") ? "" : url, title: selected?.title || "", style: "trends", score: 0 }); pg?.done(); toast?.success("Imagem gerada!"); } } catch (e) { pg?.fail(e.message); toast?.error(e.message); } setGenImgLoading(prev => ({...prev, [k]: false})); }} disabled={genImgLoading[p.k]} style={{ flex: 1, padding: "5px 12px", borderRadius: 6, border: "none", background: genImgLoading[p.k] ? "rgba(255,255,255,0.05)" : `${p.c}20`, color: genImgLoading[p.k] ? C.dim : p.c, cursor: genImgLoading[p.k] ? "wait" : "pointer", fontSize: 10, fontWeight: 600 }}>{genImgLoading[p.k] ? "Gerando..." : "Gerar Imagem (ImageFX)"}</button>
                      </div>
                    </div>
                  ))}
                  {analysis.ctrTips?.length > 0 && <div>{analysis.ctrTips.map((t, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "4px 0 4px 12px", borderLeft: `2px solid ${C.orange}30`, marginBottom: 4 }}>{t}</div>)}</div>}
                </div>
              ) : null}
            </Sec>
          </div>
        )}
      </div>
    </div>
  );
}


function YouTubePreview({ canvasRef, title = "Titulo do Video", channel = "Seu Canal" }) {
  const [mode, setMode] = useState("home");
  const [thumbSrc, setThumbSrc] = useState("");

  useEffect(() => {
    const c = canvasRef?.current;
    if (c) { try { setThumbSrc(c.toDataURL("image/png")); } catch {} }
  });

  const views = Math.floor(Math.random() * 900 + 100) + "K visualizacoes";
  const time = ["2:34", "10:15", "8:42", "15:30", "5:17"][Math.floor(Math.random() * 5)];
  const ago = ["ha 2 horas", "ha 5 horas", "ha 1 dia", "ha 3 dias"][Math.floor(Math.random() * 4)];

  const thumbImg = thumbSrc ? <img src={thumbSrc} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: "100%", background: "#222" }} />;

  return (
    <Sec title="Preview YouTube" icon="📺" open={false}>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {["home", "search", "sidebar", "mobile"].map(m => (
          <Pill key={m} active={mode === m} onClick={() => setMode(m)} color={C.red}>
            {m === "home" ? "Feed" : m === "search" ? "Busca" : m === "sidebar" ? "Sidebar" : "Mobile"}
          </Pill>
        ))}
      </div>

      <div style={{ background: mode === "mobile" ? "#000" : "#0F0F0F", borderRadius: 10, padding: mode === "mobile" ? "8px" : "14px", overflow: "hidden" }}>
        {mode === "home" && (
          <div style={{ maxWidth: 360 }}>
            <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "16/9" }}>
              {thumbImg}
              <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>{time}</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#333", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title || "Titulo do Video"}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{channel} · {views} · {ago}</div>
              </div>
            </div>
          </div>
        )}

        {mode === "search" && (
          <div style={{ display: "flex", gap: 12, maxWidth: 500 }}>
            <div style={{ position: "relative", width: 200, flexShrink: 0, borderRadius: 8, overflow: "hidden", aspectRatio: "16/9" }}>
              {thumbImg}
              <span style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 3 }}>{time}</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", lineHeight: 1.3, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 10, color: "#aaa" }}>{views} · {ago}</div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#333" }} />
                {channel}
              </div>
            </div>
          </div>
        )}

        {mode === "sidebar" && (
          <div style={{ display: "flex", gap: 8, maxWidth: 350 }}>
            <div style={{ position: "relative", width: 168, flexShrink: 0, borderRadius: 6, overflow: "hidden", aspectRatio: "16/9" }}>
              {thumbImg}
              <span style={{ position: "absolute", bottom: 3, right: 3, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 8, padding: "1px 4px", borderRadius: 2 }}>{time}</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#fff", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>{channel}</div>
              <div style={{ fontSize: 10, color: "#aaa" }}>{views}</div>
            </div>
          </div>
        )}

        {mode === "mobile" && (
          <div style={{ maxWidth: 200, margin: "0 auto" }}>
            <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", aspectRatio: "16/9" }}>
              {thumbImg}
              <span style={{ position: "absolute", bottom: 3, right: 3, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 8, padding: "1px 4px", borderRadius: 2 }}>{time}</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#fff", lineHeight: 1.2 }}>{title}</div>
              <div style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>{channel} · {views}</div>
            </div>
            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#181818", fontSize: 9, color: C.orange, fontWeight: 600, textAlign: "center" }}>
              Este e o tamanho real no feed mobile (120x68px)
            </div>
          </div>
        )}
      </div>
    </Sec>
  );
}

/* ═══════════════════════════════════════
   TAB 4: EDITOR CANVAS (Enhanced)
   ═══════════════════════════════════════ */
function EditorCanvas({ toast, pg }) {
  const cvs = useRef(null);
  const [layers, setLayers] = useState([{ id: 1, text: "SEU TITULO", x: 640, y: 320, size: 72, font: "Impact, sans-serif", weight: 900, color: "#FFFFFF", stroke: true, strokeColor: "#000000", strokeWidth: 5, shadow: true, shadowBlur: 16, visible: true }]);
  const [selLayer, setSelLayer] = useState(1);
  const [template, setTemplate] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBg, setAiBg] = useState(null);
  const [userBg, setUserBg] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [badge, setBadge] = useState("");
  const [emoji, setEmoji] = useState("");
  const [dragging, setDragging] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [niche, setNiche] = useState("outro");
  const W = 1280, H = 720;
  const bg = userBg || aiBg;
  const nextId = useRef(2);

  const addLayer = () => { const id = nextId.current++; setLayers(p => [...p, { id, text: "TEXTO", x: 640, y: 400, size: 48, font: "'Montserrat', sans-serif", weight: 700, color: "#FFFFFF", stroke: false, strokeColor: "#000", strokeWidth: 3, shadow: true, shadowBlur: 10, visible: true }]); setSelLayer(id); };
  const updateLayer = (id, data) => setLayers(p => p.map(l => l.id === id ? { ...l, ...data } : l));
  const removeLayer = (id) => { setLayers(p => p.filter(l => l.id !== id)); if (selLayer === id) setSelLayer(layers[0]?.id); };
  const curLayer = layers.find(l => l.id === selLayer);

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d"); c.width = W; c.height = H;
    const t = TEMPLATES_CANVAS[template];
    const drawContent = () => {
      const vg = ctx.createRadialGradient(W/2, H/2, W*.2, W/2, H/2, W*.7);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      layers.filter(l => l.visible).forEach(l => {
        ctx.font = `${l.weight} ${l.size}px ${l.font}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (l.stroke) { ctx.strokeStyle = l.strokeColor; ctx.lineWidth = l.strokeWidth; ctx.lineJoin = "round"; ctx.strokeText(l.text.toUpperCase(), l.x, l.y); }
        if (l.shadow) { ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = l.shadowBlur; ctx.shadowOffsetY = 3; }
        ctx.fillStyle = l.color; ctx.fillText(l.text.toUpperCase(), l.x, l.y);
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      });
      if (badge) { ctx.fillStyle = t.accentColor; ctx.font = "bold 22px Arial"; const bw = ctx.measureText(badge).width+30; ctx.beginPath(); ctx.roundRect(W-bw-20, 20, bw, 44, 8); ctx.fill(); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(badge, W-bw/2-20, 48); }
      if (emoji) { ctx.font = "100px Arial"; ctx.textAlign = "left"; ctx.fillText(emoji, 40, H-60); }
    };
    const fillGrad = () => { const grd = ctx.createLinearGradient(0,0,W,H); const colors = t.bg.match(/#[a-f0-9]{3,8}/gi) || ["#1a1a2e"]; colors.forEach((c, i) => grd.addColorStop(i/Math.max(colors.length-1,1), c)); ctx.fillStyle = grd; ctx.fillRect(0,0,W,H); };
    if (bg) { const img = new Image(); img.crossOrigin = "anonymous"; img.src = bg; img.onload = () => { ctx.drawImage(img,0,0,W,H); drawContent(); }; img.onerror = () => { fillGrad(); drawContent(); }; } else { fillGrad(); drawContent(); }
  }, [layers, template, bg, badge, emoji]);

  useEffect(() => { draw(); }, [draw]);

  // Mouse drag for text layers
  const onMouseDown = (e) => {
    const c = cvs.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i]; if (!l.visible) continue;
      const tw = l.text.length * l.size * 0.5, th = l.size;
      if (mx > l.x - tw/2 && mx < l.x + tw/2 && my > l.y - th/2 && my < l.y + th/2) {
        setDragging({ id: l.id, offX: mx - l.x, offY: my - l.y }); setSelLayer(l.id); return;
      }
    }
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const c = cvs.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width), my = (e.clientY - rect.top) * (H / rect.height);
    updateLayer(dragging.id, { x: Math.round(mx - dragging.offX), y: Math.round(my - dragging.offY) });
  };
  const onMouseUp = () => setDragging(null);

  const genBg = async () => { if (!aiPrompt.trim()) return; setGenLoading(true); pg?.start("Gerando", ["ImageFX processando"]); try { const r = await aiApi.generateAsset({ prompt: sanitizePrompt(aiPrompt + ", YouTube thumbnail, 16:9, cinematic, 8K, no text") }); if (r.url || r.b64) { setAiBg(r.url || ("data:image/png;base64,"+r.b64)); setUserBg(null); pg?.done(); toast?.success("Background gerado!"); } } catch (e) { pg?.fail(e.message); } setGenLoading(false); };
  const exp = (s=1) => { const c = cvs.current; if (!c) return; if (s===1) { const l = document.createElement("a"); l.download = "thumbnail.png"; l.href = c.toDataURL("image/png"); l.click(); } else { const h = document.createElement("canvas"); h.width=W*s; h.height=H*s; h.getContext("2d").drawImage(c,0,0,W*s,H*s); const l = document.createElement("a"); l.download = `thumb-${W*s}x${H*s}.png`; l.href = h.toDataURL("image/png"); l.click(); } toast?.success("Exportado!"); };
  const palette = NICHE_PALETTES[niche] || NICHE_PALETTES.outro;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <div>
        {/* Canvas with drag */}
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, cursor: dragging ? "grabbing" : "grab", position: "relative" }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
          <canvas ref={cvs} style={{ width: "100%", height: "auto", display: "block" }} />
          <div style={{ position: "absolute", top: 8, left: 8, fontSize: 9, color: "rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.5)", padding: "2px 8px", borderRadius: 4 }}>Arraste o texto para posicionar</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <Btn onClick={() => exp(1)}>1280x720</Btn>
          <Btn onClick={() => exp(2)} style={{ background: C.blue+"15", color: C.blue }}>2K HD</Btn>
          <Btn onClick={() => exp(3)} style={{ background: C.purple+"15", color: C.purple }}>4K</Btn>
          <Btn onClick={() => setShowPreview(!showPreview)} style={{ background: showPreview ? C.red+"15" : "transparent", color: showPreview ? C.red : C.dim }}>{showPreview ? "Fechar Preview" : "📺 Preview YouTube"}</Btn>
        </div>
        {showPreview && <YouTubePreview canvasRef={cvs} title={layers[0]?.text} />}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "80vh", overflowY: "auto" }}>
        {/* Text Layers */}
        <Sec title={`Camadas de Texto (${layers.length})`} icon="📝">
          {layers.map(l => (
            <div key={l.id} onClick={() => setSelLayer(l.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: selLayer === l.id ? C.blue+"12" : "rgba(255,255,255,0.02)", border: `1px solid ${selLayer === l.id ? C.blue+"40" : C.border}` }}>
              <span style={{ fontSize: 9, color: C.dim, width: 14 }}>#{l.id}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: l.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.text || "(vazio)"}</span>
              <button onClick={e => { e.stopPropagation(); updateLayer(l.id, { visible: !l.visible }); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: l.visible ? C.green : C.dim }}>{l.visible ? "👁" : "👁‍🗨"}</button>
              {layers.length > 1 && <button onClick={e => { e.stopPropagation(); removeLayer(l.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: C.red }}>✕</button>}
            </div>
          ))}
          <button onClick={addLayer} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px dashed ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 11 }}>+ Adicionar Texto</button>

          {curLayer && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              <Label t="Texto" /><input value={curLayer.text} onChange={e => updateLayer(curLayer.id, { text: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)", color: C.text, outline: "none", fontSize: 13, marginBottom: 8 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <div><Label t="Tamanho" /><input type="range" min="20" max="120" value={curLayer.size} onChange={e => updateLayer(curLayer.id, { size: +e.target.value })} style={{ width: "100%" }} /><span style={{ fontSize: 10, color: C.dim }}>{curLayer.size}px</span></div>
                <div><Label t="Cor" /><input type="color" value={curLayer.color} onChange={e => updateLayer(curLayer.id, { color: e.target.value })} style={{ width: "100%", height: 30, border: "none", borderRadius: 6, cursor: "pointer" }} /></div>
              </div>
              <Label t="Fonte" /><select value={curLayer.font} onChange={e => updateLayer(curLayer.id, { font: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#1a1a2e", color: "#fff", fontSize: 12, marginBottom: 8, appearance: "none", WebkitAppearance: "none", backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\"white\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\"><path d=\"M7 10l5 5 5-5z\"/></svg>')", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 32 }}>
                {TITLE_STYLES.map(s => <option key={s.id} value={s.font}>{s.l} ({s.font.split(",")[0].replace(/'/g,"")})</option>)}
              </select>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <Pill active={curLayer.stroke} onClick={() => updateLayer(curLayer.id, { stroke: !curLayer.stroke })} color={C.red}>Outline</Pill>
                <Pill active={curLayer.shadow} onClick={() => updateLayer(curLayer.id, { shadow: !curLayer.shadow })} color={C.blue}>Sombra</Pill>
                <Pill active={curLayer.weight >= 700} onClick={() => updateLayer(curLayer.id, { weight: curLayer.weight >= 700 ? 400 : 900 })} color={C.orange}>Bold</Pill>
              </div>
              {curLayer.stroke && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                  <div><Label t="Cor Outline" /><input type="color" value={curLayer.strokeColor} onChange={e => updateLayer(curLayer.id, { strokeColor: e.target.value })} style={{ width: "100%", height: 24, border: "none", borderRadius: 4, cursor: "pointer" }} /></div>
                  <div><Label t="Espessura" /><input type="range" min="1" max="15" value={curLayer.strokeWidth} onChange={e => updateLayer(curLayer.id, { strokeWidth: +e.target.value })} style={{ width: "100%" }} /></div>
                </div>
              )}
            </div>
          )}
        </Sec>

        {/* Palette */}
        <Sec title="Paleta do Nicho" icon="🎨" open={false}>
          <select value={niche} onChange={e => setNiche(e.target.value)} style={{ width: "100%", padding: "6px", borderRadius: 6, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)", color: C.text, fontSize: 11, marginBottom: 8 }}>
            {NICHES.map(n => <option key={n.id} value={n.id}>{n.i} {n.l}</option>)}
          </select>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {palette.colors.map((c, i) => <div key={i} onClick={() => { if (curLayer) updateLayer(curLayer.id, { color: c }); }} style={{ flex: 1, height: 32, borderRadius: 6, background: c, cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)" }} title={c} />)}
          </div>
          <div style={{ fontSize: 10, color: C.dim }}>{palette.tip}</div>
        </Sec>

        {/* Templates */}
        <Sec title="Templates Layout" icon="📐" open={false}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4 }}>
            {LAYOUT_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => {
                const newLayers = [];
                const lid = () => nextId.current++;
                if (t.id === "mrbeast") {
                  newLayers.push({ id: lid(), text: "TEXTO AQUI", x: 320, y: 300, size: 80, font: "Impact, sans-serif", weight: 900, color: "#FFFFFF", stroke: true, strokeColor: "#000", strokeWidth: 6, shadow: true, shadowBlur: 16, visible: true });
                  newLayers.push({ id: lid(), text: "SUBTITULO", x: 320, y: 420, size: 36, font: "'Montserrat', sans-serif", weight: 700, color: "#FFFF00", stroke: false, strokeColor: "#000", strokeWidth: 3, shadow: true, shadowBlur: 10, visible: true });
                } else if (t.id === "finance") {
                  newLayers.push({ id: lid(), text: "R$10.000", x: 640, y: 260, size: 96, font: "Impact, sans-serif", weight: 900, color: "#00FF00", stroke: true, strokeColor: "#000", strokeWidth: 6, shadow: true, shadowBlur: 20, visible: true });
                  newLayers.push({ id: lid(), text: "COMO GANHAR", x: 640, y: 420, size: 42, font: "'Oswald', sans-serif", weight: 700, color: "#FFD700", stroke: false, strokeColor: "#000", strokeWidth: 3, shadow: true, shadowBlur: 12, visible: true });
                } else if (t.id === "dark-minimal") {
                  newLayers.push({ id: lid(), text: "TITULO", x: 200, y: 120, size: 56, font: "'Bebas Neue', sans-serif", weight: 400, color: "#FF0000", stroke: false, strokeColor: "#000", strokeWidth: 3, shadow: false, shadowBlur: 0, visible: true, glow: true });
                } else if (t.id === "reaction") {
                  newLayers.push({ id: lid(), text: "OMG", x: 200, y: 150, size: 90, font: "'Bangers', cursive", weight: 400, color: "#FFFF00", stroke: true, strokeColor: "#000", strokeWidth: 7, shadow: true, shadowBlur: 20, visible: true });
                } else if (t.id === "versus") {
                  newLayers.push({ id: lid(), text: "VS", x: 640, y: 360, size: 100, font: "Impact, sans-serif", weight: 900, color: "#FFFFFF", stroke: true, strokeColor: "#FF0000", strokeWidth: 8, shadow: true, shadowBlur: 20, visible: true });
                  newLayers.push({ id: lid(), text: "LADO A", x: 320, y: 150, size: 44, font: "'Oswald', sans-serif", weight: 700, color: "#FF4444", stroke: true, strokeColor: "#000", strokeWidth: 4, shadow: true, shadowBlur: 10, visible: true });
                  newLayers.push({ id: lid(), text: "LADO B", x: 960, y: 150, size: 44, font: "'Oswald', sans-serif", weight: 700, color: "#4488FF", stroke: true, strokeColor: "#000", strokeWidth: 4, shadow: true, shadowBlur: 10, visible: true });
                } else if (t.id === "before-after") {
                  newLayers.push({ id: lid(), text: "ANTES", x: 320, y: 100, size: 48, font: "Impact, sans-serif", weight: 900, color: "#EF4444", stroke: true, strokeColor: "#000", strokeWidth: 4, shadow: true, shadowBlur: 10, visible: true });
                  newLayers.push({ id: lid(), text: "DEPOIS", x: 960, y: 100, size: 48, font: "Impact, sans-serif", weight: 900, color: "#22C55E", stroke: true, strokeColor: "#000", strokeWidth: 4, shadow: true, shadowBlur: 10, visible: true });
                } else if (t.id === "breaking") {
                  newLayers.push({ id: lid(), text: "URGENTE", x: 640, y: 280, size: 88, font: "Impact, sans-serif", weight: 900, color: "#FFFFFF", stroke: true, strokeColor: "#DC2626", strokeWidth: 6, shadow: true, shadowBlur: 20, visible: true });
                  newLayers.push({ id: lid(), text: "ACONTECEU AGORA", x: 640, y: 420, size: 36, font: "'Oswald', sans-serif", weight: 700, color: "#FFFF00", stroke: false, strokeColor: "#000", strokeWidth: 3, shadow: true, shadowBlur: 10, visible: true });
                } else if (t.id === "cinema-wide") {
                  newLayers.push({ id: lid(), text: "TITULO", x: 300, y: 560, size: 52, font: "'Playfair Display', serif", weight: 900, color: "#FFD700", stroke: false, strokeColor: "#000", strokeWidth: 3, shadow: true, shadowBlur: 14, visible: true });
                } else if (t.id === "list-number") {
                  newLayers.push({ id: lid(), text: "TOP 10", x: 200, y: 300, size: 100, font: "Impact, sans-serif", weight: 900, color: "#FFD700", stroke: true, strokeColor: "#000", strokeWidth: 7, shadow: true, shadowBlur: 20, visible: true });
                  newLayers.push({ id: lid(), text: "MELHORES", x: 200, y: 440, size: 38, font: "'Montserrat', sans-serif", weight: 700, color: "#FFFFFF", stroke: false, strokeColor: "#000", strokeWidth: 3, shadow: true, shadowBlur: 10, visible: true });
                } else {
                  newLayers.push({ id: lid(), text: "TITULO", x: 640, y: 360, size: 72, font: "Impact, sans-serif", weight: 900, color: "#FFFFFF", stroke: true, strokeColor: "#000", strokeWidth: 5, shadow: true, shadowBlur: 16, visible: true });
                }
                setLayers(newLayers); setSelLayer(newLayers[0].id);
                toast?.success("Template " + t.name + " aplicado!");
              }} style={{ padding: "8px 6px", borderRadius: 8, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "center" }}>
                <div style={{ display: "flex", gap: 2, justifyContent: "center", marginBottom: 4 }}>{t.colors.map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />)}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{t.name}</div>
                <div style={{ fontSize: 8, color: C.dim }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </Sec>

        {/* Badge + Emoji */}
        <Sec title="Badge + Emoji" icon="🏷️" open={false}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            <div><Label t="Badge" /><Input value={badge} onChange={e => setBadge(e.target.value)} placeholder="NOVO, TOP" /></div>
            <div><Label t="Emoji" /><Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🔥😱" /></div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {STICKERS.filter(s => s.text && !s.emoji).map(s => <button key={s.id} onClick={() => setBadge(s.text)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: s.bg, color: s.color, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{s.text}</button>)}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {STICKERS.filter(s => s.emoji).map(s => <button key={s.id} onClick={() => setEmoji(p => p + s.text)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 18 }}>{s.text}</button>)}
          </div>
        </Sec>

        {/* Background Template */}
        <Sec title="Background" icon="🎨">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 8 }}>
            {TEMPLATES_CANVAS.map((t, i) => <button key={i} onClick={() => { setTemplate(i); setAiBg(null); setUserBg(null); }} style={{ height: 32, borderRadius: 6, border: template===i ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: t.bg, cursor: "pointer" }}><span style={{ fontSize: 7, fontWeight: 700, color: t.textColor }}>{t.name}</span></button>)}
          </div>
          <Drop onFile={f => { setUserBg(URL.createObjectURL(f)); setAiBg(null); }} label="Upload fundo" sub="Foto ou screenshot" />
          {userBg && <button onClick={() => setUserBg(null)} style={{ marginTop: 6, width: "100%", padding: "5px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 10 }}>Remover</button>}
          <div style={{ marginTop: 8 }}><Input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Prompt para ImageFX..." style={{ marginBottom: 6 }} />
          <Btn onClick={genBg} disabled={genLoading} style={{ width: "100%", justifyContent: "center", fontSize: 11 }}>{genLoading ? "Gerando..." : "Gerar Background (ImageFX)"}</Btn></div>
          {aiBg && <button onClick={() => setAiBg(null)} style={{ marginTop: 6, width: "100%", padding: "5px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 10 }}>Remover IA</button>}
        </Sec>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════ */
/* ═══════════════════════════════════════
   TAB 6: HISTORY + GALLERY
   ═══════════════════════════════════════ */
function HistoryGallery({ toast }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterNiche, setFilterNiche] = useState("");
  const [modalImg, setModalImg] = useState(null);
  const BASE = "/api";
  const getToken = () => localStorage.getItem("lc_token");

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/trends/thumb-history${filterNiche ? `?niche=${filterNiche}` : ""}`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.ok ? r.json() : []),
      fetch(`${BASE}/trends/thumb-stats`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.ok ? r.json() : {}),
    ]).then(([h, s]) => { setHistory(h); setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, [filterNiche]);

  const del = async (id) => {
    await fetch(`${BASE}/trends/thumb-history/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
    setHistory(p => p.filter(h => h.id !== id));
    toast?.success("Removido");
  };

  const topNiches = Object.entries(stats).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  return (
    <div>
      <ImageModal src={modalImg} onClose={() => setModalImg(null)} title="Thumbnail do Historico" />

      {/* Stats */}
      {topNiches.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {topNiches.map(([niche, data]) => (
            <div key={niche} onClick={() => setFilterNiche(filterNiche === niche ? "" : niche)} style={{ padding: "10px 16px", borderRadius: 10, background: filterNiche === niche ? C.blue + "15" : "rgba(255,255,255,0.02)", border: `1px solid ${filterNiche === niche ? C.blue + "40" : C.border}`, cursor: "pointer" }}>
              <div style={{ fontSize: 11, color: C.muted }}>{NICHES.find(n => n.id === niche)?.i} {NICHES.find(n => n.id === niche)?.l || niche}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{data.count}</span>
                <span style={{ fontSize: 11, color: C.green, alignSelf: "center" }}>avg {data.avgScore}pts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <select value={filterNiche} onChange={e => setFilterNiche(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "#1a1a2e", border: `1px solid ${C.border}`, color: "#fff", fontSize: 12 }}>
          <option value="">Todos os nichos</option>
          {NICHES.map(n => <option key={n.id} value={n.id}>{n.i} {n.l}</option>)}
        </select>
        <span style={{ fontSize: 12, color: C.dim }}>{history.length} thumbnails geradas</span>
      </div>

      {/* Grid */}
      {loading ? <div style={{ textAlign: "center", padding: 40, color: C.dim }}>Carregando...</div> :
        history.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.dim }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Nenhuma thumbnail gerada ainda</div>
            <div style={{ fontSize: 12 }}>Use o Criador Pro ou Trends para gerar thumbnails. Elas aparecerao aqui automaticamente.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {history.map(h => (
              <div key={h.id} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)" }}>
                {h.imageUrl && <img src={h.imageUrl} onClick={() => setModalImg(h.imageUrl)} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", cursor: "pointer", display: "block" }} />}
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{h.title || "Sem titulo"}</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    {h.niche && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: C.blue + "15", color: C.blue }}>{h.niche}</span>}
                    {h.style && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: C.purple + "15", color: C.purple }}>{h.style}</span>}
                    {h.score > 0 && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: (h.score >= 80 ? C.green : C.orange) + "15", color: h.score >= 80 ? C.green : C.orange }}>CTR {h.score}</span>}
                  </div>
                  {h.prompt && <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 6 }}>{h.prompt}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: C.dim }}>{h.createdAt ? new Date(h.createdAt).toLocaleDateString("pt-BR") : ""}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {h.prompt && <button onClick={() => { navigator.clipboard.writeText(h.prompt); toast?.success("Prompt copiado!"); }} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 9 }}>Copiar</button>}
                      {h.imageUrl && <a href={h.imageUrl} download={`thumb-${h.id}.png`} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.green}30`, background: "transparent", color: C.green, cursor: "pointer", fontSize: 9, textDecoration: "none" }}>Baixar</a>}
                      <button onClick={() => del(h.id)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.red}30`, background: "transparent", color: C.red, cursor: "pointer", fontSize: 9 }}>Remover</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

const TABS = [
  { id: "criador", l: "Criador Pro", i: "🎨", color: "#DC2626" },
  { id: "trends", l: "Trends", i: "📊", color: "#22C55E", badge: "NOVO" },
  { id: "remix", l: "Remix AI", i: "🔄", color: "#7C3AED", badge: "NOVO" },
  { id: "analisador", l: "Analisador Viral", i: "🔍", color: "#F97316", badge: "NOVO" },
  { id: "editor", l: "Editor Canvas", i: "🖌️", color: "#3B82F6" },
  { id: "history", l: "Historico", i: "📁", color: "#8B5CF6" },
];

export default function ThumbEditor() {
  const toast = useToast();
  const pg = useProgress();
  const [tab, setTab] = useState("criador");

  useEffect(() => {
    if (!document.getElementById("thumb-fonts")) {
      const link = document.createElement("link");
      link.id = "thumb-fonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@700&family=Orbitron:wght@900&family=Oswald:wght@700&family=Playfair+Display:wght@900&family=Creepster&family=Permanent+Marker&family=Righteous&family=Caveat:wght@700&family=Black+Ops+One&family=Bangers&family=Bungee&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="page-enter" role="main" aria-label="ThumbEditor">
      <Hdr title="LaCasa ThumbStudio 🎨" sub="Editor profissional de thumbnails com IA" />
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, overflowX: "auto" }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab===t.id ? t.color+"18" : "transparent", borderBottom: tab===t.id ? `3px solid ${t.color}` : "3px solid transparent", color: tab===t.id ? "#fff" : C.muted, fontSize: 13, fontWeight: tab===t.id ? 700 : 400, transition: "0.2s", whiteSpace: "nowrap" }}>
          <span>{t.i}</span><span>{t.l}</span>{t.badge && <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: t.color, padding: "2px 6px", borderRadius: 4 }}>{t.badge}</span>}
        </button>)}
      </div>
      {tab === "criador" && <CriadorNinja toast={toast} pg={pg} />}
      {tab === "trends" && <TrendsTab toast={toast} pg={pg} />}
      {tab === "remix" && <RemixAI toast={toast} pg={pg} />}
      {tab === "analisador" && <AnalisadorViral toast={toast} pg={pg} />}
      {tab === "editor" && <EditorCanvas toast={toast} pg={pg} />}
      {tab === "history" && <HistoryGallery toast={toast} />}
    </div>
  );
}
