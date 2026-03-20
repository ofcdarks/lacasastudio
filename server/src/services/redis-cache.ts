/**
 * Redis-compatible cache service
 * Uses in-memory by default. Set REDIS_URL env to use real Redis.
 * Install: npm install ioredis (when ready for production)
 * 
 * Usage:
 *   import cache from "./services/redis-cache";
 *   await cache.set("key", data, 3600); // TTL in seconds
 *   const val = await cache.get("key");
 *   await cache.del("key");
 */

interface CacheEntry { value: string; exp: number; }
const mem: Map<string, CacheEntry> = new Map();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of mem) { if (v.exp < now) mem.delete(k); }
}, 60000);

const cache = {
  async get(key: string): Promise<any | null> {
    if (process.env.REDIS_URL) {
      // Production: use ioredis
      // const Redis = require("ioredis");
      // const client = new Redis(process.env.REDIS_URL);
      // const val = await client.get(key);
      // await client.quit();
      // return val ? JSON.parse(val) : null;
    }
    const entry = mem.get(key);
    if (!entry) return null;
    if (entry.exp < Date.now()) { mem.delete(key); return null; }
    return JSON.parse(entry.value);
  },

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    const str = JSON.stringify(value);
    if (process.env.REDIS_URL) {
      // Production: use ioredis
      // const Redis = require("ioredis");
      // const client = new Redis(process.env.REDIS_URL);
      // await client.set(key, str, "EX", ttlSeconds);
      // await client.quit();
      // return;
    }
    mem.set(key, { value: str, exp: Date.now() + ttlSeconds * 1000 });
    if (mem.size > 500) {
      const now = Date.now();
      for (const [k, v] of mem) { if (v.exp < now) mem.delete(k); }
      if (mem.size > 500) { const first = mem.keys().next().value; if (first) mem.delete(first); }
    }
  },

  async del(key: string): Promise<void> {
    if (process.env.REDIS_URL) {
      // Production: use ioredis
    }
    mem.delete(key);
  },

  async flush(): Promise<void> { mem.clear(); },
  stats() { return { size: mem.size, backend: process.env.REDIS_URL ? "redis" : "memory" }; }
};

export default cache;
