import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum, index } from "drizzle-orm/pg-core";
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
}, (table) => [
  index("idx_mosques_status").on(table.status),
  index("idx_mosques_province").on(table.province),
  index("idx_mosques_city").on(table.city),
  index("idx_mosques_is_active").on(table.isActive),
]);

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
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
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
  pendingApproval: boolean("pending_approval").notNull().default(false),
  canPrintIds: boolean("can_print_ids").notNull().default(false),
  acceptedPrivacyPolicy: boolean("accepted_privacy_policy").notNull().default(false),
  privacyPolicyAcceptedAt: timestamp("privacy_policy_accepted_at"),
  adminNotes: text("admin_notes"),
  suspendedUntil: timestamp("suspended_until"),
  studyMode: text("study_mode").notNull().default("in-person"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_users_mosque_id").on(table.mosqueId),
  index("idx_users_teacher_id").on(table.teacherId),
  index("idx_users_role").on(table.role),
  index("idx_users_phone").on(table.phone),
  index("idx_users_is_active").on(table.isActive),
  index("idx_users_study_mode").on(table.studyMode),
]);

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_assignments_student_id").on(table.studentId),
  index("idx_assignments_teacher_id").on(table.teacherId),
  index("idx_assignments_mosque_id").on(table.mosqueId),
  index("idx_assignments_status").on(table.status),
  index("idx_assignments_scheduled_date").on(table.scheduledDate),
  index("idx_assignments_has_audio").on(table.hasAudio),
]);

export const insertAssignmentSchema = createInsertSchema(assignments).omit({ id: true, createdAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

export const assignmentAudio = pgTable("assignment_audio", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }).unique(),
  audioData: text("audio_data").notNull(),
  mimeType: text("mime_type").notNull().default("audio/webm"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_assignment_audio_assignment_id").on(table.assignmentId),
]);

export type AssignmentAudio = typeof assignmentAudio.$inferSelect;

// ==================== RATINGS ====================
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: varchar("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  stars: integer("stars").notNull(),
  honorBadge: boolean("honor_badge").notNull().default(false),
  comment: text("comment"),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_ratings_from_user_id").on(table.fromUserId),
  index("idx_ratings_to_user_id").on(table.toUserId),
  index("idx_ratings_mosque_id").on(table.mosqueId),
]);

export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, createdAt: true });
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

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
  examTime: text("exam_time").notNull(),
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

// ==================== ACTIVITY LOGS ====================
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  userRole: text("user_role"),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  module: text("module").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_activity_logs_user_id").on(table.userId),
  index("idx_activity_logs_mosque_id").on(table.mosqueId),
]);

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// ==================== NOTIFICATIONS ====================
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
  index("idx_notifications_mosque_id").on(table.mosqueId),
  index("idx_notifications_is_read").on(table.isRead),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ==================== COURSES ====================
export const courseStatusEnum = pgEnum("course_status", ["active", "completed", "cancelled"]);

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

// ==================== BANNED DEVICES ====================
export const bannedDevices = pgTable("banned_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  reason: text("reason"),
  bannedBy: varchar("banned_by").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_banned_devices_banned_by").on(table.bannedBy),
]);

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
}, (table) => [
  index("idx_attendance_student_id").on(table.studentId),
  index("idx_attendance_teacher_id").on(table.teacherId),
  index("idx_attendance_mosque_id").on(table.mosqueId),
  index("idx_attendance_date").on(table.date),
  index("idx_attendance_status").on(table.status),
]);

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
}, (table) => [
  index("idx_messages_sender_id").on(table.senderId),
  index("idx_messages_receiver_id").on(table.receiverId),
  index("idx_messages_mosque_id").on(table.mosqueId),
  index("idx_messages_is_read").on(table.isRead),
]);

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
}, (table) => [
  index("idx_points_user_id").on(table.userId),
  index("idx_points_mosque_id").on(table.mosqueId),
]);

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
}, (table) => [
  index("idx_badges_user_id").on(table.userId),
  index("idx_badges_mosque_id").on(table.mosqueId),
]);

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
}, (table) => [
  index("idx_schedules_mosque_id").on(table.mosqueId),
  index("idx_schedules_teacher_id").on(table.teacherId),
]);

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
}, (table) => [
  index("idx_competitions_mosque_id").on(table.mosqueId),
  index("idx_competitions_created_by").on(table.createdBy),
]);

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
}, (table) => [
  index("idx_competition_participants_competition_id").on(table.competitionId),
  index("idx_competition_participants_student_id").on(table.studentId),
]);

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
}, (table) => [
  index("idx_parent_reports_student_id").on(table.studentId),
  index("idx_parent_reports_mosque_id").on(table.mosqueId),
]);

export const insertParentReportSchema = createInsertSchema(parentReports).omit({ id: true, createdAt: true });
export type InsertParentReport = z.infer<typeof insertParentReportSchema>;
export type ParentReport = typeof parentReports.$inferSelect;

