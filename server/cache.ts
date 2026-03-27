/**
 * طبقة كاش بسيطة في الذاكرة لنظام مُتْقِن
 * تُقلل الضغط على قاعدة البيانات للاستعلامات المتكررة
 * بدون أي حزمة خارجية — مبنية على Map
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // تنظيف كل 60 ثانية
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * جلب من الكاش
   * @returns البيانات أو undefined إذا غير موجودة أو منتهية
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  /**
   * حفظ في الكاش
   * @param key مفتاح الكاش
   * @param data البيانات
   * @param ttlMs مدة الصلاحية بالمللي ثانية
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * إبطال مفتاح محدد
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * إبطال كل المفاتيح التي تبدأ بـ prefix
   * مثال: invalidatePattern("user:") يحذف user:123, user:456, الخ
   */
  invalidatePattern(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * إبطال كل الكاش
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * حجم الكاش الحالي
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * تنظيف المفاتيح المنتهية
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[Cache] تم تنظيف ${cleaned} عنصر منتهي — المتبقي: ${this.store.size}`);
    }
  }

  /**
   * إيقاف الكاش (عند إيقاف السيرفر)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// كاش مشترك واحد للتطبيق
export const cache = new MemoryCache();

// ثوابت TTL (بالمللي ثانية)
export const TTL = {
  SHORT: 30_000,        // 30 ثانية — بيانات سريعة التغير
  MEDIUM: 2 * 60_000,   // 2 دقيقة — بيانات المستخدم
  LONG: 5 * 60_000,     // 5 دقائق — بيانات المساجد
  VERY_LONG: 10 * 60_000, // 10 دقائق — feature flags وبيانات ثابتة
} as const;

/**
 * Helper: جلب من الكاش أو تنفيذ الدالة وتخزين النتيجة
 *
 * استخدام:
 * ```
 * const mosque = await cachedQuery(`mosque:${id}`, TTL.LONG, () => db.getMosque(id));
 * ```
 */
export async function cachedQuery<T>(
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
