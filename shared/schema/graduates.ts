import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { mosques } from "./mosques";
import { users } from "./users";

// ==================== GRADUATES ====================
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