// ==================== EMERGENCY SUBSTITUTIONS (Crisis Management) ====================
export const emergencySubstitutions = pgTable("emergency_substitutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  absentTeacherId: varchar("absent_teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  substituteTeacherId: varchar("substitute_teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("active"),
  studentsCount: integer("students_count"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_emergency_substitutions_mosque_id").on(table.mosqueId),
  index("idx_emergency_substitutions_absent_teacher_id").on(table.absentTeacherId),
  index("idx_emergency_substitutions_substitute_teacher_id").on(table.substituteTeacherId),
  index("idx_emergency_substitutions_created_by").on(table.createdBy),
]);
export const insertEmergencySubstitutionSchema = createInsertSchema(emergencySubstitutions).omit({ id: true, createdAt: true });
export type InsertEmergencySubstitution = z.infer<typeof insertEmergencySubstitutionSchema>;
export type EmergencySubstitution = typeof emergencySubstitutions.$inferSelect;

// ==================== INCIDENT RECORDS (Crisis Management) ====================
export const incidentRecords = pgTable("incident_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  reportedBy: varchar("reported_by").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"),
  actionTaken: text("action_taken"),
  status: text("status").notNull().default("open"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_incident_records_mosque_id").on(table.mosqueId),
  index("idx_incident_records_reported_by").on(table.reportedBy),
]);
export const insertIncidentRecordSchema = createInsertSchema(incidentRecords).omit({ id: true, createdAt: true });
export type InsertIncidentRecord = z.infer<typeof insertIncidentRecordSchema>;
export type IncidentRecord = typeof incidentRecords.$inferSelect;

// ==================== GRADUATES (Graduation & Follow-up) ====================
export const graduates = pgTable("graduates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  graduationDate: timestamp("graduation_date").notNull(),
  totalJuz: integer("total_juz").notNull().default(30),
  ijazahChain: text("ijazah_chain"),
  ijazahTeacher: text("ijazah_teacher"),
  recitationStyle: text("recitation_style").default("hafs"),
  finalGrade: text("final_grade"),
  certificateId: varchar("certificate_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_graduates_student_id").on(table.studentId),
  index("idx_graduates_mosque_id").on(table.mosqueId),
]);
export const insertGraduateSchema = createInsertSchema(graduates).omit({ id: true, createdAt: true });
export type InsertGraduate = z.infer<typeof insertGraduateSchema>;
export type Graduate = typeof graduates.$inferSelect;

// ==================== GRADUATE FOLLOWUPS ====================
export const graduateFollowups = pgTable("graduate_followups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  graduateId: varchar("graduate_id").notNull().references(() => graduates.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  followupDate: timestamp("followup_date").notNull(),
  retentionLevel: text("retention_level").notNull(),
  juzReviewed: integer("juz_reviewed"),
  notes: text("notes"),
  contactedBy: varchar("contacted_by").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_graduate_followups_graduate_id").on(table.graduateId),
  index("idx_graduate_followups_mosque_id").on(table.mosqueId),
  index("idx_graduate_followups_contacted_by").on(table.contactedBy),
]);
export const insertGraduateFollowupSchema = createInsertSchema(graduateFollowups).omit({ id: true, createdAt: true });
export type InsertGraduateFollowup = z.infer<typeof insertGraduateFollowupSchema>;
export type GraduateFollowup = typeof graduateFollowups.$inferSelect;

// ==================== STUDENT TRANSFERS (Institutional Integration) ====================
export const studentTransfers = pgTable("student_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fromMosqueId: varchar("from_mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  toMosqueId: varchar("to_mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  transferData: text("transfer_data"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_student_transfers_student_id").on(table.studentId),
  index("idx_student_transfers_from_mosque_id").on(table.fromMosqueId),
  index("idx_student_transfers_to_mosque_id").on(table.toMosqueId),
  index("idx_student_transfers_approved_by").on(table.approvedBy),
]);
export const insertStudentTransferSchema = createInsertSchema(studentTransfers).omit({ id: true, createdAt: true });
export type InsertStudentTransfer = z.infer<typeof insertStudentTransferSchema>;
export type StudentTransfer = typeof studentTransfers.$inferSelect;

// ==================== FAMILY ACCOUNTS ====================
export const familyLinks = pgTable("family_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentPhone: text("parent_phone").notNull(),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull().default("parent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_family_links_student_id").on(table.studentId),
  index("idx_family_links_mosque_id").on(table.mosqueId),
]);
export const insertFamilyLinkSchema = createInsertSchema(familyLinks).omit({ id: true, createdAt: true });
export type InsertFamilyLink = z.infer<typeof insertFamilyLinkSchema>;
export type FamilyLink = typeof familyLinks.$inferSelect;

