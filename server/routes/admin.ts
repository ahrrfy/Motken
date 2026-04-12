import type { Express } from "express";
import { requireAuth, requireRole, hashPassword } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import {
  mosques,
  users,
  assignments,
  attendance,
  courses,
  courseStudents,
  courseTeachers,
  certificates,
  notifications,
  messages,
  activityLogs,
  ratings,
  points,
  badges,
  schedules,
  parentReports,
  exams,
  examStudents,
  featureFlags,
  bannedDevices,
  quranProgress,
  mosqueRegistrations,
  graduates,
  familyLinks,
  emergencySubstitutions,
  studentTransfers,
  feedback,
  graduateFollowups,
  messageTemplates,
  mosqueMessages,
  incidentRecords,
  testimonials,
  assignmentAudio,
  pointRedemptions,
  mosqueHistory,
  communicationLogs,
  announcements,
} from "@shared/schema";
import { sessionTracker } from "../session-tracker";
import { logActivity } from "./shared";
import { allFeatureDefaults } from "./feature-defaults";
import { sendError } from "../error-handler";
import { toSafeUser, toSafeUsers } from "../services/user-service";

export function registerAdminRoutes(app: Express) {
  // Seed endpoint removed for security — use `npx tsx script/seed.ts` instead
  app.post("/api/seed", (_req, res) => {
    res.status(410).json({ message: "تم إلغاء هذا المسار. استخدم: npx tsx script/seed.ts" });
  });

  app.get("/api/verify-user/:id", requireAuth, async (req, res) => {
    try {
      let user;
      const idParam = req.params.id.trim();
      const mtqMatch = idParam.match(/^MTQ-\d{4}-([A-Za-z0-9]{4})$/i);
      if (mtqMatch) {
        const last4 = mtqMatch[1].toUpperCase();
        const allUsers = await storage.getUsers();
        user = allUsers.find((u) => {
          const uLast4 = u.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
          return uLast4 === last4;
        });
      } else {
        user = await storage.getUser(idParam);
      }
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      const currentUser = req.user!;
      if (currentUser.role !== "admin" && user.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      let mosqueName = "";
      if (user.mosqueId) {
        const mosque = await storage.getMosque(user.mosqueId);
        mosqueName = mosque?.name || "";
      }
      res.json({ ...toSafeUser(user), mosqueName });
    } catch (err: unknown) {
      sendError(res, err, "التحقق من المستخدم");
    }
  });

  app.post("/api/system/reset", requireRole("admin"), async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || typeof password !== "string") {
        return res.status(400).json({ message: "كلمة المرور مطلوبة" });
      }
      const admin = await storage.getUser(req.user!.id);
      if (!admin) return res.status(404).json({ message: "المستخدم غير موجود" });

      const { comparePasswords } = await import("../auth");
      const valid = await comparePasswords(password, admin.password);
      if (!valid) {
        return res.status(403).json({ message: "كلمة المرور غير صحيحة" });
      }

      await storage.resetSystemData();
      await logActivity(req.user!, "تصفير النظام بالكامل", "system", "تم مسح جميع بيانات المساجد والمستخدمين");
      res.json({ message: "تم تصفير النظام بنجاح" });
    } catch (err: unknown) {
      sendError(res, err, "تصفير النظام");
    }
  });

  app.get("/api/system/backup/stats", requireRole("admin"), async (req, res) => {
    try {
      const { sql } = await import("drizzle-orm");
      const [
        mosquesCount, usersCount, assignmentsCount, attendanceCount,
        coursesCount, certificatesCount, examsCount
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(mosques),
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(assignments),
        db.select({ count: sql<number>`count(*)` }).from(attendance),
        db.select({ count: sql<number>`count(*)` }).from(courses),
        db.select({ count: sql<number>`count(*)` }).from(certificates),
        db.select({ count: sql<number>`count(*)` }).from(exams),
      ]);

      const usersByRole = await db.select({
        role: users.role,
        count: sql<number>`count(*)`,
      }).from(users).groupBy(users.role);

      const roleMap: Record<string, number> = {};
      usersByRole.forEach(r => { roleMap[r.role] = Number(r.count); });

      const lastBackupLog = await db.select()
        .from(activityLogs)
        .where(sql`${activityLogs.action} = 'إنشاء نسخة احتياطية'`)
        .orderBy(sql`${activityLogs.createdAt} DESC`)
        .limit(1);

      res.json({
        mosques: Number(mosquesCount[0]?.count || 0),
        supervisors: roleMap["supervisor"] || 0,
        teachers: roleMap["teacher"] || 0,
        students: roleMap["student"] || 0,
        assignments: Number(assignmentsCount[0]?.count || 0),
        attendance: Number(attendanceCount[0]?.count || 0),
        courses: Number(coursesCount[0]?.count || 0),
        certificates: Number(certificatesCount[0]?.count || 0),
        exams: Number(examsCount[0]?.count || 0),
        totalUsers: Number(usersCount[0]?.count || 0),
        lastBackupDate: lastBackupLog[0]?.createdAt || null,
      });
    } catch (err: unknown) {
      sendError(res, err, "جلب إحصائيات النسخ الاحتياطي");
    }
  });

  app.get("/api/system/backup", requireRole("admin"), async (req, res) => {
    try {
      // Sequential table loading — prevents connection pool exhaustion and memory spikes
      const tables: [string, any][] = [
        ["mosques", mosques], ["users", users], ["assignments", assignments],
        ["attendance", attendance], ["courses", courses], ["courseStudents", courseStudents],
        ["courseTeachers", courseTeachers], ["certificates", certificates],
        ["notifications", notifications], ["messages", messages],
        ["activityLogs", activityLogs], ["ratings", ratings],
        ["points", points], ["badges", badges],
        ["schedules", schedules], ["parentReports", parentReports],
        ["exams", exams], ["examStudents", examStudents],
        ["featureFlags", featureFlags], ["bannedDevices", bannedDevices],
        ["quranProgress", quranProgress], ["mosqueRegistrations", mosqueRegistrations],
        ["graduates", graduates], ["familyLinks", familyLinks],
        ["emergencySubstitutions", emergencySubstitutions], ["studentTransfers", studentTransfers],
        ["feedback", feedback], ["graduateFollowups", graduateFollowups],
        ["messageTemplates", messageTemplates], ["mosqueMessages", mosqueMessages],
        ["incidentRecords", incidentRecords], ["testimonials", testimonials],
        ["assignmentAudio", assignmentAudio], ["pointRedemptions", pointRedemptions],
        ["mosqueHistory", mosqueHistory], ["communicationLogs", communicationLogs],
        ["announcements", announcements],
      ];

      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Disposition", `attachment; filename="mutqin_backup_${dateStr}.json"`);
      res.setHeader("Content-Type", "application/json");

      // Stream JSON — write metadata first, then tables sequentially
      let totalRecords = 0;
      const allData: Record<string, unknown[]> = {};

      for (const [name, table] of tables) {
        const rows = await db.select().from(table);
        if (name === "users") {
          allData[name] = toSafeUsers(rows);
        } else {
          allData[name] = rows;
        }
        totalRecords += rows.length;
      }

      const backup = {
        metadata: {
          version: "2.0",
          timestamp: new Date().toISOString(),
          tableCount: tables.length,
          totalRecords,
        },
        data: allData,
      };

      await logActivity(req.user!, "إنشاء نسخة احتياطية", "system", `تم تصدير ${totalRecords} سجل`);
      res.json(backup);
    } catch (err: unknown) {
      sendError(res, err, "إنشاء النسخة الاحتياطية");
    }
  });

  app.post("/api/system/backup/validate", requireRole("admin"), async (req, res) => {
    try {
      const { metadata, data } = req.body;
      const errors: string[] = [];

      if (!metadata || !data) {
        return res.json({ valid: false, summary: null, errors: ["ملف النسخة الاحتياطية غير صالح: البيانات الوصفية أو البيانات مفقودة"] });
      }

      if (!metadata.version || !metadata.timestamp) {
        errors.push("البيانات الوصفية غير مكتملة");
      }

      // ديناميكي: نقرأ كل الجداول الموجودة في النسخة الاحتياطية
      const details: { tableName: string; count: number }[] = [];
      let totalRecords = 0;

      for (const table of Object.keys(data)) {
        if (!Array.isArray(data[table])) {
          errors.push(`الجدول ${table} ليس مصفوفة`);
          details.push({ tableName: table, count: 0 });
        } else {
          details.push({ tableName: table, count: data[table].length });
          totalRecords += data[table].length;
        }
      }

      if (data.users && Array.isArray(data.users)) {
        for (const user of data.users) {
          if (!user.username || !user.name) {
            errors.push("بعض سجلات المستخدمين تفتقد حقول مطلوبة (username, name)");
            break;
          }
        }
      }

      if (data.mosques && Array.isArray(data.mosques)) {
        for (const mosque of data.mosques) {
          if (!mosque.name) {
            errors.push("بعض سجلات المساجد تفتقد حقل الاسم");
            break;
          }
        }
      }

      res.json({
        valid: errors.length === 0,
        summary: {
          tables: details.filter(d => d.count > 0).length,
          totalRecords,
          details,
        },
        errors,
      });
    } catch (err: unknown) {
      sendError(res, err, "التحقق من النسخة الاحتياطية");
    }
  });

  app.post("/api/system/backup/restore", requireRole("admin"), async (req, res) => {
    try {
      const { password, backup } = req.body;
      if (!password || typeof password !== "string") {
        return res.status(400).json({ message: "كلمة المرور مطلوبة" });
      }
      const admin = await storage.getUser(req.user!.id);
      if (!admin) return res.status(404).json({ message: "المستخدم غير موجود" });

      const { comparePasswords } = await import("../auth");
      const valid = await comparePasswords(password, admin.password);
      if (!valid) {
        return res.status(403).json({ message: "كلمة المرور غير صحيحة" });
      }

      if (!backup || !backup.data) {
        return res.status(400).json({ message: "بيانات النسخة الاحتياطية مفقودة" });
      }

      const { data } = backup;

      // تحقق من أدوار المستخدمين
      if (data.users?.length) {
        const validRoles = ["admin", "supervisor", "teacher", "student", "parent"];
        for (const u of data.users) {
          if (u.role && !validRoles.includes(u.role)) {
            return res.status(400).json({ message: `دور غير صالح في بيانات المستخدمين: ${u.role}` });
          }
        }
        const hasAnyAdmin = data.users.some((u: any) => u.role === "admin");
        if (!hasAnyAdmin) {
          return res.status(400).json({ message: "النسخة الاحتياطية يجب أن تحتوي على حساب مدير واحد على الأقل" });
        }
      }

      const { pool } = await import("../db");
      const { hashPassword } = await import("../auth");
      const client = await pool.connect();

      // دالة تحويل camelCase إلى snake_case
      const toSnake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase();

      try {
        await client.query("BEGIN");

        // === 1. جلب كل الجداول الموجودة حالياً في قاعدة البيانات ===
        const { rows: dbTablesRows } = await client.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );
        const existingDbTables = new Set(dbTablesRows.map((r: any) => r.table_name));

        // === 2. تحديد الجداول في النسخة الاحتياطية وتحويل أسمائها ===
        const backupKeys = Object.keys(data).filter(k => Array.isArray(data[k]) && data[k].length > 0);
        const tableMapping: { dataKey: string; dbTable: string }[] = backupKeys.map(k => ({
          dataKey: k,
          dbTable: toSnake(k),
        }));

        // === 3. إنشاء الجداول الناقصة تلقائياً ===
        for (const { dataKey, dbTable } of tableMapping) {
          if (!existingDbTables.has(dbTable)) {
            // جمع كل أسماء الأعمدة من كل السجلات
            const allCols = new Set<string>();
            for (const row of data[dataKey]) {
              for (const key of Object.keys(row)) {
                allCols.add(key);
              }
            }
            // تحديد نوع كل عمود من القيم
            const colDefs: string[] = [];
            for (const col of allCols) {
              const snakeCol = toSnake(col);
              // استنتاج النوع من أول قيمة غير فارغة
              let pgType = "text";
              for (const row of data[dataKey]) {
                const val = row[col];
                if (val !== undefined && val !== null) {
                  if (typeof val === "boolean") {
                    pgType = "boolean";
                  } else if (typeof val === "number") {
                    pgType = Number.isInteger(val) ? "integer" : "double precision";
                  } else if (typeof val === "object") {
                    pgType = "jsonb";
                  }
                  break;
                }
              }
              if (snakeCol === "id") {
                colDefs.push(`"id" text PRIMARY KEY`);
              } else {
                colDefs.push(`"${snakeCol}" ${pgType}`);
              }
            }
            await client.query(`CREATE TABLE IF NOT EXISTS "${dbTable}" (${colDefs.join(", ")})`);
            existingDbTables.add(dbTable);
            console.log(`[Restore] تم إنشاء جدول جديد: ${dbTable}`);
          }
        }

        // === 4. حذف البيانات ديناميكياً (الجداول الفرعية أولاً، ثم users، ثم mosques) ===
        const protectedTables = ["users", "mosques"];
        const tablesToDelete = tableMapping
          .map(t => t.dbTable)
          .filter(t => !protectedTables.includes(t) && existingDbTables.has(t));
        for (const table of tablesToDelete) {
          await client.query(`DELETE FROM "${table}" WHERE TRUE`).catch(() => {});
        }
        // حذف الجداول المحمية بالترتيب الصحيح
        if (existingDbTables.has("users")) {
          await client.query(`DELETE FROM "users" WHERE TRUE`).catch(() => {});
        }
        if (existingDbTables.has("mosques")) {
          await client.query(`DELETE FROM "mosques" WHERE TRUE`).catch(() => {});
        }

        // === 5. إدخال البيانات ===
        const defaultPasswordHash = await hashPassword("123456");

        // دالة إدخال عامة
        const insertRows = async (dbTable: string, rows: any[], processRow?: (row: any) => void) => {
          for (const row of rows) {
            try {
              if (processRow) processRow(row);
              const cols = Object.keys(row).filter(k => row[k] !== undefined);
              if (cols.length === 0) continue;
              const vals = cols.map(k => row[k]);
              const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
              const colNames = cols.map(k => `"${toSnake(k)}"`).join(", ");
              await client.query(
                `INSERT INTO "${dbTable}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                vals
              );
            } catch (insertErr: any) {
              console.warn(`[Restore] تخطي سجل في ${dbTable}: ${insertErr.message}`);
            }
          }
        };

        // إدخال المساجد أولاً (لأن الجداول الأخرى تعتمد عليها)
        if (data.mosques?.length) {
          await insertRows("mosques", data.mosques);
        }

        // إدخال المستخدمين (مع معالجة كلمة المرور)
        if (data.users?.length) {
          await insertRows("users", data.users, (row) => {
            if (!row.password) row.password = defaultPasswordHash;
          });
        }

        // إدخال بقية الجداول
        for (const { dataKey, dbTable } of tableMapping) {
          if (dataKey === "mosques" || dataKey === "users") continue;
          if (!existingDbTables.has(dbTable)) continue;
          await insertRows(dbTable, data[dataKey]);
        }

        await client.query("COMMIT");
        res.json({ message: "تم استعادة النسخة الاحتياطية بنجاح" });
      } catch (err: unknown) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err: unknown) {
      sendError(res, err, "استعادة النسخة الاحتياطية");
    }
  });


  // ==================== ONLINE USERS & SESSION MANAGEMENT ====================
  app.get("/api/admin/sessions", requireRole("admin"), async (req, res) => {
    const sessions = sessionTracker.getActiveSessions();
    res.json(sessions);
  });

  app.get("/api/admin/online-count", requireAuth, async (req, res) => {
    if (req.user!.role !== "admin") {
      return res.json({ count: 0 });
    }
    res.json({ count: sessionTracker.getOnlineCount() });
  });

  app.post("/api/admin/kick-session", requireRole("admin"), async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "معرف الجلسة مطلوب" });
    const session = sessionTracker.getSession(sessionId);
    if (session && session.role === "admin") {
      return res.status(403).json({ message: "لا يمكن التحكم بحساب مدير النظام" });
    }
    sessionTracker.removeSession(sessionId);
    res.json({ message: "تم إنهاء الجلسة" });
  });

  app.post("/api/admin/kick-user", requireRole("admin"), async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "معرف المستخدم مطلوب" });
    const targetUser = await storage.getUser(userId);
    if (targetUser && targetUser.role === "admin") {
      return res.status(403).json({ message: "لا يمكن التحكم بحساب مدير النظام" });
    }
    sessionTracker.removeSessionsByUserId(userId);
    res.json({ message: "تم إنهاء جميع جلسات المستخدم" });
  });

  app.post("/api/admin/suspend-user", requireRole("admin"), async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "معرف المستخدم مطلوب" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (user.role === "admin") return res.status(403).json({ message: "لا يمكن التحكم بحساب مدير النظام" });
    await storage.updateUser(userId, { isActive: false });
    sessionTracker.removeSessionsByUserId(userId);
    await logActivity(req.user!, `إيقاف حساب ${user.name} مؤقتاً`, "users");
    res.json({ message: "تم إيقاف الحساب مؤقتاً" });
  });

  app.post("/api/admin/activate-user", requireRole("admin"), async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "معرف المستخدم مطلوب" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    await storage.updateUser(userId, { isActive: true });
    await logActivity(req.user!, `تفعيل حساب ${user.name}`, "users");
    res.json({ message: "تم تفعيل الحساب" });
  });

  app.post("/api/admin/ban-permanent", requireRole("admin"), async (req, res) => {
    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ message: "معرف المستخدم مطلوب" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (user.role === "admin") return res.status(403).json({ message: "لا يمكن التحكم بحساب مدير النظام" });

    const userSessions = sessionTracker.getSessionsByUserId(userId);
    const bannedIPs = new Set<string>();
    
    for (const session of userSessions) {
      if (session.ipAddress && session.ipAddress !== "unknown" && !bannedIPs.has(session.ipAddress)) {
        bannedIPs.add(session.ipAddress);
        await storage.createBannedDevice({
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          deviceFingerprint: null,
          reason: reason || `حظر دائم للمستخدم ${user.name}`,
          bannedBy: req.user!.id,
        });
      }
    }

    await storage.updateUser(userId, { isActive: false });
    sessionTracker.removeSessionsByUserId(userId);
    await logActivity(req.user!, `حظر دائم: ${user.name} (${bannedIPs.size} عناوين IP)`, "security", reason);
    res.json({ message: `تم حظر المستخدم نهائياً وحظر ${bannedIPs.size} عناوين IP` });
  });


  // ==================== BANNED DEVICES MANAGEMENT ====================
  app.get("/api/admin/banned-devices", requireRole("admin"), async (req, res) => {
    try {
      const devices = await storage.getBannedDevices();
      res.json(devices);
    } catch (err: unknown) {
      sendError(res, err, "جلب الأجهزة المحظورة");
    }
  });

  app.post("/api/admin/ban-ip", requireRole("admin"), async (req, res) => {
    try {
      const { ipAddress, reason } = req.body;
      if (!ipAddress || typeof ipAddress !== "string" || ipAddress.length > 45) {
        return res.status(400).json({ message: "عنوان IP غير صالح" });
      }
      if (reason && (typeof reason !== "string" || reason.length > 500)) {
        return res.status(400).json({ message: "السبب يجب ألا يتجاوز 500 حرف" });
      }
      const banned = await storage.createBannedDevice({
        ipAddress,
        userAgent: null,
        deviceFingerprint: null,
        reason: reason || "حظر يدوي",
        bannedBy: req.user!.id,
      });
      await logActivity(req.user!, `حظر عنوان IP: ${ipAddress}`, "security", reason);
      res.status(201).json(banned);
    } catch (err: unknown) {
      sendError(res, err, "حظر عنوان IP");
    }
  });

  app.delete("/api/admin/banned-devices/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteBannedDevice(req.params.id);
      await logActivity(req.user!, `إزالة حظر جهاز`, "security");
      res.json({ message: "تم إزالة الحظر" });
    } catch (err: unknown) {
      sendError(res, err, "إزالة حظر جهاز");
    }
  });


  // ==================== FEATURE FLAGS ====================
  app.get("/api/feature-flags", requireRole("admin"), async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      res.json(flags);
    } catch (err: unknown) {
      sendError(res, err, "جلب إعدادات الميزات");
    }
  });

  app.patch("/api/feature-flags/:id", requireRole("admin"), async (req, res) => {
    try {
      const { isEnabled } = req.body;
      if (typeof isEnabled !== "boolean") {
        return res.status(400).json({ message: "قيمة التفعيل مطلوبة" });
      }
      const updated = await storage.updateFeatureFlag(req.params.id, { isEnabled, updatedAt: new Date() });
      if (!updated) return res.status(404).json({ message: "الميزة غير موجودة" });
      await logActivity(req.user!, `${isEnabled ? "تفعيل" : "تعطيل"} ميزة: ${updated.featureName}`, "feature_flags");
      res.json(updated);
    } catch (err: unknown) {
      sendError(res, err, "تحديث إعداد الميزة");
    }
  });

  app.get("/api/features/check/:key", requireAuth, async (req, res) => {
    try {
      const enabled = await storage.isFeatureEnabled(req.params.key);
      res.json({ enabled });
    } catch (err: unknown) {
      sendError(res, err, "التحقق من حالة الميزة");
    }
  });

  app.get("/api/features/enabled", requireAuth, async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      const enabled = flags.filter(f => f.isEnabled).map(f => f.featureKey);
      res.json({ enabled });
    } catch (err: unknown) {
      sendError(res, err, "جلب الميزات المفعّلة");
    }
  });

  app.post("/api/feature-flags/seed", requireRole("admin"), async (req, res) => {
    try {
      const existing = await storage.getFeatureFlags();
      const existingKeys = new Set(existing.map(f => f.featureKey));
      const newFlags = allFeatureDefaults.filter(f => !existingKeys.has(f.featureKey));
      if (newFlags.length === 0) {
        return res.status(400).json({ message: "جميع الميزات موجودة مسبقاً" });
      }
      const created = [];
      for (const flag of newFlags) {
        const f = await storage.createFeatureFlag(flag);
        created.push(f);
      }
      await logActivity(req.user!, `إضافة ${newFlags.length} ميزة جديدة`, "feature_flags");
      res.status(201).json(created);
    } catch (err: unknown) {
      sendError(res, err, "إنشاء الميزات الافتراضية");
    }
  });

  // ==================== AUDIT LOG (Admin Only) ====================
  app.get("/api/admin/audit-log", requireRole("admin"), async (req, res) => {
    try {
      const { userId, action, module, from, to } = req.query;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const offset = (page - 1) * limit;

      let conditions = [];
      let params: (string | Date)[] = [];
      let paramIdx = 1;

      if (userId) { conditions.push(`user_id = $${paramIdx++}`); params.push(userId as string); }
      if (action) { conditions.push(`action ILIKE $${paramIdx++}`); params.push(`%${action}%`); }
      if (module) { conditions.push(`module = $${paramIdx++}`); params.push(module as string); }
      if (from) { conditions.push(`created_at >= $${paramIdx++}`); params.push(new Date(from as string)); }
      if (to) { conditions.push(`created_at <= $${paramIdx++}`); params.push(new Date(to as string)); }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const { pool: dbPool } = await import("../db");
      const [countResult, dataResult] = await Promise.all([
        dbPool.query(`SELECT COUNT(*)::int AS total FROM activity_logs ${whereClause}`, params),
        dbPool.query(
          `SELECT * FROM activity_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
          [...params, limit, offset]
        ),
      ]);

      res.json({
        logs: dataResult.rows,
        pagination: {
          page, limit,
          total: countResult.rows[0]?.total || 0,
          totalPages: Math.ceil((countResult.rows[0]?.total || 0) / limit),
        },
      });
    } catch (err: unknown) {
      sendError(res, err, "جلب سجل التدقيق");
    }
  });

  // ==================== SYSTEM OVERVIEW (Admin Only) ====================
  app.get("/api/admin/system-overview", requireRole("admin"), async (req, res) => {
    try {
      const { pool: dbPool } = await import("../db");

      const [userStats, mosqueStats, assignmentStats, recentActivity, topTeachers, topStudents, dbSize] = await Promise.all([
        dbPool.query(`
          SELECT role, COUNT(*)::int AS count, COUNT(CASE WHEN is_active THEN 1 END)::int AS active
          FROM users GROUP BY role ORDER BY count DESC
        `),
        dbPool.query(`
          SELECT COUNT(*)::int AS total,
            COUNT(CASE WHEN is_active THEN 1 END)::int AS active
          FROM mosques
        `),
        dbPool.query(`
          SELECT COUNT(*)::int AS total,
            COUNT(CASE WHEN status='done' THEN 1 END)::int AS completed,
            COUNT(CASE WHEN status='pending' THEN 1 END)::int AS pending
          FROM assignments
        `),
        dbPool.query(`
          SELECT user_name, action, module, created_at
          FROM activity_logs ORDER BY created_at DESC LIMIT 10
        `),
        dbPool.query(`
          SELECT u.id, u.name, u.username, COUNT(DISTINCT a.id)::int AS assignment_count
          FROM users u
          LEFT JOIN assignments a ON u.id = a.teacher_id AND a.created_at >= NOW() - INTERVAL '30 days'
          WHERE u.role = 'teacher' AND u.is_active = true
          GROUP BY u.id, u.name, u.username
          ORDER BY assignment_count DESC LIMIT 10
        `),
        dbPool.query(`
          SELECT u.id, u.name, u.username, COALESCE(SUM(p.amount), 0)::int AS total_points
          FROM users u
          LEFT JOIN points p ON u.id = p.user_id
          WHERE u.role = 'student' AND u.is_active = true
          GROUP BY u.id, u.name, u.username
          ORDER BY total_points DESC LIMIT 10
        `),
        dbPool.query(`SELECT pg_database_size(current_database()) AS size`),
      ]);

      const memUsage = process.memoryUsage();
      res.json({
        users: {
          byRole: userStats.rows,
          total: userStats.rows.reduce((s: number, r: { count: number }) => s + r.count, 0),
        },
        mosques: mosqueStats.rows[0],
        assignments: assignmentStats.rows[0],
        recentActivity: recentActivity.rows,
        topTeachers: topTeachers.rows,
        topStudents: topStudents.rows,
        system: {
          dbSizeMB: Math.round(Number(dbSize.rows[0]?.size || 0) / 1024 / 1024),
          memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          uptime: Math.round(process.uptime()),
          nodeVersion: process.version,
        },
      });
    } catch (err: unknown) {
      sendError(res, err, "جلب نظرة عامة على النظام");
    }
  });

  // ==================== BULK OPERATIONS (Admin Only) ====================
  app.post("/api/admin/bulk-transfer-students", requireRole("admin"), async (req, res) => {
    try {
      const { studentIds, newTeacherId } = req.body;
      if (!studentIds?.length || !newTeacherId) {
        return res.status(400).json({ message: "يرجى تحديد الطلاب والأستاذ الجديد" });
      }
      const teacher = await storage.getUser(newTeacherId);
      if (!teacher || teacher.role !== "teacher") {
        return res.status(404).json({ message: "الأستاذ غير موجود" });
      }
      let transferred = 0;
      for (const sid of studentIds) {
        const student = await storage.getUser(sid);
        if (student && student.role === "student") {
          const oldTeacherId = student.teacherId;
          await storage.updateUser(sid, { teacherId: newTeacherId });
          await storage.updateAssignments(sid, oldTeacherId, newTeacherId);
          transferred++;
        }
      }
      await logActivity(req.user!, `نقل جماعي: ${transferred} طالب إلى ${teacher.name}`, "admin");
      res.json({ message: `تم نقل ${transferred} طالب`, transferred });
    } catch (err: unknown) {
      sendError(res, err, "نقل جماعي للطلاب");
    }
  });

  app.post("/api/admin/bulk-reset-passwords", requireRole("admin"), async (req, res) => {
    try {
      const { userIds } = req.body;
      if (!userIds?.length) return res.status(400).json({ message: "يرجى تحديد المستخدمين" });
      const { hashPassword: hash } = await import("../auth");
      const defaultPass = await hash("Mutqin@2024");
      let reset = 0;
      for (const uid of userIds) {
        const user = await storage.getUser(uid);
        if (user && user.role !== "admin") {
          await storage.updateUser(uid, { password: defaultPass });
          reset++;
        }
      }
      await logActivity(req.user!, `إعادة تعيين كلمات مرور ${reset} مستخدم`, "admin");
      res.json({ message: `تم إعادة تعيين ${reset} كلمة مرور إلى Mutqin@2024`, reset });
    } catch (err: unknown) {
      sendError(res, err, "إعادة تعيين كلمات المرور");
    }
  });

  app.post("/api/admin/bulk-toggle-active", requireRole("admin"), async (req, res) => {
    try {
      const { userIds, isActive } = req.body;
      if (!userIds?.length || isActive === undefined) {
        return res.status(400).json({ message: "يرجى تحديد المستخدمين والحالة" });
      }
      let updated = 0;
      for (const uid of userIds) {
        const user = await storage.getUser(uid);
        if (user && user.role !== "admin") {
          await storage.updateUser(uid, { isActive });
          updated++;
        }
      }
      await logActivity(req.user!, `${isActive ? "تفعيل" : "تعطيل"} جماعي: ${updated} مستخدم`, "admin");
      res.json({ message: `تم ${isActive ? "تفعيل" : "تعطيل"} ${updated} مستخدم`, updated });
    } catch (err: unknown) {
      sendError(res, err, "تفعيل/تعطيل جماعي");
    }
  });

  app.post("/api/admin/bulk-move-mosque", requireRole("admin"), async (req, res) => {
    try {
      const { userIds, newMosqueId } = req.body;
      if (!userIds?.length || !newMosqueId) {
        return res.status(400).json({ message: "يرجى تحديد المستخدمين والمسجد الجديد" });
      }
      const mosque = await storage.getMosque(newMosqueId);
      if (!mosque) return res.status(404).json({ message: "المسجد غير موجود" });
      let moved = 0;
      for (const uid of userIds) {
        const user = await storage.getUser(uid);
        if (user && user.role !== "admin") {
          await storage.updateUser(uid, { mosqueId: newMosqueId, teacherId: null });
          moved++;
        }
      }
      await logActivity(req.user!, `نقل جماعي: ${moved} مستخدم إلى ${mosque.name}`, "admin");
      res.json({ message: `تم نقل ${moved} مستخدم إلى ${mosque.name}`, moved });
    } catch (err: unknown) {
      sendError(res, err, "نقل جماعي للمسجد");
    }
  });

  app.post("/api/admin/bulk-delete-users", requireRole("admin"), async (req, res) => {
    try {
      const { userIds, password } = req.body;
      if (!userIds?.length || !password) {
        return res.status(400).json({ message: "يرجى تحديد المستخدمين وإدخال كلمة المرور" });
      }
      const { comparePasswords: verify } = await import("../auth");
      const admin = await storage.getUser(req.user!.id);
      if (!admin || !(await verify(password, admin.password))) {
        return res.status(403).json({ message: "كلمة المرور غير صحيحة" });
      }
      let deleted = 0;
      for (const uid of userIds) {
        const user = await storage.getUser(uid);
        if (user && user.role !== "admin") {
          await storage.deleteUser(uid);
          deleted++;
        }
      }
      await logActivity(req.user!, `حذف جماعي: ${deleted} مستخدم`, "admin");
      res.json({ message: `تم حذف ${deleted} مستخدم`, deleted });
    } catch (err: unknown) {
      sendError(res, err, "حذف جماعي للمستخدمين");
    }
  });

  // ==================== MOSQUE HEALTH (Admin Only) ====================
  app.get("/api/admin/mosque-health", requireRole("admin"), async (req, res) => {
    try {
      const { pool: dbPool } = await import("../db");
      const result = await dbPool.query(`
        SELECT
          m.id, m.name, m.is_active,
          COUNT(DISTINCT CASE WHEN u.role='student' AND u.is_active THEN u.id END)::int AS active_students,
          COUNT(DISTINCT CASE WHEN u.role='teacher' AND u.is_active THEN u.id END)::int AS active_teachers,
          COUNT(DISTINCT CASE WHEN u.role='supervisor' AND u.is_active THEN u.id END)::int AS supervisors,
          COUNT(DISTINCT CASE WHEN u.role='student' AND u.is_active AND u.teacher_id IS NULL THEN u.id END)::int AS students_without_teacher,
          COUNT(DISTINCT CASE WHEN u.role='teacher' AND u.is_active AND NOT EXISTS (
            SELECT 1 FROM users s WHERE s.teacher_id = u.id AND s.role='student' AND s.is_active
          ) THEN u.id END)::int AS teachers_without_students,
          COUNT(DISTINCT CASE WHEN a.created_at >= NOW() - INTERVAL '7 days' THEN a.id END)::int AS weekly_assignments,
          COUNT(DISTINCT CASE WHEN att.date >= CURRENT_DATE - 7 THEN att.id END)::int AS weekly_attendance
        FROM mosques m
        LEFT JOIN users u ON m.id = u.mosque_id
        LEFT JOIN assignments a ON m.id = a.mosque_id
        LEFT JOIN attendance att ON m.id = att.mosque_id
        WHERE m.is_active = true
        GROUP BY m.id, m.name, m.is_active
        ORDER BY active_students DESC
      `);

      const health = result.rows.map((m: Record<string, unknown>) => ({
        ...m,
        healthScore: Math.min(100, (
          (Number(m.active_teachers) > 0 ? 25 : 0) +
          (Number(m.supervisors) > 0 ? 15 : 0) +
          (Number(m.students_without_teacher) === 0 ? 20 : 0) +
          (Number(m.teachers_without_students) === 0 ? 10 : 0) +
          (Number(m.weekly_assignments) > 0 ? 15 : 0) +
          (Number(m.weekly_attendance) > 0 ? 15 : 0)
        )),
      }));

      res.json(health);
    } catch (err: unknown) {
      sendError(res, err, "جلب صحة المساجد");
    }
  });

}
