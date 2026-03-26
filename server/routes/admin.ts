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
  competitions,
  competitionParticipants,
  schedules,
  parentReports,
  exams,
  examStudents,
  featureFlags,
  bannedDevices,
} from "@shared/schema";
import { sessionTracker } from "../session-tracker";
import { logActivity } from "./shared";
import { allFeatureDefaults } from "./feature-defaults";
import { sendError } from "../error-handler";

export function registerAdminRoutes(app: Express) {
  // ==================== SEED DATA ====================
  app.post("/api/seed", async (req, res) => {
    try {
      // SECURITY FIX: Block in production entirely
      if (process.env.NODE_ENV === "production" || process.env.REPL_DEPLOYMENT) {
        return res.status(403).json({ message: "غير مسموح في بيئة الإنتاج" });
      }
      // SECURITY FIX: Require SEED_SECRET even in development
      const seedSecret = process.env.SEED_SECRET;
      if (!seedSecret || req.body.seedSecret !== seedSecret) {
        return res.status(403).json({ message: "مفتاح التهيئة مطلوب. عيّن SEED_SECRET في متغيرات البيئة" });
      }
      const allUsers = await storage.getUsers();
      if (allUsers.length > 0) {
        if (!req.isAuthenticated() || req.user!.role !== "admin") {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
        const sup1Check = await storage.getUserByUsername("supervisor1");
        if (sup1Check) {
          return res.status(403).json({ message: "البيانات موجودة مسبقًا" });
        }
      }

      const mosque1 = await storage.createMosque({
        name: "جامع النور الكبير",
        province: "بغداد",
        city: "بغداد",
        area: "الكرخ",
        landmark: "قرب ساحة النصر",
        address: "الكرخ - شارع حيفا",
        phone: "07701000001",
        managerName: "الشيخ عبد الكريم",
        description: "جامع رئيسي لتحفيظ القرآن الكريم",
        isActive: true,
      });

      const mosque2 = await storage.createMosque({
        name: "جامع الإمام أبي حنيفة",
        province: "بغداد",
        city: "بغداد",
        area: "الأعظمية",
        landmark: "قرب جسر الأعظمية",
        address: "الأعظمية",
        phone: "07701000002",
        managerName: "الشيخ محمود",
        description: "من أعرق مساجد بغداد",
        isActive: true,
      });

      const mosque3 = await storage.createMosque({
        name: "جامع الرحمن",
        province: "البصرة",
        city: "البصرة",
        area: "المركز",
        landmark: "قرب سوق الهنود",
        address: "شارع الجمهورية",
        phone: "07701000003",
        managerName: "الشيخ حسن",
        description: "مسجد تحفيظ القرآن في البصرة",
        isActive: true,
      });

      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        return res.status(400).json({ message: "يجب تعيين ADMIN_PASSWORD في متغيرات البيئة" });
      }
      const existingAdmin = await storage.getUserByUsername(adminUsername);
      const adminUser = existingAdmin || await storage.createUser({
        username: adminUsername,
        password: await hashPassword(adminPassword),
        name: "المدير",
        role: "admin",
        phone: "",
        isActive: true,
        canPrintIds: true,
        mosqueId: null,
      });

      const sup1 = await storage.createUser({
        username: "supervisor1",
        password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")),
        name: "المشرف أحمد",
        role: "supervisor",
        mosqueId: mosque1.id,
        phone: "07801111111",
        isActive: true,
      });

      const sup2 = await storage.createUser({
        username: "supervisor2",
        password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")),
        name: "المشرف خالد",
        role: "supervisor",
        mosqueId: mosque2.id,
        phone: "07802222222",
        isActive: true,
      });

      const teacher1 = await storage.createUser({
        username: "teacher1",
        password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")),
        name: "الشيخ أحمد",
        role: "teacher",
        mosqueId: mosque1.id,
        phone: "07801234567",
        isActive: true,
      });

      const teacher2 = await storage.createUser({
        username: "teacher2",
        password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")),
        name: "الشيخ عبد الله",
        role: "teacher",
        mosqueId: mosque1.id,
        phone: "07811234567",
        isActive: true,
      });

      const teacher3 = await storage.createUser({
        username: "teacher3",
        password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")),
        name: "الشيخ محمد",
        role: "teacher",
        mosqueId: mosque2.id,
        phone: "07821234567",
        isActive: true,
      });

      const s1 = await storage.createUser({ username: "student1", password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")), name: "عمر خالد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, phone: "07901234567", isActive: true });
      const s2 = await storage.createUser({ username: "student2", password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")), name: "أحمد محمد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, phone: "07911234567", isActive: true });
      const s3 = await storage.createUser({ username: "student3", password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")), name: "يوسف علي", role: "student", mosqueId: mosque1.id, teacherId: teacher2.id, phone: "07921234567", isActive: true });
      const s4 = await storage.createUser({ username: "student4", password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")), name: "سعيد حسن", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, phone: "07931234567", isActive: true });
      const s5 = await storage.createUser({ username: "student5", password: await hashPassword(require("crypto").randomBytes(12).toString("base64url")), name: "كريم محمود", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, phone: "07941234567", isActive: true });

      await storage.createAssignment({
        studentId: s1.id, teacherId: teacher1.id, mosqueId: mosque1.id,
        surahName: "البقرة", fromVerse: 1, toVerse: 20, type: "new",
        scheduledDate: new Date(), status: "pending",
      });
      await storage.createAssignment({
        studentId: s2.id, teacherId: teacher1.id, mosqueId: mosque1.id,
        surahName: "آل عمران", fromVerse: 1, toVerse: 10, type: "review",
        scheduledDate: new Date(), status: "done",
      });
      await storage.createAssignment({
        studentId: s4.id, teacherId: teacher3.id, mosqueId: mosque2.id,
        surahName: "الكهف", fromVerse: 1, toVerse: 15, type: "new",
        scheduledDate: new Date(), status: "pending",
      });

      res.json({ message: "تم إنشاء البيانات الأولية بنجاح", mosques: 3, users: 12 });
    } catch (err: any) {
      sendError(res, err, "إنشاء البيانات الأولية");
    }
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
      const { password, ...safe } = user;
      res.json({ ...safe, mosqueName });
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
      sendError(res, err, "جلب إحصائيات النسخ الاحتياطي");
    }
  });

  app.get("/api/system/backup", requireRole("admin"), async (req, res) => {
    try {
      const [
        mosquesData, usersData, assignmentsData, attendanceData,
        coursesData, courseStudentsData, courseTeachersData, certificatesData,
        notificationsData, messagesData, activityLogsData, ratingsData,
        pointsData, badgesData, competitionsData, competitionParticipantsData,
        schedulesData, parentReportsData, examsData, examStudentsData,
        featureFlagsData, bannedDevicesData,
      ] = await Promise.all([
        db.select().from(mosques),
        db.select().from(users),
        db.select().from(assignments),
        db.select().from(attendance),
        db.select().from(courses),
        db.select().from(courseStudents),
        db.select().from(courseTeachers),
        db.select().from(certificates),
        db.select().from(notifications),
        db.select().from(messages),
        db.select().from(activityLogs),
        db.select().from(ratings),
        db.select().from(points),
        db.select().from(badges),
        db.select().from(competitions),
        db.select().from(competitionParticipants),
        db.select().from(schedules),
        db.select().from(parentReports),
        db.select().from(exams),
        db.select().from(examStudents),
        db.select().from(featureFlags),
        db.select().from(bannedDevices),
      ]);

      const safeUsersData = usersData.map(({ password, ...u }) => u);
      const backup = {
        metadata: {
          version: "1.0",
          timestamp: new Date().toISOString(),
          tableCount: 22,
          totalRecords:
            mosquesData.length + usersData.length + assignmentsData.length +
            attendanceData.length + coursesData.length + courseStudentsData.length +
            courseTeachersData.length + certificatesData.length + notificationsData.length +
            messagesData.length + activityLogsData.length + ratingsData.length +
            pointsData.length + badgesData.length + competitionsData.length +
            competitionParticipantsData.length + schedulesData.length +
            parentReportsData.length + examsData.length + examStudentsData.length +
            featureFlagsData.length + bannedDevicesData.length,
        },
        data: {
          mosques: mosquesData,
          users: safeUsersData,
          assignments: assignmentsData,
          attendance: attendanceData,
          courses: coursesData,
          courseStudents: courseStudentsData,
          courseTeachers: courseTeachersData,
          certificates: certificatesData,
          notifications: notificationsData,
          messages: messagesData,
          activityLogs: activityLogsData,
          ratings: ratingsData,
          points: pointsData,
          badges: badgesData,
          competitions: competitionsData,
          competitionParticipants: competitionParticipantsData,
          schedules: schedulesData,
          parentReports: parentReportsData,
          exams: examsData,
          examStudents: examStudentsData,
          featureFlags: featureFlagsData,
          bannedDevices: bannedDevicesData,
        },
      };

      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Disposition", `attachment; filename="mutqin_backup_${dateStr}.json"`);
      res.setHeader("Content-Type", "application/json");
      await logActivity(req.user!, "إنشاء نسخة احتياطية", "system", `تم تصدير ${backup.metadata.totalRecords} سجل`);
      res.json(backup);
    } catch (err: any) {
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

      const expectedTables = [
        "mosques", "users", "assignments", "attendance", "courses",
        "courseStudents", "courseTeachers", "certificates", "notifications",
        "messages", "activityLogs", "ratings", "points", "badges",
        "competitions", "competitionParticipants", "schedules",
        "parentReports", "exams", "examStudents", "featureFlags", "bannedDevices",
      ];

      const details: { tableName: string; count: number }[] = [];
      let totalRecords = 0;

      for (const table of expectedTables) {
        if (!data[table]) {
          if (!Array.isArray(data[table]) && data[table] !== undefined) {
            errors.push(`الجدول ${table} غير موجود في النسخة الاحتياطية`);
          }
          details.push({ tableName: table, count: 0 });
        } else if (!Array.isArray(data[table])) {
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
    } catch (err: any) {
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

      const allowedTables = [
        "mosques", "users", "assignments", "attendance", "courses", "courseStudents",
        "courseTeachers", "certificates", "notifications", "messages", "activityLogs",
        "ratings", "points", "badges", "competitions", "competitionParticipants",
        "schedules", "parentReports", "exams", "examStudents", "featureFlags", "bannedDevices"
      ];
      const dataKeys = Object.keys(data);
      const invalidKeys = dataKeys.filter(k => !allowedTables.includes(k));
      if (invalidKeys.length > 0) {
        return res.status(400).json({ message: `جداول غير معروفة في النسخة الاحتياطية: ${invalidKeys.join(", ")}` });
      }

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
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        await db.delete(competitionParticipants);
        await db.delete(competitions);
        await db.delete(parentReports);
        await db.delete(schedules);
        await db.delete(badges);
        await db.delete(points);
        await db.delete(messages);
        await db.delete(attendance);
        await db.delete(bannedDevices);
        await db.delete(certificates);
        await db.delete(courseStudents);
        await db.delete(courseTeachers);
        await db.delete(courses);
        await db.delete(examStudents);
        await db.delete(exams);
        await db.delete(ratings);
        await db.delete(assignments);
        await db.delete(notifications);
        await db.delete(activityLogs);
        await db.delete(featureFlags);
        await db.delete(users);
        await db.delete(mosques);

        if (data.mosques?.length) {
          for (const row of data.mosques) {
            await db.insert(mosques).values(row);
          }
        }

        if (data.users?.length) {
          for (const row of data.users) {
            await db.insert(users).values(row);
          }
        }

        if (data.assignments?.length) {
          for (const row of data.assignments) {
            await db.insert(assignments).values(row);
          }
        }

        if (data.attendance?.length) {
          for (const row of data.attendance) {
            await db.insert(attendance).values(row);
          }
        }

        if (data.courses?.length) {
          for (const row of data.courses) {
            await db.insert(courses).values(row);
          }
        }

        if (data.courseStudents?.length) {
          for (const row of data.courseStudents) {
            await db.insert(courseStudents).values(row);
          }
        }

        if (data.courseTeachers?.length) {
          for (const row of data.courseTeachers) {
            await db.insert(courseTeachers).values(row);
          }
        }

        if (data.certificates?.length) {
          for (const row of data.certificates) {
            await db.insert(certificates).values(row);
          }
        }

        if (data.notifications?.length) {
          for (const row of data.notifications) {
            await db.insert(notifications).values(row);
          }
        }

        if (data.messages?.length) {
          for (const row of data.messages) {
            await db.insert(messages).values(row);
          }
        }

        if (data.activityLogs?.length) {
          for (const row of data.activityLogs) {
            await db.insert(activityLogs).values(row);
          }
        }

        if (data.ratings?.length) {
          for (const row of data.ratings) {
            await db.insert(ratings).values(row);
          }
        }

        if (data.points?.length) {
          for (const row of data.points) {
            await db.insert(points).values(row);
          }
        }

        if (data.badges?.length) {
          for (const row of data.badges) {
            await db.insert(badges).values(row);
          }
        }

        if (data.competitions?.length) {
          for (const row of data.competitions) {
            await db.insert(competitions).values(row);
          }
        }

        if (data.competitionParticipants?.length) {
          for (const row of data.competitionParticipants) {
            await db.insert(competitionParticipants).values(row);
          }
        }

        if (data.schedules?.length) {
          for (const row of data.schedules) {
            await db.insert(schedules).values(row);
          }
        }

        if (data.parentReports?.length) {
          for (const row of data.parentReports) {
            await db.insert(parentReports).values(row);
          }
        }

        if (data.exams?.length) {
          for (const row of data.exams) {
            await db.insert(exams).values(row);
          }
        }

        if (data.examStudents?.length) {
          for (const row of data.examStudents) {
            await db.insert(examStudents).values(row);
          }
        }

        if (data.featureFlags?.length) {
          for (const row of data.featureFlags) {
            await db.insert(featureFlags).values(row);
          }
        }

        if (data.bannedDevices?.length) {
          for (const row of data.bannedDevices) {
            await db.insert(bannedDevices).values(row);
          }
        }

        await client.query("COMMIT");
        res.json({ message: "تم استعادة النسخة الاحتياطية بنجاح" });
      } catch (err: any) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
      sendError(res, err, "حظر عنوان IP");
    }
  });

  app.delete("/api/admin/banned-devices/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteBannedDevice(req.params.id);
      await logActivity(req.user!, `إزالة حظر جهاز`, "security");
      res.json({ message: "تم إزالة الحظر" });
    } catch (err: any) {
      sendError(res, err, "إزالة حظر جهاز");
    }
  });


  // ==================== FEATURE FLAGS ====================
  app.get("/api/feature-flags", requireRole("admin"), async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      res.json(flags);
    } catch (err: any) {
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
    } catch (err: any) {
      sendError(res, err, "تحديث إعداد الميزة");
    }
  });

  app.get("/api/features/check/:key", requireAuth, async (req, res) => {
    try {
      const enabled = await storage.isFeatureEnabled(req.params.key);
      res.json({ enabled });
    } catch (err: any) {
      sendError(res, err, "التحقق من حالة الميزة");
    }
  });

  app.get("/api/features/enabled", requireAuth, async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      const enabled = flags.filter(f => f.isEnabled).map(f => f.featureKey);
      res.json({ enabled });
    } catch (err: any) {
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
    } catch (err: any) {
      sendError(res, err, "إنشاء الميزات الافتراضية");
    }
  });

}
