import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("user_role", ["admin", "teacher", "student", "supervisor"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["pending", "done", "cancelled"]);
export const verseStatusEnum = pgEnum("verse_status", ["memorized", "review", "new"]);

// ==================== MOSQUES ====================
export const mosques = pgTable("mosques", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city"),
  address: text("address"),
  phone: text("phone"),
  imam: text("imam"),
  description: text("description"),
  image: text("image"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMosqueSchema = createInsertSchema(mosques).omit({ id: true, createdAt: true });
export type InsertMosque = z.infer<typeof insertMosqueSchema>;
export type Mosque = typeof mosques.$inferSelect;

// ==================== USERS ====================
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("student"),
  mosqueId: varchar("mosque_id").references(() => mosques.id),
  teacherId: varchar("teacher_id"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  avatar: text("avatar"),
  isActive: boolean("is_active").notNull().default(true),
  canPrintIds: boolean("can_print_ids").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ==================== ASSIGNMENTS ====================
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  mosqueId: varchar("mosque_id").references(() => mosques.id),
  surahName: text("surah_name").notNull(),
  fromVerse: integer("from_verse").notNull(),
  toVerse: integer("to_verse").notNull(),
  type: text("type").notNull().default("new"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: assignmentStatusEnum("status").notNull().default("pending"),
  grade: integer("grade"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({ id: true, createdAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

// ==================== RATINGS ====================
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  mosqueId: varchar("mosque_id").references(() => mosques.id),
  stars: integer("stars").notNull(),
  honorBadge: boolean("honor_badge").notNull().default(false),
  comment: text("comment"),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, createdAt: true });
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

// ==================== EXAMS ====================
export const exams = pgTable("exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  mosqueId: varchar("mosque_id").references(() => mosques.id),
  title: text("title").notNull(),
  surahName: text("surah_name").notNull(),
  fromVerse: integer("from_verse").notNull(),
  toVerse: integer("to_verse").notNull(),
  examDate: timestamp("exam_date").notNull(),
  examTime: text("exam_time").notNull(),
  description: text("description"),
  isForAll: boolean("is_for_all").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

// ==================== EXAM STUDENTS ====================
export const examStudents = pgTable("exam_students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").notNull().references(() => exams.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  grade: integer("grade"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExamStudentSchema = createInsertSchema(examStudents).omit({ id: true, createdAt: true });
export type InsertExamStudent = z.infer<typeof insertExamStudentSchema>;
export type ExamStudent = typeof examStudents.$inferSelect;

// ==================== ACTIVITY LOGS ====================
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  userName: text("user_name").notNull(),
  userRole: text("user_role"),
  mosqueId: varchar("mosque_id").references(() => mosques.id),
  action: text("action").notNull(),
  module: text("module").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// ==================== NOTIFICATIONS ====================
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  mosqueId: varchar("mosque_id").references(() => mosques.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ==================== COURSES ====================
export const courseStatusEnum = pgEnum("course_status", ["active", "completed", "cancelled"]);

export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  mosqueId: varchar("mosque_id").references(() => mosques.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: courseStatusEnum("status").notNull().default("active"),
  targetType: text("target_type").notNull().default("specific"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

// ==================== COURSE STUDENTS ====================
export const courseStudents = pgTable("course_students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  graduated: boolean("graduated").notNull().default(false),
  graduatedAt: timestamp("graduated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCourseStudentSchema = createInsertSchema(courseStudents).omit({ id: true, createdAt: true });
export type InsertCourseStudent = z.infer<typeof insertCourseStudentSchema>;
export type CourseStudent = typeof courseStudents.$inferSelect;

// ==================== COURSE TEACHERS ====================
export const courseTeachers = pgTable("course_teachers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCourseTeacherSchema = createInsertSchema(courseTeachers).omit({ id: true, createdAt: true });
export type InsertCourseTeacher = z.infer<typeof insertCourseTeacherSchema>;
export type CourseTeacher = typeof courseTeachers.$inferSelect;

// ==================== CERTIFICATES ====================
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  issuedBy: varchar("issued_by").notNull().references(() => users.id),
  mosqueId: varchar("mosque_id").references(() => mosques.id),
  certificateNumber: text("certificate_number").notNull(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, createdAt: true });
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;
