// @ts-nocheck
import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import multer from "multer";
import prisma from "../db/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

const genId = () => crypto.randomBytes(4).toString("hex");

// ─── State ───
const jobs: Record<string, any> = {};
// Use /app/data/downloads in production (persistent volume) or ~/Downloads in dev
let downloadDir = process.env.FRAMECUT_DIR || (process.env.NODE_ENV === "production" ? "/app/data/downloads" : path.join(os.homedir(), "Downloads"));
let cookiesFile = process.env.FRAMECUT_COOKIES || "";

// Ensure dir exists
try { if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true }); } catch {}

// Auto-detect cookies file in common locations
if (!cookiesFile) {
  const candidates = [
    path.join(os.homedir(), "cookies.txt"),
    path.join(os.homedir(), "Downloads", "cookies.txt"),
    "/app/data/cookies.txt",
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) { cookiesFile = c; break; } } catch {}
  }
}

// ─── Helpers ───
function getDownloadDir() { return downloadDir; }

function findSubtitles(videoPath: string) {
  if (!videoPath || !fs.existsSync(videoPath)) return [];
  const dir = path.dirname(videoPath);
  const base = path.basename(videoPath, path.extname(videoPath));
  const subs: any[] = [];
  for (const f of fs.readdirSync(dir)) {
    if (/\.(srt|vtt|ass)$/i.test(f)) {
      subs.push({ path: path.join(dir, f), name: f, match: f.startsWith(base) });
    }
  }
  subs.sort((a, b) => (b.match ? 1 : 0) - (a.match ? 1 : 0));
  return subs;
}

