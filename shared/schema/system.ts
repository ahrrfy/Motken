import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { mosques } from "./mosques";
import { users } from "./users";

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

// ==================== FEEDBACK & SUGGESTIONS ====================
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
