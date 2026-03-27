import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { mosques } from "./mosques";
import { users } from "./users";

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
  gender: text("gender"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_schedules_mosque_id").on(table.mosqueId),
  index("idx_schedules_teacher_id").on(table.teacherId),
]);

export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

// ==================== EMERGENCY SUBSTITUTIONS ====================
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

// ==================== INCIDENT RECORDS ====================
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

// ==================== STUDENT TRANSFERS ====================
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
