import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;


function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, "lacasastudio-salt", 32);
}

export function encrypt(text: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decrypt(data: string, secret: string): string {
  const parts = data.split(":");
  if (parts.length !== 3) return data; // Not encrypted, return as-is
  const [ivHex, tagHex, encrypted] = parts;
  const key = deriveKey(secret);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function isEncrypted(data: string): boolean {
  return /^[0-9a-f]{32}:[0-9a-f]{32}:.+$/.test(data);
}
