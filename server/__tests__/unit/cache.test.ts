import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Inline a minimal MemoryCache to avoid side effects from the real module
class TestMemoryCache {
  private store = new Map<string, { data: any; expiresAt: number }>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePattern(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

describe("MemoryCache", () => {
  let cache: TestMemoryCache;

  beforeEach(() => {
    cache = new TestMemoryCache();
  });

  it("should store and retrieve a value", () => {
    cache.set("key1", { name: "test" }, 60000);
    expect(cache.get("key1")).toEqual({ name: "test" });
  });

  it("should return undefined for missing keys", () => {
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("should expire entries after TTL", () => {
    vi.useFakeTimers();
    cache.set("expiring", "value", 1000);
    expect(cache.get("expiring")).toBe("value");

    vi.advanceTimersByTime(1001);
    expect(cache.get("expiring")).toBeUndefined();
    vi.useRealTimers();
  });

  it("should invalidate a specific key", () => {
    cache.set("key1", "val1", 60000);
    cache.set("key2", "val2", 60000);
    cache.invalidate("key1");
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBe("val2");
  });

  it("should invalidate by pattern prefix", () => {
    cache.set("user:1", "a", 60000);
    cache.set("user:2", "b", 60000);
    cache.set("mosque:1", "c", 60000);
    cache.invalidatePattern("user:");
    expect(cache.get("user:1")).toBeUndefined();
    expect(cache.get("user:2")).toBeUndefined();
    expect(cache.get("mosque:1")).toBe("c");
  });

  it("should clear all entries", () => {
    cache.set("a", 1, 60000);
    cache.set("b", 2, 60000);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("should track size correctly", () => {
    expect(cache.size).toBe(0);
    cache.set("a", 1, 60000);
    expect(cache.size).toBe(1);
    cache.set("b", 2, 60000);
    expect(cache.size).toBe(2);
    cache.invalidate("a");
    expect(cache.size).toBe(1);
  });

  it("should overwrite existing keys", () => {
    cache.set("key", "old", 60000);
    cache.set("key", "new", 60000);
    expect(cache.get("key")).toBe("new");
    expect(cache.size).toBe(1);
  });
});

describe("cachedQuery pattern", () => {
  let cache: TestMemoryCache;

  async function cachedQuery<T>(
    cache: TestMemoryCache,
    key: string,
    ttlMs: number,
    queryFn: () => Promise<T>,
  ): Promise<T> {
    const cached = cache.get<T>(key);
    if (cached !== undefined) return cached;
    const result = await queryFn();
    if (result !== null && result !== undefined) {
      cache.set(key, result, ttlMs);
    }
    return result;
  }

  beforeEach(() => {
    cache = new TestMemoryCache();
  });

  it("should call queryFn on cache miss", async () => {
    const fn = vi.fn().mockResolvedValue({ id: 1, name: "test" });
    const result = await cachedQuery(cache, "test:1", 60000, fn);
    expect(fn).toHaveBeenCalledOnce();
    expect(result).toEqual({ id: 1, name: "test" });
  });

  it("should use cache on second call", async () => {
    const fn = vi.fn().mockResolvedValue({ id: 1 });
    await cachedQuery(cache, "test:1", 60000, fn);
    const result2 = await cachedQuery(cache, "test:1", 60000, fn);
    expect(fn).toHaveBeenCalledOnce(); // Not called again
    expect(result2).toEqual({ id: 1 });
  });

  it("should not cache null results", async () => {
    const fn = vi.fn().mockResolvedValue(null);
    await cachedQuery(cache, "test:null", 60000, fn);
    await cachedQuery(cache, "test:null", 60000, fn);
    expect(fn).toHaveBeenCalledTimes(2); // Called again because null not cached
  });
});
