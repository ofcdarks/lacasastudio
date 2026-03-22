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

// Allow all common file types - block only dangerous executables
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
  ".vbs", ".vbe", ".js", ".jse", ".ws", ".wsf", ".wsc", ".wsh",
  ".ps1", ".ps2", ".psc1", ".psc2", ".reg", ".inf", ".lnk",
]);

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (BLOCKED_EXTENSIONS.has(ext)) {
    cb(new Error(`Tipo de arquivo bloqueado: ${ext}`));
    return;
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});
export { UPLOAD_DIR };
