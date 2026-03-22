import { describe, it, expect, beforeAll } from "vitest";
import { prisma, testUser } from "./setup";

const BASE = `http://localhost:${process.env.PORT || 3000}/api`;

let channelId: number;
let videoId: number;

beforeAll(async () => {
  const ch = await prisma.channel.create({ data: { name: "Test Channel", userId: testUser.id } });
  channelId = ch.id;
});

function auth(path: string, opts: RequestInit = {}) {
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${testUser.token}`, ...opts.headers as any },
  });
}

describe("Video CRUD", () => {
  it("creates a video", async () => {
    const res = await auth("/videos", {
      method: "POST",
      body: JSON.stringify({ title: "Test Video", channelId }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe("Test Video");
    expect(data.status).toBe("idea");
    videoId = data.id;
  });

  it("lists videos with pagination", async () => {
    const res = await auth("/videos?page=1&limit=10");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toBeDefined();
    expect(data.meta).toBeDefined();
    expect(data.meta.page).toBe(1);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it("gets a single video", async () => {
    const res = await auth(`/videos/${videoId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(videoId);
    expect(data.scenes).toBeDefined();
    expect(data.checklists).toBeDefined();
  });

  it("updates a video", async () => {
    const res = await auth(`/videos/${videoId}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Updated Video", status: "script", priority: "alta" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Updated Video");
    expect(data.status).toBe("script");
  });

  it("rejects invalid status update", async () => {
    const res = await auth(`/videos/${videoId}`, {
      method: "PUT",
      body: JSON.stringify({ priority: "invalid-priority" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects video in another user's channel", async () => {
    const res = await auth("/videos", {
      method: "POST",
      body: JSON.stringify({ title: "Sneaky", channelId: 99999 }),
    });
    expect(res.status).toBe(403);
  });

  it("deletes a video", async () => {
    const res = await auth(`/videos/${videoId}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("returns 404 for deleted video", async () => {
    const res = await auth(`/videos/${videoId}`);
    expect(res.status).toBe(404);
  });
});
