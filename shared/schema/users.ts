import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { roleEnum } from "./enums";
import { mosques } from "./mosques";

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
  isChild: boolean("is_child").notNull().default(false),
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
