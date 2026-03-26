// @ts-nocheck
// Simple HTML sanitizer for user inputs
export function sanitizeInput(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/data:/gi, "data_")
    .trim();
}

export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const clean: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") clean[key] = sanitizeInput(val);
    else clean[key] = val;
  }
  return clean;
}
