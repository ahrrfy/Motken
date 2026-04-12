import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { assignmentStatusEnum, courseStatusEnum } from "./enums";
import { mosques } from "./mosques";
import { users } from "./users";

// ==================== ASSIGNMENTS ====================
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  surahName: text("surah_name").notNull(),
  fromVerse: integer("from_verse").notNull(),
  toVerse: integer("to_verse").notNull(),
  type: text("type").notNull().default("new"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: assignmentStatusEnum("status").notNull().default("pending"),
  grade: integer("grade"),
  notes: text("notes"),
  hasAudio: boolean("has_audio").notNull().default(false),
  audioFileName: text("audio_file_name"),
  audioUploadedAt: timestamp("audio_uploaded_at"),
  audioGradedAt: timestamp("audio_graded_at"),
  seenByStudent: boolean("seen_by_student").notNull().default(false),
  seenAt: timestamp("seen_at"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_assignments_student_id").on(table.studentId),
  index("idx_assignments_teacher_id").on(table.teacherId),
  index("idx_assignments_mosque_id").on(table.mosqueId),
  index("idx_assignments_status").on(table.status),
  index("idx_assignments_scheduled_date").on(table.scheduledDate),
  index("idx_assignments_has_audio").on(table.hasAudio),
  index("idx_assignments_is_archived").on(table.isArchived),
]);

export const insertAssignmentSchema = createInsertSchema(assignments).omit({ id: true, createdAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

// ==================== ASSIGNMENT AUDIO ====================
export const assignmentAudio = pgTable("assignment_audio", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }).unique(),
  audioData: text("audio_data"),
  audioKey: text("audio_key"),
  mimeType: text("mime_type").notNull().default("audio/webm"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_assignment_audio_assignment_id").on(table.assignmentId),
]);

export type AssignmentAudio = typeof assignmentAudio.$inferSelect;

// ==================== EXAMS ====================
export const exams = pgTable("exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  surahName: text("surah_name").notNull(),
  fromVerse: integer("from_verse").notNull(),
  toVerse: integer("to_verse").notNull(),
  examDate: timestamp("exam_date").notNull(),
  examTime: text("exam_time"),
  description: text("description"),
  isForAll: boolean("is_for_all").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_exams_teacher_id").on(table.teacherId),
  index("idx_exams_mosque_id").on(table.mosqueId),
]);

export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

// ==================== EXAM STUDENTS ====================
export const examStudents = pgTable("exam_students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  grade: integer("grade"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_exam_students_exam_id").on(table.examId),
  index("idx_exam_students_student_id").on(table.studentId),
]);

export const insertExamStudentSchema = createInsertSchema(examStudents).omit({ id: true, createdAt: true });
export type InsertExamStudent = z.infer<typeof insertExamStudentSchema>;
export type ExamStudent = typeof examStudents.$inferSelect;

// ==================== COURSES ====================
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: courseStatusEnum("status").notNull().default("active"),
  targetType: text("target_type").notNull().default("specific"),
  category: text("category").notNull().default("memorization"),
  maxStudents: integer("max_students"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_courses_mosque_id").on(table.mosqueId),
  index("idx_courses_created_by").on(table.createdBy),
]);

export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

// ==================== COURSE STUDENTS ====================
export const courseStudents = pgTable("course_students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  graduated: boolean("graduated").notNull().default(false),
  graduatedAt: timestamp("graduated_at"),
  graduationGrade: text("graduation_grade"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_course_students_course_id").on(table.courseId),
  index("idx_course_students_student_id").on(table.studentId),
]);

export const insertCourseStudentSchema = createInsertSchema(courseStudents).omit({ id: true, createdAt: true });
export type InsertCourseStudent = z.infer<typeof insertCourseStudentSchema>;
export type CourseStudent = typeof courseStudents.$inferSelect;

// ==================== COURSE TEACHERS ====================
export const courseTeachers = pgTable("course_teachers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_course_teachers_course_id").on(table.courseId),
  index("idx_course_teachers_teacher_id").on(table.teacherId),
]);

export const insertCourseTeacherSchema = createInsertSchema(courseTeachers).omit({ id: true, createdAt: true });
export type InsertCourseTeacher = z.infer<typeof insertCourseTeacherSchema>;
export type CourseTeacher = typeof courseTeachers.$inferSelect;

// ==================== CERTIFICATES ====================
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "cascade" }),
  graduateId: varchar("graduate_id"),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  issuedBy: varchar("issued_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  certificateNumber: text("certificate_number").notNull(),
  certificateType: text("certificate_type").notNull().default("course"),
  templateId: text("template_id").default("classic"),
  title: text("title"),
  notes: text("notes"),
  graduationGrade: text("graduation_grade"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_certificates_course_id").on(table.courseId),
  index("idx_certificates_student_id").on(table.studentId),
  index("idx_certificates_issued_by").on(table.issuedBy),
  index("idx_certificates_mosque_id").on(table.mosqueId),
  index("idx_certificates_certificate_number").on(table.certificateNumber),
  index("idx_certificates_certificate_type").on(table.certificateType),
]);

export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, createdAt: true });
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;
