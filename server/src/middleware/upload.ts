import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const userDir = path.join(UPLOAD_DIR, String(req.userId));
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_MIMES: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
  ".svg": ["image/svg+xml"],
  ".mp4": ["video/mp4"],
  ".mov": ["video/quicktime"],
  ".avi": ["video/x-msvideo"],
  ".mp3": ["audio/mpeg"],
  ".wav": ["audio/wav", "audio/wave"],
  ".pdf": ["application/pdf"],
  ".zip": ["application/zip"],
  ".json": ["application/json"],
  ".srt": ["application/x-subrip", "text/plain"],
  ".vtt": ["text/vtt", "text/plain"],
  ".ttf": ["font/ttf"],
  ".otf": ["font/otf"],
  ".woff": ["font/woff"],
  ".woff2": ["font/woff2"],
};

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ALLOWED_MIMES[ext];

  if (!allowedMimes) {
    cb(new Error(`Tipo de arquivo não permitido: ${ext}`));
    return;
  }

  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error(`MIME type inválido para ${ext}: ${file.mimetype}`));
    return;
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for file uploads
});
export { UPLOAD_DIR };
