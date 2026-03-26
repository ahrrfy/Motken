import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// ==================== MOSQUE REGISTRATIONS ====================
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

// ==================== MOSQUE HISTORY ====================
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

// ==================== MOSQUE MESSAGES ====================
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

// ==================== TESTIMONIALS ====================
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
