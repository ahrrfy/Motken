import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  type Exam, type InsertExam,
  type ExamStudent, type InsertExamStudent,
  type Course, type InsertCourse,
  type CourseStudent, type InsertCourseStudent,
  type CourseTeacher, type InsertCourseTeacher,
  type Certificate, type InsertCertificate,
  type ActivityLog, type InsertActivityLog,
  type QuranProgress,
  exams, examStudents,
  courses, courseStudents, courseTeachers, certificates,
  activityLogs, quranProgress,
} from "@shared/schema";

export const educationMethods = {
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

  // ==================== EXAMS ====================
  async getExam(id: string): Promise<Exam | undefined> {
    const [exam] = await db.select().from(exams).where(eq(exams.id, id));
    return exam;
  },

  async getExamsByTeacher(teacherId: string): Promise<Exam[]> {
    return db.select().from(exams).where(eq(exams.teacherId, teacherId)).orderBy(desc(exams.createdAt));
  },

  async getExamsByMosque(mosqueId: string): Promise<Exam[]> {
    return db.select().from(exams).where(eq(exams.mosqueId, mosqueId)).orderBy(desc(exams.createdAt));
  },

  async createExam(e: InsertExam): Promise<Exam> {
    const [exam] = await db.insert(exams).values(e).returning();
    return exam;
  },

  async updateExam(id: string, data: Partial<InsertExam>): Promise<Exam | undefined> {
    const [exam] = await db.update(exams).set(data).where(eq(exams.id, id)).returning();
    return exam;
  },

  async deleteExam(id: string): Promise<void> {
    await db.delete(examStudents).where(eq(examStudents.examId, id));
    await db.delete(exams).where(eq(exams.id, id));
  },

  // ==================== EXAM STUDENTS ====================
  async getExamStudents(examId: string): Promise<ExamStudent[]> {
    return db.select().from(examStudents).where(eq(examStudents.examId, examId)).orderBy(desc(examStudents.createdAt));
  },

  async createExamStudent(es: InsertExamStudent): Promise<ExamStudent> {
    const [entry] = await db.insert(examStudents).values(es).returning();
    return entry;
  },

  async updateExamStudent(id: string, data: Partial<InsertExamStudent>): Promise<ExamStudent | undefined> {
    const [entry] = await db.update(examStudents).set(data).where(eq(examStudents.id, id)).returning();
    return entry;
  },

  async getExamsByStudent(studentId: string): Promise<ExamStudent[]> {
    return db.select().from(examStudents).where(eq(examStudents.studentId, studentId)).orderBy(desc(examStudents.createdAt));
  },

  // ==================== ACTIVITY LOGS ====================
  async getActivityLogs(): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  },

  async getActivityLogsByMosque(mosqueId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.mosqueId, mosqueId)).orderBy(desc(activityLogs.createdAt));
  },

  async getActivityLogsByUser(userId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt));
  },

  async getActivityLogsByMosqueAndRole(mosqueId: string, role: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(
      and(eq(activityLogs.mosqueId, mosqueId), eq(activityLogs.userRole, role))
    ).orderBy(desc(activityLogs.createdAt));
  },

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [entry] = await db.insert(activityLogs).values(log).returning();
    return entry;
  },

  // ==================== COURSES ====================
  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  },

  async getCourses(): Promise<Course[]> {
    return db.select().from(courses).orderBy(desc(courses.createdAt));
  },

  async getCoursesByMosque(mosqueId: string): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.mosqueId, mosqueId)).orderBy(desc(courses.createdAt));
  },

  async getCoursesByCreator(createdBy: string): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.createdBy, createdBy)).orderBy(desc(courses.createdAt));
  },

  async createCourse(c: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(c).returning();
    return course;
  },

  async updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined> {
    const [course] = await db.update(courses).set(data).where(eq(courses.id, id)).returning();
    return course;
  },

  async deleteCourse(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(courseStudents).where(eq(courseStudents.courseId, id));
      await tx.delete(courseTeachers).where(eq(courseTeachers.courseId, id));
      await tx.delete(certificates).where(eq(certificates.courseId, id));
      await tx.delete(courses).where(eq(courses.id, id));
    });
  },

  // ==================== COURSE STUDENTS ====================
  async getCourseStudents(courseId: string): Promise<CourseStudent[]> {
    return db.select().from(courseStudents).where(eq(courseStudents.courseId, courseId));
  },

  async createCourseStudent(cs: InsertCourseStudent): Promise<CourseStudent> {
    const [entry] = await db.insert(courseStudents).values(cs).returning();
    return entry;
  },

  async updateCourseStudent(id: string, data: Partial<InsertCourseStudent>): Promise<CourseStudent | undefined> {
    const [entry] = await db.update(courseStudents).set(data).where(eq(courseStudents.id, id)).returning();
    return entry;
  },

  async deleteCourseStudent(id: string): Promise<void> {
    await db.delete(courseStudents).where(eq(courseStudents.id, id));
  },

  // ==================== COURSE TEACHERS ====================
  async getCourseTeachers(courseId: string): Promise<CourseTeacher[]> {
    return db.select().from(courseTeachers).where(eq(courseTeachers.courseId, courseId));
  },

  async createCourseTeacher(ct: InsertCourseTeacher): Promise<CourseTeacher> {
    const [entry] = await db.insert(courseTeachers).values(ct).returning();
    return entry;
  },

  async deleteCourseTeacher(id: string): Promise<void> {
    await db.delete(courseTeachers).where(eq(courseTeachers.id, id));
  },

  // ==================== CERTIFICATES ====================
  async getCertificatesByCourse(courseId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.courseId, courseId)).orderBy(desc(certificates.createdAt));
  },

  async getCertificatesByStudent(studentId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.studentId, studentId)).orderBy(desc(certificates.createdAt));
  },

  async getCertificatesByMosque(mosqueId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.mosqueId, mosqueId)).orderBy(desc(certificates.createdAt));
  },

  async createCertificate(c: InsertCertificate): Promise<Certificate> {
    const [cert] = await db.insert(certificates).values(c).returning();
    return cert;
  },

  async deleteCertificate(id: string): Promise<void> {
    await db.delete(certificates).where(eq(certificates.id, id));
  },

  async getCertificate(id: string): Promise<Certificate | undefined> {
    const [cert] = await db.select().from(certificates).where(eq(certificates.id, id));
    return cert;
  },

  async getCertificateByNumber(certNumber: string): Promise<Certificate | undefined> {
    const [cert] = await db.select().from(certificates).where(eq(certificates.certificateNumber, certNumber));
    return cert;
  },

  async getCoursesByStudent(studentId: string): Promise<CourseStudent[]> {
    return db.select().from(courseStudents).where(eq(courseStudents.studentId, studentId));
  },

  async getCoursesByTeacher(teacherId: string): Promise<CourseTeacher[]> {
    return db.select().from(courseTeachers).where(eq(courseTeachers.teacherId, teacherId));
  },
};
