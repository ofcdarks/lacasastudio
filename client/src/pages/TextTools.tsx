// @ts-nocheck
import { useState, useMemo } from "react";
import { C, Card, Btn } from "../components/shared/UI";

const TABS = ["Editor de Texto", "Gerador de SRT", "Divisor de Texto"];

function TextEditor() {
  const [text, setText] = useState("");
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(Boolean).length : 0;
  const wpm = { normal: 155, slow: 130, fast: 185 };
  const time = (r) => { const s = Math.ceil((words / r) * 60); const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; };
  const downloadSRT = () => {
    if (!text.trim()) return;
    const lines = text.split("\n").filter(Boolean);
    let srt = ""; let i = 1; let t = 0;
    for (const line of lines) {
      const dur = Math.ceil((line.split(/\s+/).length / wpm.normal) * 60);
      const fmtT = (s) => { const h = String(Math.floor(s / 3600)).padStart(2, "0"); const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0"); const sec = String(s % 60).padStart(2, "0"); return `${h}:${m}:${sec},000`; };
      srt += `${i}\n${fmtT(t)} --> ${fmtT(t + dur)}\n${line}\n\n`;
      t += dur; i++;
    }
    const blob = new Blob([srt], { type: "text/srt" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "legenda.srt"; a.click();
  };
  const downloadTXT = () => {
    if (!text.trim()) return;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "texto.txt"; a.click();
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
        <Card color={C.blue} style={{ padding: 16 }}><div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>Caracteres</div><div style={{ fontSize: 28, fontWeight: 800, color: C.blue }}>{chars}</div></Card>
        <Card color={C.purple} style={{ padding: 16 }}><div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>Palavras</div><div style={{ fontSize: 28, fontWeight: 800, color: C.purple }}>{words}</div></Card>
        <Card color={C.red} style={{ padding: 16 }}><div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>Parágrafos</div><div style={{ fontSize: 28, fontWeight: 800, color: C.red }}>{paragraphs}</div></Card>
      </div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>✨</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Tempo de Narração (padrão)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Card color={C.green} style={{ padding: 14 }}><div style={{ fontSize: 11, fontWeight: 600, color: C.green }}>Normal</div><div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{time(wpm.normal)}</div><div style={{ fontSize: 10, color: C.dim }}>{wpm.normal} palavras/min</div></Card>
          <Card color={C.orange} style={{ padding: 14 }}><div style={{ fontSize: 11, fontWeight: 600, color: C.orange }}>Lento/Pausado</div><div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{time(wpm.slow)}</div><div style={{ fontSize: 10, color: C.dim }}>{wpm.slow} palavras/min</div></Card>
          <Card color={C.cyan} style={{ padding: 14 }}><div style={{ fontSize: 11, fontWeight: 600, color: C.cyan }}>Rápido/Dinâmico</div><div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{time(wpm.fast)}</div><div style={{ fontSize: 10, color: C.dim }}>{wpm.fast} palavras/min</div></Card>
        </div>
      </Card>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Área de Texto</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={downloadSRT} style={{ background: C.red, color: "#fff", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 11 }}>⬇️ Baixar SRT</Btn>
            <Btn onClick={downloadTXT} style={{ background: `${C.dim}20`, color: C.muted, padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 11, border: `1px solid ${C.border}` }}>📄 Baixar TXT</Btn>
          </div>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite ou cole seu texto aqui..." rows={16} style={{ width: "100%", padding: 16, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, lineHeight: 1.8, outline: "none", resize: "vertical" }} />
      </Card>
      <Card color={C.blue} style={{ marginTop: 20, padding: 16 }}>
        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.8 }}>
          <span style={{ fontWeight: 700, color: C.blue }}>Dica:</span> Cada parágrafo vira uma legenda com tempo calculado automaticamente. Calculado com base em velocidades padrão de fala ({wpm.normal} palavras/min para normal).
        </div>
      </Card>
    </div>
  );
}

function SRTGenerator() {
  const [text, setText] = useState("");
  const [srtOutput, setSrtOutput] = useState("");
  const [fileName, setFileName] = useState("legendas");
  const [preset, setPreset] = useState(495);
  const PRESETS = [
    { label: "Máximo CapCut (495 chars)", value: 495 },
    { label: "Médio (350 chars)", value: 350 },
    { label: "Curto (250 chars)", value: 250 },
    { label: "Muito Curto (150 chars)", value: 150 },
  ];
  const generate = () => {
    if (!text.trim()) return;
    const lines = text.split("\n").filter(Boolean);
    let srt = ""; let i = 1; let t = 0;
    for (const line of lines) {
      const chunks = [];
      let current = "";
      for (const word of line.split(/\s+/)) {
        if ((current + " " + word).trim().length > preset && current) { chunks.push(current.trim()); current = word; }
        else current = (current + " " + word).trim();
      }
      if (current) chunks.push(current);
      for (const chunk of chunks) {
        const dur = Math.max(1, Math.ceil((chunk.split(/\s+/).length / 155) * 60));
        const fmtT = (s) => { const h = String(Math.floor(s / 3600)).padStart(2, "0"); const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0"); const sec = String(Math.floor(s % 60)).padStart(2, "0"); return `${h}:${m}:${sec},000`; };
        srt += `${i}\n${fmtT(t)} --> ${fmtT(t + dur)}\n${chunk}\n\n`;
        t += dur; i++;
      }
    }
    setSrtOutput(srt);
  };
  const download = () => {
    if (!srtOutput) return;
    const blob = new Blob([srtOutput], { type: "text/srt" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${fileName || "legendas"}.srt`; a.click();
  };
  return (
    <div>
      <Card style={{ marginBottom: 20, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14 }}>⚡</span><span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Presets Rápidos</span></div>
          <Btn style={{ background: `${C.dim}12`, color: C.muted, padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid ${C.border}` }}>⚙️ Configurações</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {PRESETS.map((p) => (
            <button key={p.value} onClick={() => setPreset(p.value)} style={{ padding: "12px 10px", borderRadius: 10, border: `1px solid ${preset === p.value ? C.cyan : C.border}`, background: preset === p.value ? `${C.cyan}08` : C.bg, color: preset === p.value ? C.text : C.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "center" }}>{p.label}</button>
          ))}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>📄</span><span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Texto Original</span></div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Cole seu texto aqui..." rows={14} style={{ width: "100%", padding: 14, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, lineHeight: 1.7, outline: "none", resize: "vertical" }} />
          <Btn onClick={generate} style={{ width: "100%", marginTop: 12, background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 13, textAlign: "center" }}>✅ Gerar Legendas</Btn>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>🎬</span><span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Arquivo SRT</span></div>
          <textarea value={srtOutput} readOnly placeholder="As legendas aparecerão aqui..." rows={14} style={{ width: "100%", padding: 14, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.muted, fontSize: 12, lineHeight: 1.7, outline: "none", resize: "vertical", fontFamily: "monospace" }} />
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.dim, display: "block", marginBottom: 6 }}>Nome do arquivo</label>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none" }} />
              <span style={{ fontSize: 12, color: C.dim }}>.srt</span>
            </div>
          </div>
          <Btn onClick={download} disabled={!srtOutput} style={{ width: "100%", marginTop: 12, background: `${C.dim}12`, color: C.muted, padding: "10px", borderRadius: 10, fontWeight: 600, fontSize: 12, textAlign: "center", border: `1px solid ${C.border}`, opacity: srtOutput ? 1 : 0.4 }}>⬇️ Baixar SRT</Btn>
        </Card>
      </div>
      <Card color={C.orange} style={{ padding: 14 }}>
        <div style={{ fontSize: 12, color: C.dim }}><span style={{ fontWeight: 700, color: C.orange }}>Dica:</span> Use os presets otimizados para diferentes tipos de conteúdo. O preset "Máximo" é ideal para CapCut com limite de 495 caracteres por linha.</div>
      </Card>
    </div>
  );
}

