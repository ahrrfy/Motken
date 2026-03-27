import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { mosques } from "./mosques";
import { users } from "./users";

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

// ==================== QURAN PROGRESS ====================
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
  easeFactor: text("ease_factor").default("2.5"),
  reviewInterval: integer("review_interval").default(0),
  nextReviewDate: text("next_review_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_quran_progress_user_surah").on(table.userId, table.surahNumber),
  index("idx_quran_progress_mosque_id").on(table.mosqueId),
]);
export const insertQuranProgressSchema = createInsertSchema(quranProgress).omit({ id: true, updatedAt: true });
export type InsertQuranProgress = z.infer<typeof insertQuranProgressSchema>;
export type QuranProgress = typeof quranProgress.$inferSelect;

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
