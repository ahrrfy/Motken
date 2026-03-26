import { db } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  type User, type InsertUser,
  users, courseStudents, courseTeachers, certificates,
  notifications, activityLogs, ratings, examStudents,
  assignments, exams,
} from "@shared/schema";

export const userMethods = {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  },

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  },

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  },

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any)).orderBy(desc(users.createdAt));
  },

  async getUsersByMosque(mosqueId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.mosqueId, mosqueId)).orderBy(desc(users.createdAt));
  },

  async getUsersByMosqueAndRole(mosqueId: string, role: string): Promise<User[]> {
    return db.select().from(users).where(
      and(eq(users.mosqueId, mosqueId), eq(users.role, role as any))
    ).orderBy(desc(users.createdAt));
  },

  async getUsersByTeacher(teacherId: string): Promise<User[]> {
    return db.select().from(users).where(
      and(eq(users.teacherId, teacherId), eq(users.role, "student"))
    ).orderBy(desc(users.createdAt));
  },

  async checkPhoneExists(phone: string, excludeId?: string, allowedRoles?: string[]): Promise<boolean> {
    const phoneClean = (phone || "").replace(/[^\d]/g, "");
    if (!phoneClean) return false;
    const excludeParam = excludeId || "";
    const result = await db.execute(sql`
      SELECT id, role FROM users
      WHERE id != ${excludeParam}
        AND REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g') = ${phoneClean}
    `);
    if (result.rows.length === 0) return false;
    if (allowedRoles && allowedRoles.length > 0) {
      const allAllowed = result.rows.every((r: any) => allowedRoles.includes(r.role));
      if (allAllowed) return false;
    }
    return true;
  },

  async getLinkedAccounts(phone: string, excludeId?: string): Promise<User[]> {
    const phoneClean = (phone || "").replace(/[^\d]/g, "");
    if (!phoneClean) return [];
    const excludeParam = excludeId || "";
    const result = await db.execute(sql`
      SELECT * FROM users
      WHERE id != ${excludeParam}
        AND role IN ('teacher', 'supervisor')
        AND REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g') = ${phoneClean}
      ORDER BY created_at
    `);
    return result.rows as User[];
  },

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  },

  async deleteUser(id: string): Promise<void> {
    await db.delete(courseStudents).where(eq(courseStudents.studentId, id));
    await db.delete(courseTeachers).where(eq(courseTeachers.teacherId, id));
    await db.delete(certificates).where(eq(certificates.studentId, id));
    await db.delete(certificates).where(eq(certificates.issuedBy, id));
    await db.delete(notifications).where(eq(notifications.userId, id));
    await db.delete(activityLogs).where(eq(activityLogs.userId, id));
    await db.delete(ratings).where(eq(ratings.fromUserId, id));
    await db.delete(ratings).where(eq(ratings.toUserId, id));
    await db.delete(examStudents).where(eq(examStudents.studentId, id));
    await db.delete(assignments).where(eq(assignments.studentId, id));
    await db.delete(assignments).where(eq(assignments.teacherId, id));
    await db.delete(exams).where(eq(exams.teacherId, id));
    await db.delete(users).where(eq(users.id, id));
  },
};