// ==================== FEEDBACK & SUGGESTIONS (Maintenance) ====================
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("suggestion"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  response: text("response"),
  respondedBy: varchar("responded_by").references(() => users.id, { onDelete: "cascade" }),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_feedback_user_id").on(table.userId),
  index("idx_feedback_mosque_id").on(table.mosqueId),
  index("idx_feedback_responded_by").on(table.respondedBy),
]);
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// ==================== TAJWEED RULES (Knowledge Management) ====================
export const tajweedRules = pgTable("tajweed_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  examples: text("examples"),
  surahReference: text("surah_reference"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertTajweedRuleSchema = createInsertSchema(tajweedRules).omit({ id: true, createdAt: true });
export type InsertTajweedRule = z.infer<typeof insertTajweedRuleSchema>;
export type TajweedRule = typeof tajweedRules.$inferSelect;

// ==================== SIMILAR VERSES (Educational Content) ====================
export const similarVerses = pgTable("similar_verses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  verse1Surah: text("verse1_surah").notNull(),
  verse1Number: integer("verse1_number").notNull(),
  verse1Text: text("verse1_text").notNull(),
  verse2Surah: text("verse2_surah").notNull(),
  verse2Number: integer("verse2_number").notNull(),
  verse2Text: text("verse2_text").notNull(),
  explanation: text("explanation"),
  difficulty: text("difficulty").notNull().default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertSimilarVerseSchema = createInsertSchema(similarVerses).omit({ id: true, createdAt: true });
export type InsertSimilarVerse = z.infer<typeof insertSimilarVerseSchema>;
export type SimilarVerse = typeof similarVerses.$inferSelect;

// ==================== MESSAGE TEMPLATES ====================
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mosqueId: varchar("mosque_id"),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({ id: true, createdAt: true });
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;

// ==================== COMMUNICATION LOG ====================
export const communicationLogs = pgTable("communication_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  contactedBy: varchar("contacted_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  subject: text("subject").notNull(),
  notes: text("notes"),
  parentPhone: text("parent_phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertCommunicationLogSchema = createInsertSchema(communicationLogs).omit({ id: true, createdAt: true });
export type InsertCommunicationLog = z.infer<typeof insertCommunicationLogSchema>;
export type CommunicationLog = typeof communicationLogs.$inferSelect;

// ==================== MOSQUE REGISTRATIONS (التزكية) ====================
export const mosqueRegistrations = pgTable("mosque_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mosqueName: text("mosque_name").notNull(),
  province: text("province").notNull(),
  city: text("city").notNull(),
  area: text("area").notNull(),
  landmark: text("landmark"),
  mosquePhone: text("mosque_phone"),
  applicantName: text("applicant_name").notNull(),
  applicantPhone: text("applicant_phone").notNull(),
  requestedUsername: text("requested_username").notNull(),
  requestedPassword: text("requested_password").notNull(),
  registrationType: text("registration_type").notNull().default("direct"),
  vouchedByUserId: varchar("vouched_by_user_id"),
  vouchedByMosqueId: varchar("vouched_by_mosque_id"),
  voucherRelationship: text("voucher_relationship"),
  vouchReason: text("vouch_reason"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_mosque_registrations_status").on(table.status),
  index("idx_mosque_registrations_requested_username").on(table.requestedUsername),
]);
export const insertMosqueRegistrationSchema = createInsertSchema(mosqueRegistrations).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertMosqueRegistration = z.infer<typeof insertMosqueRegistrationSchema>;
export type MosqueRegistration = typeof mosqueRegistrations.$inferSelect;

// ==================== QURAN PROGRESS (تقدم الحفظ) ====================
export const quranProgress = pgTable("quran_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  surahNumber: integer("surah_number").notNull(),
  verseStatuses: text("verse_statuses").notNull().default("{}"),
  notes: text("notes"),
  reviewedToday: boolean("reviewed_today").notNull().default(false),
  reviewStreak: integer("review_streak").notNull().default(0),
  lastReviewDate: text("last_review_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_quran_progress_user_surah").on(table.userId, table.surahNumber),
  index("idx_quran_progress_mosque_id").on(table.mosqueId),
]);
export const insertQuranProgressSchema = createInsertSchema(quranProgress).omit({ id: true, updatedAt: true });
export type InsertQuranProgress = z.infer<typeof insertQuranProgressSchema>;
export type QuranProgress = typeof quranProgress.$inferSelect;

// ==================== MOSQUE HISTORY (سجل أحداث المسجد) ====================
export const mosqueHistory = pgTable("mosque_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mosqueId: varchar("mosque_id").notNull().references(() => mosques.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  byUser: text("by_user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_mosque_history_mosque_id").on(table.mosqueId),
]);
export type MosqueHistory = typeof mosqueHistory.$inferSelect;

// ==================== TESTIMONIALS (آراء المستخدمين) ====================
export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  text: text("text").notNull(),
  rating: integer("rating").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true, createdAt: true });
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

// ==================== MOSQUE MESSAGES (رسائل المسجد) ====================
export const mosqueMessages = pgTable("mosque_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mosqueId: varchar("mosque_id").notNull().references(() => mosques.id, { onDelete: "cascade" }),
  fromAdmin: boolean("from_admin").notNull().default(true),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_mosque_messages_mosque_id").on(table.mosqueId),
  index("idx_mosque_messages_is_read").on(table.isRead),
]);
export type MosqueMessage = typeof mosqueMessages.$inferSelect;
