// @ts-nocheck
import { useState } from "react";
import { C, Card, Btn } from "../components/shared/UI";

const VOICES = [
  { id: "alloy", name: "Alloy", desc: "Neutra e versátil", icon: "🎙️" },
  { id: "echo", name: "Echo", desc: "Masculina profunda", icon: "🔊" },
  { id: "fable", name: "Fable", desc: "Narradora suave", icon: "📖" },
  { id: "onyx", name: "Onyx", desc: "Masculina autoritária", icon: "🎧" },
  { id: "nova", name: "Nova", desc: "Feminina jovem", icon: "✨" },
  { id: "shimmer", name: "Shimmer", desc: "Feminina calorosa", icon: "💫" },
];

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function GeradorAudio() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [speed, setSpeed] = useState(1.0);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lcs_audio_history") || "[]"); } catch { return []; }
  });

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estDuration = Math.ceil(wordCount / 2.5); // ~150 words/min

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` },
        body: JSON.stringify({ text: text.trim(), voice, speed }),
      });
      if (!res.ok) throw new Error("Erro ao gerar áudio. Verifique as configurações de API.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const entry = { id: Date.now(), text: text.substring(0, 80) + "...", voice, speed, createdAt: new Date().toISOString() };
      const updated = [entry, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem("lcs_audio_history", JSON.stringify(updated));
    } catch (e) { alert(e.message); }
    finally { setGenerating(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.green}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎤</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Gerador de Áudio</h1>
          <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Transforme texto em narração profissional com IA</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Texto para Narração</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 11, color: C.dim }}>{charCount} caracteres</span>
                <span style={{ fontSize: 11, color: C.dim }}>{wordCount} palavras</span>
                <span style={{ fontSize: 11, color: C.orange }}>~{estDuration}s</span>
              </div>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Cole ou digite o texto que deseja transformar em áudio..." rows={12} style={{ width: "100%", padding: 14, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, lineHeight: 1.7, outline: "none", resize: "vertical" }} />
          </Card>

          {audioUrl && (
            <Card color={C.green} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>🔊 Áudio Gerado</div>
              <audio controls src={audioUrl} style={{ width: "100%" }} />
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <a href={audioUrl} download="narracao.mp3" style={{ flex: 1, textAlign: "center", padding: "8px 16px", borderRadius: 8, background: `${C.green}15`, color: C.green, fontWeight: 600, fontSize: 12, textDecoration: "none" }}>⬇️ Baixar MP3</a>
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Voz</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {VOICES.map((v) => (
                <button key={v.id} onClick={() => setVoice(v.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${voice === v.id ? C.blue : C.border}`, background: voice === v.id ? `${C.blue}10` : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 16 }}>{v.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: voice === v.id ? C.blue : C.text }}>{v.name}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>{v.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Velocidade</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => setSpeed(s)} style={{ padding: "8px", borderRadius: 8, border: `1px solid ${speed === s ? C.orange : C.border}`, background: speed === s ? `${C.orange}10` : "transparent", color: speed === s ? C.orange : C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>{s}x</button>
              ))}
            </div>
          </Card>

          <Btn onClick={handleGenerate} disabled={generating || !text.trim()} style={{ width: "100%", background: generating ? C.dim : `linear-gradient(135deg, ${C.green}, ${C.teal})`, color: "#fff", fontWeight: 700, padding: "14px", borderRadius: 12, fontSize: 14, opacity: generating || !text.trim() ? 0.6 : 1 }}>{generating ? "⏳ Gerando..." : "🎙️ Gerar Áudio"}</Btn>
        </div>
      </div>

      {history.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>📂 Histórico</div>
          {history.slice(0, 5).map((h) => (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 10, color: C.dim, minWidth: 80 }}>{new Date(h.createdAt).toLocaleDateString("pt-BR")}</span>
              <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{h.text}</span>
              <span style={{ fontSize: 10, color: C.orange }}>{h.voice} · {h.speed}x</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
