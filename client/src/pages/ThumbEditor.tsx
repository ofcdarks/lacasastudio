// @ts-nocheck
import { useProgress } from "../components/shared/ProgressModal";
import { useState, useRef, useEffect } from "react";
import { aiApi, chatApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const TEMPLATES = [
  { name: "Impacto", bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", textColor: "#fff", accentColor: "#EF4444" },
  { name: "Clean", bg: "linear-gradient(135deg,#1a1a2e,#16213e)", textColor: "#fff", accentColor: "#3B82F6" },
  { name: "Energia", bg: "linear-gradient(135deg,#f12711,#f5af19)", textColor: "#fff", accentColor: "#000000" },
  { name: "Dark", bg: "linear-gradient(135deg,#0a0a0a,#1a0a0a)", textColor: "#EF4444", accentColor: "#F59E0B" },
  { name: "Neon", bg: "linear-gradient(135deg,#0a0a2e,#000000)", textColor: "#00ffff", accentColor: "#ff00ff" },
  { name: "Nature", bg: "linear-gradient(135deg,#134e5e,#71b280)", textColor: "#fff", accentColor: "#FDE047" },
];

export default function ThumbEditor() {
  const toast = useToast();
  const pg = useProgress();
  const cvs = useRef(null);
  const [title, setTitle] = useState("SEU TÍTULO AQUI");
  const [subtitle, setSubtitle] = useState("");
  const [template, setTemplate] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBg, setAiBg] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [imageOnly, setImageOnly] = useState(false);
  const [elements, setElements] = useState([]);
  const [badge, setBadge] = useState("");
  const [emoji, setEmoji] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoNiche, setVideoNiche] = useState("");
  const [thumbSuggestions, setThumbSuggestions] = useState([]);
  const [genFromTitleLoading, setGenFromTitleLoading] = useState(false);

  const W = 1280, H = 720;

  const draw = () => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = W; c.height = H;
    const t = TEMPLATES[template];

    // Background
    if (aiBg) {
      const img = new Image(); img.crossOrigin = "anonymous"; img.src = aiBg;
      img.onload = () => { ctx.drawImage(img, 0, 0, W, H); if(!imageOnly) drawOverlay(ctx, t); };
      img.onerror = () => { fillGradient(ctx, t); if(!imageOnly) drawOverlay(ctx, t); };
    } else { fillGradient(ctx, t); if(!imageOnly) drawOverlay(ctx, t); }
  };

  const fillGradient = (ctx, t) => {
    const grd = ctx.createLinearGradient(0, 0, W, H);
    const colors = t.bg.match(/#[a-f0-9]{3,8}/gi) || ["#1a1a2e", "#16213e"];
    if (colors.length === 1) { grd.addColorStop(0, colors[0]); grd.addColorStop(1, colors[0]); }
    else colors.forEach((c, i) => grd.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  };

  const drawOverlay = (ctx, t) => {
    // Vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, W * .2, W / 2, H / 2, W * .7);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    // Title
    if (title) {
      ctx.fillStyle = t.textColor; ctx.font = "bold 72px 'Bebas Neue', Arial";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 4;
      const lines = title.split("\n");
      lines.forEach((line, i) => { ctx.fillText(line.toUpperCase(), W / 2, H / 2 - 20 + (i - (lines.length - 1) / 2) * 80); });
      ctx.shadowBlur = 0;
    }

    // Subtitle
    if (subtitle) {
      ctx.fillStyle = t.accentColor; ctx.font = "bold 32px Arial"; ctx.textAlign = "center";
      ctx.fillText(subtitle, W / 2, H / 2 + 70);
    }

    // Badge
    if (badge) {
      ctx.fillStyle = t.accentColor;
      const bw = ctx.measureText(badge).width + 30;
      ctx.beginPath(); ctx.roundRect(W - bw - 20, 20, bw, 44, 8); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 22px Arial"; ctx.textAlign = "center";
      ctx.fillText(badge, W - bw / 2 - 20, 48);
    }

    // Emoji
    if (emoji) { ctx.font = "120px Arial"; ctx.textAlign = "left"; ctx.fillText(emoji, 40, H - 60); }

    // Accent line (only if title exists)
    if (title || subtitle) { ctx.fillStyle = t.accentColor; ctx.fillRect(W / 2 - 60, H / 2 + 100, 120, 4); }
  };

  useEffect(() => { draw(); }, [title, subtitle, template, aiBg, badge, emoji, imageOnly]);

  const genBg = async () => {
    if (!aiPrompt.trim()) { toast?.error("Escreva um prompt"); return; }
    setGenLoading(true);
    pg?.start("🎨 Gerando Background", ["Enviando prompt ao ImageFX", "Imagen 3.5 processando", "Aplicando no canvas"]);
    try {
      const r = await aiApi.generateAsset({ prompt: aiPrompt + ", YouTube thumbnail background, 16:9, cinematic, high quality" });
      if (r.url) { setAiBg(r.url); pg?.done(); toast?.success("Background gerado!"); }
    } catch (e) { toast?.error(e.message); }
    setGenLoading(false);
  };

  const genFromTitle = async () => {
    if (!videoTitle.trim()) { toast?.error("Cole o título do vídeo"); return; }
    setGenFromTitleLoading(true);
    pg?.start("🎯 Criando Thumb de Alto Impacto", ["Analisando título", "Gerando 3 variações", "Otimizando CTR"]);
    try {
      const { reply } = await chatApi.send([{ role: "user", content: `Crie 3 variações de thumbnail para este vídeo YouTube. Nicho: ${videoNiche || "geral"}. Título: "${videoTitle}"

RESPONDA APENAS JSON array (sem \`\`\`):
[{"title":"TEXTO PRINCIPAL na thumb (curto, impactante, 2-4 palavras)","subtitle":"Texto secundário menor","badge":"Badge tipo NOVO ou TOP","emoji":"1 emoji impactante","prompt":"Prompt DETALHADO para ImageFX: cena cinematográfica, cores vibrantes, composição profissional, 16:9, sem texto na imagem. Descreva o visual da thumbnail como um diretor de arte","ctrScore":85}]

Regras: SEM clickbait, máximo impacto visual, texto curto e legível, contraste alto.` }]);
      const parsed = JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      setThumbSuggestions(Array.isArray(parsed) ? parsed : []);
      pg?.done();
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
    setGenFromTitleLoading(false);
  };

  const exportPng = () => {
    const c = cvs.current; if (!c) return;
    const link = document.createElement("a"); link.download = "thumbnail.png";
    link.href = c.toDataURL("image/png"); link.click();
    toast?.success("Thumbnail exportada!");
  };

  return (
    <div className="page-enter" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Hdr title="Editor de Thumbnails" sub="Crie thumbnails profissionais com IA" action={<div style={{display:"flex",gap:6}}><Btn onClick={exportPng}>📥 1280x720</Btn><Btn onClick={() => { const c = cvs.current; if (!c) return; const hd = document.createElement("canvas"); hd.width = 2560; hd.height = 1440; hd.getContext("2d").drawImage(c, 0, 0, 2560, 1440); const l = document.createElement("a"); l.download = "thumb-2K.png"; l.href = hd.toDataURL("image/png"); l.click(); toast?.success("2K exportado!"); }} style={{background:`${C.blue}20`,color:C.blue}}>📐 2K HD</Btn></div>} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Canvas */}
        <div>
          <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, position: "relative" }}>
            <canvas ref={cvs} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button onClick={() => setImageOnly(!imageOnly)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${imageOnly ? C.green : C.border}`, background: imageOnly ? `${C.green}15` : "transparent", color: imageOnly ? C.green : C.dim, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                {imageOnly ? "🖼️ Só Imagem ✓" : "📝 Com Texto"}
              </button>
              <button onClick={() => { const c = cvs.current; if (!c) return; const hd = document.createElement("canvas"); hd.width = 2560; hd.height = 1440; const hctx = hd.getContext("2d"); hctx.drawImage(c, 0, 0, 2560, 1440); const link = document.createElement("a"); link.download = "thumbnail-HD.png"; link.href = hd.toDataURL("image/png"); link.click(); toast?.success("Exportado em 2560x1440 HD!"); }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${C.blue}30`, background: `${C.blue}08`, color: C.blue, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                📐 Export 2K HD
              </button>
            </div>
          </div>

          <div style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📝 Texto</div>
            <Label t="Título principal" />
            <textarea value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, color: C.text, fontSize: 13, outline: "none", minHeight: 50, resize: "vertical" }} />
            <Label t="Subtítulo" />
            <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Texto secundário..." />
            <Label t="Badge" />
            <Input value={badge} onChange={e => setBadge(e.target.value)} placeholder="NOVO, TOP 10, etc" />
            <Label t="Emoji" />
            <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🔥 😱 💰" />
          </div>

          <div style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🎨 Template</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => { setTemplate(i); setAiBg(null); }} style={{ height: 40, borderRadius: 8, border: template === i ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: t.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: t.textColor }}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🤖 Background com IA</div>
            <Input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Ex: explosão de cores, cidade futurista..." style={{ marginBottom: 8 }} />
            <Btn onClick={genBg} disabled={genLoading} style={{ width: "100%", justifyContent: "center", fontSize: 11 }}>
              {genLoading ? "⏳ Gerando..." : "🎨 Gerar Background (ImageFX)"}
            </Btn>
            {aiBg && <button onClick={() => setAiBg(null)} style={{ width: "100%", marginTop: 6, padding: "6px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 10 }}>Remover background IA</button>}
          </div>

          <div style={{ background: `linear-gradient(135deg,${C.red}08,${C.orange}08)`, borderRadius: 12, border: `1px solid ${C.red}20`, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>🎯 Thumb de Alto Impacto</div>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>Cole o título do vídeo e a IA gera uma thumbnail de alto CTR sem clickbait</div>
            <Input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="Título do vídeo..." style={{ marginBottom: 6 }} />
            <Input value={videoNiche} onChange={e => setVideoNiche(e.target.value)} placeholder="Nicho (ex: finanças, dark, ASMR)" style={{ marginBottom: 8 }} />
            <Btn onClick={genFromTitle} disabled={genFromTitleLoading} style={{ width: "100%", justifyContent: "center", fontSize: 11, background: `linear-gradient(135deg,${C.red},${C.orange})`, border: "none", color: "#fff" }}>
              {genFromTitleLoading ? "⏳ IA criando..." : "🚀 Gerar Thumb Completa"}
            </Btn>
            {thumbSuggestions.length > 0 && <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 4 }}>Sugestões geradas:</div>
              {thumbSuggestions.map((s, i) => <div key={i} style={{ padding: "6px 8px", marginBottom: 4, borderRadius: 6, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => { setTitle(s.title || title); setSubtitle(s.subtitle || ""); setBadge(s.badge || ""); setEmoji(s.emoji || ""); if (s.prompt) { setAiPrompt(s.prompt); } }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{s.title || "Título"}</div>
                <div style={{ fontSize: 9, color: C.dim }}>{s.subtitle} · {s.badge} · CTR: {s.ctrScore}</div>
                {s.prompt && <button onClick={async (e) => { e.stopPropagation(); setGenLoading(true); pg?.start("🎨 Gerando Thumb", ["Criando visual"]); try { const r = await aiApi.generateAsset({ prompt: s.prompt + ", YouTube thumbnail, 16:9, high quality, viral, no text" }); if (r.url) { setAiBg(r.url); pg?.done(); toast?.success("Thumbnail gerada!"); } } catch (err) { pg?.fail(err.message); } setGenLoading(false); }} style={{ marginTop: 4, padding: "4px 10px", borderRadius: 4, border: "none", background: `${C.red}20`, color: C.red, cursor: "pointer", fontSize: 9, fontWeight: 600, width: "100%" }}>🎨 Gerar esta thumb</button>}
              </div>)}
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
