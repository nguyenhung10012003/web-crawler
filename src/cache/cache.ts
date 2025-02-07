export interface Cache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  delete(key: K): void;
  clear(): void;
}

export type CacheStrategy = 'lru' | 'lfu' | 'fifo' | 'random';

export interface CacheOptions {
  maxCacheSize?: number;
  strategy?: CacheStrategy;
  ttl?: number; // Time to live in milliseconds
}