function TextDivider() {
  const [text, setText] = useState("");
  const [maxChars, setMaxChars] = useState(500);
  const [mode, setMode] = useState("partes");
  const [parts, setParts] = useState([]);
  const charCount = text.length;
  const divide = () => {
    if (!text.trim()) return;
    if (mode === "partes") {
      const clean = text.replace(/\n+/g, " ").trim();
      const result = []; let current = "";
      for (const word of clean.split(/\s+/)) {
        if ((current + " " + word).trim().length > maxChars && current) { result.push(current.trim()); current = word; }
        else current = (current + " " + word).trim();
      }
      if (current.trim()) result.push(current.trim());
      setParts(result);
    } else {
      const result = []; let current = "";
      for (const para of text.split("\n")) {
        if ((current + "\n" + para).length > maxChars && current) { result.push(current.trim()); current = para; }
        else current = (current ? current + "\n" : "") + para;
      }
      if (current.trim()) result.push(current.trim());
      setParts(result);
    }
  };
  const clear = () => { setText(""); setParts([]); };
  const copy = (t) => navigator.clipboard.writeText(t);
  const copyAll = () => navigator.clipboard.writeText(parts.join("\n\n---\n\n"));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode("partes")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "none", borderBottom: `2px solid ${mode === "partes" ? C.cyan : "transparent"}`, background: "transparent", color: mode === "partes" ? C.cyan : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📄 Divisor por Partes</button>
        <button onClick={() => setMode("blocos")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "none", borderBottom: `2px solid ${mode === "blocos" ? C.cyan : "transparent"}`, background: "transparent", color: mode === "blocos" ? C.cyan : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔲 Divisor por Blocos (CapCut)</button>
      </div>
      <Card color={C.cyan} style={{ padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: C.dim }}><span style={{ fontWeight: 700, color: C.cyan }}>{mode === "partes" ? "Divisor por Partes:" : "Divisor por Blocos:"}</span> {mode === "partes" ? "Remove quebras de linha e divide em partes corridas. Perfeito para CapCut Web." : "Mantém a formatação original com parágrafos. Ideal para legendas com blocos de texto."}</div>
      </Card>
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>Cole o texto grande que deseja dividir em partes menores...</div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Cole o texto grande que deseja dividir em partes menores..." rows={10} style={{ width: "100%", padding: 14, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, lineHeight: 1.7, outline: "none", resize: "vertical" }} />
        <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>{charCount} caracteres</div>
      </Card>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: "block", marginBottom: 8 }}>Limite de caracteres por parte</label>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input type="number" value={maxChars} onChange={(e) => setMaxChars(+e.target.value)} style={{ width: 200, padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 14, outline: "none" }} />
          <Btn onClick={divide} disabled={!text.trim()} style={{ flex: 1, background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 13, textAlign: "center", opacity: text.trim() ? 1 : 0.4 }}>✂️ Dividir</Btn>
          <Btn onClick={clear} style={{ background: `${C.dim}12`, color: C.muted, padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 12, border: `1px solid ${C.border}` }}>Limpar</Btn>
        </div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>Sugestões: ChatGPT (4000), WhatsApp (4096), Twitter (280)</div>
      </div>
      {parts.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{parts.length} partes geradas</span>
            <Btn onClick={copyAll} style={{ background: `${C.blue}12`, color: C.blue, padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>📋 Copiar Tudo</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {parts.map((p, i) => (
              <Card key={i} style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan }}>Parte {i + 1} • {p.length} chars</span>
                  <button onClick={() => copy(p)} style={{ background: `${C.blue}15`, color: C.blue, border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>📋 Copiar</button>
                </div>
                <pre style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto", margin: 0 }}>{p}</pre>
              </Card>
            ))}
          </div>
        </div>
      )}
      {parts.length === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 24 }}>
          <Card style={{ padding: 18 }}><div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.blue}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 10 }}>📄</div><div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>Cole seu texto</div><div style={{ fontSize: 11, color: C.dim }}>Cole qualquer texto grande que precise ser dividido</div></Card>
          <Card style={{ padding: 18 }}><div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.cyan}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 10 }}>📋</div><div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>Escolha o modo</div><div style={{ fontSize: 11, color: C.dim }}>Mantém formatação original com parágrafos</div></Card>
          <Card style={{ padding: 18 }}><div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.green}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 10 }}>📎</div><div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>Copie facilmente</div><div style={{ fontSize: 11, color: C.dim }}>Copie cada parte individualmente ou tudo de uma vez</div></Card>
        </div>
      )}
    </div>
  );
}

export default function TextTools() {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.blue}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📝</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Ferramentas de Texto</h1>
            <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Editor, gerador de legendas e divisor de texto em um só lugar</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, padding: 4 }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: tab === i ? `${C.blue}15` : "transparent", color: tab === i ? C.blue : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {i === 0 ? "✏️" : i === 1 ? "🎬" : "✂️"} {t}
            </button>
          ))}
        </div>
      </div>
      {tab === 0 && <TextEditor />}
      {tab === 1 && <SRTGenerator />}
      {tab === 2 && <TextDivider />}
    </div>
  );
}
