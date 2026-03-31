import { db } from "../db";
import { eq, desc, sum } from "drizzle-orm";
import {
  type Point, type InsertPoint,
  type Badge, type InsertBadge,
  points, badges,
} from "@shared/schema";

export const gamificationMethods = {
  // ==================== POINTS ====================
  async getPointsByUser(userId: string): Promise<Point[]> {
    return db.select().from(points).where(eq(points.userId, userId)).orderBy(desc(points.createdAt));
  },

  async getPointsByMosque(mosqueId: string): Promise<Point[]> {
    return db.select().from(points).where(eq(points.mosqueId, mosqueId)).orderBy(desc(points.createdAt));
  },

  async getTotalPoints(userId: string): Promise<number> {
    const [result] = await db.select({ value: sum(points.amount) }).from(points).where(eq(points.userId, userId));
    return Number(result?.value ?? 0);
  },

  async createPoint(p: InsertPoint): Promise<Point> {
    const [entry] = await db.insert(points).values(p).returning();
    return entry;
  },

  async getLeaderboard(this: any, mosqueId?: string): Promise<{id: string, name: string, username: string, avatar: string | null, totalPoints: number}[]> {
    const query = db.select({
      userId: points.userId,
      total: sum(points.amount),
    }).from(points);

    const results = mosqueId
      ? await query.where(eq(points.mosqueId, mosqueId)).groupBy(points.userId).orderBy(desc(sum(points.amount)))
      : await query.groupBy(points.userId).orderBy(desc(sum(points.amount)));

    const enriched = [];
    for (const r of results) {
      const user = await this.getUser(r.userId);
      if (user) {
        enriched.push({
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          totalPoints: Number(r.total ?? 0),
        });
      }
    }
    return enriched;
  },

  // ==================== BADGES ====================
  async getBadgesByUser(userId: string): Promise<Badge[]> {
    return db.select().from(badges).where(eq(badges.userId, userId)).orderBy(desc(badges.createdAt));
  },

  async getBadgesByMosque(mosqueId: string): Promise<Badge[]> {
    return db.select().from(badges).where(eq(badges.mosqueId, mosqueId)).orderBy(desc(badges.createdAt));
  },

  async createBadge(b: InsertBadge): Promise<Badge> {
    const [entry] = await db.insert(badges).values(b).returning();
    return entry;
  },

  async deleteBadge(id: string): Promise<void> {
    await db.delete(badges).where(eq(badges.id, id));
  },

};
