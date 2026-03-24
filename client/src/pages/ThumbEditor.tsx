// @ts-nocheck
import { useProgress } from "../components/shared/ProgressModal";
import { useState, useRef, useEffect, useCallback } from "react";
import { aiApi, chatApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

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
  { id: "educacao", l: "Educação", i: "🎓" }, { id: "empreendedorismo", l: "Empreendedorismo", i: "🚀" },
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

/* ═══════════════════════════════════════
   TAB 1: CRIADOR NINJA
   ═══════════════════════════════════════ */
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
  const [genImgLoading, setGenImgLoading] = useState({});
  const genImage = async (key, prompt) => {
    setGenImgLoading(p => ({ ...p, [key]: true }));
    pg?.start("Gerando Imagem", ["ImageFX processando", "Finalizando"]);
    try {
      const r = await aiApi.generateAsset({ prompt: prompt + ", YouTube thumbnail, 16:9 landscape, no text, ultra quality, 8K" });
      if (r.url || r.b64) { setGenImages(p => ({ ...p, [key]: r.url || ("data:image/png;base64," + r.b64) })); pg?.done(); toast?.success("Imagem gerada!"); }
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
    setGenImgLoading(p => ({ ...p, [key]: false }));
  };

  const toggle = id => setEffects(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const generate = async () => {
    if (!title.trim()) { toast?.error("Digite o título"); return; }
    setLoading(true);
    pg?.start("🎨 Gerando Prompt ThumbStudio", ["Analisando nicho e estilo", "Construindo visual", "Otimizando CTR"]);
    try {
      const nicheL = NICHES.find(n => n.id === niche)?.l || niche;
      const styleL = TITLE_STYLES.find(s => s.id === titleStyle)?.desc || "";
      const fxList = effects.map(e => EFFECTS.find(x => x.id === e)?.l).join(", ");
      const { reply } = await chatApi.send([{ role: "user", content: `Crie 3 prompts detalhados para thumbnail YouTube.
Nicho: ${nicheL}. Título: "${title}". Estilo título: ${styleL}. Sub: ${subtitle||"nenhum"}.
Personagem: ${charDesc||"nenhum"}${charImgs.length ? ` (${charImgs.length} imagem(ns) de referência enviada(s))` : ""}. Posição personagem: ${charPos}. Posição texto: ${textPos}. Enquadramento: ${charFrame}. Nº personagens: ${charCount}. Cor: ${mainColor}. Efeitos: ${fxList||"nenhum"}. Fundo: ${bgImg ? "imagem de fundo enviada pelo usuário" : bgDesc||"auto"}.
RESPONDA JSON (sem backticks):
{"promptImageFX":"prompt principal ImageFX 16:9 sem texto na imagem, ultra detalhado cinematográfico 8K","promptVariation2":"variação 2","promptVariation3":"variação 3 ousada","textOverlay":{"title":"${title}","titleStyle":"desc estilo","subtitle":"${subtitle}","badge":"sugestão badge","emoji":"1 emoji"},"tips":["3 dicas CTR"],"ctrEstimate":85}` }]);
      const parsed = JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      setOutput(parsed); pg?.done();
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
                      <img src={genImages[p.k]} style={{ width: "100%", borderRadius: 10, border: `2px solid ${p.c}40` }} />
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
  const genImage = async (key, prompt) => {
    setGenImgLoading(p => ({ ...p, [key]: true }));
    pg?.start("Gerando Remix", ["ImageFX processando"]);
    try {
      const r = await aiApi.generateAsset({ prompt: prompt + ", YouTube thumbnail, 16:9, no text, ultra quality" });
      if (r.url || r.b64) { setGenImages(p => ({ ...p, [key]: r.url || ("data:image/png;base64," + r.b64) })); pg?.done(); toast?.success("Remix gerado!"); }
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
    setGenImgLoading(p => ({ ...p, [key]: false }));
  };

  const analyze = async () => {
    if (!thumbUrl) { toast?.error("Envie uma thumbnail"); return; }
    setLoading(true);
    pg?.start("🔄 Engenharia Reversa", ["Analisando composição", "Extraindo estilo", "Gerando variações"]);
    try {
      const { reply } = await chatApi.send([{ role: "user", content: `Analise uma thumbnail YouTube e faça engenharia reversa. Gere 3 prompts para recriar variações.
RESPONDA JSON (sem backticks):
{"analysis":{"style":"estilo visual","colors":["#hex"],"composition":"composição","mood":"atmosfera"},"remixPrompts":[{"name":"Variação 1","prompt":"prompt detalhado ImageFX 16:9","changes":"mudança"},{"name":"Variação 2","prompt":"prompt variação","changes":"mudança"},{"name":"Variação 3","prompt":"prompt ousado","changes":"mudança"}],"improvements":["3 melhorias"]}` }]);
      setOutput(JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()));
      pg?.done();
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
                    <img src={genImages[k]} style={{ width: "100%", borderRadius: 10, border: `2px solid ${clr}40` }} />
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
      const { reply } = await chatApi.send([{ role: "user", content: `Expert em viralização YouTube. Analise:
T�tulos: ${titles.filter(Boolean).map(t => `"${t}"`).join(", ")}. Nicho: ${niche || "geral"}. ${thumbUrls.filter(Boolean).length} thumbnail(s).
JSON (sem backticks):
{"overallScore":85,"titleAnalysis":[{"title":"título","score":80,"strengths":["fortes"],"weaknesses":["fracos"],"improvedVersion":"versão melhorada"}],"viralFactors":{"curiosityGap":85,"emotionalImpact":70,"clarity":90,"uniqueness":75,"clickability":80},"thumbnailTips":["3 dicas thumb"],"actionPlan":["3 ações"]}` }]);
      setOutput(JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()));
      pg?.done();
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
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
function EditorCanvas({ toast, pg }) {
  const cvs = useRef(null);
  const [title, setTitle] = useState("SEU TÍTULO AQUI");
  const [subtitle, setSubtitle] = useState("");
  const [template, setTemplate] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBg, setAiBg] = useState(null);
  const [userBg, setUserBg] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [imageOnly, setImageOnly] = useState(false);
  const [badge, setBadge] = useState("");
  const [emoji, setEmoji] = useState("");
  const [titleStyle, setTitleStyle] = useState("impacto");
  const W = 1280, H = 720;
  const bg = userBg || aiBg;

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d"); c.width = W; c.height = H;
    const t = TEMPLATES_CANVAS[template];
    const style = TITLE_STYLES.find(s => s.id === titleStyle) || TITLE_STYLES[0];
    const content = () => {
      if (imageOnly) return;
      const vg = ctx.createRadialGradient(W/2, H/2, W*.2, W/2, H/2, W*.7);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      if (title) { ctx.font = `${style.weight} ${style.size}px ${style.font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; if (style.stroke) { ctx.strokeStyle = "rgba(0,0,0,0.9)"; ctx.lineWidth = 6; ctx.strokeText(title.toUpperCase(), W/2, H/2-20); } if (style.glow) { ctx.shadowColor = style.color; ctx.shadowBlur = 30; } else { ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 4; } ctx.fillStyle = style.color; ctx.fillText(title.toUpperCase(), W/2, H/2-20); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
      if (subtitle) { ctx.fillStyle = t.accentColor; ctx.font = "bold 32px Arial"; ctx.textAlign = "center"; ctx.fillText(subtitle, W/2, H/2+70); }
      if (badge) { ctx.fillStyle = t.accentColor; ctx.font = "bold 22px Arial"; const bw = ctx.measureText(badge).width+30; ctx.beginPath(); ctx.roundRect(W-bw-20, 20, bw, 44, 8); ctx.fill(); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(badge, W-bw/2-20, 48); }
      if (emoji) { ctx.font = "120px Arial"; ctx.textAlign = "left"; ctx.fillText(emoji, 40, H-60); }
      if (title || subtitle) { ctx.fillStyle = t.accentColor; ctx.fillRect(W/2-60, H/2+100, 120, 4); }
    };
    const fillGrad = () => { const grd = ctx.createLinearGradient(0,0,W,H); const colors = t.bg.match(/#[a-f0-9]{3,8}/gi) || ["#1a1a2e"]; colors.forEach((c, i) => grd.addColorStop(i/Math.max(colors.length-1,1), c)); ctx.fillStyle = grd; ctx.fillRect(0,0,W,H); };
    if (bg) { const img = new Image(); img.crossOrigin = "anonymous"; img.src = bg; img.onload = () => { ctx.drawImage(img,0,0,W,H); content(); }; img.onerror = () => { fillGrad(); content(); }; } else { fillGrad(); content(); }
  }, [title, subtitle, template, bg, badge, emoji, imageOnly, titleStyle]);

  useEffect(() => { draw(); }, [draw]);

  const genBg = async () => { if (!aiPrompt.trim()) { toast?.error("Escreva um prompt"); return; } setGenLoading(true); pg?.start("🎨 Gerando", ["ImageFX processando"]); try { const r = await aiApi.generateAsset({ prompt: aiPrompt + ", YouTube thumbnail, 16:9, cinematic, 8K" }); if (r.url) { setAiBg(r.url); setUserBg(null); pg?.done(); toast?.success("Background gerado!"); } } catch (e) { pg?.fail(e.message); } setGenLoading(false); };
  const exp = (s=1) => { const c = cvs.current; if (!c) return; if (s===1) { const l = document.createElement("a"); l.download = "thumbnail.png"; l.href = c.toDataURL("image/png"); l.click(); } else { const h = document.createElement("canvas"); h.width=W*s; h.height=H*s; h.getContext("2d").drawImage(c,0,0,W*s,H*s); const l = document.createElement("a"); l.download = `thumb-${W*s}x${H*s}.png`; l.href = h.toDataURL("image/png"); l.click(); } toast?.success("Exportado!"); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
      <div>
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}><canvas ref={cvs} style={{ width: "100%", height: "auto", display: "block" }} /></div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <Btn onClick={() => exp(1)}>📥 1280×720</Btn>
          <Btn onClick={() => exp(2)} style={{ background: C.blue+"15", color: C.blue }}>📐 2K HD</Btn>
          <Btn onClick={() => setImageOnly(!imageOnly)} style={{ background: imageOnly ? C.green+"15" : "transparent", color: imageOnly ? C.green : C.dim }}>{imageOnly ? "🖼️ Só Imagem ✓" : "📝 Com Texto"}</Btn>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "75vh", overflowY: "auto" }}>
        <Sec title="📝 Texto" icon="">
          <Label t="Título" /><textarea value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, color: C.text, fontSize: 13, outline: "none", minHeight: 44, resize: "vertical" }} />
          <Label t="Estilo" /><div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 3, marginBottom: 8 }}>{TITLE_STYLES.map(s => <button key={s.id} onClick={() => setTitleStyle(s.id)} style={{ padding: "5px 2px", borderRadius: 5, border: `1px solid ${titleStyle === s.id ? C.red : C.border}`, background: titleStyle === s.id ? C.red+"12" : "transparent", cursor: "pointer" }}><div style={{ fontFamily: s.font, fontSize: 9, fontWeight: s.weight, color: s.color }}>{s.ex}</div><div style={{ fontSize: 7, color: C.dim }}>{s.l}</div></button>)}</div>
          <Label t="Subtítulo" /><Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Texto secundário" />
          <Label t="Badge" /><Input value={badge} onChange={e => setBadge(e.target.value)} placeholder="NOVO, TOP 10" />
          <Label t="Emoji" /><Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🔥 😱 💰" />
        </Sec>
        <Sec title="🎨 Template" icon=""><div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>{TEMPLATES_CANVAS.map((t, i) => <button key={i} onClick={() => { setTemplate(i); setAiBg(null); setUserBg(null); }} style={{ height: 32, borderRadius: 6, border: template===i ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: t.bg, cursor: "pointer" }}><span style={{ fontSize: 7, fontWeight: 700, color: t.textColor }}>{t.name}</span></button>)}</div></Sec>
        <Sec title="📷 Sua Imagem" icon="">
          <Drop onFile={f => { setUserBg(URL.createObjectURL(f)); setAiBg(null); }} label="Upload fundo" sub="Foto ou screenshot" />
          {userBg && <button onClick={() => setUserBg(null)} style={{ marginTop: 6, width: "100%", padding: "5px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 10 }}>✕ Remover</button>}
        </Sec>
        <Sec title="🤖 Background IA" icon="">
          <Input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="cidade futurista, explosão..." style={{ marginBottom: 8 }} />
          <Btn onClick={genBg} disabled={genLoading} style={{ width: "100%", justifyContent: "center", fontSize: 11 }}>{genLoading ? "⏳..." : "🎨 Gerar (ImageFX)"}</Btn>
          {aiBg && <button onClick={() => setAiBg(null)} style={{ marginTop: 6, width: "100%", padding: "5px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 10 }}>✕ Remover IA</button>}
        </Sec>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN
   ═══════════════════════════════════════ */
const TABS = [
  { id: "criador", l: "Criador Pro", i: "🎨", color: "#DC2626" },
  { id: "remix", l: "Remix AI", i: "🔄", color: "#7C3AED", badge: "NOVO" },
  { id: "analisador", l: "AnalisadorViral", i: "🔍", color: "#F97316", badge: "NOVO" },
  { id: "editor", l: "Editor Canvas", i: "🖌️", color: "#3B82F6" },
];

export default function ThumbEditor() {
  const toast = useToast();
  const pg = useProgress();
  const [tab, setTab] = useState("criador");

  // Load Google Fonts for title styles
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
    <div className="page-enter">
      <Hdr title="LaCasa ThumbStudio 🎨" sub="Editor profissional de thumbnails com IA" />
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, overflowX: "auto" }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab===t.id ? t.color+"18" : "transparent", borderBottom: tab===t.id ? `3px solid ${t.color}` : "3px solid transparent", color: tab===t.id ? "#fff" : C.muted, fontSize: 13, fontWeight: tab===t.id ? 700 : 400, transition: "0.2s", whiteSpace: "nowrap" }}>
          <span>{t.i}</span><span>{t.l}</span>{t.badge && <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: t.color, padding: "2px 6px", borderRadius: 4 }}>{t.badge}</span>}
        </button>)}
      </div>
      {tab === "criador" && <CriadorNinja toast={toast} pg={pg} />}
      {tab === "remix" && <RemixAI toast={toast} pg={pg} />}
      {tab === "analisador" && <AnalisadorViral toast={toast} pg={pg} />}
      {tab === "editor" && <EditorCanvas toast={toast} pg={pg} />}
    </div>
  );
}
