import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { mosques } from "./mosques";
import { users } from "./users";

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
