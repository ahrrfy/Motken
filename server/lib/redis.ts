/**
 * Redis client with graceful fallback to in-memory
 * When REDIS_URL is not set, uses the existing MemoryCache
 */

import { logger } from "./logger";

interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<void>;
  del(key: string | string[]): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  quit(): Promise<void>;
  isReady: boolean;
}

/**
 * In-memory fallback that mimics Redis API
 */
class MemoryFallback implements RedisLikeClient {
  private store = new Map<string, { value: string; expiresAt: number }>();
  isReady = true;

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    const ttl = (options?.EX || 300) * 1000; // default 5 min
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  async del(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) this.store.delete(k);
  }

  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace("*", "");
    return Array.from(this.store.keys()).filter(k => k.startsWith(prefix));
  }

  async quit(): Promise<void> {
    this.store.clear();
  }
}

let client: RedisLikeClient | null = null;

/**
 * Get or create Redis client
 * Falls back to in-memory if REDIS_URL not configured
 */
export async function getRedisClient(): Promise<RedisLikeClient> {
  if (client?.isReady) return client;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.info("Redis not configured — using in-memory fallback");
    client = new MemoryFallback();
    return client;
  }

  try {
    const { createClient } = await import("redis");
    const redisClient = createClient({ url: redisUrl });

    redisClient.on("error", (err) => {
      logger.error({ err: err.message }, "Redis connection error");
    });

    await redisClient.connect();
    logger.info("Redis connected successfully");

    // Wrap in our interface
    client = {
      get: (key) => redisClient.get(key),
      set: async (key, value, options) => {
        if (options?.EX) {
          await redisClient.set(key, value, { EX: options.EX });
        } else {
          await redisClient.set(key, value);
        }
      },
      del: async (key) => {
        const keys = Array.isArray(key) ? key : [key];
        if (keys.length > 0) await redisClient.del(keys);
      },
      keys: (pattern) => redisClient.keys(pattern),
      quit: () => redisClient.quit(),
      isReady: true,
    };

    return client;
  } catch (err: any) {
    logger.warn({ err: err.message }, "Redis failed to connect — using in-memory fallback");
    client = new MemoryFallback();
    return client;
  }
}

/**
 * Gracefully disconnect Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
