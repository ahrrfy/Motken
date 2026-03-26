import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["admin", "teacher", "student", "supervisor", "parent"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["pending", "done", "cancelled"]);
export const verseStatusEnum = pgEnum("verse_status", ["memorized", "review", "new"]);
export const courseStatusEnum = pgEnum("course_status", ["active", "completed", "cancelled"]);
