import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== TAJWEED RULES ====================
export const tajweedRules = pgTable("tajweed_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  examples: text("examples"),
  surahReference: text("surah_reference"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertTajweedRuleSchema = createInsertSchema(tajweedRules).omit({ id: true, createdAt: true });
export type InsertTajweedRule = z.infer<typeof insertTajweedRuleSchema>;
export type TajweedRule = typeof tajweedRules.$inferSelect;

// ==================== SIMILAR VERSES ====================
export const similarVerses = pgTable("similar_verses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  verse1Surah: text("verse1_surah").notNull(),
  verse1Number: integer("verse1_number").notNull(),
  verse1Text: text("verse1_text").notNull(),
  verse2Surah: text("verse2_surah").notNull(),
  verse2Number: integer("verse2_number").notNull(),
  verse2Text: text("verse2_text").notNull(),
  explanation: text("explanation"),
  difficulty: text("difficulty").notNull().default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertSimilarVerseSchema = createInsertSchema(similarVerses).omit({ id: true, createdAt: true });
export type InsertSimilarVerse = z.infer<typeof insertSimilarVerseSchema>;
export type SimilarVerse = typeof similarVerses.$inferSelect;
