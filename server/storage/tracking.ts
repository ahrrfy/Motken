import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { createCrud } from "./base-repository";
import {
  type Attendance, type InsertAttendance,
  attendance,
} from "@shared/schema";

const attendanceCrud = createCrud<InsertAttendance, Attendance>(attendance);

export const trackingMethods = {
  getAttendance: attendanceCrud.getById,
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
  createAttendance: attendanceCrud.create,
  updateAttendance: attendanceCrud.update,
  deleteAttendance: attendanceCrud.remove,
};
