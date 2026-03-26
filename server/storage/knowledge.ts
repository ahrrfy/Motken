import { db } from "../db";
import { eq, desc, and, asc } from "drizzle-orm";
import {
  type TajweedRule, type InsertTajweedRule,
  type SimilarVerse, type InsertSimilarVerse,
  type QuranProgress,
  tajweedRules, similarVerses, quranProgress,
} from "@shared/schema";

export const knowledgeMethods = {
  // ==================== TAJWEED RULES ====================
  async getTajweedRule(id: string): Promise<TajweedRule | undefined> {
    const [entry] = await db.select().from(tajweedRules).where(eq(tajweedRules.id, id));
    return entry;
  },

  async getAllTajweedRules(): Promise<TajweedRule[]> {
    return db.select().from(tajweedRules).orderBy(asc(tajweedRules.sortOrder));
  },

  async getTajweedRulesByCategory(category: string): Promise<TajweedRule[]> {
    return db.select().from(tajweedRules).where(eq(tajweedRules.category, category)).orderBy(asc(tajweedRules.sortOrder));
  },

  async createTajweedRule(data: InsertTajweedRule): Promise<TajweedRule> {
    const [entry] = await db.insert(tajweedRules).values(data).returning();
    return entry;
  },

  async updateTajweedRule(id: string, data: Partial<InsertTajweedRule>): Promise<TajweedRule | undefined> {
    const [entry] = await db.update(tajweedRules).set(data).where(eq(tajweedRules.id, id)).returning();
    return entry;
  },

  async deleteTajweedRule(id: string): Promise<void> {
    await db.delete(tajweedRules).where(eq(tajweedRules.id, id));
  },

  // ==================== SIMILAR VERSES ====================
  async getSimilarVerse(id: string): Promise<SimilarVerse | undefined> {
    const [entry] = await db.select().from(similarVerses).where(eq(similarVerses.id, id));
    return entry;
  },

  async getAllSimilarVerses(): Promise<SimilarVerse[]> {
    return db.select().from(similarVerses).orderBy(desc(similarVerses.createdAt));
  },

  async createSimilarVerse(data: InsertSimilarVerse): Promise<SimilarVerse> {
    const [entry] = await db.insert(similarVerses).values(data).returning();
    return entry;
  },

  async updateSimilarVerse(id: string, data: Partial<InsertSimilarVerse>): Promise<SimilarVerse | undefined> {
    const [entry] = await db.update(similarVerses).set(data).where(eq(similarVerses.id, id)).returning();
    return entry;
  },

  async deleteSimilarVerse(id: string): Promise<void> {
    await db.delete(similarVerses).where(eq(similarVerses.id, id));
  },

  // ==================== QURAN PROGRESS ====================
  async getQuranProgress(userId: string, surahNumber: number): Promise<QuranProgress | undefined> {
    const [row] = await db.select().from(quranProgress)
      .where(and(eq(quranProgress.userId, userId), eq(quranProgress.surahNumber, surahNumber)));
    return row;
  },

  async getQuranProgressByUser(userId: string): Promise<QuranProgress[]> {
    return db.select().from(quranProgress).where(eq(quranProgress.userId, userId));
  },

  async upsertQuranProgress(this: any, data: {
    userId: string; mosqueId?: string | null; surahNumber: number;
    verseStatuses?: string; notes?: string | null;
    reviewedToday?: boolean; reviewStreak?: number; lastReviewDate?: string | null;
  }): Promise<QuranProgress> {
    const existing = await this.getQuranProgress(data.userId, data.surahNumber);
    if (existing) {
      const [updated] = await db.update(quranProgress)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(quranProgress.userId, data.userId), eq(quranProgress.surahNumber, data.surahNumber)))
        .returning();
      return updated;
    }
    const [created] = await db.insert(quranProgress)
      .values({ ...data, verseStatuses: data.verseStatuses || "{}" })
      .returning();
    return created;
  },
};
