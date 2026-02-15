import {
  type User, type InsertUser,
  type Mosque, type InsertMosque,
  type Assignment, type InsertAssignment,
  type ActivityLog, type InsertActivityLog,
  type Notification, type InsertNotification,
  type Rating, type InsertRating,
  type Exam, type InsertExam,
  type ExamStudent, type InsertExamStudent,
  type Course, type InsertCourse,
  type CourseStudent, type InsertCourseStudent,
  type CourseTeacher, type InsertCourseTeacher,
  type Certificate, type InsertCertificate,
  users, mosques, assignments, activityLogs, notifications, ratings, exams, examStudents,
  courses, courseStudents, courseTeachers, certificates,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";

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

  getAssignment(id: string): Promise<Assignment | undefined>;
  getAssignments(): Promise<Assignment[]>;
  getAssignmentsByMosque(mosqueId: string): Promise<Assignment[]>;
  getAssignmentsByStudent(studentId: string): Promise<Assignment[]>;
  getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]>;
  createAssignment(a: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  updateAssignments(studentId: string, oldTeacherId: string | null, newTeacherId: string): Promise<void>;
  deleteAssignment(id: string): Promise<void>;

  getRatingsByUser(toUserId: string): Promise<Rating[]>;
  getRatingsByMosque(mosqueId: string): Promise<Rating[]>;
  createRating(r: InsertRating): Promise<Rating>;

  getExam(id: string): Promise<Exam | undefined>;
  getExamsByTeacher(teacherId: string): Promise<Exam[]>;
  getExamsByMosque(mosqueId: string): Promise<Exam[]>;
  createExam(e: InsertExam): Promise<Exam>;
  updateExam(id: string, data: Partial<InsertExam>): Promise<Exam | undefined>;
  deleteExam(id: string): Promise<void>;

  getExamStudents(examId: string): Promise<ExamStudent[]>;
  createExamStudent(es: InsertExamStudent): Promise<ExamStudent>;
  updateExamStudent(id: string, data: Partial<InsertExamStudent>): Promise<ExamStudent | undefined>;
  getExamsByStudent(studentId: string): Promise<ExamStudent[]>;

  getActivityLogs(): Promise<ActivityLog[]>;
  getActivityLogsByMosque(mosqueId: string): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: string): Promise<ActivityLog[]>;
  getActivityLogsByMosqueAndRole(mosqueId: string, role: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getNotification(id: string): Promise<Notification | undefined>;
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(n: InsertNotification): Promise<Notification>;
  updateNotification(id: string, data: Partial<InsertNotification>): Promise<Notification | undefined>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  deleteNotifications(ids: string[], userId: string): Promise<void>;

  getCourse(id: string): Promise<Course | undefined>;
  getCourses(): Promise<Course[]>;
  getCoursesByMosque(mosqueId: string): Promise<Course[]>;
  getCoursesByCreator(createdBy: string): Promise<Course[]>;
  createCourse(c: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<void>;
  getCourseStudents(courseId: string): Promise<CourseStudent[]>;
  createCourseStudent(cs: InsertCourseStudent): Promise<CourseStudent>;
  updateCourseStudent(id: string, data: Partial<InsertCourseStudent>): Promise<CourseStudent | undefined>;
  deleteCourseStudent(id: string): Promise<void>;
  getCourseTeachers(courseId: string): Promise<CourseTeacher[]>;
  createCourseTeacher(ct: InsertCourseTeacher): Promise<CourseTeacher>;
  deleteCourseTeacher(id: string): Promise<void>;
  getCertificatesByCourse(courseId: string): Promise<Certificate[]>;
  getCertificatesByStudent(studentId: string): Promise<Certificate[]>;
  getCertificatesByMosque(mosqueId: string): Promise<Certificate[]>;
  createCertificate(c: InsertCertificate): Promise<Certificate>;
  getCoursesByStudent(studentId: string): Promise<CourseStudent[]>;
  getCoursesByTeacher(teacherId: string): Promise<CourseTeacher[]>;
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

  async getAssignment(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
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

  async getRatingsByUser(toUserId: string): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.toUserId, toUserId)).orderBy(desc(ratings.createdAt));
  }

  async getRatingsByMosque(mosqueId: string): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.mosqueId, mosqueId)).orderBy(desc(ratings.createdAt));
  }

  async createRating(r: InsertRating): Promise<Rating> {
    const [rating] = await db.insert(ratings).values(r).returning();
    return rating;
  }

  async getExam(id: string): Promise<Exam | undefined> {
    const [exam] = await db.select().from(exams).where(eq(exams.id, id));
    return exam;
  }

  async getExamsByTeacher(teacherId: string): Promise<Exam[]> {
    return db.select().from(exams).where(eq(exams.teacherId, teacherId)).orderBy(desc(exams.createdAt));
  }

  async getExamsByMosque(mosqueId: string): Promise<Exam[]> {
    return db.select().from(exams).where(eq(exams.mosqueId, mosqueId)).orderBy(desc(exams.createdAt));
  }

  async createExam(e: InsertExam): Promise<Exam> {
    const [exam] = await db.insert(exams).values(e).returning();
    return exam;
  }

  async updateExam(id: string, data: Partial<InsertExam>): Promise<Exam | undefined> {
    const [exam] = await db.update(exams).set(data).where(eq(exams.id, id)).returning();
    return exam;
  }

  async deleteExam(id: string): Promise<void> {
    await db.delete(examStudents).where(eq(examStudents.examId, id));
    await db.delete(exams).where(eq(exams.id, id));
  }

  async getExamStudents(examId: string): Promise<ExamStudent[]> {
    return db.select().from(examStudents).where(eq(examStudents.examId, examId)).orderBy(desc(examStudents.createdAt));
  }

  async createExamStudent(es: InsertExamStudent): Promise<ExamStudent> {
    const [entry] = await db.insert(examStudents).values(es).returning();
    return entry;
  }

  async updateExamStudent(id: string, data: Partial<InsertExamStudent>): Promise<ExamStudent | undefined> {
    const [entry] = await db.update(examStudents).set(data).where(eq(examStudents.id, id)).returning();
    return entry;
  }

  async getExamsByStudent(studentId: string): Promise<ExamStudent[]> {
    return db.select().from(examStudents).where(eq(examStudents.studentId, studentId)).orderBy(desc(examStudents.createdAt));
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByMosque(mosqueId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.mosqueId, mosqueId)).orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByUser(userId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByMosqueAndRole(mosqueId: string, role: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(
      and(eq(activityLogs.mosqueId, mosqueId), eq(activityLogs.userRole, role))
    ).orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [entry] = await db.insert(activityLogs).values(log).returning();
    return entry;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notif;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(n: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(n).returning();
    return notif;
  }

  async updateNotification(id: string, data: Partial<InsertNotification>): Promise<Notification | undefined> {
    const [notif] = await db.update(notifications).set(data).where(eq(notifications.id, id)).returning();
    return notif;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async deleteNotifications(ids: string[], userId: string): Promise<void> {
    for (const id of ids) {
      await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    }
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCourses(): Promise<Course[]> {
    return db.select().from(courses).orderBy(desc(courses.createdAt));
  }

  async getCoursesByMosque(mosqueId: string): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.mosqueId, mosqueId)).orderBy(desc(courses.createdAt));
  }

  async getCoursesByCreator(createdBy: string): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.createdBy, createdBy)).orderBy(desc(courses.createdAt));
  }

  async createCourse(c: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(c).returning();
    return course;
  }

  async updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined> {
    const [course] = await db.update(courses).set(data).where(eq(courses.id, id)).returning();
    return course;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courseStudents).where(eq(courseStudents.courseId, id));
    await db.delete(courseTeachers).where(eq(courseTeachers.courseId, id));
    await db.delete(certificates).where(eq(certificates.courseId, id));
    await db.delete(courses).where(eq(courses.id, id));
  }

  async getCourseStudents(courseId: string): Promise<CourseStudent[]> {
    return db.select().from(courseStudents).where(eq(courseStudents.courseId, courseId));
  }

  async createCourseStudent(cs: InsertCourseStudent): Promise<CourseStudent> {
    const [entry] = await db.insert(courseStudents).values(cs).returning();
    return entry;
  }

  async updateCourseStudent(id: string, data: Partial<InsertCourseStudent>): Promise<CourseStudent | undefined> {
    const [entry] = await db.update(courseStudents).set(data).where(eq(courseStudents.id, id)).returning();
    return entry;
  }

  async deleteCourseStudent(id: string): Promise<void> {
    await db.delete(courseStudents).where(eq(courseStudents.id, id));
  }

  async getCourseTeachers(courseId: string): Promise<CourseTeacher[]> {
    return db.select().from(courseTeachers).where(eq(courseTeachers.courseId, courseId));
  }

  async createCourseTeacher(ct: InsertCourseTeacher): Promise<CourseTeacher> {
    const [entry] = await db.insert(courseTeachers).values(ct).returning();
    return entry;
  }

  async deleteCourseTeacher(id: string): Promise<void> {
    await db.delete(courseTeachers).where(eq(courseTeachers.id, id));
  }

  async getCertificatesByCourse(courseId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.courseId, courseId)).orderBy(desc(certificates.createdAt));
  }

  async getCertificatesByStudent(studentId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.studentId, studentId)).orderBy(desc(certificates.createdAt));
  }

  async getCertificatesByMosque(mosqueId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.mosqueId, mosqueId)).orderBy(desc(certificates.createdAt));
  }

  async createCertificate(c: InsertCertificate): Promise<Certificate> {
    const [cert] = await db.insert(certificates).values(c).returning();
    return cert;
  }

  async getCoursesByStudent(studentId: string): Promise<CourseStudent[]> {
    return db.select().from(courseStudents).where(eq(courseStudents.studentId, studentId));
  }

  async getCoursesByTeacher(teacherId: string): Promise<CourseTeacher[]> {
    return db.select().from(courseTeachers).where(eq(courseTeachers.teacherId, teacherId));
  }
}

export const storage = new DatabaseStorage();
