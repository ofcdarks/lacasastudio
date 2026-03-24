// @ts-nocheck
import { encrypt, decrypt } from "../services/crypto";

export function encryptValue(value: string): string {
  if (!value || value === "••••••••") return value;
  try { return encrypt(value); } catch { return value; }
}

export function decryptValue(value: string): string {
  if (!value || !value.includes(":")) return value;
  try { return decrypt(value); } catch { return value; }
}
