// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from "react";
import { Hdr, Btn, Card, Input, Label, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const API = "/api/framecut";
const tk = () => localStorage.getItem("lc_token") || "";
const hdr = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${tk()}` });
const safeJson = async (r: Response) => {
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw new Error(text.slice(0, 100)); }
};

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
  const [videoSrc, setVideoSrc] = useState<string>(""); // Persist video src across re-renders
  const [videoInfo, setVideoInfo] = useState({ res: "—", dur: "—", fmt: "—", size: "—" });
  const [fileName, setFileName] = useState("");
  const [videoPath, setVideoPath] = useState<string | null>(() => localStorage.getItem("fc_last_video") || null);

  // Apply video src when videoLoaded becomes true (new video element is mounted)
  useEffect(() => {
    if (!videoLoaded || !videoSrc) return;
    const timer = setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      if (videoSrc.startsWith("blob:") || videoSrc.includes("serve-video")) {
        if (!videoSrc.startsWith("blob:")) v.crossOrigin = "anonymous";
        v.preload = "auto";
        v.src = videoSrc;
        v.onloadedmetadata = () => {
          setVideoInfo({ res: `${v.videoWidth}×${v.videoHeight}`, dur: fmtTime(v.duration), fmt: "MP4", size: fmtBytes(v.duration * 200000) });
        };
        v.load();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [videoLoaded, videoSrc]);

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

  // Video Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisFrames, setAnalysisFrames] = useState<{ time: number; url: string }[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisProg, setAnalysisProg] = useState(0);
  const [showDnaModal, setShowDnaModal] = useState(false);
  const [dnaTab, setDnaTab] = useState<"storyboard" | "dna" | "roteiro" | "nichos" | "modelagem">("dna");

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

  // Job files (for download buttons after completion)
  const [jobFiles, setJobFiles] = useState<{ name: string; path: string; type: string; size: number }[]>([]);

  // Cookies
  const [cookiesActive, setCookiesActive] = useState(false);
  const [cookiesDate, setCookiesDate] = useState<string | null>(null);
  const [cookiesUploading, setCookiesUploading] = useState(false);
  const [cookiesPaste, setCookiesPaste] = useState("");
  const [showCookiesPaste, setShowCookiesPaste] = useState(false);

  const fetchCookiesStatus = () => {
    fetch(`${API}/cookies-status`).then(r => safeJson(r)).then(d => {
      setCookiesActive(!!d.active);
      setCookiesDate(d.updatedAt || null);
    }).catch(() => {});
  };

  const uploadCookies = async (file: File) => {
    setCookiesUploading(true);
    try {
      const form = new FormData();
      form.append("cookies", file);
      const r = await fetch(`${API}/upload-cookies`, { method: "POST", headers: { Authorization: `Bearer ${tk()}` }, body: form });
      const data = await safeJson(r);
      if (data.active) { setCookiesActive(true); setCookiesDate(new Date().toISOString()); toast?.success(data.message || "Cookies enviados!"); }
      else { toast?.error(data.error || "Erro ao enviar cookies"); }
    } catch (e: any) { toast?.error(e.message || "Erro ao enviar"); }
    setCookiesUploading(false);
  };

  const pasteCookies = async () => {
    if (!cookiesPaste.trim()) { toast?.error("Cole o conteúdo dos cookies primeiro"); return; }
    setCookiesUploading(true);
    try {
      const r = await fetch(`${API}/paste-cookies`, { method: "POST", headers: hdr(), body: JSON.stringify({ text: cookiesPaste }) });
      const data = await safeJson(r);
      if (data.active) {
        setCookiesActive(true); setCookiesDate(new Date().toISOString());
        setCookiesPaste(""); setShowCookiesPaste(false);
        toast?.success(data.message || "Cookies salvos!");
      } else { toast?.error(data.error || "Erro ao salvar cookies"); }
    } catch (e: any) { toast?.error(e.message || "Erro ao salvar"); }
    setCookiesUploading(false);
  };

  const removeCookies = async () => {
    try {
      await fetch(`${API}/cookies`, { method: "DELETE", headers: hdr() });
      setCookiesActive(false); setCookiesDate(null);
      toast?.success("Cookies removidos");
    } catch {}
  };

  // Load download dir + cookies status on mount + auto-load last video
  useEffect(() => {
    fetch(`${API}/download-dir`).then(r => safeJson(r)).then(d => setDlDir(d.dir)).catch(() => {});
    fetchCookiesStatus();
    // Auto-load last video from localStorage
    const lastVideo = localStorage.getItem("fc_last_video");
    if (lastVideo) {
      loadVideoFromPath(lastVideo);
    }
  }, []);

  // ─── VIDEO LOAD ───
  const loadLocalVideo = (file: File) => {
    const src = URL.createObjectURL(file);
    setVideoSrc(src);
    setFileName(file.name);
    setVideoInfo({ res: "—", dur: "—", fmt: file.type.split("/")[1]?.toUpperCase() || "?", size: fmtBytes(file.size) });
    setVideoLoaded(true); // Show player view — useEffect will apply src
  };

  const loadVideoFromPath = (p: string) => {
    const src = `${API}/serve-video?path=${encodeURIComponent(p)}`;
    setVideoSrc(src);
    setFileName(p.split(/[/\\]/).pop() || "");
    setVideoPath(p);
    localStorage.setItem("fc_last_video", p);
    setVideoLoaded(true); // Show player — useEffect will apply src
    // Auto-find subtitles
    fetch(`${API}/find-subs?path=${encodeURIComponent(p)}`).then(r => safeJson(r)).then(d => {
      if (d.subs?.length) {
        fetch(`${API}/read-sub?path=${encodeURIComponent(d.subs[0].path)}`).then(r => safeJson(r)).then(s => {
          if (s.lines?.length) { setTransLines(s.lines); toast?.success(`${s.lines.length} linhas de legenda carregadas`); }
        });
      }
    }).catch(() => {});
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
      const data = await safeJson(r);
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
      const data = await safeJson(r);
      if (data.job_id) pollJob(data.job_id, type);
    } catch (e: any) { setConsoleLines(p => [...p, `❌ ${e.message}`]); setDownloading(false); }
  };

  const triggerBrowserDownload = (serverPath: string, filename: string) => {
    const a = document.createElement("a");
    a.href = `${API}/download-file?path=${encodeURIComponent(serverPath)}`;
    a.download = filename;
    a.click();
  };

  const pollJob = (jobId: string, type: string) => {
    let lastLen = 0;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${API}/job/${jobId}`);
        const data = await safeJson(r);
        const newLines = data.output.slice(lastLen);
        lastLen = data.output.length;
        if (newLines.length) setConsoleLines(p => [...p, ...newLines]);
        if (type === "video") setConsoleProg(data.progress || 0);
        if (data.status === "done" || data.status === "error") {
          clearInterval(iv);
          setDownloading(false);
          if (data.status === "done") {
            if (data.filepath && type === "video") {
              loadVideoFromPath(data.filepath); // Load video into player + save to localStorage
            }
            // Fetch generated files for download buttons
            fetch(`${API}/job-files/${jobId}`).then(r => safeJson(r)).then(d => {
              if (d.files?.length) setJobFiles(d.files);
            }).catch(() => {});
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

  // ─── VIDEO ANALYSIS ───
  const analyzeVideo = async () => {
    if (!videoPath) { toast?.error("Carregue um vídeo primeiro"); return; }
    setAnalyzing(true); setAnalysisProg(0); setAnalysisResult(null); setAnalysisFrames([]);
    try {
      // Step 1: Extract 30 keyframes via server ffmpeg
      toast?.success("Extraindo frames do vídeo...");
      const r = await fetch(`${API}/analyze-video`, { method: "POST", headers: hdr(), body: JSON.stringify({ videoPath, count: 30 }) });
      const data = await safeJson(r);
      if (!data.job_id) { toast?.error(data.error || "Erro"); setAnalyzing(false); return; }

      // Step 2: Poll extraction job
      const jobId = data.job_id;
      const jobResult: any = await new Promise((resolve) => {
        const iv = setInterval(async () => {
          const jr = await fetch(`${API}/analyze-result/${jobId}?base64=true`);
          const jd = await safeJson(jr);
          setAnalysisProg(Math.round((jd.progress || 0) * 0.5)); // 0-50% for extraction
          if (jd.status === "done" || jd.status === "error") {
            clearInterval(iv);
            resolve(jd);
          }
        }, 800);
      });

      if (!jobResult.frames?.length) { toast?.error("Falha ao extrair frames"); setAnalyzing(false); return; }
      setAnalysisFrames(jobResult.frames);
      toast?.success(`${jobResult.frames.length} frames extraídos — analisando com IA...`);
      setAnalysisProg(55);

      // Step 3: Build transcription text if available
      const transcriptText = transLines.length > 0
        ? transLines.map(l => `[${fmtTime(l.time)}] ${l.text}`).join("\n")
        : "";

      // Step 4: Send frames + transcription to AI for deep analysis
      // Limit to 10 frames to avoid body size issues (server picks best spread)
      const step = Math.max(1, Math.floor(jobResult.frames.length / 10));
      const selectedFrames = jobResult.frames.filter((_: any, i: number) => i % step === 0).slice(0, 10);
      toast?.success(`Enviando ${selectedFrames.length} frames para análise IA...`);

      const aiR = await fetch("/api/ai/analyze-visual", {
        method: "POST", headers: hdr(),
        body: JSON.stringify({
          frames: selectedFrames.map((f: any) => ({ time: f.time, base64: f.base64 })),
          videoTitle: fileName,
          duration: jobResult.duration,
          frameCount: jobResult.frames.length,
          transcription: transcriptText,
        }),
      });
      setAnalysisProg(90);

      if (!aiR.ok) {
        const errText = await aiR.text();
        toast?.error(`Erro IA (${aiR.status}): ${errText.slice(0, 150)}`);
        setAnalysisProg(100); setAnalyzing(false); return;
      }

      const aiD = await safeJson(aiR);
      if (aiD.analysis) {
        setAnalysisResult(aiD.analysis);
        setShowDnaModal(true);
        setDnaTab("dna");
        toast?.success("Análise completa do DNA do vídeo!");
      } else if (aiD.error) {
        toast?.error(aiD.error);
      } else {
        toast?.error("Resposta da IA sem análise — verifique a configuração da API");
      }
      setAnalysisProg(100);
    } catch (e: any) { toast?.error("Erro na análise: " + (e.message || "Erro desconhecido").slice(0, 200)); }
    setAnalyzing(false);
  };

  // ─── WHISPER ───
  const startWhisper = async () => {
    let vp = videoPath;
    if (!vp) { toast?.error("Carregue um vídeo baixado do YouTube primeiro, ou use o .srt"); return; }
    setWhisperLoading(true); setShowWhisperConsole(true); setWhisperLines([]);
    try {
      const r = await fetch(`${API}/transcribe`, { method: "POST", headers: hdr(), body: JSON.stringify({ videoPath: vp, language: transLang }) });
      const data = await safeJson(r);
      if (data.error) { setWhisperLines([`❌ ${data.error}`]); setWhisperLoading(false); return; }
      if (data.job_id) pollWhisper(data.job_id);
    } catch (e: any) { setWhisperLines([`❌ ${e.message}`]); setWhisperLoading(false); }
  };

  const pollWhisper = (jobId: string) => {
    let lastLen = 0;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${API}/job/${jobId}`);
        const data = await safeJson(r);
        const nl = data.output.slice(lastLen); lastLen = data.output.length;
        if (nl.length) setWhisperLines(p => [...p, ...nl]);
        if (data.status === "done" || data.status === "error") {
          clearInterval(iv); setWhisperLoading(false);
          if (data.filepath) {
            const sr = await fetch(`${API}/read-sub?path=${encodeURIComponent(data.filepath)}`);
            const sd = await safeJson(sr);
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
            {/* Cookies Banner */}
            <div style={{ marginBottom: 18, borderRadius: 10, border: `1px solid ${cookiesActive ? "#1a4a3a" : "#3a2a10"}`, background: cookiesActive ? "rgba(46,196,182,0.06)" : "rgba(244,162,97,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "1.1rem" }}>{cookiesActive ? "🟢" : "🟡"}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.82rem", color: cookiesActive ? "#2ec4b6" : "#f4a261" }}>
                        {cookiesActive ? "Cookies ativos" : "Sem cookies (pode bloquear)"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#505068", marginTop: 2 }}>
                        {cookiesActive && cookiesDate
                          ? `Enviado em ${new Date(cookiesDate).toLocaleDateString("pt-BR")} às ${new Date(cookiesDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                          : "Envie ou cole cookies.txt do YouTube para evitar bloqueio anti-bot"
                        }
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setShowCookiesPaste(!showCookiesPaste)} style={{ ...s.btn2, padding: "6px 12px", fontSize: "0.72rem" }}>
                      📋 Colar
                    </button>
                    <label style={{ ...s.btn2, padding: "6px 12px", fontSize: "0.72rem", cursor: cookiesUploading ? "wait" : "pointer", opacity: cookiesUploading ? 0.5 : 1 }}>
                      📤 Arquivo
                      <input type="file" accept=".txt" style={{ display: "none" }} disabled={cookiesUploading}
                        onChange={e => { if (e.target.files?.[0]) uploadCookies(e.target.files[0]); e.target.value = ""; }} />
                    </label>
                    {cookiesActive && (
                      <button onClick={removeCookies} style={{ ...s.btn2, padding: "6px 10px", fontSize: "0.72rem", color: "#e63946" }}>✕</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Paste area */}
              {showCookiesPaste && (
                <div style={{ padding: "0 16px 14px" }}>
                  <textarea
                    value={cookiesPaste}
                    onChange={e => setCookiesPaste(e.target.value)}
                    placeholder={"Cole aqui o conteúdo do cookies.txt\n\nEx: # Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tvalue..."}
                    style={{
                      width: "100%", height: 140, resize: "vertical",
                      background: "#0c0c10", border: "1px solid #252538", borderRadius: 8,
                      padding: "10px 12px", color: "#ededf0", fontSize: "0.75rem",
                      fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6,
                      outline: "none",
                    }}
                    onFocus={e => { e.target.style.borderColor = "rgba(75,141,248,0.4)"; }}
                    onBlur={e => { e.target.style.borderColor = "#252538"; }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      onClick={pasteCookies}
                      disabled={cookiesUploading || !cookiesPaste.trim()}
                      style={{
                        flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: cookiesUploading || !cookiesPaste.trim() ? "#1e1e2a" : "linear-gradient(135deg, #2ec4b6, #1aa89e)",
                        color: cookiesUploading || !cookiesPaste.trim() ? "#505068" : "#fff",
                        fontSize: "0.82rem", fontWeight: 600, transition: "all 0.2s",
                      }}
                    >
                      {cookiesUploading ? "⏳ Salvando..." : "✅ Salvar cookies"}
                    </button>
                    <button
                      onClick={() => { setShowCookiesPaste(false); setCookiesPaste(""); }}
                      style={{ ...s.btn2, padding: "10px 14px", fontSize: "0.78rem" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {!cookiesActive && !showCookiesPaste && (
                <div style={{ padding: "0 16px 14px" }}>
                  <div style={{ padding: "10px 12px", background: "#101016", borderRadius: 8, fontSize: "0.72rem", color: "#8a8aa0", lineHeight: 1.6 }}>
                    <strong style={{ color: "#f4a261" }}>Como obter:</strong> Instale a extensão <strong>"Get cookies.txt LOCALLY"</strong> no Chrome, acesse youtube.com logado, clique na extensão e exporte. Depois envie o arquivo ou cole o conteúdo acima.
                  </div>
                </div>
              )}
            </div>

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

                {/* Download files to user's computer */}
                {!downloading && jobFiles.length > 0 && (
                  <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 10, border: "1px solid #1a4a3a", background: "rgba(46,196,182,0.06)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#2ec4b6", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>💾</span> Salvar no seu computador
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {jobFiles.map((f, i) => {
                        const icon = f.type === "video" ? "🎬" : f.type === "thumb" ? "🖼️" : f.type === "subs" ? "📝" : "📄";
                        const sizeStr = f.size > 1048576 ? (f.size / 1048576).toFixed(1) + " MB" : (f.size / 1024).toFixed(0) + " KB";
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#0c0c10", borderRadius: 8 }}>
                            <span style={{ fontSize: "1rem" }}>{icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#ededf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                              <div style={{ fontSize: "0.68rem", color: "#505068" }}>{sizeStr}</div>
                            </div>
                            <button
                              onClick={() => triggerBrowserDownload(f.path, f.name)}
                              style={{
                                padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                                background: f.type === "video" ? "linear-gradient(135deg, #e63946, #c1292e)" : "#1e1e2a",
                                color: f.type === "video" ? "#fff" : "#8a8aa0",
                                fontSize: "0.75rem", fontWeight: 600, flexShrink: 0,
                              }}
                            >
                              ⬇ Salvar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => jobFiles.forEach((f, i) => setTimeout(() => triggerBrowserDownload(f.path, f.name), i * 300))}
                      style={{
                        width: "100%", marginTop: 10, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg, #2ec4b6, #1aa89e)", color: "#fff",
                        fontSize: "0.82rem", fontWeight: 600,
                      }}
                    >
                      ⬇ Salvar Todos ({jobFiles.length} arquivos)
                    </button>
                  </div>
                )}

                {/* Cookies upload card — appears after bot-block error */}
                {showConsole && !downloading && consoleLines.some(l => l.includes("bloqueou") || l.includes("not a bot") || l.includes("anti-bot")) && (
                  <div style={{
                    marginTop: 12, borderRadius: 10, overflow: "hidden",
                    border: cookiesActive ? "1px solid #1a4a3a" : "1px solid rgba(240,68,68,0.20)",
                    background: cookiesActive ? "rgba(46,196,182,0.06)" : "rgba(240,68,68,0.04)",
                  }}>
                    <div style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: "1.3rem" }}>{cookiesActive ? "🟢" : "🔒"}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: cookiesActive ? "#2ec4b6" : "#e63946" }}>
                            {cookiesActive ? "Cookies ativos — tente baixar novamente" : "YouTube bloqueou o download"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#8a8aa0", marginTop: 2 }}>
                            {cookiesActive ? "Seus cookies podem estar expirados. Atualize abaixo." : "Envie ou cole seus cookies do YouTube para desbloquear"}
                          </div>
                        </div>
                      </div>

                      {!cookiesActive && (
                        <div style={{ padding: "12px 14px", background: "#0c0c10", borderRadius: 8, marginBottom: 14, fontSize: "0.78rem", color: "#c0c0d0", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 700, color: "#f4a261", marginBottom: 6 }}>Como fazer em 3 passos:</div>
                          <div>1. Instale a extensão <strong style={{ color: "#ededf0" }}>"Get cookies.txt LOCALLY"</strong> no Chrome</div>
                          <div>2. Acesse <strong style={{ color: "#ededf0" }}>youtube.com</strong> logado na sua conta</div>
                          <div>3. Clique na extensão → <strong style={{ color: "#ededf0" }}>Export</strong> → copie ou salve</div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          onClick={() => setShowCookiesPaste(true)}
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            padding: "12px 16px", borderRadius: 8, cursor: "pointer", border: "none",
                            background: "linear-gradient(135deg, #e63946, #c1292e)",
                            color: "#fff", fontSize: "0.85rem", fontWeight: 600, transition: "all 0.2s",
                          }}
                        >
                          📋 Colar cookies
                        </button>
                        <label style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          padding: "12px 16px", borderRadius: 8, cursor: cookiesUploading ? "wait" : "pointer",
                          background: "#1e1e2a", border: "1px solid #252538",
                          color: "#8a8aa0", fontSize: "0.85rem", fontWeight: 600,
                          opacity: cookiesUploading ? 0.5 : 1, transition: "all 0.2s",
                        }}>
                          📤 Arquivo
                          <input type="file" accept=".txt" style={{ display: "none" }} disabled={cookiesUploading}
                            onChange={e => { if (e.target.files?.[0]) uploadCookies(e.target.files[0]); e.target.value = ""; }} />
                        </label>
                        {cookiesActive && (
                          <button onClick={removeCookies} style={{ ...s.btn2, padding: "12px 14px", fontSize: "0.78rem", color: "#e63946" }}>✕</button>
                        )}
                      </div>
                    </div>

                    {/* Paste area inside error card */}
                    {showCookiesPaste && (
                      <div style={{ padding: "0 18px 16px" }}>
                        <textarea
                          value={cookiesPaste}
                          onChange={e => setCookiesPaste(e.target.value)}
                          placeholder={"Cole aqui o conteúdo do cookies.txt\n\n# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tvalue..."}
                          style={{
                            width: "100%", height: 150, resize: "vertical",
                            background: "#0c0c10", border: "1px solid #252538", borderRadius: 8,
                            padding: "10px 12px", color: "#ededf0", fontSize: "0.75rem",
                            fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, outline: "none",
                          }}
                          onFocus={e => { e.target.style.borderColor = "rgba(75,141,248,0.4)"; }}
                          onBlur={e => { e.target.style.borderColor = "#252538"; }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            onClick={pasteCookies}
                            disabled={cookiesUploading || !cookiesPaste.trim()}
                            style={{
                              flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                              background: cookiesUploading || !cookiesPaste.trim() ? "#1e1e2a" : "linear-gradient(135deg, #2ec4b6, #1aa89e)",
                              color: cookiesUploading || !cookiesPaste.trim() ? "#505068" : "#fff",
                              fontSize: "0.82rem", fontWeight: 600, transition: "all 0.2s",
                            }}
                          >
                            {cookiesUploading ? "⏳ Salvando..." : "✅ Salvar cookies"}
                          </button>
                          <button
                            onClick={() => { setShowCookiesPaste(false); setCookiesPaste(""); }}
                            style={{ ...s.btn2, padding: "10px 14px", fontSize: "0.78rem" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {cookiesActive && cookiesDate && (
                      <div style={{ padding: "0 18px 12px", fontSize: "0.7rem", color: "#505068", textAlign: "center" }}>
                        Último envio: {new Date(cookiesDate).toLocaleDateString("pt-BR")} às {new Date(cookiesDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
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
    </div>
  );

  // ═════════ MAIN VIEW (video loaded) ═════════

  return (
    <div>
      <Hdr title="🎬 FrameCut" sub={fileName} action={<button style={s.btn2} onClick={() => { setVideoLoaded(false); setVideoSrc(""); setFrames([]); setTransLines([]); setVideoPath(null); setJobFiles([]); localStorage.removeItem("fc_last_video"); }}>← Trocar vídeo</button>} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
        {/* LEFT: Player + Gallery */}
        <div>
          {/* Player */}
          <div style={{ borderRadius: 10, overflow: "hidden" }}>
            <video ref={videoRef} controls crossOrigin="anonymous" style={{ width: "100%", display: "block", borderRadius: 10 }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button style={s.btn2} onClick={captureCurrentFrame}>📸 Frame atual</button>
          </div>

          {/* Transcript */}
          {transLines.length > 0 && (
            <div style={{ ...s.console, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#101016", borderBottom: "1px solid #252538", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>📝 Transcrição ({transLines.length})</span>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <button style={{ ...s.btn2, padding: "4px 10px", fontSize: "0.72rem" }} title="Copiar com timestamps"
                    onClick={() => { navigator.clipboard.writeText(transLines.map(l => `[${fmtTime(l.time)}] ${l.text}`).join("\n")); toast?.success("Copiado com timestamps!"); }}>📋 +T</button>
                  <button style={{ ...s.btn2, padding: "4px 10px", fontSize: "0.72rem" }} title="Copiar só texto"
                    onClick={() => { navigator.clipboard.writeText(transLines.map(l => l.text).join("\n")); toast?.success("Texto copiado!"); }}>📋 TXT</button>
                  <button style={{ ...s.btn2, padding: "4px 10px", fontSize: "0.72rem" }} title="Baixar com timestamps"
                    onClick={() => { const b = new Blob([transLines.map(l => `[${fmtTime(l.time)}] ${l.text}`).join("\n")], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "transcricao_timestamps.txt"; a.click(); }}>⬇ +T</button>
                  <button style={{ ...s.btn2, padding: "4px 10px", fontSize: "0.72rem" }} title="Baixar só texto"
                    onClick={() => { const b = new Blob([transLines.map(l => l.text).join("\n")], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "transcricao.txt"; a.click(); }}>⬇ TXT</button>
                  <button style={{ ...s.btn2, padding: "4px 10px", fontSize: "0.72rem" }} onClick={() => setTransLines([])}>✕</button>
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

          {/* Video Analysis */}
          <Card>
            <Label t="Análise Visual" />
            <p style={{ fontSize: "0.78rem", color: "#8a8aa0", marginBottom: 12, lineHeight: 1.5 }}>
              Extrai frames-chave e analisa estilo, cores, edição e produção do vídeo com IA.
            </p>
            <button onClick={analyzeVideo} disabled={analyzing || !videoPath} style={{ ...s.btnPurple, opacity: analyzing || !videoPath ? 0.5 : 1 }}>
              {analyzing ? `⏳ Analisando... ${analysisProg}%` : "🎬 Analisar Vídeo"}
            </button>

            {/* Storyboard mini preview */}
            {analysisFrames.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#a78bfa", marginBottom: 8 }}>📸 {analysisFrames.length} frames extraídos</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3, borderRadius: 8, overflow: "hidden" }}>
                  {analysisFrames.slice(0, 10).map((f, i) => (
                    <img key={i} src={f.url} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  ))}
                </div>
              </div>
            )}

            {/* Open DNA Modal button */}
            {analysisResult && (
              <button onClick={() => setShowDnaModal(true)} style={{ ...s.btnPurple, marginTop: 10, background: "linear-gradient(135deg, #7c5fd6, #a78bfa)" }}>
                🧬 Ver Análise DNA Completa
              </button>
            )}
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

      {/* ══════ DNA ANALYSIS MODAL ══════ */}
      {showDnaModal && analysisResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 20px", overflowY: "auto" }}
          onClick={() => setShowDnaModal(false)}>
          <div style={{ background: "#12121a", borderRadius: 16, width: "100%", maxWidth: 960, border: "1px solid #252538", position: "relative", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ededf0", margin: 0 }}>🧬 DNA do Video</h2>
                  <p style={{ fontSize: "0.85rem", color: "#8a8aa0", marginTop: 4 }}>{fileName || "Video analisado"}</p>
                </div>
                <button onClick={() => setShowDnaModal(false)} style={{ background: "none", border: "none", color: "#8a8aa0", fontSize: "1.5rem", cursor: "pointer", padding: "4px 8px" }}>×</button>
              </div>

              {/* Nicho hierarchy badges */}
              {(analysisResult.nicho || analysisResult.subnicho) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {analysisResult.nicho && <span style={{ padding: "6px 14px", borderRadius: 8, background: "#e6394618", color: "#e63946", fontSize: "0.85rem", fontWeight: 600 }}>🎯 {analysisResult.nicho}</span>}
                  {analysisResult.subnicho && <span style={{ padding: "6px 14px", borderRadius: 8, background: "#a78bfa18", color: "#a78bfa", fontSize: "0.85rem", fontWeight: 600 }}>📂 {analysisResult.subnicho}</span>}
                  {analysisResult.micronicho && <span style={{ padding: "6px 14px", borderRadius: 8, background: "#2ec4b618", color: "#2ec4b6", fontSize: "0.85rem", fontWeight: 600 }}>🔬 {analysisResult.micronicho}</span>}
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #252538" }}>
                {([
                  { id: "dna" as const, label: "🧬 DNA Visual" },
                  { id: "roteiro" as const, label: "📝 Roteiro" },
                  { id: "nichos" as const, label: "🎯 Nichos" },
                  { id: "storyboard" as const, label: "📸 Storyboard" },
                  { id: "modelagem" as const, label: "🎨 Modelagem" },
                ]).map(t => (
                  <button key={t.id} onClick={() => setDnaTab(t.id)}
                    style={{ padding: "10px 18px", background: "none", border: "none", borderBottom: dnaTab === t.id ? "2px solid #a78bfa" : "2px solid transparent", color: dnaTab === t.id ? "#ededf0" : "#505068", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px 24px", overflowY: "auto", flex: 1 }}>

              {/* ── TAB: DNA VISUAL ── */}
              {dnaTab === "dna" && (
                <div>
                  {analysisResult.dnaResumo && (
                    <p style={{ fontSize: "0.92rem", color: "#ededf0", lineHeight: 1.8, marginBottom: 20, padding: "16px 18px", background: "linear-gradient(135deg, #0c0c10, #15152a)", borderRadius: 12, borderLeft: "3px solid #a78bfa" }}>
                      {analysisResult.dnaResumo}
                    </p>
                  )}

                  {/* Metrics grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                    {[
                      ["ESTILO", analysisResult.estilo, "#a78bfa"],
                      ["FORMATO", analysisResult.formato, "#4B8DF8"],
                      ["RITMO EDICAO", analysisResult.ritmoEdicao, "#f4a261"],
                      ["QUALIDADE", analysisResult.qualidade ? `${analysisResult.qualidade}/10` : null, "#22D35E"],
                      ["COLOR GRADING", analysisResult.colorGrading, "#EC4899"],
                      ["ILUMINACAO", analysisResult.iluminacao, "#f4a261"],
                      ["AUDIENCIA", analysisResult.audiencia, "#4B8DF8"],
                      ["MUSICA", analysisResult.musicaEstilo, "#a78bfa"],
                    ].filter(([, v]) => v).map(([label, val, color]) => (
                      <div key={label as string} style={{ padding: "12px 14px", background: "#101016", borderRadius: 10, borderTop: `2px solid ${color}` }}>
                        <div style={{ fontSize: "0.7rem", color: "#505068", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#ededf0" }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Color palette */}
                  {analysisResult.cores && Array.isArray(analysisResult.cores) && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: "0.78rem", color: "#505068", marginBottom: 6, fontWeight: 600 }}>PALETA DE CORES</div>
                      <div style={{ display: "flex", gap: 4, borderRadius: 10, overflow: "hidden" }}>
                        {analysisResult.cores.map((c: string, i: number) => (
                          <div key={i} style={{ flex: 1, height: 44, background: c, cursor: "pointer", position: "relative" }} title={c}
                            onClick={() => { navigator.clipboard.writeText(c); toast?.success(`${c} copiado!`); }}>
                            <span style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", fontSize: "0.6rem", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>{c}</span>
                          </div>
                        ))}
                      </div>
                      {analysisResult.paleta && <div style={{ fontSize: "0.8rem", color: "#8a8aa0", marginTop: 6 }}>{analysisResult.paleta}</div>}
                    </div>
                  )}

                  {/* Production chips */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {[
                      ["🎥 CAMERAS / MOVIMENTOS", analysisResult.cameras, "#4B8DF8"],
                      ["✨ TRANSICOES", analysisResult.transicoes, "#a78bfa"],
                      ["💥 EFEITOS VISUAIS", analysisResult.efeitosVisuais, "#f4a261"],
                      ["🔊 SFX VISUAIS", analysisResult.sfx, "#EC4899"],
                      ["🛠 FERRAMENTAS", analysisResult.ferramentas, "#22D35E"],
                    ].filter(([, arr]) => Array.isArray(arr) && arr.length).map(([label, arr, color]) => (
                      <div key={label as string} style={{ padding: "12px 14px", background: "#101016", borderRadius: 10 }}>
                        <div style={{ fontSize: "0.72rem", color: color as string, marginBottom: 8, fontWeight: 600 }}>{label}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {(arr as string[]).map((item, i) => (
                            <span key={i} style={{ fontSize: "0.8rem", padding: "4px 10px", borderRadius: 6, background: `${color}12`, color: color as string }}>{item}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Highlights & Improvements side by side */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    {analysisResult.destaques && (
                      <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10, borderLeft: "3px solid #22D35E" }}>
                        <div style={{ fontSize: "0.78rem", color: "#22D35E", marginBottom: 8, fontWeight: 700 }}>✅ PONTOS FORTES</div>
                        {analysisResult.destaques.map((d: string, i: number) => <div key={i} style={{ fontSize: "0.85rem", padding: "4px 0", color: "#c0c0d0", lineHeight: 1.6 }}>• {d}</div>)}
                      </div>
                    )}
                    {analysisResult.melhorias && (
                      <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10, borderLeft: "3px solid #f4a261" }}>
                        <div style={{ fontSize: "0.78rem", color: "#f4a261", marginBottom: 8, fontWeight: 700 }}>💡 SUGESTOES DE MELHORIA</div>
                        {analysisResult.melhorias.map((m: string, i: number) => <div key={i} style={{ fontSize: "0.85rem", padding: "4px 0", color: "#c0c0d0", lineHeight: 1.6 }}>• {m}</div>)}
                      </div>
                    )}
                  </div>

                  {analysisResult.canaisSimilares && (
                    <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10, marginBottom: 16 }}>
                      <div style={{ fontSize: "0.78rem", color: "#4B8DF8", marginBottom: 8, fontWeight: 700 }}>📺 CANAIS SIMILARES</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {analysisResult.canaisSimilares.map((c: string, i: number) => (
                          <span key={i} style={{ fontSize: "0.85rem", padding: "6px 14px", borderRadius: 8, background: "#4B8DF812", color: "#4B8DF8", fontWeight: 500 }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: ROTEIRO ── */}
              {dnaTab === "roteiro" && (
                <div>
                  {analysisResult.roteiro ? (
                    <>
                      {/* Script structure timeline */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#a78bfa", marginBottom: 12 }}>📐 ESTRUTURA DO ROTEIRO</div>
                        {analysisResult.roteiro.estrutura && Array.isArray(analysisResult.roteiro.estrutura) && (
                          <div style={{ position: "relative", paddingLeft: 24 }}>
                            <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, #a78bfa, #2ec4b6, #f4a261)" }} />
                            {analysisResult.roteiro.estrutura.map((sec: any, i: number) => (
                              <div key={i} style={{ position: "relative", marginBottom: 16, paddingLeft: 20 }}>
                                <div style={{ position: "absolute", left: -20, top: 4, width: 12, height: 12, borderRadius: "50%", background: "#a78bfa", border: "2px solid #12121a" }} />
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                  <span style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: 6, background: "#a78bfa18", color: "#a78bfa", fontWeight: 600 }}>{sec.secao || sec.section}</span>
                                  <span style={{ fontSize: "0.75rem", color: "#505068", fontFamily: "monospace" }}>{sec.timestamp}</span>
                                </div>
                                <div style={{ fontSize: "0.88rem", color: "#c0c0d0", lineHeight: 1.6 }}>{sec.descricao || sec.description}</div>
                                {sec.tecnica && <div style={{ fontSize: "0.78rem", color: "#f4a261", marginTop: 4 }}>Tecnica: {sec.tecnica}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Script metrics */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                        {analysisResult.roteiro.tom && (
                          <div style={{ padding: "12px 14px", background: "#101016", borderRadius: 10 }}>
                            <div style={{ fontSize: "0.7rem", color: "#505068", marginBottom: 4 }}>TOM NARRATIVO</div>
                            <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#ededf0" }}>{analysisResult.roteiro.tom}</div>
                          </div>
                        )}
                        {analysisResult.roteiro.pacing && (
                          <div style={{ padding: "12px 14px", background: "#101016", borderRadius: 10 }}>
                            <div style={{ fontSize: "0.7rem", color: "#505068", marginBottom: 4 }}>PACING</div>
                            <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#ededf0" }}>{analysisResult.roteiro.pacing}</div>
                          </div>
                        )}
                        {analysisResult.roteiro.ctaTexto && (
                          <div style={{ padding: "12px 14px", background: "#101016", borderRadius: 10 }}>
                            <div style={{ fontSize: "0.7rem", color: "#505068", marginBottom: 4 }}>CTA PRINCIPAL</div>
                            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#e63946" }}>"{analysisResult.roteiro.ctaTexto}"</div>
                          </div>
                        )}
                      </div>

                      {/* Hooks */}
                      {analysisResult.roteiro.hooks && (
                        <div style={{ marginBottom: 16, padding: "14px 16px", background: "#101016", borderRadius: 10, borderLeft: "3px solid #e63946" }}>
                          <div style={{ fontSize: "0.78rem", color: "#e63946", marginBottom: 8, fontWeight: 700 }}>🪝 HOOKS USADOS</div>
                          {analysisResult.roteiro.hooks.map((h: string, i: number) => (
                            <div key={i} style={{ fontSize: "0.88rem", padding: "4px 0", color: "#ededf0", lineHeight: 1.6 }}>"{h}"</div>
                          ))}
                        </div>
                      )}

                      {/* Open Loops */}
                      {analysisResult.roteiro.openLoops && (
                        <div style={{ marginBottom: 16, padding: "14px 16px", background: "#101016", borderRadius: 10, borderLeft: "3px solid #f4a261" }}>
                          <div style={{ fontSize: "0.78rem", color: "#f4a261", marginBottom: 8, fontWeight: 700 }}>🔄 OPEN LOOPS</div>
                          {analysisResult.roteiro.openLoops.map((l: string, i: number) => (
                            <div key={i} style={{ fontSize: "0.88rem", padding: "4px 0", color: "#c0c0d0", lineHeight: 1.6 }}>• {l}</div>
                          ))}
                        </div>
                      )}

                      {/* Emotional triggers & retention */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        {analysisResult.roteiro.gatilhosEmocionais && (
                          <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10 }}>
                            <div style={{ fontSize: "0.78rem", color: "#EC4899", marginBottom: 8, fontWeight: 700 }}>💗 GATILHOS EMOCIONAIS</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {analysisResult.roteiro.gatilhosEmocionais.map((g: string, i: number) => (
                                <span key={i} style={{ fontSize: "0.82rem", padding: "4px 10px", borderRadius: 6, background: "#EC489912", color: "#EC4899" }}>{g}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {analysisResult.roteiro.retencaoTecnicas && (
                          <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10 }}>
                            <div style={{ fontSize: "0.78rem", color: "#2ec4b6", marginBottom: 8, fontWeight: 700 }}>📊 TECNICAS DE RETENCAO</div>
                            {analysisResult.roteiro.retencaoTecnicas.map((t: string, i: number) => (
                              <div key={i} style={{ fontSize: "0.85rem", padding: "3px 0", color: "#c0c0d0" }}>• {t}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Script strengths & improvements */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {analysisResult.roteiro.pontosFortesRoteiro && (
                          <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10, borderLeft: "3px solid #22D35E" }}>
                            <div style={{ fontSize: "0.78rem", color: "#22D35E", marginBottom: 8, fontWeight: 700 }}>✅ PONTOS FORTES DO ROTEIRO</div>
                            {analysisResult.roteiro.pontosFortesRoteiro.map((p: string, i: number) => (
                              <div key={i} style={{ fontSize: "0.85rem", padding: "4px 0", color: "#c0c0d0", lineHeight: 1.6 }}>• {p}</div>
                            ))}
                          </div>
                        )}
                        {analysisResult.roteiro.melhorasRoteiro && (
                          <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10, borderLeft: "3px solid #f4a261" }}>
                            <div style={{ fontSize: "0.78rem", color: "#f4a261", marginBottom: 8, fontWeight: 700 }}>💡 MELHORIAS DO ROTEIRO</div>
                            {analysisResult.roteiro.melhorasRoteiro.map((m: string, i: number) => (
                              <div key={i} style={{ fontSize: "0.85rem", padding: "4px 0", color: "#c0c0d0", lineHeight: 1.6 }}>• {m}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#505068" }}>
                      <div style={{ fontSize: "2rem", marginBottom: 12 }}>📝</div>
                      <p style={{ fontSize: "0.92rem" }}>Analise de roteiro nao disponivel.</p>
                      <p style={{ fontSize: "0.82rem", marginTop: 8 }}>Transcreva o video primeiro e depois analise novamente para obter a analise completa do roteiro.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: NICHOS ── */}
              {dnaTab === "nichos" && (
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#e63946", marginBottom: 16 }}>🎯 NICHOS RELACIONADOS PARA ATACAR</div>
                  {analysisResult.nichosRelacionados && Array.isArray(analysisResult.nichosRelacionados) && analysisResult.nichosRelacionados.length > 0 ? (
                    <div style={{ display: "grid", gap: 16 }}>
                      {analysisResult.nichosRelacionados.map((n: any, i: number) => (
                        <div key={i} style={{ background: "#101016", borderRadius: 14, border: "1px solid #252538", overflow: "hidden" }}>
                          {/* Header */}
                          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2a", background: "linear-gradient(135deg, #12121a, #16162a)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ededf0" }}>{n.nome}</div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <span style={{ fontSize: "0.75rem", padding: "4px 12px", borderRadius: 6, background: n.dificuldade === "Facil" || n.dificuldade === "Fácil" ? "#22D35E15" : n.dificuldade === "Medio" || n.dificuldade === "Médio" ? "#f4a26115" : "#e6394615", color: n.dificuldade === "Facil" || n.dificuldade === "Fácil" ? "#22D35E" : n.dificuldade === "Medio" || n.dificuldade === "Médio" ? "#f4a261" : "#e63946", fontWeight: 600 }}>
                                  {n.dificuldade || "Medio"}
                                </span>
                                <span style={{ fontSize: "0.75rem", padding: "4px 12px", borderRadius: 6, background: n.potencial === "Alto" ? "#22D35E15" : "#4B8DF815", color: n.potencial === "Alto" ? "#22D35E" : "#4B8DF8", fontWeight: 600 }}>
                                  Potencial: {n.potencial || "Medio"}
                                </span>
                              </div>
                            </div>

                            {/* Quick stats row */}
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                              {n.paisAlvo && (
                                <span style={{ fontSize: "0.78rem", color: "#8a8aa0", display: "flex", alignItems: "center", gap: 4 }}>
                                  🌍 <strong style={{ color: "#ededf0" }}>{n.paisAlvo}</strong>
                                </span>
                              )}
                              {n.idioma && (
                                <span style={{ fontSize: "0.78rem", color: "#8a8aa0", display: "flex", alignItems: "center", gap: 4 }}>
                                  🗣 <strong style={{ color: "#ededf0" }}>{n.idioma}</strong>
                                </span>
                              )}
                              {n.rpmEstimado && (
                                <span style={{ fontSize: "0.78rem", color: "#8a8aa0", display: "flex", alignItems: "center", gap: 4 }}>
                                  💰 RPM: <strong style={{ color: "#22D35E" }}>{n.rpmEstimado}</strong>
                                </span>
                              )}
                              {n.viewsEstimado && (
                                <span style={{ fontSize: "0.78rem", color: "#8a8aa0", display: "flex", alignItems: "center", gap: 4 }}>
                                  👁 Views: <strong style={{ color: "#4B8DF8" }}>{n.viewsEstimado}</strong>
                                </span>
                              )}
                              {n.frequencia && (
                                <span style={{ fontSize: "0.78rem", color: "#8a8aa0", display: "flex", alignItems: "center", gap: 4 }}>
                                  📅 <strong style={{ color: "#ededf0" }}>{n.frequencia}</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Body */}
                          <div style={{ padding: "16px 20px" }}>
                            {/* Channel name suggestion */}
                            {n.nomeCanal && (
                              <div style={{ marginBottom: 14, padding: "10px 14px", background: "#0c0c10", borderRadius: 10, borderLeft: "3px solid #a78bfa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                  <div style={{ fontSize: "0.7rem", color: "#505068", marginBottom: 2 }}>NOME DO CANAL SUGERIDO</div>
                                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#a78bfa" }}>{n.nomeCanal}</div>
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(n.nomeCanal); toast?.success("Nome copiado!"); }}
                                  style={{ background: "none", border: "1px solid #252538", borderRadius: 6, color: "#8a8aa0", padding: "4px 10px", cursor: "pointer", fontSize: "0.72rem" }}>📋</button>
                              </div>
                            )}

                            {/* Why & How */}
                            <div style={{ fontSize: "0.88rem", color: "#c0c0d0", lineHeight: 1.8, marginBottom: 10 }}>
                              <strong style={{ color: "#a78bfa" }}>Por que atacar:</strong> {n.porque}
                            </div>
                            <div style={{ fontSize: "0.88rem", color: "#c0c0d0", lineHeight: 1.8, marginBottom: 10 }}>
                              <strong style={{ color: "#2ec4b6" }}>Como adaptar:</strong> {n.comoAdaptar}
                            </div>

                            {/* Competition & Monetization */}
                            {(n.concorrencia || n.monetizacao) && (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                                {n.concorrencia && (
                                  <div style={{ padding: "10px 12px", background: "#0c0c10", borderRadius: 8 }}>
                                    <div style={{ fontSize: "0.7rem", color: "#f4a261", marginBottom: 4, fontWeight: 600 }}>⚔️ CONCORRENCIA</div>
                                    <div style={{ fontSize: "0.82rem", color: "#c0c0d0", lineHeight: 1.6 }}>{n.concorrencia}</div>
                                  </div>
                                )}
                                {n.monetizacao && (
                                  <div style={{ padding: "10px 12px", background: "#0c0c10", borderRadius: 8 }}>
                                    <div style={{ fontSize: "0.7rem", color: "#22D35E", marginBottom: 4, fontWeight: 600 }}>💵 MONETIZACAO</div>
                                    <div style={{ fontSize: "0.82rem", color: "#c0c0d0", lineHeight: 1.6 }}>{n.monetizacao}</div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Strategy */}
                            {n.estrategia && (
                              <div style={{ padding: "12px 14px", background: "linear-gradient(135deg, #0c0c10, #10101a)", borderRadius: 10, marginBottom: 14, borderLeft: "3px solid #4B8DF8" }}>
                                <div style={{ fontSize: "0.72rem", color: "#4B8DF8", marginBottom: 6, fontWeight: 700 }}>🚀 ESTRATEGIA DE CRESCIMENTO</div>
                                <div style={{ fontSize: "0.85rem", color: "#ededf0", lineHeight: 1.8 }}>{n.estrategia}</div>
                              </div>
                            )}

                            {/* Suggested titles */}
                            {n.titulosSugeridos && Array.isArray(n.titulosSugeridos) && n.titulosSugeridos.length > 0 && (
                              <div>
                                <div style={{ fontSize: "0.72rem", color: "#e63946", marginBottom: 8, fontWeight: 700 }}>🎬 TITULOS SUGERIDOS (prontos para usar)</div>
                                <div style={{ display: "grid", gap: 6 }}>
                                  {n.titulosSugeridos.map((t: string, j: number) => (
                                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#0c0c10", borderRadius: 8, border: "1px solid #1e1e2a" }}>
                                      <span style={{ fontSize: "0.72rem", color: "#505068", fontWeight: 700, flexShrink: 0 }}>{j + 1}.</span>
                                      <span style={{ fontSize: "0.88rem", color: "#ededf0", flex: 1 }}>{t}</span>
                                      <button onClick={() => { navigator.clipboard.writeText(t); toast?.success("Titulo copiado!"); }}
                                        style={{ background: "none", border: "1px solid #252538", borderRadius: 6, color: "#8a8aa0", padding: "3px 8px", cursor: "pointer", fontSize: "0.68rem", flexShrink: 0 }}>📋</button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#505068" }}>
                      <p style={{ fontSize: "0.92rem" }}>Sugestoes de nichos nao foram geradas nesta analise.</p>
                      <p style={{ fontSize: "0.82rem", marginTop: 8 }}>Tente analisar novamente com a transcricao carregada para melhores resultados.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: STORYBOARD ── */}
              {dnaTab === "storyboard" && (
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#a78bfa", marginBottom: 12 }}>📸 Storyboard Completo ({analysisFrames.length} frames)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                    {analysisFrames.map((f, i) => (
                      <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #252538" }}>
                        <img src={f.url} alt={`Frame ${i + 1}`} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "12px 6px 4px", textAlign: "center" }}>
                          <span style={{ fontSize: "0.72rem", color: "#fff", fontFamily: "monospace", fontWeight: 600 }}>{fmtTime(f.time)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB: MODELAGEM ── */}
              {dnaTab === "modelagem" && (
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#22D35E", marginBottom: 16 }}>🎨 COMO REPLICAR ESTE ESTILO</div>

                  {analysisResult.comoReplicar && (
                    <div style={{ padding: "18px 20px", background: "linear-gradient(135deg, #0c0c10, #15152a)", borderRadius: 12, marginBottom: 20, borderLeft: "3px solid #22D35E", fontSize: "0.92rem", color: "#ededf0", lineHeight: 1.8 }}>
                      {analysisResult.comoReplicar}
                    </div>
                  )}

                  {/* Quick recipe */}
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#a78bfa", marginBottom: 12 }}>📋 RECEITA RAPIDA</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#4B8DF8", marginBottom: 8, fontWeight: 700 }}>🎥 EQUIPAMENTO</div>
                      {analysisResult.cameras && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {analysisResult.cameras.map((c: string, i: number) => (
                            <span key={i} style={{ fontSize: "0.82rem", padding: "4px 10px", borderRadius: 6, background: "#4B8DF812", color: "#4B8DF8" }}>{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#22D35E", marginBottom: 8, fontWeight: 700 }}>🛠 SOFTWARE</div>
                      {analysisResult.ferramentas && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {analysisResult.ferramentas.map((f: string, i: number) => (
                            <span key={i} style={{ fontSize: "0.82rem", padding: "4px 10px", borderRadius: 6, background: "#22D35E12", color: "#22D35E" }}>{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#a78bfa", marginBottom: 8, fontWeight: 700 }}>🎨 ESTILO VISUAL</div>
                      <div style={{ fontSize: "0.88rem", color: "#c0c0d0" }}>{analysisResult.colorGrading || "-"}</div>
                      <div style={{ fontSize: "0.82rem", color: "#8a8aa0", marginTop: 4 }}>{analysisResult.iluminacao || "-"}</div>
                    </div>
                    <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#EC4899", marginBottom: 8, fontWeight: 700 }}>🎵 AUDIO</div>
                      <div style={{ fontSize: "0.88rem", color: "#c0c0d0" }}>{analysisResult.musicaEstilo || "-"}</div>
                    </div>
                  </div>

                  {/* Color palette to use */}
                  {analysisResult.cores && Array.isArray(analysisResult.cores) && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: "0.78rem", color: "#505068", marginBottom: 8, fontWeight: 600 }}>PALETA PARA USAR</div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {analysisResult.cores.map((c: string, i: number) => (
                          <div key={i} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{ height: 50, borderRadius: 10, background: c, marginBottom: 6, cursor: "pointer", border: "1px solid #252538" }}
                              onClick={() => { navigator.clipboard.writeText(c); toast?.success(`${c} copiado!`); }} />
                            <div style={{ fontSize: "0.78rem", color: "#8a8aa0", fontFamily: "monospace" }}>{c}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transitions & Effects checklist */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {analysisResult.transicoes && (
                      <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10 }}>
                        <div style={{ fontSize: "0.72rem", color: "#a78bfa", marginBottom: 8, fontWeight: 700 }}>✨ TRANSICOES</div>
                        {analysisResult.transicoes.map((t: string, i: number) => (
                          <div key={i} style={{ fontSize: "0.85rem", padding: "3px 0", color: "#c0c0d0" }}>☐ {t}</div>
                        ))}
                      </div>
                    )}
                    {analysisResult.efeitosVisuais && (
                      <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10 }}>
                        <div style={{ fontSize: "0.72rem", color: "#f4a261", marginBottom: 8, fontWeight: 700 }}>💥 EFEITOS</div>
                        {analysisResult.efeitosVisuais.map((e: string, i: number) => (
                          <div key={i} style={{ fontSize: "0.85rem", padding: "3px 0", color: "#c0c0d0" }}>☐ {e}</div>
                        ))}
                      </div>
                    )}
                    {analysisResult.sfx && (
                      <div style={{ padding: "14px 16px", background: "#101016", borderRadius: 10 }}>
                        <div style={{ fontSize: "0.72rem", color: "#EC4899", marginBottom: 8, fontWeight: 700 }}>🔊 SFX</div>
                        {analysisResult.sfx.map((s: string, i: number) => (
                          <div key={i} style={{ fontSize: "0.85rem", padding: "3px 0", color: "#c0c0d0" }}>☐ {s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #252538", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
              <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(analysisResult, null, 2)); toast?.success("DNA copiado!"); }} style={{ ...s.btn2 }}>
                📋 Copiar JSON
              </button>
              <button onClick={() => {
                const txt = `🧬 DNA DO VIDEO: ${fileName}\n\n` +
                  `Nicho: ${analysisResult.nicho || "-"} > ${analysisResult.subnicho || "-"} > ${analysisResult.micronicho || "-"}\n\n` +
                  `${analysisResult.dnaResumo || ""}\n\n` +
                  `Estilo: ${analysisResult.estilo || "-"}\nFormato: ${analysisResult.formato || "-"}\nColor Grading: ${analysisResult.colorGrading || "-"}\nRitmo: ${analysisResult.ritmoEdicao || "-"}\nQualidade: ${analysisResult.qualidade || "-"}/10\n\n` +
                  (analysisResult.comoReplicar ? `COMO REPLICAR:\n${analysisResult.comoReplicar}\n\n` : "") +
                  (analysisResult.roteiro ? `ROTEIRO:\nTom: ${analysisResult.roteiro.tom || "-"}\nPacing: ${analysisResult.roteiro.pacing || "-"}\nHooks: ${(analysisResult.roteiro.hooks || []).join(", ")}\n` : "");
                navigator.clipboard.writeText(txt); toast?.success("Resumo copiado!");
              }} style={{ ...s.btn2, background: "#a78bfa18", color: "#a78bfa", borderColor: "#a78bfa40" }}>
                📄 Copiar Resumo
              </button>
              <button onClick={() => setShowDnaModal(false)} style={{ ...s.btn2, background: "#e6394618", color: "#e63946", borderColor: "#e6394640" }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
