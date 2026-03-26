import { db } from "../db";
import { eq, desc, inArray } from "drizzle-orm";
import {
  type BannedDevice, type InsertBannedDevice,
  type FeatureFlag, type InsertFeatureFlag,
  bannedDevices, featureFlags,
  certificates, courseStudents, courseTeachers, courses,
  examStudents, exams, ratings, assignments, notifications,
  activityLogs, users, mosques,
} from "@shared/schema";

export const systemMethods = {
  // ==================== BANNED DEVICES ====================
  async getBannedDevices(): Promise<BannedDevice[]> {
    return db.select().from(bannedDevices).orderBy(desc(bannedDevices.createdAt));
  },

  async createBannedDevice(bd: InsertBannedDevice): Promise<BannedDevice> {
    const [entry] = await db.insert(bannedDevices).values(bd).returning();
    return entry;
  },

  async deleteBannedDevice(id: string): Promise<void> {
    await db.delete(bannedDevices).where(eq(bannedDevices.id, id));
  },

  async isBannedIP(ip: string): Promise<boolean> {
    const [result] = await db.select().from(bannedDevices).where(eq(bannedDevices.ipAddress, ip)).limit(1);
    return !!result;
  },

  async isBannedFingerprint(fingerprint: string): Promise<boolean> {
    const [result] = await db.select().from(bannedDevices).where(eq(bannedDevices.deviceFingerprint, fingerprint)).limit(1);
    return !!result;
  },

  // ==================== FEATURE FLAGS ====================
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(desc(featureFlags.createdAt));
  },

  async getFeatureFlag(featureKey: string): Promise<FeatureFlag | undefined> {
    const [ff] = await db.select().from(featureFlags).where(eq(featureFlags.featureKey, featureKey));
    return ff;
  },

  async createFeatureFlag(ff: InsertFeatureFlag): Promise<FeatureFlag> {
    const [entry] = await db.insert(featureFlags).values(ff).returning();
    return entry;
  },

  async updateFeatureFlag(id: string, data: Partial<InsertFeatureFlag>): Promise<FeatureFlag | undefined> {
    const [entry] = await db.update(featureFlags).set(data).where(eq(featureFlags.id, id)).returning();
    return entry;
  },

  async isFeatureEnabled(featureKey: string): Promise<boolean> {
    const [ff] = await db.select().from(featureFlags).where(eq(featureFlags.featureKey, featureKey));
    return ff?.isEnabled ?? false;
  },

  // ==================== RESET ====================
  async resetSystemData(): Promise<void> {
    await db.delete(bannedDevices);
    await db.delete(certificates);
    await db.delete(courseStudents);
    await db.delete(courseTeachers);
    await db.delete(courses);
    await db.delete(examStudents);
    await db.delete(exams);
    await db.delete(ratings);
    await db.delete(assignments);
    await db.delete(notifications);
    await db.delete(activityLogs);
    await db.delete(users).where(
      inArray(users.role, ["teacher", "student", "supervisor"])
    );
    await db.delete(mosques);
  },
};
