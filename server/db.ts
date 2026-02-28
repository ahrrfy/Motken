import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err.message);
});

async function ensurePoolHealthy() {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
  } catch (err: any) {
    console.error("Pool health check failed, connections will be re-established:", err.message);
  }
}

setInterval(ensurePoolHealthy, 60000);

export const db = drizzle(pool, { schema });

export async function createIndexes() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_mosque_id ON users(mosque_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_teacher_id ON users(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

      CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON assignments(student_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_mosque_id ON assignments(mosque_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
      CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON assignments(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_ratings_to_user_id ON ratings(to_user_id);
      CREATE INDEX IF NOT EXISTS idx_ratings_mosque_id ON ratings(mosque_id);

      CREATE INDEX IF NOT EXISTS idx_exams_teacher_id ON exams(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_exams_mosque_id ON exams(mosque_id);

      CREATE INDEX IF NOT EXISTS idx_exam_students_exam_id ON exam_students(exam_id);
      CREATE INDEX IF NOT EXISTS idx_exam_students_student_id ON exam_students(student_id);

      CREATE INDEX IF NOT EXISTS idx_activity_logs_mosque_id ON activity_logs(mosque_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_role ON activity_logs(user_role);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

      CREATE INDEX IF NOT EXISTS idx_courses_mosque_id ON courses(mosque_id);
      CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);

      CREATE INDEX IF NOT EXISTS idx_course_students_course_id ON course_students(course_id);
      CREATE INDEX IF NOT EXISTS idx_course_students_student_id ON course_students(student_id);

      CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
      CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);

      CREATE INDEX IF NOT EXISTS idx_banned_devices_ip ON banned_devices(ip_address);
      CREATE INDEX IF NOT EXISTS idx_banned_devices_fingerprint ON banned_devices(device_fingerprint);
    `);
    console.log("Database indexes created successfully");
  } catch (err: any) {
    console.error("Error creating indexes:", err.message);
  } finally {
    client.release();
  }
}
