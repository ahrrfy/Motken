import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type Mosque, type InsertMosque,
  mosques, activityLogs, notifications,
} from "@shared/schema";

export const mosqueMethods = {
  async getMosque(id: string): Promise<Mosque | undefined> {
    const [mosque] = await db.select().from(mosques).where(eq(mosques.id, id));
    return mosque;
  },

  async getMosques(): Promise<Mosque[]> {
    return db.select().from(mosques).orderBy(desc(mosques.createdAt));
  },

  async createMosque(mosque: InsertMosque): Promise<Mosque> {
    const [m] = await db.insert(mosques).values(mosque).returning();
    return m;
  },

  async updateMosque(id: string, data: Partial<InsertMosque>): Promise<Mosque | undefined> {
    const [m] = await db.update(mosques).set(data).where(eq(mosques.id, id)).returning();
    return m;
  },

  async deleteMosque(this: any, id: string): Promise<void> {
    const mosqueUsers = await this.getUsersByMosque(id);
    for (const user of mosqueUsers) {
      await this.deleteUser(user.id);
    }
    await db.delete(activityLogs).where(eq(activityLogs.mosqueId, id));
    await db.delete(notifications).where(eq(notifications.mosqueId, id));
    await db.delete(mosques).where(eq(mosques.id, id));
  },
};
