import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { mosques } from "./mosques";
import { users } from "./users";

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

// ==================== POINT REDEMPTIONS ====================
export const pointRedemptions = pgTable("point_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mosqueId: varchar("mosque_id").references(() => mosques.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  rewardName: text("reward_name").notNull(),
  redeemedBy: varchar("redeemed_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_redemptions_student_id").on(table.studentId),
  index("idx_redemptions_mosque_id").on(table.mosqueId),
]);

export const insertPointRedemptionSchema = createInsertSchema(pointRedemptions).omit({ id: true, createdAt: true });
export type InsertPointRedemption = z.infer<typeof insertPointRedemptionSchema>;
export type PointRedemption = typeof pointRedemptions.$inferSelect;

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
  gender: text("gender"),
  scope: text("scope").notNull().default("mosque"),  // "mosque" | "inter-mosque"
  participatingMosques: text("participating_mosques"),  // JSON array of mosque IDs
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
