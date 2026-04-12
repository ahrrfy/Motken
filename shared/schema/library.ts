import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { mosques } from "./mosques";

// ==================== LIBRARY SECTIONS (أقسام المكتبة) ====================
export const librarySections = pgTable("library_sections", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  mosqueId: varchar("mosque_id", { length: 36 }).references(() => mosques.id),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: integer("sort_order").default(0),
  createdBy: varchar("created_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLibrarySectionSchema = createInsertSchema(librarySections).omit({ id: true, createdAt: true });
export type LibrarySection = typeof librarySections.$inferSelect;
export type InsertLibrarySection = z.infer<typeof insertLibrarySectionSchema>;

// ==================== LIBRARY BRANCHES (أفرع المكتبة) ====================
export const libraryBranches = pgTable("library_branches", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id", { length: 36 }).notNull().references(() => librarySections.id),
  mosqueId: varchar("mosque_id", { length: 36 }).references(() => mosques.id),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdBy: varchar("created_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_library_branches_section").on(table.sectionId),
]);

export const insertLibraryBranchSchema = createInsertSchema(libraryBranches).omit({ id: true, createdAt: true });
export type LibraryBranch = typeof libraryBranches.$inferSelect;
export type InsertLibraryBranch = z.infer<typeof insertLibraryBranchSchema>;

// ==================== LIBRARY BOOKS (كتب المكتبة) ====================
export const libraryBooks = pgTable("library_books", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id", { length: 36 }).notNull().references(() => librarySections.id),
  branchId: varchar("branch_id", { length: 36 }).references(() => libraryBranches.id),
  mosqueId: varchar("mosque_id", { length: 36 }).references(() => mosques.id),
  title: text("title").notNull(),
  author: text("author"),
  description: text("description"),
  pages: integer("pages"),
  url: text("url"),
  pdfStorageKey: text("pdf_storage_key"),
  isPdf: boolean("is_pdf").default(false),
  featured: boolean("featured").default(false),
  coverImage: text("cover_image"),
  createdBy: varchar("created_by", { length: 36 }),
  addedByRole: text("added_by_role"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_library_books_section").on(table.sectionId),
  index("idx_library_books_branch").on(table.branchId),
]);

export const insertLibraryBookSchema = createInsertSchema(libraryBooks).omit({ id: true, createdAt: true });
export type LibraryBook = typeof libraryBooks.$inferSelect;
export type InsertLibraryBook = z.infer<typeof insertLibraryBookSchema>;
