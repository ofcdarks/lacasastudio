// @ts-nocheck
import { encrypt, decrypt, isEncrypted } from "../services/crypto";

const SECRET = process.env.JWT_SECRET || "lacasastudio-default-key-change-me";

export function encryptValue(value: string): string {
  if (!value || value === "••••••••" || isEncrypted(value)) return value;
  try { return encrypt(value, SECRET); } catch { return value; }
}

export function decryptValue(value: string): string {
  if (!value || !isEncrypted(value)) return value;
  try { return decrypt(value, SECRET); } catch { return value; }
}
