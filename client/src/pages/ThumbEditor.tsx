// @ts-nocheck
import { useProgress } from "../components/shared/ProgressModal";
import { useState, useRef, useEffect } from "react";
import { aiApi } from "../lib/api";
import { C, Btn, Hdr, Label, Input } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const TEMPLATES = [
  { name: "Impacto", bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", textColor: "#fff", accentColor: "#EF4444" },
  { name: "Clean", bg: "linear-gradient(135deg,#1a1a2e,#16213e)", textColor: "#fff", accentColor: "#3B82F6" },
  { name: "Energia", bg: "linear-gradient(135deg,#f12711,#f5af19)", textColor: "#fff", accentColor: "#000" },
  { name: "Dark", bg: "linear-gradient(135deg,#0a0a0a,#1a0a0a)", textColor: "#EF4444", accentColor: "#F59E0B" },
  { name: "Neon", bg: "linear-gradient(135deg,#0a0a2e,#000)", textColor: "#0ff", accentColor: "#f0f" },
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
  const [elements, setElements] = useState([]);
  const [badge, setBadge] = useState("");
  const [emoji, setEmoji] = useState("");

  const W = 1280, H = 720;

  const draw = () => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = W; c.height = H;
    const t = TEMPLATES[template];

    // Background
    if (aiBg) {
      const img = new Image(); img.crossOrigin = "anonymous"; img.src = aiBg;
      img.onload = () => { ctx.drawImage(img, 0, 0, W, H); drawOverlay(ctx, t); };
      img.onerror = () => { fillGradient(ctx, t); drawOverlay(ctx, t); };
    } else { fillGradient(ctx, t); drawOverlay(ctx, t); }
  };

  const fillGradient = (ctx, t) => {
    const grd = ctx.createLinearGradient(0, 0, W, H);
    const colors = t.bg.match(/#[a-f0-9]{6}/gi) || ["#1a1a2e", "#16213e"];
    colors.forEach((c, i) => grd.addColorStop(i / (colors.length - 1), c));
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

    // Accent line
    ctx.fillStyle = t.accentColor; ctx.fillRect(W / 2 - 60, H / 2 + 100, 120, 4);
  };

  useEffect(() => { draw(); }, [title, subtitle, template, aiBg, badge, emoji]);

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

  const exportPng = () => {
    const c = cvs.current; if (!c) return;
    const link = document.createElement("a"); link.download = "thumbnail.png";
    link.href = c.toDataURL("image/png"); link.click();
    toast?.success("Thumbnail exportada!");
  };

  return (
    <div className="page-enter" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Hdr title="Editor de Thumbnails" sub="Crie thumbnails profissionais com IA" action={<Btn onClick={exportPng}>📥 Exportar PNG</Btn>} />

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
        </div>
      </div>
    </div>
  );
}
