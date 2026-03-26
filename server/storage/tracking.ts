import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  type Attendance, type InsertAttendance,
  attendance,
} from "@shared/schema";

export const trackingMethods = {
  async getAttendance(id: string): Promise<Attendance | undefined> {
    const [entry] = await db.select().from(attendance).where(eq(attendance.id, id));
    return entry;
  },

  async getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
    return db.select().from(attendance).where(eq(attendance.studentId, studentId)).orderBy(desc(attendance.date));
  },

  async getAttendanceByTeacher(teacherId: string): Promise<Attendance[]> {
    return db.select().from(attendance).where(eq(attendance.teacherId, teacherId)).orderBy(desc(attendance.date));
  },

  async getAttendanceByMosque(mosqueId: string): Promise<Attendance[]> {
    return db.select().from(attendance).where(eq(attendance.mosqueId, mosqueId)).orderBy(desc(attendance.date));
  },

  async getAttendanceByDate(date: Date, teacherId: string): Promise<Attendance[]> {
    return db.select().from(attendance).where(
      and(eq(attendance.date, date), eq(attendance.teacherId, teacherId))
    ).orderBy(desc(attendance.createdAt));
  },

  async createAttendance(a: InsertAttendance): Promise<Attendance> {
    const [entry] = await db.insert(attendance).values(a).returning();
    return entry;
  },

  async updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const [entry] = await db.update(attendance).set(data).where(eq(attendance.id, id)).returning();
    return entry;
  },

  async deleteAttendance(id: string): Promise<void> {
    await db.delete(attendance).where(eq(attendance.id, id));
  },
};