function readSubFile(filepath: string) {
  if (!filepath || !fs.existsSync(filepath)) return [];
  const content = fs.readFileSync(filepath, "utf-8");
  const lines: any[] = [];
  if (filepath.endsWith(".srt")) {
    for (const block of content.trim().split(/\n\s*\n/)) {
      const bl = block.trim().split("\n");
      if (bl.length < 3) continue;
      const m = bl[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (!m) continue;
      const sec = +m[1]*3600 + +m[2]*60 + +m[3] + +m[4]/1000;
      const text = bl.slice(2).join(" ").replace(/<[^>]+>/g, "").trim();
      if (text) lines.push({ time: sec, text });
    }
  } else if (filepath.endsWith(".vtt")) {
    // Parse VTT — handle YouTube auto-generated karaoke format
    // YouTube VTT has 2-line cues where line 1 is previous text (repeated) and line 2 is new text
    // We only want the NEW text from each cue, then merge into sentences
    const raw = content.split("\n"); let i = 0;
    const segments: { time: number; text: string }[] = [];

    while (i < raw.length && !raw[i].includes("-->")) i++;
    while (i < raw.length) {
      if (!raw[i].includes("-->")) { i++; continue; }
      const tm = raw[i].match(/(\d{2}):(\d{2}):(\d{2})[.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.](\d{3})/);
      if (!tm) { i++; continue; }
      const start = +tm[1]*3600 + +tm[2]*60 + +tm[3] + +tm[4]/1000;
      const end = +tm[5]*3600 + +tm[6]*60 + +tm[7] + +tm[8]/1000;
      const cueLines: string[] = []; i++;
      while (i < raw.length && raw[i].trim() && !raw[i].includes("-->")) {
        cueLines.push(raw[i].trim().replace(/<[^>]+>/g, "")); i++;
      }
      // Skip micro-duration cues (0.01s = YouTube duplicate markers)
      if ((end - start) < 0.05) continue;
      // For YouTube karaoke: if 2+ lines, only take the LAST line (new content)
      // For normal VTT: take all lines
      const text = cueLines.length > 1 ? cueLines[cueLines.length - 1] : cueLines.join(" ");
      if (text?.trim()) segments.push({ time: start, text: text.trim() });
    }

    // Merge consecutive segments into sentences (group by ~5 second windows)
    if (segments.length > 0) {
      let current = { time: segments[0].time, parts: [segments[0].text] };
      for (let j = 1; j < segments.length; j++) {
        const seg = segments[j];
        const gap = seg.time - (current.time + current.parts.length * 0.5);
        const merged = current.parts.join(" ");
        // Start new line if: gap > 5s, or merged text > 120 chars, or text ends with sentence-ending punctuation
        if (gap > 5 || merged.length > 120 || /[.!?]$/.test(merged)) {
          lines.push({ time: current.time, text: merged });
          current = { time: seg.time, parts: [seg.text] };
        } else {
          current.parts.push(seg.text);
        }
      }
      // Push last group
      const lastMerged = current.parts.join(" ");
      if (lastMerged.trim()) lines.push({ time: current.time, text: lastMerged });
    }
  }
  return lines;
}

// ─── Download strategies (tried in order on bot-block) ───
const STRATEGIES = [
  { name: "web_creator", extArgs: "youtube:player_client=web_creator" },
  { name: "ios", extArgs: "youtube:player_client=ios" },
  { name: "tv_embedded", extArgs: "youtube:player_client=tv_embedded" },
  { name: "mweb", extArgs: "youtube:player_client=mweb" },
];

function buildBaseArgs(): string[] {
  const args = [
    "--newline", "--no-colors", "--ignore-errors", "--no-warnings",
    "--retries", "10", "--fragment-retries", "10", "--extractor-retries", "5",
    "--socket-timeout", "30", "--concurrent-fragments", "4",
    "--geo-bypass", "--geo-bypass-country", "BR",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "--add-header", "Accept-Language:pt-BR,pt;q=0.9,en;q=0.8",
    "--js-runtimes", "node",
  ];
  // Add cookies if available — auto-fix format on read
  if (cookiesFile && fs.existsSync(cookiesFile)) {
    try {
      const raw = fs.readFileSync(cookiesFile, "utf-8");
      if (!isNetscapeFormat(raw)) {
        const converted = ensureNetscapeFormat(raw);
        fs.writeFileSync(cookiesFile, converted, "utf-8");
      }
    } catch {}
    args.push("--cookies", cookiesFile);
  }
  return args;
}

function spawnJob(id: string, cmd: string, args: string[], cwd: string, retryCtx?: { strategyIndex: number; baseArgs: string[]; formatArgs: string[]; url: string; triedNoFormat?: boolean }) {
  const job = jobs[id];
  job.status = "running";
  let sawBotBlock = false;
  let sawFormatError = false;

  const env = { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" };
  const proc = spawn(cmd, args, { cwd, env, shell: process.platform === "win32" });

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    job.output.push(line);

    const m = line.match(/\[download\]\s+([\d.]+)%/);
    if (m) job.progress = parseFloat(m[1]);

    const lower = line.toLowerCase();
    if (
      lower.includes("sign in to confirm you’re not a bot") ||
      lower.includes("use --cookies-from-browser or --cookies")
    ) {
      sawBotBlock = true;
    }
    if (lower.includes("requested format is not available")) {
      sawFormatError = true;
    }
  };

  proc.stdout?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString("utf-8").split("\n")) handleLine(line);
  });
  proc.stderr?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString("utf-8").split("\n")) handleLine(line);
  });
  proc.on("close", (code) => {
    if (code === 0) {
      job.status = "done"; job.progress = 100;
      job.output.push(`\n[FrameCut] ✅ Concluído!`);
    } else {
      // Check if output files exist anyway
      if (job.expectedFile && fs.existsSync(job.expectedFile)) {
        job.status = "done"; job.progress = 100; job.filepath = job.expectedFile;
        job.output.push(`\n[FrameCut] ⚠️ Processo reportou erro, mas arquivo encontrado.`);
      } else if (sawFormatError && retryCtx && !retryCtx.triedNoFormat) {
        // ─── Format not available: retry without format filter (just "best") ───
        job.output.push(`\n[FrameCut] ⚠️ Formato não disponível. Tentando sem filtro de qualidade...`);
        job.progress = 0;
        // Remove -f and its value from formatArgs, replace with simple "best"
        const noFmtArgs: string[] = [];
        let skipNext = false;
        for (const a of retryCtx.formatArgs) {
          if (a === "-f") { skipNext = true; continue; }
          if (skipNext) { skipNext = false; continue; }
          noFmtArgs.push(a);
        }
        const retryArgs = [
          ...retryCtx.baseArgs,
          "--extractor-args", STRATEGIES[0].extArgs,
          ...noFmtArgs,
          retryCtx.url,
        ];
        job.output.push(`[FrameCut] > yt-dlp (sem filtro de formato)\n`);
        spawnJob(id, "yt-dlp", retryArgs, cwd, { ...retryCtx, strategyIndex: 0, triedNoFormat: true });
        return;
      } else if (sawBotBlock && retryCtx && retryCtx.strategyIndex < STRATEGIES.length - 1) {
        // ─── Bot block: retry with next player client ───
        const nextIdx = retryCtx.strategyIndex + 1;
        const next = STRATEGIES[nextIdx];
        job.output.push(`\n[FrameCut] ⚠️ Bot detectado. Tentando estratégia: ${next.name}...`);
        job.progress = 0;

        const retryArgs = [
          ...retryCtx.baseArgs,
          "--extractor-args", next.extArgs,
          ...retryCtx.formatArgs,
          retryCtx.url,
        ];
        job.output.push(`[FrameCut] > yt-dlp (${next.name})\n`);
        spawnJob(id, "yt-dlp", retryArgs, cwd, { ...retryCtx, strategyIndex: nextIdx });
        return;
      } else {
        job.status = "error";
        if (sawBotBlock) {
          const hasCookies = cookiesFile && fs.existsSync(cookiesFile);
          job.output.push(`\n[FrameCut] ⚠️ YouTube bloqueou todas as estratégias de download.`);
          if (!hasCookies) {
            job.output.push(`[FrameCut] 💡 Solução: exporte seus cookies do YouTube no navegador (extensão "Get cookies.txt LOCALLY") e salve como cookies.txt em ${path.join(os.homedir(), "cookies.txt")} ou /app/data/cookies.txt`);
            job.output.push(`[FrameCut] Ou use o endpoint POST /api/framecut/set-cookies para definir o caminho.`);
          } else {
            job.output.push(`[FrameCut] 💡 Cookies encontrados em ${cookiesFile}, mas podem estar expirados. Re-exporte do navegador.`);
          }
        }
        job.output.push(`\n[FrameCut] ❌ Erro (código ${code})`);
      }
    }
    // Try to find file
    if (job.status === "done" && !job.filepath) {
      const exts = job.findExts || [".mp4",".webm",".mkv"];
      try {
        const files = fs.readdirSync(cwd)
          .filter(f => exts.some(e => f.toLowerCase().endsWith(e)))
          .map(f => ({ name: f, full: path.join(cwd, f), mtime: fs.statSync(path.join(cwd, f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);
        if (files.length) job.filepath = files[0].full;
      } catch {}
    }
    if (job.filepath) job.output.push(`[FrameCut] 📁 ${job.filepath}`);
  });
}

// ─── Routes ───

// Get job status
router.get("/job/:id", (req: Request, res: Response) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({
    status: job.status,
    progress: job.progress || 0,
    output: job.output.slice(-150),
    filepath: job.filepath || null,
  });
});

// Get download dir
router.get("/download-dir", (_req: Request, res: Response) => {
  res.json({ dir: downloadDir });
});

// Analyze YouTube URL — instant (no yt-dlp, just extract ID)
router.post("/analyze", async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL vazia" });
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!m) return res.status(400).json({ error: "URL inválida" });
  const id = m[1];
  // Return immediately with thumbnail — no yt-dlp needed
  res.json({ title: id, id, thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`, duration: 0, uploader: "" });

  // Optionally try to get more info in background (won't block response)
  try {
    const proc = spawn("yt-dlp", ["--dump-json", "--no-download", "--socket-timeout", "10", url], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    let out = "";
    proc.stdout?.on("data", (d: Buffer) => { out += d.toString("utf-8"); });
    const timeout = setTimeout(() => { try { proc.kill(); } catch {} }, 15000);
    proc.on("close", () => {
      clearTimeout(timeout);
      try {
        const data = JSON.parse(out);
        // Store in jobs for later retrieval
        jobs[`info_${id}`] = { title: data.title, duration: data.duration, uploader: data.uploader };
      } catch {}
    });
  } catch {}
});

// Start download
router.post("/download", (req: Request, res: Response) => {
  const { url, quality = "1080", type = "video", dir } = req.body;
  if (!url) return res.status(400).json({ error: "URL vazia" });
  const dlDir = dir || downloadDir;
  if (!fs.existsSync(dlDir)) fs.mkdirSync(dlDir, { recursive: true });

  const id = genId();
  jobs[id] = { status: "starting", output: [`[FrameCut] Pasta: ${dlDir}`, `[FrameCut] Baixando...`], progress: 0, filepath: null, findExts: null, expectedFile: null };

  const baseArgs = buildBaseArgs();
  const strategy = STRATEGIES[0];
  const formatArgs: string[] = [];

  if (type === "video") {
    const fmtMap: Record<string, string> = {
      best: "bestvideo+bestaudio/bestvideo*+bestaudio/best",
      "1080": "bestvideo[height<=1080]+bestaudio/bestvideo*[height<=1080]+bestaudio/best[height<=1080]/best",
      "720": "bestvideo[height<=720]+bestaudio/bestvideo*[height<=720]+bestaudio/best[height<=720]/best",
      "480": "bestvideo[height<=480]+bestaudio/bestvideo*[height<=480]+bestaudio/best[height<=480]/best"
    };
    const outTpl = path.join(dlDir, "%(id)s_%(title).80B.%(ext)s");
    formatArgs.push(
      "-f", fmtMap[quality] || fmtMap["1080"],
      "--merge-output-format", "mp4",
      "--restrict-filenames",
      "--write-auto-sub", "--sub-lang", "pt,en,es",
      "--write-thumbnail", "--convert-thumbnails", "jpg",
      "-o", outTpl
    );
    jobs[id].findExts = [".mp4",".webm",".mkv"];
  } else if (type === "subs") {
    const outTpl = path.join(dlDir, "%(id)s_%(title).80B.%(ext)s");
    formatArgs.push("--write-auto-sub", "--sub-lang", "pt,en,es", "--skip-download", "--restrict-filenames", "-o", outTpl);
    jobs[id].findExts = [".srt",".vtt",".ass"];
  } else if (type === "thumb") {
    const outTpl = path.join(dlDir, "%(id)s_%(title).80B.%(ext)s");
    formatArgs.push("--write-thumbnail", "--skip-download", "--convert-thumbnails", "jpg", "--restrict-filenames", "-o", outTpl);
    jobs[id].findExts = [".jpg",".png",".webp"];
  }

  const args = [...baseArgs, "--extractor-args", strategy.extArgs, ...formatArgs, url];
  jobs[id].output.push(`[FrameCut] > yt-dlp (${strategy.name})${cookiesFile ? " +cookies" : ""}\n`);

  spawnJob(id, "yt-dlp", args, dlDir, { strategyIndex: 0, baseArgs, formatArgs, url });
  res.json({ job_id: id });
});

// Start whisper transcription
router.post("/transcribe", (req: Request, res: Response) => {
  const { videoPath, language = "pt" } = req.body;
  if (!videoPath || !fs.existsSync(videoPath)) return res.status(400).json({ error: "Arquivo não encontrado" });
  const validExts = [".mp4",".webm",".mkv",".mov",".avi",".mp3",".wav",".m4a",".ogg",".flac"];
  if (!validExts.some(e => videoPath.toLowerCase().endsWith(e))) return res.status(400).json({ error: "Não é vídeo/áudio" });

  const id = genId();
  const outputDir = path.dirname(videoPath);
  const baseName = path.basename(videoPath, path.extname(videoPath));
  const expectedSrt = path.join(outputDir, baseName + ".srt");

  jobs[id] = { status: "starting", output: [`[FrameCut] 🎤 Whisper: ${path.basename(videoPath)}`], progress: 0, filepath: null, findExts: [".srt"], expectedFile: expectedSrt };

  const args = [videoPath, "--language", language, "--model", "base", "--output_format", "srt", "--output_dir", outputDir];
  spawnJob(id, "whisper", args, outputDir);
  res.json({ job_id: id });
});

// Extract frames from video using ffmpeg (server-side)
router.post("/extract-frames", (req: Request, res: Response) => {
  const { videoPath, times, format = "jpg", quality = 2 } = req.body;
  if (!videoPath || !fs.existsSync(videoPath)) return res.status(400).json({ error: "Vídeo não encontrado" });
  if (!times || !Array.isArray(times) || times.length === 0) return res.status(400).json({ error: "Timestamps obrigatórios" });
  if (times.length > 200) return res.status(400).json({ error: "Máximo 200 frames" });

  const dir = path.dirname(videoPath);
  const base = path.basename(videoPath, path.extname(videoPath));
  const outDir = path.join(dir, base + "_frames");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const id = genId();
  const frames: string[] = [];
  jobs[id] = { status: "starting", output: [`[FrameCut] 🎞️ Extraindo ${times.length} frames...`], progress: 0, filepath: null, findExts: [".jpg", ".png"] };

  let completed = 0;
  const total = times.length;

  const extractNext = (idx: number) => {
    if (idx >= total) {
      jobs[id].status = "done";
      jobs[id].progress = 100;
      jobs[id].output.push(`\n[FrameCut] ✅ ${frames.length} frames extraídos em ${outDir}`);
      jobs[id].filepath = outDir;
      return;
    }
    const t = times[idx];
    const outFile = path.join(outDir, `frame_${String(idx + 1).padStart(3, "0")}_${String(Math.floor(t / 60)).padStart(2, "0")}m${String(Math.floor(t % 60)).padStart(2, "0")}s.${format}`);
    const args = ["-ss", String(t), "-i", videoPath, "-frames:v", "1", "-q:v", String(quality), "-y", outFile];
    const proc = spawn("ffmpeg", args, { env: process.env, shell: process.platform === "win32" });
    proc.on("close", (code) => {
      completed++;
      jobs[id].progress = Math.round((completed / total) * 100);
      if (code === 0 && fs.existsSync(outFile)) frames.push(outFile);
      jobs[id].output.push(`[FrameCut] Frame ${completed}/${total}`);
      extractNext(idx + 1);
    });
    proc.on("error", () => { completed++; extractNext(idx + 1); });
  };

  jobs[id].status = "running";
  extractNext(0);
  res.json({ job_id: id, outDir });
});

// Serve frame image
router.get("/serve-frame", (req: Request, res: Response) => {
  const filepath = req.query.path as string;
  if (!filepath || !fs.existsSync(filepath)) return res.status(404).json({ error: "Not found" });
  const ext = path.extname(filepath).toLowerCase();
  const ct = ext === ".png" ? "image/png" : "image/jpeg";
  res.setHeader("Content-Type", ct);
  res.setHeader("Cache-Control", "public, max-age=3600");
  fs.createReadStream(filepath).pipe(res);
});

// List extracted frames
router.get("/list-frames", (req: Request, res: Response) => {
  const dir = req.query.dir as string;
  if (!dir || !fs.existsSync(dir)) return res.json({ frames: [] });
  try {
    const frames = fs.readdirSync(dir)
      .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      .sort()
      .map(f => ({ name: f, path: path.join(dir, f), url: `/api/framecut/serve-frame?path=${encodeURIComponent(path.join(dir, f))}` }));
    res.json({ frames });
  } catch { res.json({ frames: [] }); }
});

// Analyze video — extract keyframes at uniform intervals for visual analysis
router.post("/analyze-video", (req: Request, res: Response) => {
  const { videoPath, count = 30 } = req.body;
  if (!videoPath || !fs.existsSync(videoPath)) return res.status(400).json({ error: "Vídeo não encontrado" });
  if (count < 1 || count > 100) return res.status(400).json({ error: "Count deve ser entre 1 e 100" });

  const id = genId();
  const dir = path.dirname(videoPath);
  const base = path.basename(videoPath, path.extname(videoPath));
  const outDir = path.join(dir, base + "_analysis");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  jobs[id] = { status: "starting", output: [`[FrameCut] 🎬 Analisando vídeo...`], progress: 0, filepath: null };

  // Step 1: Get video duration via ffprobe
  const probe = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", videoPath], { shell: process.platform === "win32" });
  let durationStr = "";
  probe.stdout?.on("data", (d: Buffer) => { durationStr += d.toString().trim(); });
  probe.on("close", () => {
    const duration = parseFloat(durationStr) || 0;
    if (duration <= 0) {
      jobs[id].status = "error";
      jobs[id].output.push("[FrameCut] ❌ Não foi possível obter a duração do vídeo");
      return;
    }

    // Step 2: Generate uniform timestamps (skip first/last 2%)
    const start = duration * 0.02;
    const end = duration * 0.98;
    const interval = (end - start) / (count - 1);
    const times: number[] = [];
    for (let i = 0; i < count; i++) times.push(Math.round((start + i * interval) * 100) / 100);

    jobs[id].output.push(`[FrameCut] Duração: ${Math.floor(duration / 60)}m${Math.floor(duration % 60)}s — Extraindo ${count} frames...`);
    jobs[id].status = "running";

    // Step 3: Extract frames sequentially
    const frames: { time: number; path: string; url: string }[] = [];
    let completed = 0;

    const extractNext = (idx: number) => {
      if (idx >= times.length) {
        jobs[id].status = "done";
        jobs[id].progress = 100;
        jobs[id].filepath = outDir;
        jobs[id].output.push(`\n[FrameCut] ✅ ${frames.length} frames extraídos`);
        // Store frames list in job for retrieval
        (jobs[id] as any).frames = frames;
        (jobs[id] as any).duration = duration;
        return;
      }
      const t = times[idx];
      const ts = `${String(Math.floor(t / 60)).padStart(2, "0")}m${String(Math.floor(t % 60)).padStart(2, "0")}s`;
      const outFile = path.join(outDir, `key_${String(idx + 1).padStart(2, "0")}_${ts}.jpg`);
      const args = ["-ss", String(t), "-i", videoPath, "-frames:v", "1", "-q:v", "2", "-y", outFile];
      const proc = spawn("ffmpeg", args, { env: process.env, shell: process.platform === "win32" });
      proc.on("close", (code) => {
        completed++;
        jobs[id].progress = Math.round((completed / times.length) * 100);
        if (code === 0 && fs.existsSync(outFile)) {
          frames.push({
            time: t,
            path: outFile,
            url: `/api/framecut/serve-frame?path=${encodeURIComponent(outFile)}`
          });
        }
        extractNext(idx + 1);
      });
      proc.on("error", () => { completed++; extractNext(idx + 1); });
    };
    extractNext(0);
  });
  probe.on("error", () => {
    jobs[id].status = "error";
    jobs[id].output.push("[FrameCut] ❌ ffprobe não encontrado");
  });

  res.json({ job_id: id });
});

// Get analysis frames result
router.get("/analyze-result/:id", (req: Request, res: Response) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: "Job não encontrado" });
  const includeBase64 = req.query.base64 === "true";
  const frames = ((job as any).frames || []).map((f: any) => {
    const result: any = { time: f.time, url: f.url };
    if (includeBase64 && f.path && fs.existsSync(f.path)) {
      try { result.base64 = fs.readFileSync(f.path).toString("base64"); } catch {}
    }
    return result;
  });
  res.json({
    status: job.status,
    progress: job.progress || 0,
    frames,
    duration: (job as any).duration || 0,
  });
});

// Find subtitle files near a video
router.get("/find-subs", (req: Request, res: Response) => {
  const videoPath = req.query.path as string;
  res.json({ subs: findSubtitles(videoPath || "") });
});

// Read subtitle file content
router.get("/read-sub", (req: Request, res: Response) => {
  const subPath = req.query.path as string;
  res.json({ lines: readSubFile(subPath || "") });
});

// Serve video file for player (with range support)
router.get("/serve-video", (req: Request, res: Response) => {
  const filepath = req.query.path as string;
  if (!filepath || !fs.existsSync(filepath)) return res.status(404).json({ error: "Not found" });
  const stat = fs.statSync(filepath);
  const size = stat.size;
  const ext = path.extname(filepath).toLowerCase();
  const ctMap: Record<string, string> = { ".mp4": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska", ".mov": "video/quicktime" };
  const ct = ctMap[ext] || "video/mp4";

  // CORS is handled by index.ts middleware for serve-video/serve-frame/download-file
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-cache");

  const range = req.headers.range;
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const start = parseInt(m[1]);
      const end = m[2] ? parseInt(m[2]) : Math.min(start + 1024 * 1024 - 1, size - 1); // Max 1MB chunks
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": chunkSize,
        "Content-Type": ct,
      });
      fs.createReadStream(filepath, { start, end }).pipe(res);
      return;
    }
  }
  // No range — send first chunk to trigger range request from browser
  res.writeHead(200, { "Content-Length": size, "Content-Type": ct });
  fs.createReadStream(filepath).pipe(res);
});

// Download file to user's browser (triggers save dialog)
router.get("/download-file", (req: Request, res: Response) => {
  const filepath = req.query.path as string;
  if (!filepath || !fs.existsSync(filepath)) return res.status(404).json({ error: "Arquivo não encontrado" });
  const filename = path.basename(filepath);
  const ext = path.extname(filepath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".mp4": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
    ".vtt": "text/vtt", ".srt": "application/x-subrip", ".ass": "text/plain",
    ".txt": "text/plain",
  };
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream");
  res.setHeader("Content-Length", fs.statSync(filepath).size);
  fs.createReadStream(filepath).pipe(res);
});

// List files generated by a download (video, thumb, subs near the video file)
router.get("/job-files/:id", (req: Request, res: Response) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: "Job não encontrado" });
  const videoPath = job.filepath;
  if (!videoPath) return res.json({ files: [] });

  const dir = path.dirname(videoPath);
  const base = path.basename(videoPath, path.extname(videoPath));
  const files: { name: string; path: string; type: string; size: number }[] = [];

  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.startsWith(base)) continue;
      const full = path.join(dir, f);
      const ext = path.extname(f).toLowerCase();
      const stat = fs.statSync(full);
      let type = "other";
      if ([".mp4", ".webm", ".mkv"].includes(ext)) type = "video";
      else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) type = "thumb";
      else if ([".vtt", ".srt", ".ass"].includes(ext)) type = "subs";
      files.push({ name: f, path: full, type, size: stat.size });
    }
  } catch {}

  res.json({ files });
});

// Set download dir
router.post("/set-dir", (req: Request, res: Response) => {
  if (req.body.dir) downloadDir = req.body.dir;
  res.json({ dir: downloadDir });
});

// Set cookies file path
router.post("/set-cookies", (req: Request, res: Response) => {
  const { path: p } = req.body;
  if (!p) return res.status(400).json({ error: "Caminho vazio" });
  if (!fs.existsSync(p)) return res.status(400).json({ error: "Arquivo não encontrado" });
  cookiesFile = p;
  res.json({ cookies: cookiesFile, active: true, message: "Cookies configurados com sucesso" });
});

// Upload cookies.txt file
const cookiesDir = process.env.NODE_ENV === "production" ? "/app/data" : path.join(os.homedir());
const cookiesUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(cookiesDir)) fs.mkdirSync(cookiesDir, { recursive: true });
      cb(null, cookiesDir);
    },
    filename: (_req, _file, cb) => cb(null, "cookies.txt"),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith(".txt") || file.mimetype === "text/plain") cb(null, true);
    else cb(new Error("Apenas arquivos .txt são aceitos"));
  },
});

// Convert browser cookie string (name=value;name=value) to Netscape format
function browserCookiesToNetscape(raw: string, domain = ".youtube.com"): string {
  const lines = ["# Netscape HTTP Cookie File", "# Converted automatically by LaCasaStudio FrameCut", ""];
  // Split by semicolons, handling both ";" and "; "
  const pairs = raw.split(/;\s*/).filter(p => p.includes("="));
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx < 1) continue;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (!name) continue;
    // Determine domain based on cookie name
    const cookieDomain = name.startsWith("__Secure-") || name.startsWith("__Host-") ? ".youtube.com" : domain;
    const secure = name.startsWith("__Secure-") || name.startsWith("__Host-") ? "TRUE" : "FALSE";
    lines.push(`${cookieDomain}\tTRUE\t/\t${secure}\t0\t${name}\t${value}`);
  }
  return lines.join("\n");
}

// Detect if text is browser format (single line with semicolons) vs Netscape format
function isNetscapeFormat(text: string): boolean {
  const lines = text.trim().split("\n");
  // Netscape format has tabs and multiple lines
  return lines.some(l => !l.startsWith("#") && l.includes("\t") && l.split("\t").length >= 6);
}

function ensureNetscapeFormat(text: string): string {
  const trimmed = text.trim();
  if (isNetscapeFormat(trimmed)) return trimmed;
  // Probably browser format — convert
  return browserCookiesToNetscape(trimmed);
}

router.post("/upload-cookies", cookiesUpload.single("cookies"), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
  const filePath = path.join(cookiesDir, "cookies.txt");
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const converted = ensureNetscapeFormat(content);
    fs.writeFileSync(filePath, converted, "utf-8");
    const lines = converted.split("\n").filter(l => l.trim() && !l.startsWith("#"));
    if (lines.length < 1) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Arquivo vazio ou inválido" });
    }
  } catch {
    return res.status(400).json({ error: "Erro ao ler arquivo" });
  }
  cookiesFile = filePath;
  res.json({ active: true, path: cookiesFile, message: "Cookies enviados com sucesso!" });
});

// Save cookies from pasted text
router.post("/paste-cookies", (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== "string" || text.trim().length < 10) {
    return res.status(400).json({ error: "Conteúdo dos cookies vazio ou muito curto" });
  }
  const filePath = path.join(cookiesDir, "cookies.txt");
  try {
    if (!fs.existsSync(cookiesDir)) fs.mkdirSync(cookiesDir, { recursive: true });
    const converted = ensureNetscapeFormat(text);
    fs.writeFileSync(filePath, converted, "utf-8");
    const lines = converted.split("\n").filter(l => l.trim() && !l.startsWith("#"));
    if (lines.length < 1) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Conteúdo inválido — nenhuma linha de cookie encontrada" });
    }
  } catch {
    return res.status(400).json({ error: "Erro ao salvar cookies" });
  }
  cookiesFile = filePath;
  res.json({ active: true, path: cookiesFile, message: "Cookies salvos com sucesso!" });
});

// Remove cookies
router.delete("/cookies", (_req: Request, res: Response) => {
  if (cookiesFile && fs.existsSync(cookiesFile)) {
    try { fs.unlinkSync(cookiesFile); } catch {}
  }
  cookiesFile = "";
  res.json({ active: false, path: null, message: "Cookies removidos" });
});

// Get cookies status
router.get("/cookies-status", (_req: Request, res: Response) => {
  const active = !!(cookiesFile && fs.existsSync(cookiesFile));
  let updatedAt: string | null = null;
  if (active) {
    try { updatedAt = fs.statSync(cookiesFile).mtime.toISOString(); } catch {}
  }
  res.json({ path: cookiesFile || null, active, updatedAt });
});

// ─── SAVED DNA ANALYSES ───

// Save a DNA analysis
router.post("/dna/save", authenticate, async (req: any, res: Response) => {
  try {
    const { videoTitle, videoPath, nicho, subnicho, micronicho, estilo, qualidade, analysisJson, thumbnailUrl, duration } = req.body;
    if (!analysisJson) return res.status(400).json({ error: "analysisJson obrigatório" });
    const saved = await prisma.videoDna.create({
      data: {
        videoTitle: (videoTitle || "").slice(0, 500),
        videoPath: (videoPath || "").slice(0, 1000),
        nicho: (nicho || "").slice(0, 200),
        subnicho: (subnicho || "").slice(0, 200),
        micronicho: (micronicho || "").slice(0, 200),
        estilo: (estilo || "").slice(0, 500),
        qualidade: Number(qualidade) || 0,
        analysisJson: typeof analysisJson === "string" ? analysisJson.slice(0, 100000) : JSON.stringify(analysisJson).slice(0, 100000),
        thumbnailUrl: (thumbnailUrl || "").slice(0, 1000),
        duration: Number(duration) || 0,
        userId: req.userId,
      },
    });
    res.json({ id: saved.id, message: "Análise DNA salva!" });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao salvar: " + (err.message || "") });
  }
});

// List saved DNA analyses
router.get("/dna/list", authenticate, async (req: any, res: Response) => {
  try {
    const items = await prisma.videoDna.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single DNA analysis
router.get("/dna/:id", authenticate, async (req: any, res: Response) => {
  try {
    const item = await prisma.videoDna.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!item) return res.status(404).json({ error: "Não encontrado" });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete DNA analysis
router.delete("/dna/:id", authenticate, async (req: any, res: Response) => {
  try {
    await prisma.videoDna.deleteMany({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SCRIPT AGENTS ───

router.post("/agents/save", authenticate, async (req: any, res: Response) => {
  try {
    const { name, description, nicho, sourceVideo, prompt, icon, color } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt obrigatório" });
    const agent = await prisma.scriptAgent.create({
      data: {
        name: (name || "Agente sem nome").slice(0, 200),
        description: (description || "").slice(0, 500),
        nicho: (nicho || "").slice(0, 200),
        sourceVideo: (sourceVideo || "").slice(0, 500),
        prompt: prompt.slice(0, 50000),
        icon: (icon || "🤖").slice(0, 10),
        color: (color || "#a78bfa").slice(0, 20),
        userId: req.userId,
      },
    });
    res.json({ id: agent.id, message: "Agente salvo!" });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao salvar agente: " + (err.message || "") });
  }
});

router.get("/agents/list", authenticate, async (req: any, res: Response) => {
  try {
    const agents = await prisma.scriptAgent.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/agents/:id", authenticate, async (req: any, res: Response) => {
  try {
    const agent = await prisma.scriptAgent.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!agent) return res.status(404).json({ error: "Agente não encontrado" });
    res.json(agent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/agents/:id", authenticate, async (req: any, res: Response) => {
  try {
    const { name, description, prompt, icon, color } = req.body;
    const updated = await prisma.scriptAgent.updateMany({
      where: { id: Number(req.params.id), userId: req.userId },
      data: {
        ...(name !== undefined && { name: name.slice(0, 200) }),
        ...(description !== undefined && { description: description.slice(0, 500) }),
        ...(prompt !== undefined && { prompt: prompt.slice(0, 50000) }),
        ...(icon !== undefined && { icon: icon.slice(0, 10) }),
        ...(color !== undefined && { color: color.slice(0, 20) }),
      },
    });
    res.json({ ok: true, count: updated.count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/agents/:id", authenticate, async (req: any, res: Response) => {
  try {
    await prisma.scriptAgent.deleteMany({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate script using an agent
router.post("/agents/generate", authenticate, async (req: any, res: Response) => {
  try {
    const { agentId, title, duration, model } = req.body;
    if (!title) return res.status(400).json({ error: "Título obrigatório" });

    const agent = await prisma.scriptAgent.findFirst({
      where: { id: Number(agentId), userId: req.userId },
    });
    if (!agent) return res.status(404).json({ error: "Agente não encontrado" });

    // Resolve AI config
    const { resolveAIConfig } = require("../services/ai-resolver");
    const config = await resolveAIConfig(req.userId);
    if (!config.apiKey) return res.status(400).json({ error: "Configure sua API Key nas Configurações" });

    // Override model if specified
    const useModel = model || config.model;

    const userMessage = `Título: ${title} | Duração: ${duration || "10"} minutos\n\nGere o roteiro completo agora seguindo a fórmula.`;

    const headers: any = { "Content-Type": "application/json" };
    if (config.provider === "anthropic") {
      headers["x-api-key"] = config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const body: any = {
      model: useModel,
      messages: [
        { role: "system", content: agent.prompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    };

    // Anthropic format
    if (config.provider === "anthropic") {
      delete body.messages;
      body.system = agent.prompt;
      body.messages = [{ role: "user", content: userMessage }];
    }

    const aiRes = await fetch(config.apiUrl, { method: "POST", headers, body: JSON.stringify(body) });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return res.status(aiRes.status).json({ error: `Erro IA (${aiRes.status}): ${errText.slice(0, 200)}` });
    }

    const aiData = await aiRes.json();
    let script = "";
    if (config.provider === "anthropic") {
      script = aiData.content?.[0]?.text || "";
    } else {
      script = aiData.choices?.[0]?.message?.content || "";
    }

    if (!script) return res.status(500).json({ error: "IA retornou resposta vazia" });

    res.json({ script, model: useModel, title, duration });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao gerar roteiro: " + (err.message || "") });
  }
});

export default router;
