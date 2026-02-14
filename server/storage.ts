import {
  type User, type InsertUser,
  type Mosque, type InsertMosque,
  type Assignment, type InsertAssignment,
  type ActivityLog, type InsertActivityLog,
  type Notification, type InsertNotification,
  users, mosques, assignments, activityLogs, notifications,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByMosque(mosqueId: string): Promise<User[]>;
  getUsersByMosqueAndRole(mosqueId: string, role: string): Promise<User[]>;
  getUsersByTeacher(teacherId: string): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  getMosque(id: string): Promise<Mosque | undefined>;
  getMosques(): Promise<Mosque[]>;
  createMosque(mosque: InsertMosque): Promise<Mosque>;
  updateMosque(id: string, data: Partial<InsertMosque>): Promise<Mosque | undefined>;
  deleteMosque(id: string): Promise<void>;

  getAssignments(): Promise<Assignment[]>;
  getAssignmentsByMosque(mosqueId: string): Promise<Assignment[]>;
  getAssignmentsByStudent(studentId: string): Promise<Assignment[]>;
  getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]>;
  createAssignment(a: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  updateAssignments(studentId: string, oldTeacherId: string | null, newTeacherId: string): Promise<void>;
  deleteAssignment(id: string): Promise<void>;

  getActivityLogs(): Promise<ActivityLog[]>;
  getActivityLogsByMosque(mosqueId: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(n: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any)).orderBy(desc(users.createdAt));
  }

  async getUsersByMosque(mosqueId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.mosqueId, mosqueId)).orderBy(desc(users.createdAt));
  }

  async getUsersByMosqueAndRole(mosqueId: string, role: string): Promise<User[]> {
    return db.select().from(users).where(
      and(eq(users.mosqueId, mosqueId), eq(users.role, role as any))
    ).orderBy(desc(users.createdAt));
  }

  async getUsersByTeacher(teacherId: string): Promise<User[]> {
    return db.select().from(users).where(
      and(eq(users.teacherId, teacherId), eq(users.role, "student"))
    ).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getMosque(id: string): Promise<Mosque | undefined> {
    const [mosque] = await db.select().from(mosques).where(eq(mosques.id, id));
    return mosque;
  }

  async getMosques(): Promise<Mosque[]> {
    return db.select().from(mosques).orderBy(desc(mosques.createdAt));
  }

  async createMosque(mosque: InsertMosque): Promise<Mosque> {
    const [m] = await db.insert(mosques).values(mosque).returning();
    return m;
  }

  async updateMosque(id: string, data: Partial<InsertMosque>): Promise<Mosque | undefined> {
    const [m] = await db.update(mosques).set(data).where(eq(mosques.id, id)).returning();
    return m;
  }

  async deleteMosque(id: string): Promise<void> {
    await db.delete(mosques).where(eq(mosques.id, id));
  }

  async getAssignments(): Promise<Assignment[]> {
    return db.select().from(assignments).orderBy(desc(assignments.createdAt));
  }

  async getAssignmentsByMosque(mosqueId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.mosqueId, mosqueId)).orderBy(desc(assignments.createdAt));
  }

  async getAssignmentsByStudent(studentId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.studentId, studentId)).orderBy(desc(assignments.scheduledDate));
  }

  async getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.teacherId, teacherId)).orderBy(desc(assignments.scheduledDate));
  }

  async createAssignment(a: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db.insert(assignments).values(a).returning();
    return assignment;
  }

  async updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [assignment] = await db.update(assignments).set(data).where(eq(assignments.id, id)).returning();
    return assignment;
  }

  async updateAssignments(studentId: string, oldTeacherId: string | null, newTeacherId: string): Promise<void> {
    const conditions = oldTeacherId
      ? and(eq(assignments.studentId, studentId), eq(assignments.teacherId, oldTeacherId))
      : eq(assignments.studentId, studentId);
    await db.update(assignments).set({ teacherId: newTeacherId }).where(conditions);
  }

  async deleteAssignment(id: string): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByMosque(mosqueId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.mosqueId, mosqueId)).orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [entry] = await db.insert(activityLogs).values(log).returning();
    return entry;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(n: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(n).returning();
    return notif;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }
}

export const storage = new DatabaseStorage();
