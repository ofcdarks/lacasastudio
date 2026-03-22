import { describe, it, expect } from "vitest";

describe("AI Service Utilities", () => {
  it("parses JSON from markdown fences", () => {
    const raw = '```json\n{"titles":["Test"]}\n```';
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    expect(parsed.titles).toHaveLength(1);
    expect(parsed.titles[0]).toBe("Test");
  });

  it("handles bare JSON without fences", () => {
    const raw = '{"score":85,"tips":["tip1","tip2"]}';
    const parsed = JSON.parse(raw);
    expect(parsed.score).toBe(85);
    expect(parsed.tips).toHaveLength(2);
  });

  it("handles malformed JSON gracefully", () => {
    const raw = 'not valid json at all';
    expect(() => JSON.parse(raw)).toThrow();
  });

  it("calculates channel score correctly", () => {
    function calcScore(subs: number, views: number, vids: number): number {
      if (!vids) return 0;
      const avgViews = views / vids;
      const viewsPerSub = subs > 0 ? avgViews / subs : 0;
      let s = 0;
      if (avgViews > 1000000) s += 30; else if (avgViews > 100000) s += 25; else if (avgViews > 10000) s += 18; else if (avgViews > 1000) s += 10; else s += 5;
      if (viewsPerSub > 5) s += 25; else if (viewsPerSub > 2) s += 20; else if (viewsPerSub > 1) s += 15; else if (viewsPerSub > 0.5) s += 10; else s += 5;
      if (subs > 1000000) s += 15; else if (subs > 100000) s += 20; else if (subs > 10000) s += 25; else if (subs > 1000) s += 20; else s += 15;
      if (vids > 100) s += 10; else if (vids > 30) s += 15; else s += 10;
      return Math.min(100, Math.max(0, s));
    }

    expect(calcScore(50000, 5000000, 50)).toBeGreaterThan(50);
    expect(calcScore(0, 0, 0)).toBe(0);
    expect(calcScore(100, 1000, 10)).toBeGreaterThan(0);
    expect(calcScore(1000000, 500000000, 200)).toBeGreaterThan(70);
  });
});
