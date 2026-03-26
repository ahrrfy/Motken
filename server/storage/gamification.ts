import { db } from "../db";
import { eq, desc, asc, sum } from "drizzle-orm";
import {
  type Point, type InsertPoint,
  type Badge, type InsertBadge,
  type Schedule, type InsertSchedule,
  type Competition, type InsertCompetition,
  type CompetitionParticipant, type InsertCompetitionParticipant,
  points, badges, schedules, competitions, competitionParticipants,
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

  // ==================== SCHEDULES ====================
  async getSchedule(id: string): Promise<Schedule | undefined> {
    const [entry] = await db.select().from(schedules).where(eq(schedules.id, id));
    return entry;
  },

  async getSchedulesByMosque(mosqueId: string): Promise<Schedule[]> {
    return db.select().from(schedules).where(eq(schedules.mosqueId, mosqueId)).orderBy(asc(schedules.dayOfWeek));
  },

  async getSchedulesByTeacher(teacherId: string): Promise<Schedule[]> {
    return db.select().from(schedules).where(eq(schedules.teacherId, teacherId)).orderBy(asc(schedules.dayOfWeek));
  },

  async createSchedule(s: InsertSchedule): Promise<Schedule> {
    const [entry] = await db.insert(schedules).values(s).returning();
    return entry;
  },

  async updateSchedule(id: string, data: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const [entry] = await db.update(schedules).set(data).where(eq(schedules.id, id)).returning();
    return entry;
  },

  async deleteSchedule(id: string): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  },

  // ==================== COMPETITIONS ====================
  async getCompetition(id: string): Promise<Competition | undefined> {
    const [entry] = await db.select().from(competitions).where(eq(competitions.id, id));
    return entry;
  },

  async getCompetitions(): Promise<Competition[]> {
    return db.select().from(competitions).orderBy(desc(competitions.createdAt));
  },

  async getCompetitionsByMosque(mosqueId: string): Promise<Competition[]> {
    return db.select().from(competitions).where(eq(competitions.mosqueId, mosqueId)).orderBy(desc(competitions.createdAt));
  },

  async createCompetition(c: InsertCompetition): Promise<Competition> {
    const [entry] = await db.insert(competitions).values(c).returning();
    return entry;
  },

  async updateCompetition(id: string, data: Partial<InsertCompetition>): Promise<Competition | undefined> {
    const [entry] = await db.update(competitions).set(data).where(eq(competitions.id, id)).returning();
    return entry;
  },

  async deleteCompetition(id: string): Promise<void> {
    await db.delete(competitionParticipants).where(eq(competitionParticipants.competitionId, id));
    await db.delete(competitions).where(eq(competitions.id, id));
  },

  // ==================== COMPETITION PARTICIPANTS ====================
  async getCompetitionParticipants(competitionId: string): Promise<CompetitionParticipant[]> {
    return db.select().from(competitionParticipants).where(eq(competitionParticipants.competitionId, competitionId)).orderBy(desc(competitionParticipants.createdAt));
  },

  async createCompetitionParticipant(cp: InsertCompetitionParticipant): Promise<CompetitionParticipant> {
    const [entry] = await db.insert(competitionParticipants).values(cp).returning();
    return entry;
  },

  async updateCompetitionParticipant(id: string, data: Partial<InsertCompetitionParticipant>): Promise<CompetitionParticipant | undefined> {
    const [entry] = await db.update(competitionParticipants).set(data).where(eq(competitionParticipants.id, id)).returning();
    return entry;
  },

  async deleteCompetitionParticipant(id: string): Promise<void> {
    await db.delete(competitionParticipants).where(eq(competitionParticipants.id, id));
  },
};
