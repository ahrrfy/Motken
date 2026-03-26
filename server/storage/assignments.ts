import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  type Assignment, type InsertAssignment,
  assignments,
} from "@shared/schema";

export const assignmentMethods = {
  async getAssignment(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  },

  async getAssignments(): Promise<Assignment[]> {
    return db.select().from(assignments).orderBy(desc(assignments.createdAt));
  },

  async getAssignmentsByMosque(mosqueId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.mosqueId, mosqueId)).orderBy(desc(assignments.createdAt));
  },

  async getAssignmentsByStudent(studentId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.studentId, studentId)).orderBy(desc(assignments.scheduledDate));
  },

  async getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.teacherId, teacherId)).orderBy(desc(assignments.scheduledDate));
  },

  async createAssignment(a: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db.insert(assignments).values(a).returning();
    return assignment;
  },

  async updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [assignment] = await db.update(assignments).set(data).where(eq(assignments.id, id)).returning();
    return assignment;
  },

  async updateAssignments(studentId: string, oldTeacherId: string | null, newTeacherId: string): Promise<void> {
    const conditions = oldTeacherId
      ? and(eq(assignments.studentId, studentId), eq(assignments.teacherId, oldTeacherId))
      : eq(assignments.studentId, studentId);
    await db.update(assignments).set({ teacherId: newTeacherId }).where(conditions);
  },

  async deleteAssignment(id: string): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  },
};
