import { pool } from "./db";

const HEALTH_CHECK_INTERVAL = 60_000;
const DB_OPTIMIZE_INTERVAL = 6 * 60 * 60_000;
const SESSION_CLEANUP_INTERVAL = 30 * 60_000;
const TEMP_DATA_CLEANUP_INTERVAL = 24 * 60 * 60_000;

let healthCheckTimer: NodeJS.Timeout | null = null;
let dbOptimizeTimer: NodeJS.Timeout | null = null;
let sessionCleanupTimer: NodeJS.Timeout | null = null;
let tempCleanupTimer: NodeJS.Timeout | null = null;

export interface SystemHealthReport {
  status: "healthy" | "degraded" | "critical";
  database: boolean;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  lastCheck: string;
  autoRecoveries: number;
}

let autoRecoveryCount = 0;
let lastHealthReport: SystemHealthReport | null = null;

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT 1 as ok");
    client.release();
    return result.rows[0]?.ok === 1;
  } catch (err: unknown) {
    console.error("[Self-Healing] Database health check failed:", err.message);
    return false;
  }
}

async function attemptDatabaseRecovery(): Promise<boolean> {
  console.warn("[Self-Healing] Attempting database recovery...");
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    autoRecoveryCount++;
    console.log("[Self-Healing] Database recovery successful");
    return true;
  } catch (err: unknown) {
    console.error("[Self-Healing] Database recovery failed:", err.message);
    return false;
  }
}

async function runHealthCheck(): Promise<SystemHealthReport> {
  const dbHealthy = await checkDatabaseHealth();

  if (!dbHealthy) {
    await attemptDatabaseRecovery();
  }

  const report: SystemHealthReport = {
    status: dbHealthy ? "healthy" : "degraded",
    database: dbHealthy,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    lastCheck: new Date().toISOString(),
    autoRecoveries: autoRecoveryCount,
  };

  lastHealthReport = report;

  const memUsedMB = Math.round(report.memoryUsage.heapUsed / 1024 / 1024);
  const memTotalMB = Math.round(report.memoryUsage.heapTotal / 1024 / 1024);

  if (memUsedMB > memTotalMB * 0.95) {
    console.warn(`[Self-Healing] High memory usage: ${memUsedMB}MB / ${memTotalMB}MB`);
    if (global.gc) {
      global.gc();
      console.log("[Self-Healing] Forced garbage collection");
    }
  }

  return report;
}

async function optimizeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log("[Cron] Running database optimization...");

    await client.query("ANALYZE");

    const expiredSessions = await client.query(
      `DELETE FROM "session" WHERE expire < NOW() RETURNING sid`
    );
    if (expiredSessions.rowCount && expiredSessions.rowCount > 0) {
      console.log(`[Cron] Cleaned ${expiredSessions.rowCount} expired sessions`);
    }

    const oldLogs = await client.query(
      `DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days' RETURNING id`
    );
    if (oldLogs.rowCount && oldLogs.rowCount > 0) {
      console.log(`[Cron] Archived ${oldLogs.rowCount} old activity logs (90+ days)`);
    }

    const oldNotifications = await client.query(
      `DELETE FROM notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days' RETURNING id`
    );
    if (oldNotifications.rowCount && oldNotifications.rowCount > 0) {
      console.log(`[Cron] Cleaned ${oldNotifications.rowCount} read notifications (30+ days)`);
    }

    console.log("[Cron] Database optimization complete");
  } catch (err: unknown) {
    console.error("[Cron] Database optimization error:", err.message);
  } finally {
    client.release();
  }
}

async function cleanupExpiredSessions(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query(
      `DELETE FROM "session" WHERE expire < NOW() RETURNING sid`
    );
    client.release();
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[Cron] Session cleanup: removed ${result.rowCount} expired sessions`);
    }
  } catch (err: unknown) {
    console.error("[Cron] Session cleanup error:", err.message);
  }
}

async function cleanupTempData(): Promise<void> {
  try {
    const client = await pool.connect();

    const expiredReports = await client.query(
      `DELETE FROM parent_reports WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id`
    );
    if (expiredReports.rowCount && expiredReports.rowCount > 0) {
      console.log(`[Cron] Cleaned ${expiredReports.rowCount} expired parent reports`);
    }

    client.release();
  } catch (err: unknown) {
    console.error("[Cron] Temp data cleanup error:", err.message);
  }
}

export function startSelfHealing(): void {
  console.log("[Self-Healing] System initialized");

  healthCheckTimer = setInterval(runHealthCheck, HEALTH_CHECK_INTERVAL);

  dbOptimizeTimer = setInterval(optimizeDatabase, DB_OPTIMIZE_INTERVAL);

  sessionCleanupTimer = setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL);

  tempCleanupTimer = setInterval(cleanupTempData, TEMP_DATA_CLEANUP_INTERVAL);

  setTimeout(optimizeDatabase, 30_000);
}

export function stopSelfHealing(): void {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  if (dbOptimizeTimer) clearInterval(dbOptimizeTimer);
  if (sessionCleanupTimer) clearInterval(sessionCleanupTimer);
  if (tempCleanupTimer) clearInterval(tempCleanupTimer);
  console.log("[Self-Healing] System stopped");
}

export function getHealthReport(): SystemHealthReport | null {
  return lastHealthReport;
}

export async function getDetailedHealthReport(): Promise<SystemHealthReport> {
  return runHealthCheck();
}

let absenceAlertTimer: NodeJS.Timeout | null = null;

async function checkRepeatedAbsences(): Promise<void> {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = await pool.query(`
      SELECT a.student_id, u.name, u.mosque_id, u.teacher_id, COUNT(*) AS cnt
      FROM attendance a JOIN users u ON u.id = a.student_id
      WHERE a.status IN ('absent','غائب') AND a.date >= $1
      GROUP BY a.student_id, u.name, u.mosque_id, u.teacher_id
      HAVING COUNT(*) >= 3
    `, [threeDaysAgo]);

    for (const row of result.rows) {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const already = await pool.query(
        `SELECT id FROM notifications WHERE user_id=$1 AND title LIKE '%غياب متكرر%' AND created_at>=$2 LIMIT 1`,
        [row.teacher_id || row.mosque_id, todayStart]
      );
      if (already.rows.length) continue;

      const recipients = new Set<string>();
      if (row.teacher_id) recipients.add(row.teacher_id);
      if (row.mosque_id) {
        const sups = await pool.query(`SELECT id FROM users WHERE mosque_id=$1 AND role='supervisor'`, [row.mosque_id]);
        sups.rows.forEach((s: any) => recipients.add(s.id));
      }
      for (const rid of recipients) {
        await pool.query(
          `INSERT INTO notifications(id,user_id,mosque_id,title,message,type,is_read,created_at)
           VALUES(gen_random_uuid(),$1,$2,$3,$4,'warning',false,NOW())`,
          [rid, row.mosque_id, `غياب متكرر`, `${row.name} غاب ${row.cnt} مرات في آخر 3 أيام`]
        );
      }
    }
  } catch (err: unknown) {
    console.error("[Cron] Absence check error:", err.message);
  }
}

export function startAbsenceAlerts(): void {
  setTimeout(checkRepeatedAbsences, 10_000);
  absenceAlertTimer = setInterval(checkRepeatedAbsences, 24 * 60 * 60_000);
  console.log("[Self-Healing] Absence alert monitor started");
}

export function stopAbsenceAlerts(): void {
  if (absenceAlertTimer) clearInterval(absenceAlertTimer);
}
