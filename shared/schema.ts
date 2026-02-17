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
  province: text("province"),
  city: text("city"),
  area: text("area"),
  landmark: text("landmark"),
  address: text("address"),
  phone: text("phone"),
  managerName: text("manager_name"),
  description: text("description"),
  image: text("image"),
  status: text("status").notNull().default("active"),
  adminNotes: text("admin_notes"),
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
  phone: text("phone"),
  address: text("address"),
  gender: text("gender"),
  avatar: text("avatar"),
  age: integer("age"),
  telegramId: text("telegram_id"),
  parentPhone: text("parent_phone"),
  educationLevel: text("education_level"),
  level: integer("level"),
  teacherLevels: text("teacher_levels"),
  isSpecialNeeds: boolean("is_special_needs").notNull().default(false),
  isOrphan: boolean("is_orphan").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  canPrintIds: boolean("can_print_ids").notNull().default(false),
  acceptedPrivacyPolicy: boolean("accepted_privacy_policy").notNull().default(false),
  privacyPolicyAcceptedAt: timestamp("privacy_policy_accepted_at"),
  adminNotes: text("admin_notes"),
  suspendedUntil: timestamp("suspended_until"),
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
  seenByStudent: boolean("seen_by_student").notNull().default(false),
  seenAt: timestamp("seen_at"),
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
  category: text("category").notNull().default("memorization"),
  maxStudents: integer("max_students"),
  notes: text("notes"),
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
  graduationGrade: text("graduation_grade"),
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
  notes: text("notes"),
  graduationGrade: text("graduation_grade"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, createdAt: true });
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;

// ==================== BANNED DEVICES ====================
export const bannedDevices = pgTable("banned_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  reason: text("reason"),
  bannedBy: varchar("banned_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBannedDeviceSchema = createInsertSchema(bannedDevices).omit({ id: true, createdAt: true });
export type InsertBannedDevice = z.infer<typeof insertBannedDeviceSchema>;
export type BannedDevice = typeof bannedDevices.$inferSelect;

// ==================== FEATURE FLAGS ====================
export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  featureKey: text("feature_key").notNull().unique(),
  featureName: text("feature_name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  category: text("category").notNull().default("general"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true });
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;

// ==================== ATTENDANCE ====================
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("present"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

// ==================== MESSAGES ====================
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ==================== POINTS ====================
export const points = pgTable("points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  category: text("category").notNull().default("assignment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPointSchema = createInsertSchema(points).omit({ id: true, createdAt: true });
export type InsertPoint = z.infer<typeof insertPointSchema>;
export type Point = typeof points.$inferSelect;

// ==================== BADGES ====================
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  badgeType: text("badge_type").notNull(),
  badgeName: text("badge_name").notNull(),
  description: text("description"),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, createdAt: true });
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

// ==================== SCHEDULES ====================
export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

// ==================== COMPETITIONS ====================
export const competitions = pgTable("competitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  surahName: text("surah_name"),
  fromVerse: integer("from_verse"),
  toVerse: integer("to_verse"),
  competitionDate: timestamp("competition_date").notNull(),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompetitionSchema = createInsertSchema(competitions).omit({ id: true, createdAt: true });
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitions.$inferSelect;

// ==================== COMPETITION PARTICIPANTS ====================
export const competitionParticipants = pgTable("competition_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: varchar("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: integer("score"),
  rank: integer("rank"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompetitionParticipantSchema = createInsertSchema(competitionParticipants).omit({ id: true, createdAt: true });
export type InsertCompetitionParticipant = z.infer<typeof insertCompetitionParticipantSchema>;
export type CompetitionParticipant = typeof competitionParticipants.$inferSelect;

// ==================== PARENT REPORTS ====================
export const parentReports = pgTable("parent_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull().default("weekly"),
  content: text("content").notNull(),
  accessToken: text("access_token").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertParentReportSchema = createInsertSchema(parentReports).omit({ id: true, createdAt: true });
export type InsertParentReport = z.infer<typeof insertParentReportSchema>;
export type ParentReport = typeof parentReports.$inferSelect;
