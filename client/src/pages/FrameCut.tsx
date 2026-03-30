// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from "react";
import { Hdr, Btn, Card, Input, Label, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const API = "/api/framecut";
const tk = () => localStorage.getItem("lc_token") || "";
const hdr = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${tk()}` });

const fmtTime = (s: number) => {
  if (!s || isNaN(s)) return "00:00";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sc).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sc).padStart(2, "0")}`;
};
const fmtBytes = (b: number) => {
  if (b < 1024) return b + " B"; if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  if (b < 1073741824) return (b / 1048576).toFixed(1) + " MB"; return (b / 1073741824).toFixed(2) + " GB";
};
const fmtTimeFile = (s: number) => fmtTime(s).replace(/:/g, "-");

type Frame = { dataUrl: string; time: number; width: number; height: number; format: string };
type TransLine = { time: number; text: string };
type Mode = "random" | "interval" | "timestamps";

export default function FrameCut() {
  const toast = useToast();

  // Video
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoInfo, setVideoInfo] = useState({ res: "—", dur: "—", fmt: "—", size: "—" });
  const [fileName, setFileName] = useState("");
  const [videoPath, setVideoPath] = useState<string | null>(null);

  // YouTube
  const [ytUrl, setYtUrl] = useState("");
  const [ytInfo, setYtInfo] = useState<any>(null);
  const [ytQuality, setYtQuality] = useState("1080");
  const [dlDir, setDlDir] = useState("~/Downloads");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [consoleProg, setConsoleProg] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Frames
  const [frames, setFrames] = useState<Frame[]>([]);
  const [mode, setMode] = useState<Mode>("random");
  const [randomCount, setRandomCount] = useState(10);
  const [intervalSec, setIntervalSec] = useState(5);
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [tsInput, setTsInput] = useState("");
  const [outputFormat, setOutputFormat] = useState("image/png");
  const [quality, setQuality] = useState(0.92);
  const [extracting, setExtracting] = useState(false);
  const [extractProg, setExtractProg] = useState({ cur: 0, total: 0 });

  // Transcription
  const [transLines, setTransLines] = useState<TransLine[]>([]);
  const [transLang, setTransLang] = useState("en");
  const [whisperLoading, setWhisperLoading] = useState(false);
  const [whisperLines, setWhisperLines] = useState<string[]>([]);
  const [showWhisperConsole, setShowWhisperConsole] = useState(false);

  // Lightbox
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIdx, setLbIdx] = useState(0);

  // Tab
  const [tab, setTab] = useState<"local" | "youtube">("local");

  // Load download dir on mount
  useEffect(() => {
    fetch(`${API}/download-dir`).then(r => r.json()).then(d => setDlDir(d.dir)).catch(() => {});
  }, []);

  // ─── VIDEO LOAD ───
  const loadLocalVideo = (file: File) => {
    const v = videoRef.current!;
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => {
      setVideoInfo({ res: `${v.videoWidth}×${v.videoHeight}`, dur: fmtTime(v.duration), fmt: file.type.split("/")[1]?.toUpperCase() || "?", size: fmtBytes(file.size) });
      setFileName(file.name);
      setVideoLoaded(true);
    };
    v.load();
  };

  const loadVideoFromPath = (p: string) => {
    const v = videoRef.current!;
    v.src = `${API}/serve-video?path=${encodeURIComponent(p)}`;
    v.onloadedmetadata = () => {
      setVideoInfo({ res: `${v.videoWidth}×${v.videoHeight}`, dur: fmtTime(v.duration), fmt: "MP4", size: "—" });
      setFileName(p.split(/[/\\]/).pop() || "");
      setVideoLoaded(true);
      setVideoPath(p);
      // Auto-find subtitles
      fetch(`${API}/find-subs?path=${encodeURIComponent(p)}`).then(r => r.json()).then(d => {
        if (d.subs?.length) {
          fetch(`${API}/read-sub?path=${encodeURIComponent(d.subs[0].path)}`).then(r => r.json()).then(s => {
            if (s.lines?.length) { setTransLines(s.lines); toast?.success(`${s.lines.length} linhas de legenda carregadas`); }
          });
        }
      }).catch(() => {});
    };
    v.load();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("video/")) loadLocalVideo(f);
    else toast?.error("Formato não suportado");
  }, []);

  // ─── YOUTUBE ───
  const analyzeYt = async () => {
    if (!ytUrl.trim()) { toast?.error("Cole uma URL"); return; }
    const m = ytUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!m) { toast?.error("URL inválida"); return; }
    try {
      const r = await fetch(`${API}/analyze`, { method: "POST", headers: hdr(), body: JSON.stringify({ url: ytUrl }) });
      const data = await r.json();
      setYtInfo({ ...data, id: m[1] });
      toast?.success("Vídeo analisado!");
    } catch { setYtInfo({ id: m[1], title: m[1] }); }
  };

  const startDownload = async (type: string) => {
    if (!ytUrl) return;
    setDownloading(type === "video");
    setShowConsole(true);
    setConsoleLines([]);
    setConsoleProg(0);
    try {
      const r = await fetch(`${API}/download`, { method: "POST", headers: hdr(), body: JSON.stringify({ url: ytUrl, quality: ytQuality, type, dir: dlDir }) });
      const data = await r.json();
      if (data.job_id) pollJob(data.job_id, type);
    } catch (e: any) { setConsoleLines(p => [...p, `❌ ${e.message}`]); setDownloading(false); }
  };

  const pollJob = (jobId: string, type: string) => {
    let lastLen = 0;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${API}/job/${jobId}`);
        const data = await r.json();
        const newLines = data.output.slice(lastLen);
        lastLen = data.output.length;
        if (newLines.length) setConsoleLines(p => [...p, ...newLines]);
        if (type === "video") setConsoleProg(data.progress || 0);
        if (data.status === "done" || data.status === "error") {
          clearInterval(iv);
          setDownloading(false);
          if (data.status === "done" && data.filepath && type === "video") {
            setVideoPath(data.filepath);
            toast?.success("Download concluído!");
          }
        }
      } catch { clearInterval(iv); setDownloading(false); }
    }, 600);
  };

  // ─── FRAME CAPTURE ───
  const captureFrame = (time: number): Promise<Frame> => {
    return new Promise((resolve, reject) => {
      const v = videoRef.current!;
      const c = canvasRef.current!;
      const ctx = c.getContext("2d")!;
      const handler = () => {
        c.width = v.videoWidth; c.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        resolve({ dataUrl: c.toDataURL(outputFormat, quality), time, width: v.videoWidth, height: v.videoHeight, format: outputFormat.split("/")[1] });
        v.removeEventListener("seeked", handler);
      };
      v.addEventListener("seeked", handler);
      v.currentTime = time;
    });
  };

  const captureCurrentFrame = async () => {
    const v = videoRef.current;
    if (!v?.duration) return;
    const f = await captureFrame(v.currentTime);
    setFrames(p => [...p, f]);
    toast?.success(`Frame em ${fmtTime(v.currentTime)}`);
  };

  const startExtraction = async () => {
    const v = videoRef.current;
    if (!v?.duration || extracting) return;
    let times: number[] = [];
    if (mode === "random") { for (let i = 0; i < Math.min(randomCount, 200); i++) times.push(Math.random() * v.duration); times.sort((a, b) => a - b); }
    else if (mode === "interval") { for (let t = 0; t < v.duration; t += intervalSec) times.push(t); }
    else { if (!timestamps.length) { toast?.error("Adicione timestamps"); return; } times = [...timestamps].sort((a, b) => a - b); }
    if (!times.length || times.length > 500) return;

    setExtracting(true);
    const wasPlaying = !v.paused; v.pause();
    const newFrames: Frame[] = [];
    for (let i = 0; i < times.length; i++) {
      setExtractProg({ cur: i + 1, total: times.length });
      try { newFrames.push(await captureFrame(times[i])); } catch {}
    }
    setFrames(p => [...p, ...newFrames]);
    setExtracting(false);
    toast?.success(`${newFrames.length} frames extraídos!`);
    if (wasPlaying) v.play();
  };

  // ─── WHISPER ───
  const startWhisper = async () => {
    let vp = videoPath;
    if (!vp) { toast?.error("Carregue um vídeo baixado do YouTube primeiro, ou use o .srt"); return; }
    setWhisperLoading(true); setShowWhisperConsole(true); setWhisperLines([]);
    try {
      const r = await fetch(`${API}/transcribe`, { method: "POST", headers: hdr(), body: JSON.stringify({ videoPath: vp, language: transLang }) });
      const data = await r.json();
      if (data.error) { setWhisperLines([`❌ ${data.error}`]); setWhisperLoading(false); return; }
      if (data.job_id) pollWhisper(data.job_id);
    } catch (e: any) { setWhisperLines([`❌ ${e.message}`]); setWhisperLoading(false); }
  };

  const pollWhisper = (jobId: string) => {
    let lastLen = 0;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${API}/job/${jobId}`);
        const data = await r.json();
        const nl = data.output.slice(lastLen); lastLen = data.output.length;
        if (nl.length) setWhisperLines(p => [...p, ...nl]);
        if (data.status === "done" || data.status === "error") {
          clearInterval(iv); setWhisperLoading(false);
          if (data.filepath) {
            const sr = await fetch(`${API}/read-sub?path=${encodeURIComponent(data.filepath)}`);
            const sd = await sr.json();
            if (sd.lines?.length) { setTransLines(sd.lines); toast?.success(`Transcrição: ${sd.lines.length} linhas!`); }
          }
        }
      } catch { clearInterval(iv); setWhisperLoading(false); }
    }, 800);
  };

  // ─── TIMESTAMPS ───
  const addTs = () => {
    let s = tsInput.trim().replace(/s$/i, "");
    let sec: number;
    if (/^\d+(\.\d+)?$/.test(s)) sec = parseFloat(s);
    else { const p = s.split(":").map(Number); if (p.some(isNaN)) { toast?.error("Inválido"); return; } sec = p.length === 2 ? p[0]*60+p[1] : p[0]*3600+p[1]*60+p[2]; }
    if (isNaN(sec) || sec < 0) { toast?.error("Inválido"); return; }
    setTimestamps(p => [...p, sec]); setTsInput("");
  };

  // ─── SUBTITLE FILE ───
  const loadSubFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines: TransLine[] = [];
      if (file.name.endsWith(".srt")) {
        for (const block of text.trim().split(/\n\s*\n/)) {
          const bl = block.trim().split("\n");
          if (bl.length < 3) continue;
          const m = bl[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
          if (!m) continue;
          lines.push({ time: +m[1]*3600+ +m[2]*60+ +m[3]+ +m[4]/1000, text: bl.slice(2).join(" ").replace(/<[^>]+>/g, "") });
        }
      } else if (file.name.endsWith(".vtt")) {
        const raw = text.split("\n"); let i = 0;
        while (i < raw.length && !raw[i].includes("-->")) i++;
        while (i < raw.length) {
          if (!raw[i].includes("-->")) { i++; continue; }
          const m = raw[i].match(/(\d{2}):(\d{2}):(\d{2})[.](\d{3})/);
          if (!m) { i++; continue; }
          let sec = +m[1]*3600+ +m[2]*60+ +m[3]+ +m[4]/1000, txt = ""; i++;
          while (i < raw.length && raw[i].trim() && !raw[i].includes("-->")) { txt += (txt ? " " : "") + raw[i].trim().replace(/<[^>]+>/g, ""); i++; }
          if (txt) lines.push({ time: sec, text: txt });
        }
      }
      setTransLines(lines);
      toast?.success(`${lines.length} linhas carregadas`);
    };
    reader.readAsText(file);
  };

  // ─── DOWNLOADS ───
  const downloadFrame = (i: number) => { const f = frames[i]; const a = document.createElement("a"); a.href = f.dataUrl; a.download = `frame_${fmtTimeFile(f.time)}.${f.format}`; a.click(); };
  const downloadAll = () => { frames.forEach((f, i) => setTimeout(() => { const a = document.createElement("a"); a.href = f.dataUrl; a.download = `frame_${String(i+1).padStart(3,"0")}_${fmtTimeFile(f.time)}.${f.format}`; a.click(); }, i * 100)); };

  // ─── SCROLL CONSOLE ───
  useEffect(() => { consoleRef.current?.scrollTo(0, consoleRef.current.scrollHeight); }, [consoleLines]);

  // ─── STYLES ───
  const s = {
    mono: { fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: "0.75rem" } as React.CSSProperties,
    console: { background: "#0c0c10", border: "1px solid #252538", borderRadius: 10, marginTop: 12, overflow: "hidden" } as React.CSSProperties,
    consoleBody: { padding: "12px 14px", maxHeight: 260, overflowY: "auto" as const, ...{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", lineHeight: 1.7, color: "#2ec4b6", whiteSpace: "pre-wrap" as const, wordBreak: "break-all" as const } },
    progBar: { height: 3, background: "#1e1e2a", borderRadius: 2, overflow: "hidden" as const, margin: "0 14px 10px" } as React.CSSProperties,
    progFill: (pct: number) => ({ height: "100%", background: "linear-gradient(90deg, #2ec4b6, #f4a261)", width: `${pct}%`, transition: "width .3s" }) as React.CSSProperties,
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } as React.CSSProperties,
    fGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 } as React.CSSProperties,
    chip: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1e1e2a", color: "#f4a261", padding: "3px 10px", borderRadius: 12, ...{ fontFamily: "monospace", fontSize: "0.72rem" } } as React.CSSProperties,
    amber: { color: "#f4a261" }, teal: { color: "#2ec4b6" }, red: { color: "#e63946" }, purple: { color: "#a78bfa" },
    btn2: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #252538", background: "#16161e", color: "#8a8aa0", cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, transition: "all .2s" } as React.CSSProperties,
    btnRed: { background: "linear-gradient(135deg, #e63946, #c1292e)", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, width: "100%", transition: "all .2s" } as React.CSSProperties,
    btnPurple: { background: "linear-gradient(135deg, #a78bfa, #7c5fd6)", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, width: "100%", transition: "all .2s" } as React.CSSProperties,
  };

  // ═════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════

  if (!videoLoaded) return (
    <div>
      <Hdr title="🎬 FrameCut" sub="Extrator de Frames + YouTube Downloader + Transcrição" />
      {/* Upload zone */}
      <div style={{ border: "2px dashed #252538", borderRadius: 12, padding: "48px 32px", textAlign: "center", cursor: "pointer", background: "#101016", transition: "all .25s", marginBottom: 20 }}
        onClick={() => document.getElementById("fc-file-input")?.click()}
        onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12, opacity: 0.6 }}>📽️</div>
        <h3 style={{ marginBottom: 6 }}>Arraste um vídeo aqui ou clique</h3>
        <p style={{ fontSize: "0.82rem", color: "#8a8aa0" }}>MP4, WEBM, MOV, AVI</p>
        <input id="fc-file-input" type="file" accept="video/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && loadLocalVideo(e.target.files[0])} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderRadius: "10px 10px 0 0", overflow: "hidden", border: "1px solid #252538", borderBottom: "none" }}>
        {(["local", "youtube"] as const).map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "12px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", background: tab === t ? "#16161e" : "#101016", color: tab === t ? "#ededf0" : "#505068", borderRight: t === "local" ? "1px solid #252538" : "none", boxShadow: tab === t ? "inset 0 2px 0 #e63946" : "none" }}>
            {t === "local" ? "📁 Arquivo Local" : "🔴 YouTube"}
          </div>
        ))}
      </div>
      <div style={{ background: "#16161e", border: "1px solid #252538", borderTop: "none", borderRadius: "0 0 10px 10px", padding: 24 }}>
        {tab === "local" ? (
          <p style={{ textAlign: "center", color: "#505068", fontSize: "0.82rem" }}>Clique na área acima ou arraste um vídeo</p>
        ) : (
          <div>
            {/* Step 1: URL */}
            <div style={{ marginBottom: 18 }}>
              <Label t="1. Cole a URL do vídeo" />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && analyzeYt()} placeholder="https://www.youtube.com/watch?v=..."
                  style={{ flex: 1, background: "#1e1e2a", border: "1px solid #252538", borderRadius: 8, padding: "10px 14px", color: "#ededf0", fontSize: "0.82rem", outline: "none" }} />
                <Btn onClick={analyzeYt}>Analisar</Btn>
              </div>
              {ytInfo && (
                <div style={{ marginTop: 12, borderRadius: 10, overflow: "hidden", border: "1px solid #252538", background: "#101016" }}>
                  <img src={`https://img.youtube.com/vi/${ytInfo.id}/hqdefault.jpg`} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} alt="" />
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 4 }}>{ytInfo.title || ytInfo.id}</div>
                    <div style={{ ...s.mono, color: "#505068" }}>{ytInfo.uploader} {ytInfo.duration ? `• ${fmtTime(ytInfo.duration)}` : ""}</div>
                  </div>
                </div>
              )}
            </div>

            {ytInfo && <>
              {/* Step 2: Quality & Download */}
              <div style={{ marginBottom: 18 }}>
                <Label t="2. Qualidade e download" />
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {["best", "1080", "720", "480"].map(q => (
                    <button key={q} onClick={() => setYtQuality(q)} style={{ ...s.btn2, ...(ytQuality === q ? { background: "#e63946", color: "#fff", borderColor: "#e63946" } : {}) }}>
                      {q === "best" ? "🏆 Melhor" : q + "p"}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#1e1e2a", border: "1px solid #252538", borderRadius: 8, padding: "8px 12px", marginTop: 10 }}>
                  <span>📁</span>
                  <span style={{ ...s.mono, color: "#8a8aa0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dlDir}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={() => startDownload("video")} disabled={downloading} style={{ ...s.btnRed, flex: 1, opacity: downloading ? 0.5 : 1 }}>
                    {downloading ? "⏳ Baixando..." : "⬇️ Baixar Vídeo"}
                  </button>
                  <button onClick={() => startDownload("thumb")} style={{ ...s.btn2, flex: "none" }}>🖼️ Thumb</button>
                  <button onClick={() => startDownload("subs")} style={{ ...s.btn2, flex: "none", ...s.purple }}>📝 Legendas</button>
                </div>

                {/* Console */}
                {showConsole && (
                  <div style={s.console}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "#101016", borderBottom: "1px solid #252538" }}>
                      <span style={{ ...s.mono, color: "#8a8aa0" }}>⌨️ Terminal</span>
                      <button onClick={() => setConsoleLines([])} style={{ ...s.btn2, padding: "2px 8px", fontSize: "0.65rem" }}>Limpar</button>
                    </div>
                    <div style={s.progBar}><div style={s.progFill(consoleProg)} /></div>
                    <div ref={consoleRef} style={s.consoleBody}>
                      {consoleLines.map((l, i) => (
                        <div key={i} style={{ color: l.includes("❌") ? "#e63946" : l.includes("✅") ? "#2ec4b6" : l.includes("[FrameCut]") ? "#a78bfa" : l.includes("WARNING") ? "#f4a261" : "#2ec4b6" }}>{l}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Load */}
              <div>
                <Label t="3. Carregar no player" />
                <p style={{ textAlign: "center", color: "#505068", fontSize: "0.78rem", marginTop: 6 }}>Arraste o arquivo acima ☝️</p>
                {videoPath && (
                  <button onClick={() => loadVideoFromPath(videoPath)} style={{ ...s.btnRed, marginTop: 8, background: "linear-gradient(135deg, #2ec4b6, #1aa89e)" }}>
                    📂 Carregar vídeo baixado no player
                  </button>
                )}
              </div>
            </>}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <video ref={videoRef} style={{ display: "none" }} />
    </div>
  );

  // ═════════ MAIN VIEW (video loaded) ═════════

  return (
    <div>
      <Hdr title="🎬 FrameCut" sub={fileName} action={<button style={s.btn2} onClick={() => { setVideoLoaded(false); setFrames([]); setTransLines([]); setVideoPath(null); }}>← Trocar vídeo</button>} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
        {/* LEFT: Player + Gallery */}
        <div>
          {/* Player */}
          <div style={{ background: "#101016", borderRadius: 10, overflow: "hidden", border: "1px solid #252538" }}>
            <video ref={videoRef} controls style={{ width: "100%", maxHeight: 500, background: "#000", display: "block" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button style={s.btn2} onClick={captureCurrentFrame}>📸 Frame atual</button>
          </div>

          {/* Transcript */}
          {transLines.length > 0 && (
            <div style={{ ...s.console, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#101016", borderBottom: "1px solid #252538" }}>
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>📝 Transcrição ({transLines.length})</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ ...s.btn2, padding: "3px 10px", fontSize: "0.68rem" }} onClick={() => { navigator.clipboard.writeText(transLines.map(l => `[${fmtTime(l.time)}] ${l.text}`).join("\n")); toast?.success("Copiado!"); }}>📋</button>
                  <button style={{ ...s.btn2, padding: "3px 10px", fontSize: "0.68rem" }} onClick={() => { const b = new Blob([transLines.map(l => `[${fmtTime(l.time)}] ${l.text}`).join("\n")], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "transcricao.txt"; a.click(); }}>⬇</button>
                  <button style={{ ...s.btn2, padding: "3px 10px", fontSize: "0.68rem" }} onClick={() => setTransLines([])}>✕</button>
                </div>
              </div>
              <div style={{ padding: 14, maxHeight: 350, overflowY: "auto", fontSize: "0.82rem", lineHeight: 1.7 }}>
                {transLines.map((l, i) => (
                  <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ ...s.mono, ...s.amber, cursor: "pointer", marginRight: 10 }} onClick={() => { const v = videoRef.current; if (v) v.currentTime = l.time; }}>[{fmtTime(l.time)}]</span>
                    <span>{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {frames.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Frames <span style={{ ...s.mono, background: "#1e1e2a", ...s.amber, padding: "3px 10px", borderRadius: 12 }}>{frames.length}</span></h3>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={s.btn2} onClick={downloadAll}>⬇ Todos</button>
                  <button style={{ ...s.btn2 }} onClick={() => setFrames([])}>✕ Limpar</button>
                </div>
              </div>
              <div style={s.fGrid}>
                {frames.map((f, i) => (
                  <div key={i} style={{ background: "#101016", border: "1px solid #252538", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "all .2s" }}
                    onClick={() => { setLbIdx(i); setLbOpen(true); }}>
                    <img src={f.dataUrl} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} alt="" />
                    <div style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ ...s.mono, ...s.amber }}>⏱ {fmtTime(f.time)}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={{ ...s.btn2, padding: "2px 6px", fontSize: "0.68rem" }} onClick={e => { e.stopPropagation(); downloadFrame(i); }}>⬇</button>
                        <button style={{ ...s.btn2, padding: "2px 6px", fontSize: "0.68rem" }} onClick={e => { e.stopPropagation(); setFrames(p => p.filter((_, j) => j !== i)); }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {frames.length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "#505068" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 10, opacity: 0.4 }}>🖼️</div>
              <p>Nenhum frame extraído. Use o painel lateral.</p>
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Info */}
          <Card>
            <Label t="Vídeo" />
            <div style={{ ...s.grid2, marginTop: 8 }}>
              {[["Resolução", videoInfo.res], ["Duração", videoInfo.dur], ["Formato", videoInfo.fmt], ["Tamanho", videoInfo.size]].map(([k, v]) => (
                <div key={k as string} style={{ background: "#16161e", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: "0.65rem", color: "#505068", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{k}</div>
                  <div style={s.mono}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Extraction */}
          <Card>
            <Label t="Extração de Frames" />
            <div style={{ display: "flex", gap: 6, margin: "10px 0", flexWrap: "wrap" }}>
              {(["random", "interval", "timestamps"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ ...s.btn2, ...(mode === m ? { background: "#e63946", color: "#fff", borderColor: "#e63946" } : {}) }}>
                  {m === "random" ? "🎲 Aleatório" : m === "interval" ? "⏱ Intervalo" : "📍 Timestamps"}
                </button>
              ))}
            </div>
            {mode === "random" && <div style={{ marginBottom: 12 }}><Label t="Quantidade" /><Input type="number" value={randomCount} onChange={(e: any) => setRandomCount(+e.target.value)} min={1} max={200} /></div>}
            {mode === "interval" && <div style={{ marginBottom: 12 }}><Label t="A cada (seg)" /><Input type="number" value={intervalSec} onChange={(e: any) => setIntervalSec(+e.target.value)} min={0.5} step={0.5} /></div>}
            {mode === "timestamps" && (
              <div style={{ marginBottom: 12 }}>
                <Label t="Timestamp" />
                <div style={{ display: "flex", gap: 6 }}>
                  <Input value={tsInput} onChange={(e: any) => setTsInput(e.target.value)} onKeyDown={(e: any) => e.key === "Enter" && addTs()} placeholder="1:30 ou 90s" style={{ flex: 1 }} />
                  <Btn onClick={addTs}>+</Btn>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {timestamps.map((t, i) => (
                    <span key={i} style={s.chip}>{fmtTime(t)} <button onClick={() => setTimestamps(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#505068", cursor: "pointer" }}>×</button></span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}><Label t="Formato" />
              <Select value={outputFormat} onChange={(e: any) => setOutputFormat(e.target.value)}>
                <option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option>
              </Select>
            </div>
            <div style={{ marginBottom: 14 }}><Label t={`Qualidade: ${Math.round(quality * 100)}%`} />
              <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={e => setQuality(+e.target.value)} style={{ width: "100%", accentColor: "#e63946" }} />
            </div>
            <button onClick={startExtraction} disabled={extracting} style={{ ...s.btnRed, opacity: extracting ? 0.5 : 1 }}>
              {extracting ? `🎞️ ${extractProg.cur}/${extractProg.total}...` : "🎞️ Extrair Frames"}
            </button>
          </Card>

          {/* Transcription */}
          <Card>
            <Label t="Transcrição" />
            <div style={{ marginBottom: 10 }}><Label t="Idioma" />
              <Select value={transLang} onChange={(e: any) => setTransLang(e.target.value)}>
                <option value="pt">Português</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option>
              </Select>
            </div>
            <button onClick={startWhisper} disabled={whisperLoading} style={{ ...s.btnPurple, marginBottom: 8, opacity: whisperLoading ? 0.5 : 1 }}>
              {whisperLoading ? "⏳ Processando..." : "🤖 Transcrever com Whisper"}
            </button>
            <div style={{ fontSize: "0.65rem", color: "#505068", marginBottom: 8 }}>Requer: pip install openai-whisper + ffmpeg</div>
            <label style={{ ...s.btn2, width: "100%", justifyContent: "center", cursor: "pointer", display: "flex" }}>
              📄 Carregar .srt / .vtt
              <input type="file" accept=".srt,.vtt" style={{ display: "none" }} onChange={e => e.target.files?.[0] && loadSubFile(e.target.files[0])} />
            </label>
            {showWhisperConsole && whisperLines.length > 0 && (
              <div style={{ ...s.console, marginTop: 10 }}>
                <div style={{ padding: "8px 14px", background: "#101016", borderBottom: "1px solid #252538", ...s.mono, color: "#8a8aa0" }}>Whisper</div>
                <div style={{ ...s.consoleBody, maxHeight: 180 }}>
                  {whisperLines.map((l, i) => <div key={i} style={{ color: l.includes("❌") ? "#e63946" : l.includes("✅") ? "#2ec4b6" : "#2ec4b6" }}>{l}</div>)}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Lightbox */}
      {lbOpen && frames[lbIdx] && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "grid", placeItems: "center", padding: 40 }} onClick={() => setLbOpen(false)}>
          <button style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "#fff", fontSize: "1.6rem", cursor: "pointer" }} onClick={() => setLbOpen(false)}>×</button>
          <button style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: "1.2rem" }}
            onClick={e => { e.stopPropagation(); setLbIdx(i => (i - 1 + frames.length) % frames.length); }}>‹</button>
          <img src={frames[lbIdx].dataUrl} style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 8 }} alt="" onClick={e => e.stopPropagation()} />
          <button style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: "1.2rem" }}
            onClick={e => { e.stopPropagation(); setLbIdx(i => (i + 1) % frames.length); }}>›</button>
          <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", ...s.mono, color: "#8a8aa0", background: "rgba(0,0,0,.6)", padding: "6px 16px", borderRadius: 20 }}>
            {lbIdx + 1}/{frames.length} — {fmtTime(frames[lbIdx].time)} — {frames[lbIdx].width}×{frames[lbIdx].height}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
