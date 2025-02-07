import type { Cache, CacheOptions, CacheStrategy } from "./cache";

export class InMemoryCache<K, V> implements Cache<K, V> {
  private cache: Map<K, { value: V; expiry: number | null }>;
  private usageCount: Map<K, number>;
  private maxCacheSize: number;
  private strategy: CacheStrategy;
  private keyOrder: K[];
  private ttl: number | null;

  constructor(options: CacheOptions = {}) {
    this.maxCacheSize = options.maxCacheSize || 100;
    this.strategy = options.strategy || "lru";
    this.ttl = options.ttl ?? null;
    this.cache = new Map<K, { value: V; expiry: number | null }>();
    this.usageCount = new Map<K, number>();
    this.keyOrder = [];
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (entry.expiry !== null && Date.now() > entry.expiry) {
      this.delete(key);
      return undefined;
    }

    if (this.strategy === "lru") {
      this.cache.delete(key);
      this.cache.set(key, entry);
    } else if (this.strategy === "lfu") {
      this.usageCount.set(key, (this.usageCount.get(key) || 0) + 1);
    }

    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.keyOrder = this.keyOrder.filter((k) => k !== key);
    } else if (this.cache.size >= this.maxCacheSize) {
      this.evict();
    }

    const expiry = this.ttl !== null ? Date.now() + this.ttl : null;
    this.cache.set(key, { value, expiry });
    this.usageCount.set(key, 1);
    this.keyOrder.push(key);
  }

  delete(key: K): void {
    this.cache.delete(key);
    this.usageCount.delete(key);
    this.keyOrder = this.keyOrder.filter((k) => k !== key);
  }

  clear(): void {
    this.cache.clear();
    this.usageCount.clear();
    this.keyOrder = [];
  }

  private evict(): void {
    if (this.strategy === "lru") {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.usageCount.delete(firstKey);
      }
    } else if (this.strategy === "lfu") {
      let leastUsedKey: K | null = null;
      let minUsage = Infinity;

      for (const [key, count] of this.usageCount.entries()) {
        if (count < minUsage) {
          minUsage = count;
          leastUsedKey = key;
        }
      }

      if (leastUsedKey !== null) {
        this.cache.delete(leastUsedKey);
        this.usageCount.delete(leastUsedKey);
      }
    } else if (this.strategy === "fifo") {
      const firstKey = this.keyOrder.shift();
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.usageCount.delete(firstKey);
      }
    } else if (this.strategy === "random") {
      const keys = Array.from(this.cache.keys());
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      this.cache.delete(randomKey);
      this.usageCount.delete(randomKey);
    }
  }
}
