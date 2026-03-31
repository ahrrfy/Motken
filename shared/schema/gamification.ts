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

