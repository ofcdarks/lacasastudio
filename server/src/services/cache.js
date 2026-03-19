class SimpleCache {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.store = new Map();
    this.ttl = ttlMs;
  }
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.exp) { this.store.delete(key); return null; }
    return item.value;
  }
  set(key, value, ttl) {
    this.store.set(key, { value, exp: Date.now() + (ttl || this.ttl) });
  }
  del(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

module.exports = new SimpleCache();
