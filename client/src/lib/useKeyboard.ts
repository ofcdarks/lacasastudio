import { useEffect } from "react";

type ShortcutMap = Record<string, () => void>;

export function useKeyboard(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      for (const [combo, action] of Object.entries(shortcuts)) {
        const parts = combo.toLowerCase().split("+");
        const needsMod = parts.includes("mod");
        const needsShift = parts.includes("shift");
        const char = parts[parts.length - 1];

        if (needsMod && !isMod) continue;
        if (needsShift && !e.shiftKey) continue;
        if (key === char) {
          e.preventDefault();
          action();
          return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
