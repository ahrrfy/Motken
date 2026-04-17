import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== OTA BUNDLES (حزم التحديث الحي) ====================
export const appBundles = pgTable("app_bundles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  version: varchar("version", { length: 32 }).notNull().unique(),
  fileKey: text("file_key").notNull(),
  checksum: varchar("checksum", { length: 128 }).notNull(),
  size: integer("size").notNull(),
  channel: varchar("channel", { length: 32 }).default("production"),
  minNativeVersion: varchar("min_native_version", { length: 32 }),
  releaseNotes: text("release_notes"),
  isActive: boolean("is_active").default(false),
  releasedBy: varchar("released_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppBundleSchema = createInsertSchema(appBundles).omit({ id: true, createdAt: true });
export type AppBundle = typeof appBundles.$inferSelect;
export type InsertAppBundle = z.infer<typeof insertAppBundleSchema>;

// ==================== OTA STATS (إحصائيات التحديث) ====================
export const otaStats = pgTable("ota_stats", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  version: varchar("version", { length: 32 }),
  action: varchar("action", { length: 32 }),
  platform: varchar("platform", { length: 16 }),
  deviceId: varchar("device_id", { length: 128 }),
  userId: varchar("user_id", { length: 36 }),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtaStatSchema = createInsertSchema(otaStats).omit({ id: true, createdAt: true });
export type OtaStat = typeof otaStats.$inferSelect;
export type InsertOtaStat = z.infer<typeof insertOtaStatSchema>;

// ==================== APP VERSIONS (إعدادات الإصدار + Force Update) ====================
export const appVersions = pgTable("app_versions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 16 }).notNull().unique(),
  latestVersion: varchar("latest_version", { length: 32 }).notNull(),
  minimumVersion: varchar("minimum_version", { length: 32 }).notNull(),
  downloadUrl: text("download_url").notNull(),
  forceUpdateMessage: text("force_update_message"),
  softUpdateMessage: text("soft_update_message"),
  blockedUserAgents: text("blocked_user_agents").array(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppVersionSchema = createInsertSchema(appVersions).omit({ id: true, updatedAt: true });
export type AppVersion = typeof appVersions.$inferSelect;
export type InsertAppVersion = z.infer<typeof insertAppVersionSchema>;
