// @ts-nocheck
import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import multer from "multer";

const router = Router();

const genId = () => crypto.randomBytes(4).toString("hex");

// ─── State ───
const jobs: Record<string, any> = {};
let downloadDir = process.env.FRAMECUT_DIR || path.join(os.homedir(), "Downloads");
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
    const raw = content.split("\n"); let i = 0;
    while (i < raw.length && !raw[i].includes("-->")) i++;
    while (i < raw.length) {
      if (!raw[i].includes("-->")) { i++; continue; }
      const m = raw[i].match(/(\d{2}):(\d{2}):(\d{2})[.](\d{3})/);
      if (!m) { i++; continue; }
      const sec = +m[1]*3600 + +m[2]*60 + +m[3] + +m[4]/1000;
      let txt = ""; i++;
      while (i < raw.length && raw[i].trim() && !raw[i].includes("-->")) {
        txt += (txt ? " " : "") + raw[i].trim().replace(/<[^>]+>/g, ""); i++;
      }
      if (txt) lines.push({ time: sec, text: txt });
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
  ];
  // Add cookies if available
  if (cookiesFile && fs.existsSync(cookiesFile)) {
    args.push("--cookies", cookiesFile);
  }
  return args;
}

function spawnJob(id: string, cmd: string, args: string[], cwd: string, retryCtx?: { strategyIndex: number; baseArgs: string[]; formatArgs: string[]; url: string }) {
  const job = jobs[id];
  job.status = "running";
  let sawBotBlock = false;

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
      } else if (sawBotBlock && retryCtx && retryCtx.strategyIndex < STRATEGIES.length - 1) {
        // ─── Auto-retry with next strategy ───
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
        return; // don’t finalize yet
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
      best: "bestvideo+bestaudio/best",
      "1080": "bestvideo[height<=1080]+bestaudio/best",
      "720": "bestvideo[height<=720]+bestaudio/best",
      "480": "bestvideo[height<=480]+bestaudio/best"
    };
    formatArgs.push("-f", fmtMap[quality] || fmtMap["1080"], "--merge-output-format", "mp4", "-o", path.join(dlDir, "%(title)s.%(ext)s"));
    jobs[id].findExts = [".mp4",".webm",".mkv"];
  } else if (type === "subs") {
    formatArgs.push("--write-auto-sub", "--sub-lang", "pt,en,es", "--skip-download", "-o", path.join(dlDir, "%(title)s.%(ext)s"));
    jobs[id].findExts = [".srt",".vtt",".ass"];
  } else if (type === "thumb") {
    formatArgs.push("--write-thumbnail", "--skip-download", "--convert-thumbnails", "jpg", "-o", path.join(dlDir, "%(title)s.%(ext)s"));
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
  const range = req.headers.range;
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const start = parseInt(m[1]);
      const end = m[2] ? parseInt(m[2]) : size - 1;
      res.writeHead(206, { "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Content-Type": "video/mp4" });
      fs.createReadStream(filepath, { start, end }).pipe(res);
      return;
    }
  }
  res.writeHead(200, { "Content-Length": size, "Content-Type": "video/mp4", "Accept-Ranges": "bytes" });
  fs.createReadStream(filepath).pipe(res);
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

router.post("/upload-cookies", cookiesUpload.single("cookies"), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
  const filePath = path.join(cookiesDir, "cookies.txt");
  // Validate it looks like a Netscape cookies file
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim() && !l.startsWith("#"));
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
    fs.writeFileSync(filePath, text.trim(), "utf-8");
    const lines = text.split("\n").filter(l => l.trim() && !l.startsWith("#"));
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

export default router;
