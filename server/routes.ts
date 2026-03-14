import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, requirePrivacyPolicy, hashPassword } from "./auth";
import { quranSurahs } from "@shared/quran-surahs";
import { db } from "./db";
import { eq, and, desc, asc, count, sql as dsql } from "drizzle-orm";
import {
  insertUserSchema, insertAssignmentSchema, insertActivityLogSchema, insertNotificationSchema, insertMosqueSchema,
  type User, type Assignment,
  mosques, users, assignments, attendance, courses, courseStudents, courseTeachers,
  certificates, notifications, messages, activityLogs, ratings, points, badges,
  competitions, competitionParticipants, schedules, parentReports, exams, examStudents,
  featureFlags, bannedDevices, emergencySubstitutions, incidentRecords, graduates,
  graduateFollowups, studentTransfers, familyLinks, feedback, tajweedRules, similarVerses,
  messageTemplates, communicationLogs, mosqueRegistrations, quranProgress,
  mosqueHistory, mosqueMessages, testimonials, insertTestimonialSchema,
} from "@shared/schema";
import { sessionTracker } from "./session-tracker";
import { filterTextFields } from "@shared/content-filter";
import { validateFields, validateAge, validateBoolean, validateEnum, validateDate, sanitizeImageUrl, validateTeacherLevels } from "@shared/security-utils";

async function logActivity(user: any, action: string, module: string, details?: string) {
  await storage.createActivityLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    mosqueId: user.mosqueId,
    action,
    module,
    details,
    status: "success",
  });
}

function getTeacherLevelsArray(teacher: any): number[] {
  if (!teacher.teacherLevels) return [1, 2, 3, 4, 5, 6, 7];
  return teacher.teacherLevels.split(",").map(Number).filter((n: number) => n >= 1 && n <= 7);
}

function canTeacherAccessStudent(teacher: any, student: any): boolean {
  if (!teacher.mosqueId || teacher.mosqueId !== student.mosqueId) return false;
  const teacherLevels = getTeacherLevelsArray(teacher);
  const studentLevel = student.level || 1;
  return teacherLevels.includes(studentLevel);
}

function canTeacherAccessAssignment(teacher: any, assignment: any, student: any): boolean {
  if (assignment.mosqueId !== teacher.mosqueId) return false;
  return canTeacherAccessStudent(teacher, student);
}

function calculateStudentLevel(juzCount: number): number {
  if (juzCount >= 30) return 7;
  if (juzCount >= 26) return 6;
  if (juzCount >= 21) return 5;
  if (juzCount >= 16) return 4;
  if (juzCount >= 11) return 3;
  if (juzCount >= 6) return 2;
  return 1;
}

const LEVEL_NAMES: Record<number, { ar: string; en: string }> = {
  1: { ar: "المستوى الأول", en: "Level 1" },
  2: { ar: "المستوى الثاني", en: "Level 2" },
  3: { ar: "المستوى الثالث", en: "Level 3" },
  4: { ar: "المستوى الرابع", en: "Level 4" },
  5: { ar: "المستوى الخامس", en: "Level 5" },
  6: { ar: "المستوى السادس", en: "Level 6" },
  7: { ar: "حافظ", en: "Hafiz" },
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  const messageSendTimes = new Map<string, number[]>();

  const featureRouteMap: Record<string, string[]> = {
    attendance: ["/api/attendance"],
    messaging: ["/api/messages"],
    points_rewards: ["/api/points", "/api/leaderboard"],
    schedules: ["/api/schedules"],
    parent_portal: ["/api/parent-portal"],
    smart_alerts: ["/api/smart-alerts"],
    competitions: ["/api/competitions"],
    advanced_reports: ["/api/advanced-reports"],
    ratings: ["/api/ratings"],
    courses: ["/api/courses", "/api/certificates"],
    library: ["/api/library"],
    knowledge_base: ["/api/tajweed", "/api/similar-verses"],
    educational_content: ["/api/educational-content"],
    graduation: ["/api/graduates"],
    family_system: ["/api/family"],
    crisis_management: ["/api/emergency", "/api/incidents"],
    institutional: ["/api/transfers"],
    id_cards: ["/api/id-cards"],
  };

  app.use(async (req, res, next) => {
    for (const [featureKey, prefixes] of Object.entries(featureRouteMap)) {
      if (prefixes.some(prefix => req.path.startsWith(prefix))) {
        try {
          const enabled = await storage.isFeatureEnabled(featureKey);
          if (!enabled) {
            return res.status(403).json({ message: "هذه الميزة معطلة حالياً من قبل المدير" });
          }
        } catch {}
        break;
      }
    }
    next();
  });

  const allFeatureDefaults = [
    { featureKey: "attendance", featureName: "نظام الحضور والغياب", description: "تسجيل حضور وغياب الطلاب يومياً مع إمكانية تحديد الحالة (حاضر، غائب، متأخر، معذور) وإضافة ملاحظات وعرض سجل الحضور التاريخي", category: "management", isEnabled: true },
    { featureKey: "messaging", featureName: "المحادثات الداخلية", description: "نظام مراسلة فوري داخلي يتيح للمعلمين والمشرفين والطلاب التواصل المباشر مع بعضهم البعض داخل المنصة", category: "communication", isEnabled: true },
    { featureKey: "points_rewards", featureName: "النقاط والمكافآت", description: "نظام تحفيزي لمنح النقاط والشارات للطلاب على إنجازاتهم في الحفظ والسلوك والحضور مع لوحة شرف تعرض ترتيب المتميزين", category: "gamification", isEnabled: true },
    { featureKey: "schedules", featureName: "جدولة الحلقات", description: "تنظيم وعرض الجدول الأسبوعي لحلقات التحفيظ مع تحديد المعلم والوقت والمكان لكل حلقة", category: "management", isEnabled: true },
    { featureKey: "parent_portal", featureName: "بوابة ولي الأمر", description: "إنشاء تقارير دورية عن مستوى الطالب ومشاركتها مع ولي الأمر عبر رابط خاص دون الحاجة لتسجيل دخول", category: "communication", isEnabled: true },
    { featureKey: "mosque_map", featureName: "خريطة الجوامع", description: "عرض خريطة تفاعلية توضح مواقع الجوامع والمراكز القرآنية المسجلة في النظام", category: "visualization", isEnabled: false },
    { featureKey: "backup_export", featureName: "النسخ الاحتياطي والتصدير", description: "إمكانية تصدير بيانات النظام وإنشاء نسخ احتياطية لحماية البيانات من الفقدان", category: "data", isEnabled: true },
    { featureKey: "smart_alerts", featureName: "التنبيهات الذكية", description: "تنبيهات تلقائية تُرسل عند غياب الطالب المتكرر أو تراجع مستواه أو اقتراب مواعيد الامتحانات والمسابقات", category: "automation", isEnabled: true },
    { featureKey: "competitions", featureName: "المسابقات القرآنية", description: "تنظيم مسابقات قرآنية بين الطلاب مع تحديد السور والآيات وتسجيل النتائج والترتيب", category: "gamification", isEnabled: true },
    { featureKey: "advanced_reports", featureName: "التقارير المتقدمة", description: "تقارير تفصيلية وإحصائيات شاملة عن أداء الطلاب ونشاط المعلمين ومستوى التقدم في الحفظ", category: "analytics", isEnabled: true },
    { featureKey: "ratings", featureName: "التقييمات والأوسمة", description: "نظام تقييم أداء الطلاب ومنح الأوسمة والشارات التقديرية بناءً على مستوى الإنجاز", category: "gamification", isEnabled: true },
    { featureKey: "courses", featureName: "الدورات والشهادات", description: "إدارة الدورات التعليمية وإصدار شهادات الإتمام والتخرج للطلاب", category: "education", isEnabled: true },
    { featureKey: "library", featureName: "المكتبة الإسلامية", description: "مكتبة رقمية تحتوي على كتب ومراجع إسلامية متنوعة لدعم العملية التعليمية", category: "education", isEnabled: true },
    { featureKey: "knowledge_base", featureName: "موسوعة التجويد", description: "موسوعة شاملة لأحكام التجويد والآيات المتشابهة لمساعدة الطلاب والمعلمين", category: "education", isEnabled: true },
    { featureKey: "educational_content", featureName: "المحتوى التعليمي", description: "محتوى تعليمي تفاعلي يشمل دروس ومواد تعليمية متنوعة لدعم حفظ القرآن", category: "education", isEnabled: true },
    { featureKey: "graduation", featureName: "التخرج والمتابعة", description: "نظام متابعة الخريجين وتسجيل إنجازاتهم بعد إتمام الحفظ", category: "management", isEnabled: true },
    { featureKey: "family_system", featureName: "نظام الأسرة", description: "ربط حسابات أفراد الأسرة الواحدة لتسهيل المتابعة والتواصل", category: "communication", isEnabled: true },
    { featureKey: "whiteboard", featureName: "السبورة التفاعلية", description: "سبورة تفاعلية رقمية لاستخدامها في التدريس والشرح أثناء الحلقات", category: "education", isEnabled: true },
    { featureKey: "crisis_management", featureName: "إدارة الأزمات", description: "نظام لإدارة الأزمات والطوارئ والبدائل في حالات الغياب والظروف الطارئة", category: "management", isEnabled: true },
    { featureKey: "institutional", featureName: "التكامل المؤسسي", description: "نظام التكامل مع المؤسسات والجهات الخارجية ونقل البيانات بينها", category: "management", isEnabled: true },
    { featureKey: "floor_plan", featureName: "المخطط البصري", description: "عرض مخطط بصري لتوزيع القاعات والحلقات داخل الجامع أو المركز", category: "visualization", isEnabled: true },
    { featureKey: "id_cards", featureName: "الهويات ومسح QR", description: "إنشاء بطاقات هوية للطلاب والمعلمين مع رموز QR للتحقق السريع", category: "management", isEnabled: true },
  ];

  // Auto-seed feature flags (add missing ones)
  try {
    const existingFlags = await storage.getFeatureFlags();
    const existingKeys = new Set(existingFlags.map(f => f.featureKey));
    const newFlags = allFeatureDefaults.filter(f => !existingKeys.has(f.featureKey));
    if (newFlags.length > 0) {
      for (const flag of newFlags) {
        await storage.createFeatureFlag(flag);
      }
      console.log(`Feature flags: ${newFlags.length} new flags added`);
    }
  } catch (err) {
    console.error("Error seeding feature flags:", err);
  }

  // Session tracking middleware
  app.use((req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user && req.sessionID) {
      sessionTracker.updateSession(req.sessionID, req.user, req);
    }
    next();
  });

  const privacyExemptPaths = [
    "/api/auth/",
    "/api/privacy-policy/",
    "/api/register-mosque",
  ];
  app.use((req: any, res: any, next: any) => {
    if (!req.path.startsWith("/api/")) return next();
    if (privacyExemptPaths.some(p => req.path.startsWith(p))) return next();
    if (req.path === "/api/auth/me") return next();
    requirePrivacyPolicy(req, res, next);
  });

  // ==================== PRIVACY POLICY ====================
  app.post("/api/privacy-policy/accept", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      await storage.updateUser(user.id, {
        acceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: new Date(),
      });
      await logActivity(user, "الموافقة على سياسة الخصوصية", "privacy");
      res.json({ message: "تم قبول سياسة الخصوصية بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== MOSQUES ====================
  app.get("/api/mosques", requireAuth, async (req, res) => {
    try {
      if (req.user!.role === "admin") {
        const all = await storage.getMosques();
        return res.json(all);
      }
      if (req.user!.mosqueId) {
        const mosque = await storage.getMosque(req.user!.mosqueId);
        return res.json(mosque ? [mosque] : []);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.get("/api/mosques/comparative-stats", requireRole("admin"), async (req, res) => {
    try {
      const allMosquesList = await storage.getMosques();
      const activeMosques = allMosquesList.filter((m: any) => m.status === "active");
      const comparisons: any[] = [];

      for (const m of activeMosques) {
        const mosqueUsers = await storage.getUsersByMosque(m.id);
        const studentsCount = mosqueUsers.filter(u => u.role === "student").length;
        const teachersCount = mosqueUsers.filter(u => u.role === "teacher").length;
        const activeStudents = mosqueUsers.filter(u => u.role === "student" && u.isActive).length;

        let attendanceRate = 0;
        try {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const attendanceRows = await db.select().from(attendance)
            .where(and(
              eq(attendance.mosqueId, m.id),
              dsql`${attendance.date} >= ${thirtyDaysAgo.toISOString().split("T")[0]}`
            ));
          if (attendanceRows.length > 0) {
            const present = attendanceRows.filter(a => a.status === "present" || a.status === "late").length;
            attendanceRate = Math.round((present / attendanceRows.length) * 100);
          }
        } catch {}

        let lastActivity: string | null = null;
        try {
          const logs = await db.select().from(activityLogs)
            .where(eq(activityLogs.mosqueId, m.id))
            .orderBy(desc(activityLogs.createdAt))
            .limit(1);
          lastActivity = logs[0]?.createdAt?.toISOString() || null;
        } catch {}

        comparisons.push({
          id: m.id,
          name: m.name,
          province: (m as any).province || "",
          studentsCount,
          teachersCount,
          activeStudents,
          attendanceRate,
          lastActivity,
        });
      }

      comparisons.sort((a, b) => b.studentsCount - a.studentsCount);

      res.json({
        mosques: comparisons,
        topByStudents: comparisons.slice(0, 10),
        topByAttendance: [...comparisons].sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 10),
        topByActivity: [...comparisons].filter(m => m.lastActivity).sort((a, b) =>
          new Date(b.lastActivity!).getTime() - new Date(a.lastActivity!).getTime()
        ).slice(0, 10),
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب الإحصائيات المقارنة" });
    }
  });

  app.get("/api/mosques/inactivity-check", requireRole("admin"), async (req, res) => {
    try {
      const allMosquesList = await storage.getMosques();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const inactiveMosques: any[] = [];
      for (const m of allMosquesList) {
        if ((m as any).status !== "active") continue;
        try {
          const logs = await db.select().from(activityLogs)
            .where(eq(activityLogs.mosqueId, m.id))
            .orderBy(desc(activityLogs.createdAt))
            .limit(1);
          const lastLog = logs[0]?.createdAt;
          if (!lastLog || new Date(lastLog) < sevenDaysAgo) {
            inactiveMosques.push({
              id: m.id,
              name: m.name,
              province: (m as any).province || "",
              lastActivity: lastLog?.toISOString() || null,
              daysSinceActivity: lastLog
                ? Math.floor((Date.now() - new Date(lastLog).getTime()) / (1000 * 60 * 60 * 24))
                : null,
            });
          }
        } catch {}
      }
      inactiveMosques.sort((a, b) => (a.daysSinceActivity ?? 999) - (b.daysSinceActivity ?? 999));
      res.json({ inactiveMosques, count: inactiveMosques.length });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/mosques/:id", requireAuth, async (req, res) => {
    try {
      const mosque = await storage.getMosque(req.params.id);
      if (!mosque) return res.status(404).json({ message: "الجامع غير موجود" });
      if (req.user!.role !== "admin" && req.user!.mosqueId !== req.params.id) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      res.json(mosque);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/mosques", requireRole("admin"), async (req, res) => {
    try {
      const contentCheck = filterTextFields(req.body, ["name", "description", "managerName"]);
      if (contentCheck.blocked) {
        return res.status(400).json({ message: contentCheck.reason });
      }

      const { name, province, city, area, landmark, address, phone, managerName, description, image, isActive } = req.body;
      if (!name || typeof name !== "string" || name.length > 200) {
        return res.status(400).json({ message: "اسم الجامع مطلوب ويجب ألا يتجاوز 200 حرف" });
      }
      const fieldCheck = validateFields(req.body, ["province", "city", "area", "landmark", "address", "phone", "managerName", "description"]);
      if (!fieldCheck.valid) return res.status(400).json({ message: fieldCheck.error });
      const boolCheck = validateBoolean(isActive, "isActive");
      if (!boolCheck.valid) return res.status(400).json({ message: boolCheck.error });
      const safeImage = sanitizeImageUrl(image);
      const mosque = await storage.createMosque({ name, province, city, area, landmark, address, phone, managerName, description, image: safeImage, isActive });
      await logActivity(req.user!, `إنشاء جامع: ${mosque.name}`, "mosques");
      res.status(201).json(mosque);
    } catch (err: any) {
      console.error(err); res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  app.patch("/api/mosques/:id", requireRole("admin"), async (req, res) => {
    try {
      const { name, province, city, area, landmark, address, phone, managerName, description, image, isActive } = req.body;
      const updateData: any = {};
      if (name !== undefined) {
        if (typeof name !== "string" || name.length > 200) return res.status(400).json({ message: "اسم الجامع يجب ألا يتجاوز 200 حرف" });
        updateData.name = name;
      }
      if (province !== undefined) {
        if (typeof province !== "string" || province.length > 100) return res.status(400).json({ message: "اسم المحافظة يجب ألا يتجاوز 100 حرف" });
        updateData.province = province;
      }
      if (city !== undefined) {
        if (typeof city !== "string" || city.length > 100) return res.status(400).json({ message: "اسم المدينة يجب ألا يتجاوز 100 حرف" });
        updateData.city = city;
      }
      if (area !== undefined) {
        if (typeof area !== "string" || area.length > 200) return res.status(400).json({ message: "اسم المنطقة يجب ألا يتجاوز 200 حرف" });
        updateData.area = area;
      }
      if (landmark !== undefined) {
        if (typeof landmark !== "string" || landmark.length > 300) return res.status(400).json({ message: "أقرب نقطة دالة يجب ألا تتجاوز 300 حرف" });
        updateData.landmark = landmark;
      }
      if (address !== undefined) {
        if (typeof address !== "string" || address.length > 500) return res.status(400).json({ message: "العنوان يجب ألا يتجاوز 500 حرف" });
        updateData.address = address;
      }
      if (phone !== undefined) {
        if (typeof phone !== "string" || phone.length > 20) return res.status(400).json({ message: "رقم الهاتف يجب ألا يتجاوز 20 حرف" });
        updateData.phone = phone;
      }
      if (managerName !== undefined) {
        if (typeof managerName !== "string" || managerName.length > 200) return res.status(400).json({ message: "اسم المسؤول يجب ألا يتجاوز 200 حرف" });
        updateData.managerName = managerName;
      }
      if (description !== undefined) {
        if (typeof description !== "string" || description.length > 1000) return res.status(400).json({ message: "الوصف يجب ألا يتجاوز 1000 حرف" });
        updateData.description = description;
      }
      if (image !== undefined) updateData.image = sanitizeImageUrl(image);
      if (isActive !== undefined) {
        if (typeof isActive !== "boolean") return res.status(400).json({ message: "حالة النشاط يجب أن تكون صح/خطأ" });
        updateData.isActive = isActive;
      }
      if (req.body.status !== undefined) {
        if (!["active", "suspended", "permanently_closed"].includes(req.body.status)) {
          return res.status(400).json({ message: "حالة الجامع غير صحيحة" });
        }
        updateData.status = req.body.status;
      }
      if (req.body.adminNotes !== undefined) {
        const noteCheck = validateFields({ adminNotes: req.body.adminNotes }, ["adminNotes"]);
        if (!noteCheck.valid) return res.status(400).json({ message: noteCheck.error });
        updateData.adminNotes = req.body.adminNotes;
      }
      const updated = await storage.updateMosque(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "الجامع غير موجود" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تحديث البيانات" });
    }
  });

  app.delete("/api/mosques/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteMosque(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف الجامع" });
    }
  });

  // ==================== MOSQUE DASHBOARD ====================
  app.get("/api/mosques/:id/stats", requireRole("admin"), async (req, res) => {
    try {
      const mosqueId = req.params.id;
      const allUsers = await storage.getUsersByMosque(mosqueId);
      const studentsCount = allUsers.filter(u => u.role === "student").length;
      const teachersCount = allUsers.filter(u => u.role === "teacher").length;
      const supervisorsCount = allUsers.filter(u => u.role === "supervisor").length;
      const activeStudents = allUsers.filter(u => u.role === "student" && u.isActive).length;

      const supervisor = allUsers.find(u => u.role === "supervisor");

      let attendanceRate = 0;
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const attendanceRows = await db.select().from(attendance)
          .where(and(
            eq(attendance.mosqueId, mosqueId),
            dsql`${attendance.date} >= ${thirtyDaysAgo.toISOString().split("T")[0]}`
          ));
        if (attendanceRows.length > 0) {
          const present = attendanceRows.filter(a => a.status === "present" || a.status === "late").length;
          attendanceRate = Math.round((present / attendanceRows.length) * 100);
        }
      } catch {}

      let lastActivity: string | null = null;
      try {
        const logs = await db.select().from(activityLogs)
          .where(eq(activityLogs.mosqueId, mosqueId))
          .orderBy(desc(activityLogs.createdAt))
          .limit(1);
        lastActivity = logs[0]?.createdAt?.toISOString() || null;
      } catch {}

      res.json({
        studentsCount,
        teachersCount,
        supervisorsCount,
        activeStudents,
        attendanceRate,
        lastActivity,
        supervisorName: supervisor?.name || null,
        supervisorPhone: supervisor?.phone || null,
        supervisorId: supervisor?.id || null,
        lastSupervisorLogin: supervisor?.createdAt || null,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب الإحصائيات" });
    }
  });

  app.get("/api/mosques/:id/users-list", requireRole("admin"), async (req, res) => {
    try {
      const mosqueId = req.params.id;
      const role = req.query.role as string;
      const allUsers = await storage.getUsersByMosque(mosqueId);
      const filtered = role ? allUsers.filter(u => u.role === role) : allUsers;
      const safe = filtered.map(u => ({
        id: u.id, name: u.name, username: u.username, role: u.role,
        phone: u.phone, isActive: u.isActive, createdAt: u.createdAt,
        parentPhone: u.parentPhone, level: u.level,
      }));
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/mosques/:id/history", requireRole("admin"), async (req, res) => {
    try {
      const history = await db.select().from(mosqueHistory)
        .where(eq(mosqueHistory.mosqueId, req.params.id))
        .orderBy(desc(mosqueHistory.createdAt))
        .limit(50);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.patch("/api/mosques/:id/status", requireRole("admin"), async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["active", "suspended", "permanently_closed"];
      if (!validStatuses.includes(status)) return res.status(400).json({ message: "حالة غير صالحة" });
      const mosque = await storage.getMosque(req.params.id);
      if (!mosque) return res.status(404).json({ message: "غير موجود" });

      await storage.updateMosque(req.params.id, { status });

      if (status === "suspended") {
        const mosqueUsers = await storage.getUsersByMosque(req.params.id);
        for (const u of mosqueUsers) {
          if (u.role !== "admin") {
            await storage.updateUser(u.id, { isActive: false });
          }
        }
      } else if (status === "active") {
        const mosqueUsers = await storage.getUsersByMosque(req.params.id);
        for (const u of mosqueUsers) {
          await storage.updateUser(u.id, { isActive: true });
        }
      }

      const statusLabels: Record<string, string> = { active: "نشط", suspended: "موقوف مؤقتاً", permanently_closed: "مغلق نهائياً" };
      await db.insert(mosqueHistory).values({
        mosqueId: req.params.id,
        type: "status_change",
        description: `تم تغيير الحالة إلى: ${statusLabels[status] || status}`,
        byUser: req.user!.username || req.user!.name,
      });

      await logActivity(req.user!, `تغيير حالة المسجد "${mosque.name}" إلى ${statusLabels[status] || status}`, "mosques");
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== MOSQUE MESSAGES ====================
  app.get("/api/mosques/:id/messages", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "admin" && req.user!.mosqueId !== req.params.id) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const msgs = await db.select().from(mosqueMessages)
        .where(eq(mosqueMessages.mosqueId, req.params.id))
        .orderBy(asc(mosqueMessages.createdAt))
        .limit(100);

      const isAdmin = req.user!.role === "admin";
      await db.update(mosqueMessages)
        .set({ isRead: true })
        .where(and(
          eq(mosqueMessages.mosqueId, req.params.id),
          eq(mosqueMessages.fromAdmin, !isAdmin),
          eq(mosqueMessages.isRead, false)
        ));

      res.json(msgs);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/mosques/:id/messages", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "admin" && req.user!.mosqueId !== req.params.id) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "الرسالة فارغة" });

      const isAdmin = req.user!.role === "admin";
      const [msg] = await db.insert(mosqueMessages).values({
        mosqueId: req.params.id,
        content: content.trim(),
        fromAdmin: isAdmin,
        senderName: isAdmin ? "إدارة النظام" : (req.user!.name || req.user!.username),
      }).returning();

      await db.insert(mosqueHistory).values({
        mosqueId: req.params.id,
        type: "message_sent",
        description: `رسالة ${isAdmin ? "من الإدارة" : "من المشرف"}`,
        byUser: req.user!.name || req.user!.username,
      });

      res.json(msg);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/messages/unread-admin-count", requireRole("admin"), async (req, res) => {
    try {
      const result = await db.select({ value: count() })
        .from(mosqueMessages)
        .where(and(
          eq(mosqueMessages.fromAdmin, false),
          eq(mosqueMessages.isRead, false)
        ));
      res.json({ count: result[0]?.value ?? 0 });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== ADMIN BROADCAST TO ALL SUPERVISORS ====================
  app.post("/api/mosques/broadcast-notification", requireRole("admin"), async (req, res) => {
    try {
      const { title, message } = req.body;
      if (!title || !message) {
        return res.status(400).json({ message: "العنوان والرسالة مطلوبان" });
      }
      const allMosquesList = await storage.getMosques();
      let sent = 0;
      for (const m of allMosquesList) {
        const mosqueUsers = await storage.getUsersByMosque(m.id);
        const supervisors = mosqueUsers.filter(u => u.role === "supervisor" && u.isActive);
        for (const sup of supervisors) {
          await storage.createNotification({
            userId: sup.id,
            mosqueId: m.id,
            title,
            message,
            type: "admin_broadcast",
            isRead: false,
          });
          sent++;
        }
      }
      await logActivity(req.user!, `إشعار جماعي لـ ${sent} مشرف`, "notifications");
      res.json({ message: `تم إرسال الإشعار إلى ${sent} مشرف`, count: sent });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إرسال الإشعار الجماعي" });
    }
  });

  // ==================== PHONE CHECK ====================
  app.get("/api/phone/check", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const phone = (req.query.phone as string || "").replace(/[\s\-\.]/g, "");
      const excludeId = req.query.excludeId as string | undefined;
      if (!phone) {
        return res.json({ exists: false });
      }
      let usersToCheck: User[];
      if (currentUser.role === "admin") {
        usersToCheck = await storage.getUsers();
      } else if (currentUser.mosqueId) {
        usersToCheck = await storage.getUsersByMosque(currentUser.mosqueId);
      } else {
        usersToCheck = [];
      }
      const cleanDigits = (s: string) => (s || "").replace(/[^\d]/g, "");
      const cleanPhone = cleanDigits(phone);
      const exists = usersToCheck.some(u => {
        if (excludeId && u.id === excludeId) return false;
        const up = cleanDigits(u.phone || "");
        const upp = cleanDigits(u.parentPhone || "");
        return (up && up === cleanPhone) || (upp && upp === cleanPhone);
      });
      return res.json({ exists });
    } catch (error) {
      res.status(500).json({ exists: false });
    }
  });

  // ==================== USERNAME CHECK ====================
  app.get("/api/check-username/:username", requireAuth, async (req, res) => {
    try {
      const username = req.params.username.trim().toLowerCase();
      if (!username || username.length < 2) {
        return res.json({ available: false, message: "اسم المستخدم قصير جداً" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.json({ available: false, message: "اسم المستخدم مستخدم بالفعل" });
      }
      return res.json({ available: true, message: "اسم المستخدم متاح" });
    } catch (error) {
      res.status(500).json({ available: false, message: "خطأ في التحقق" });
    }
  });

  // ==================== USERS ====================
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const role = req.query.role as string | undefined;
      let result: User[] = [];

      if (currentUser.role === "admin") {
        const mosqueId = req.query.mosqueId as string | undefined;
        if (mosqueId && role) {
          result = await storage.getUsersByMosqueAndRole(mosqueId, role);
        } else if (mosqueId) {
          result = await storage.getUsersByMosque(mosqueId);
        } else if (role) {
          result = await storage.getUsersByRole(role);
        } else {
          result = await storage.getUsers();
        }
      } else if (currentUser.role === "teacher") {
        if (role === "student" && currentUser.mosqueId) {
          const allStudents = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student");
          result = allStudents.filter(s => canTeacherAccessStudent(currentUser, s) && !s.pendingApproval);
        } else if (currentUser.mosqueId) {
          if (role) {
            result = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, role);
          } else {
            result = await storage.getUsersByMosque(currentUser.mosqueId);
          }
        } else {
          result = (await storage.getUsersByTeacher(currentUser.id)).filter(s => !s.pendingApproval);
        }
      } else if (currentUser.mosqueId) {
        if (role) {
          result = (await storage.getUsersByMosqueAndRole(currentUser.mosqueId, role)).filter(s => role === "student" ? !s.pendingApproval : true);
        } else {
          result = await storage.getUsersByMosque(currentUser.mosqueId);
        }
      }

      let safe;
      if (currentUser.role === "admin" || currentUser.role === "supervisor") {
        safe = result.map(({ password, ...u }) => u);
      } else if (currentUser.role === "teacher") {
        const myStudentIds = new Set((await storage.getUsersByTeacher(currentUser.id)).map(s => s.id));
        safe = result.map(({ password, phone, parentPhone, address, telegramId, ...u }) => {
          if (myStudentIds.has(u.id) || u.id === currentUser.id) {
            return { ...u, phone, parentPhone, address, telegramId };
          }
          return u;
        });
      } else {
        safe = result.map(({ password, phone, parentPhone, address, telegramId, ...u }) => {
          if (u.id === currentUser.id) {
            return { ...u, phone, parentPhone, address, telegramId };
          }
          return u;
        });
      }
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.get("/api/students", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let students: User[] = [];
      if (currentUser.role === "admin") {
        students = await storage.getUsersByRole("student");
      } else if (currentUser.role === "teacher") {
        if (currentUser.mosqueId) {
          const allStudents = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student");
          students = allStudents.filter(s => canTeacherAccessStudent(currentUser, s) && !s.pendingApproval);
        } else {
          students = (await storage.getUsersByTeacher(currentUser.id)).filter(s => !s.pendingApproval);
        }
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        students = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student");
      } else if (currentUser.mosqueId) {
        students = (await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student")).filter(s => !s.pendingApproval);
      }
      const safe = students.map(({ password, ...u }) => u);
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب بيانات الطلاب" });
    }
  });

  app.get("/api/users/pending-approval", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      let allUsers: User[] = [];
      if (currentUser.role === "admin") {
        allUsers = await storage.getUsers();
      } else if (currentUser.mosqueId) {
        allUsers = await storage.getUsersByMosque(currentUser.mosqueId);
      }
      const pending = allUsers.filter(u => u.pendingApproval);
      const safe = pending.map(({ password, ...u }) => u);
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      const currentUser = req.user!;
      if (currentUser.role !== "admin" && user.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا المستخدم" });
      }
      const { password, ...safe } = user;
      if (currentUser.role === "student" && user.id !== currentUser.id) {
        const { phone: _p, parentPhone: _pp, address: _a, telegramId: _t, ...limited } = safe;
        return res.json(limited);
      }
      if (currentUser.role === "teacher" && user.id !== currentUser.id) {
        const isMyStudent = user.teacherId === currentUser.id;
        if (!isMyStudent && user.role !== "student") {
          const { phone: _p, parentPhone: _pp, address: _a, telegramId: _t, ...limited } = safe;
          return res.json(limited);
        }
      }
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const targetRole = req.body.role;

      if (currentUser.role === "admin") {
        if (!["admin", "supervisor", "teacher", "student"].includes(targetRole)) {
          return res.status(400).json({ message: "دور المستخدم غير صحيح" });
        }
      } else if (currentUser.role === "supervisor") {
        if (targetRole !== "teacher" && targetRole !== "student") {
          return res.status(403).json({ message: "المشرف يمكنه إنشاء حسابات الأساتذة والطلاب فقط" });
        }
        req.body.role = targetRole;
        req.body.mosqueId = currentUser.mosqueId;
        req.body.isActive = true;
        delete req.body.canPrintIds;
      } else if (currentUser.role === "teacher") {
        req.body.role = "student";
        req.body.mosqueId = currentUser.mosqueId;
        req.body.teacherId = currentUser.id;
        req.body.isActive = false;
        req.body.pendingApproval = true;
        delete req.body.canPrintIds;
      } else {
        return res.status(403).json({ message: "غير مصرح بإنشاء حسابات" });
      }

      const contentCheck = filterTextFields(req.body, ["name", "address", "notes"]);
      if (contentCheck.blocked) {
        return res.status(400).json({ message: contentCheck.reason });
      }

      const { username, name, role: userRole, mosqueId: bodyMosqueId, teacherId, phone, address, gender, avatar, isActive, canPrintIds, age, telegramId, parentPhone, educationLevel, isSpecialNeeds, isOrphan, level, teacherLevels } = req.body;
      if (!username || typeof username !== "string" || username.length < 3 || username.length > 50) {
        return res.status(400).json({ message: "اسم المستخدم مطلوب ويجب أن يكون بين 3 و 50 حرف" });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط" });
      }
      if (!name || typeof name !== "string" || name.length > 200) {
        return res.status(400).json({ message: "الاسم مطلوب ويجب ألا يتجاوز 200 حرف" });
      }
      const rawPassword = req.body.password || crypto.randomBytes(4).toString("hex");
      if (req.body.password) {
        if (typeof req.body.password !== "string" || req.body.password.length < 8) {
          return res.status(400).json({ message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
        }
        if (req.body.password.length > 128) {
          return res.status(400).json({ message: "كلمة المرور طويلة جداً" });
        }
        if (!/[A-Za-z]/.test(req.body.password) || !/[0-9]/.test(req.body.password)) {
          return res.status(400).json({ message: "كلمة المرور يجب أن تحتوي على حروف وأرقام" });
        }
      }
      const userFieldCheck = validateFields(req.body, ["phone", "parentPhone", "address", "telegramId", "educationLevel", "gender"]);
      if (!userFieldCheck.valid) return res.status(400).json({ message: userFieldCheck.error });
      const ageCheck = validateAge(age);
      if (!ageCheck.valid) return res.status(400).json({ message: ageCheck.error });
      const boolChecks = [
        validateBoolean(isSpecialNeeds, "isSpecialNeeds"),
        validateBoolean(isOrphan, "isOrphan"),
      ];
      for (const bc of boolChecks) { if (!bc.valid) return res.status(400).json({ message: bc.error }); }
      if (teacherLevels) {
        const tlCheck = validateTeacherLevels(teacherLevels);
        if (!tlCheck.valid) return res.status(400).json({ message: tlCheck.error });
      }
      if (gender !== undefined && gender !== null) {
        const genderCheck = validateEnum(gender, "gender", ["male", "female", "ذكر", "أنثى"]);
        if (!genderCheck.valid) return res.status(400).json({ message: genderCheck.error });
      }
      if (req.body.role === "student" && (!parentPhone || typeof parentPhone !== "string" || parentPhone.length < 10)) {
        return res.status(400).json({ message: "رقم هاتف ولي الأمر مطلوب للطلاب" });
      }
      if (phone) {
        const phoneDup = await storage.checkPhoneExists(phone);
        if (phoneDup) {
          return res.status(400).json({ message: "رقم الهاتف مستخدم بالفعل" });
        }
      }
      if (parentPhone) {
        const cleanDigits = (s: string) => (s || "").replace(/[^\d]/g, "");
        const cleanPP = cleanDigits(parentPhone);
        let siblingPool: User[];
        if (currentUser.role === "admin") {
          siblingPool = await storage.getUsers();
        } else if (currentUser.mosqueId) {
          siblingPool = await storage.getUsersByMosque(currentUser.mosqueId);
        } else {
          siblingPool = [];
        }
        const detectedSiblings = siblingPool.filter(u => {
          const upp = cleanDigits(u.parentPhone || "");
          return upp && upp === cleanPP && u.role === "student";
        });
        req.body._detectedSiblings = detectedSiblings.map(s => ({ id: s.id, name: s.name }));
      }
      const data: any = {
        username, name, password: await hashPassword(rawPassword),
        role: req.body.role, mosqueId: req.body.mosqueId, teacherId,
        phone, address, gender, avatar, isActive, canPrintIds, age, telegramId, parentPhone, educationLevel, isSpecialNeeds, isOrphan,
        level: req.body.role === "student" ? (level || 1) : undefined,
        teacherLevels: req.body.role === "teacher" ? (teacherLevels || "1,2,3,4,5,6") : undefined,
        pendingApproval: req.body.pendingApproval || false,
      };
      const user = await storage.createUser(data);
      const { password, ...safe } = user;
      await logActivity(currentUser, `إنشاء حساب: ${user.name} (${targetRole})`, "users");

      if (req.body._detectedSiblings?.length > 0 && user.mosqueId && user.parentPhone) {
        for (const sibling of req.body._detectedSiblings) {
          try {
            await storage.createFamilyLink({
              parentPhone: user.parentPhone,
              studentId: user.id,
              mosqueId: user.mosqueId,
              relationship: "sibling",
            });
            const supervisors = await storage.getUsersByMosqueAndRole(user.mosqueId, "supervisor");
            for (const sup of supervisors) {
              await storage.createNotification({
                userId: sup.id,
                title: "اكتشاف عائلة",
                message: `${user.name} أخ/أخت لـ ${sibling.name} — تم ربطهما تلقائياً في نظام الأسر`,
                type: "info",
              });
            }
          } catch {}
        }
      }

      if (currentUser.role === "teacher" && user.pendingApproval && currentUser.mosqueId) {
        const supervisors = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "supervisor");
        for (const supervisor of supervisors) {
          await storage.createNotification({
            userId: supervisor.id,
            mosqueId: currentUser.mosqueId,
            title: "طالب جديد بانتظار الموافقة",
            message: `قام الأستاذ ${currentUser.name} بإضافة الطالب ${user.name} - يرجى الموافقة أو الرفض`,
            type: "info",
            isRead: false,
          });
        }
      }

      res.status(201).json(safe);
    } catch (err: any) {
      console.error(err); res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
    const currentUser = req.user!;
    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });

    if (currentUser.role !== "admin" && targetUser.mosqueId !== currentUser.mosqueId) {
      return res.status(403).json({ message: "غير مصرح بتعديل هذا المستخدم" });
    }

    const isTeacherOfStudent = currentUser.role === "teacher" && targetUser.role === "student" && 
      (targetUser.teacherId === currentUser.id || canTeacherAccessStudent(currentUser, targetUser));
    const canEdit =
      currentUser.role === "admin" ||
      currentUser.id === req.params.id ||
      (currentUser.role === "supervisor" && ["teacher", "student"].includes(targetUser.role)) ||
      isTeacherOfStudent;

    if (!canEdit) {
      return res.status(403).json({ message: "غير مصرح بتعديل هذا المستخدم" });
    }

    const safeFields = ["name", "phone", "address", "gender", "avatar", "age", "telegramId", "parentPhone", "educationLevel", "isSpecialNeeds", "isOrphan", "password"];
    const supervisorFields = ["teacherId", "level", "teacherLevels"];
    const adminOnlyFields = ["role", "mosqueId", "isActive", "canPrintIds", "username", "adminNotes", "suspendedUntil"];
    const allAllowedFields = [...safeFields, ...supervisorFields, ...adminOnlyFields];
    const receivedKeys = Object.keys(req.body);
    const forbiddenKeys = receivedKeys.filter(k => !allAllowedFields.includes(k));
    if (forbiddenKeys.length > 0) {
      return res.status(400).json({ message: `حقول غير مسموحة: ${forbiddenKeys.join(", ")}` });
    }
    if (currentUser.role !== "admin") {
      const attemptedAdminFields = receivedKeys.filter(k => adminOnlyFields.includes(k));
      if (attemptedAdminFields.length > 0) {
        return res.status(403).json({ message: "غير مصرح بتعديل هذه الحقول" });
      }
      if (currentUser.id === req.params.id) {
        const attemptedSupervisorFields = receivedKeys.filter(k => supervisorFields.includes(k));
        if (attemptedSupervisorFields.length > 0) {
          return res.status(403).json({ message: "لا يمكنك تعديل هذه الحقول لحسابك الشخصي" });
        }
      }
      if (currentUser.role === "teacher" && targetUser.role === "student") {
        const teacherForbidden = receivedKeys.filter(k => supervisorFields.includes(k) && k !== "teacherId");
        if (teacherForbidden.length > 0) {
          return res.status(403).json({ message: "الأستاذ لا يمكنه تعديل مستوى الطالب" });
        }
      }
    }

    const updateData: any = {};
    const { name, phone, address, gender, avatar, teacherId, age, telegramId, parentPhone, educationLevel, isSpecialNeeds, isOrphan, level, teacherLevels } = req.body;

    const patchFieldCheck = validateFields(req.body, ["name", "phone", "parentPhone", "address", "telegramId", "educationLevel"]);
    if (!patchFieldCheck.valid) return res.status(400).json({ message: patchFieldCheck.error });
    const patchAgeCheck = validateAge(age);
    if (!patchAgeCheck.valid) return res.status(400).json({ message: patchAgeCheck.error });
    if (gender !== undefined && gender !== null) {
      const gCheck = validateEnum(gender, "gender", ["male", "female", "ذكر", "أنثى"]);
      if (!gCheck.valid) return res.status(400).json({ message: gCheck.error });
    }
    if (isSpecialNeeds !== undefined) {
      const bCheck = validateBoolean(isSpecialNeeds, "isSpecialNeeds");
      if (!bCheck.valid) return res.status(400).json({ message: bCheck.error });
    }
    if (isOrphan !== undefined) {
      const bCheck = validateBoolean(isOrphan, "isOrphan");
      if (!bCheck.valid) return res.status(400).json({ message: bCheck.error });
    }
    if (teacherLevels !== undefined) {
      const tlCheck = validateTeacherLevels(teacherLevels);
      if (!tlCheck.valid) return res.status(400).json({ message: tlCheck.error });
    }

    if (phone !== undefined && phone) {
      const phoneDup = await storage.checkPhoneExists(phone, req.params.id);
      if (phoneDup) {
        return res.status(400).json({ message: "رقم الهاتف مستخدم بالفعل" });
      }
    }
    

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (gender !== undefined) updateData.gender = gender;
    if (avatar !== undefined) updateData.avatar = sanitizeImageUrl(avatar);
    if (teacherId !== undefined) updateData.teacherId = teacherId;
    if (age !== undefined) updateData.age = age;
    if (telegramId !== undefined) updateData.telegramId = telegramId;
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone;
    if (educationLevel !== undefined) updateData.educationLevel = educationLevel;
    if (isSpecialNeeds !== undefined) updateData.isSpecialNeeds = isSpecialNeeds;
    if (isOrphan !== undefined) updateData.isOrphan = isOrphan;
    if (level !== undefined) updateData.level = level;
    if (teacherLevels !== undefined) updateData.teacherLevels = teacherLevels;

    if (req.body.password) {
      if (typeof req.body.password !== "string" || req.body.password.length < 8) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
      }
      if (req.body.password.length > 128) {
        return res.status(400).json({ message: "كلمة المرور طويلة جداً" });
      }
      if (!/[A-Za-z]/.test(req.body.password) || !/[0-9]/.test(req.body.password)) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تحتوي على حروف وأرقام" });
      }
      if (currentUser.id !== req.params.id && currentUser.role !== "admin") {
        if (!["supervisor", "teacher"].includes(currentUser.role)) {
          return res.status(403).json({ message: "غير مصرح بتغيير كلمة المرور" });
        }
      }
      updateData.password = await hashPassword(req.body.password);
      await logActivity(currentUser, `تغيير كلمة مرور المستخدم ${targetUser.name} (${targetUser.username})`, "security");
    }

    if (currentUser.role === "admin") {
      if (req.body.role !== undefined) {
        const validRoles = ["admin", "supervisor", "teacher", "student"];
        if (!validRoles.includes(req.body.role)) {
          return res.status(400).json({ message: "دور غير صالح" });
        }
        updateData.role = req.body.role;
      }
      if (req.body.mosqueId !== undefined) updateData.mosqueId = req.body.mosqueId;
      if (req.body.isActive !== undefined) {
        if (targetUser.role === "admin" && req.body.isActive === false) {
          return res.status(403).json({ message: "لا يمكن التحكم بحساب مدير النظام" });
        }
        updateData.isActive = req.body.isActive;
      }
      if (req.body.canPrintIds !== undefined) {
        const cpCheck = validateBoolean(req.body.canPrintIds, "canPrintIds");
        if (!cpCheck.valid) return res.status(400).json({ message: cpCheck.error });
        updateData.canPrintIds = req.body.canPrintIds;
      }
      if (req.body.username !== undefined) {
        if (typeof req.body.username !== "string" || req.body.username.length < 3 || req.body.username.length > 50) {
          return res.status(400).json({ message: "اسم المستخدم يجب أن يكون بين 3 و 50 حرف" });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(req.body.username)) {
          return res.status(400).json({ message: "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط" });
        }
        updateData.username = req.body.username;
      }
      if (req.body.adminNotes !== undefined) {
        const anCheck = validateFields({ adminNotes: req.body.adminNotes }, ["adminNotes"]);
        if (!anCheck.valid) return res.status(400).json({ message: anCheck.error });
        updateData.adminNotes = req.body.adminNotes;
      }
      if (req.body.suspendedUntil !== undefined) {
        if (targetUser.role === "admin") {
          return res.status(403).json({ message: "لا يمكن التحكم بحساب مدير النظام" });
        }
        if (req.body.suspendedUntil) {
          const dateCheck = validateDate(req.body.suspendedUntil, "suspendedUntil");
          if (!dateCheck.valid) return res.status(400).json({ message: dateCheck.error });
          updateData.suspendedUntil = new Date(req.body.suspendedUntil);
        } else {
          updateData.suspendedUntil = null;
        }
      }
    }

    const updated = await storage.updateUser(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "المستخدم غير موجود" });

    if (updateData.isActive === false || updateData.suspendedUntil) {
      sessionTracker.removeSessionsByUserId(req.params.id);
    }
    if (updateData.role || updateData.isActive !== undefined || updateData.suspendedUntil !== undefined) {
      await logActivity(currentUser, `تحديث أمني للمستخدم ${updated.name}: ${Object.keys(updateData).join(", ")}`, "security");
    }

    const { password, ...safe } = updated;
    return res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تحديث البيانات" });
    }
  });

  app.delete("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (targetUser.role === "admin") {
        return res.status(403).json({ message: "لا يمكن حذف حساب مدير النظام" });
      }
      await logActivity(req.user!, `حذف المستخدم ${targetUser.name} (${targetUser.username}) - الدور: ${targetUser.role}`, "security");
      await storage.deleteUser(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف المستخدم" });
    }
  });

  // ==================== STUDENT APPROVAL ====================
  app.post("/api/users/:id/approve", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (!user.pendingApproval) {
        return res.status(400).json({ message: "هذا المستخدم ليس بانتظار الموافقة" });
      }
      if (currentUser.role === "supervisor" && user.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      await storage.updateUser(req.params.id, { pendingApproval: false, isActive: true });
      if (user.teacherId) {
        await storage.createNotification({
          userId: user.teacherId,
          mosqueId: user.mosqueId,
          title: "تمت الموافقة على الطالب",
          message: `تمت الموافقة على تسجيل الطالب ${user.name} في النظام`,
          type: "success",
          isRead: false,
        });
      }
      await storage.createNotification({
        userId: req.params.id,
        mosqueId: user.mosqueId,
        title: "تمت الموافقة",
        message: "تمت الموافقة على تسجيلك في النظام",
        type: "success",
        isRead: false,
      });
      await logActivity(currentUser, `الموافقة على الطالب: ${user.name}`, "users");
      res.json({ message: "تمت الموافقة بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/users/:id/reject", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (!user.pendingApproval) {
        return res.status(400).json({ message: "هذا المستخدم ليس بانتظار الموافقة" });
      }
      if (currentUser.role === "supervisor" && user.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { reason } = req.body;
      await storage.updateUser(req.params.id, { pendingApproval: false, isActive: false });
      if (user.teacherId) {
        await storage.createNotification({
          userId: user.teacherId,
          mosqueId: user.mosqueId,
          title: "تم رفض الطالب",
          message: `تم رفض تسجيل الطالب ${user.name}${reason ? ` - السبب: ${reason}` : ''}`,
          type: "warning",
          isRead: false,
        });
      }
      await logActivity(currentUser, `رفض الطالب: ${user.name}`, "users", reason || undefined);
      res.json({ message: "تم الرفض بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== TOGGLE PRINT PERMISSION ====================
  app.post("/api/users/:id/toggle-print", requireRole("admin"), async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (!["supervisor", "teacher"].includes(targetUser.role)) {
        return res.status(400).json({ message: "يمكن منح الصلاحية للمشرفين والأساتذة فقط" });
      }
      const updated = await storage.updateUser(req.params.id, { canPrintIds: !targetUser.canPrintIds });
      if (!updated) return res.status(500).json({ message: "فشل في تحديث الصلاحية" });
      await logActivity(req.user!, `${updated.canPrintIds ? 'منح' : 'سحب'} صلاحية طباعة الهويات ${updated.canPrintIds ? 'لـ' : 'من'} ${updated.name}`, "permissions");
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تحديث الصلاحية" });
    }
  });

  // ==================== ASSIGNMENTS ====================
  app.get("/api/assignments", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { studentId, teacherId } = req.query;
      let result: Assignment[] = [];

      if (currentUser.role === "admin") {
        if (studentId) {
          result = await storage.getAssignmentsByStudent(studentId as string);
        } else if (teacherId) {
          result = await storage.getAssignmentsByTeacher(teacherId as string);
        } else {
          result = await storage.getAssignments();
        }
      } else if (currentUser.role === "student") {
        result = await storage.getAssignmentsByStudent(currentUser.id);
      } else if (currentUser.role === "teacher") {
        if (studentId) {
          const student = await storage.getUser(studentId as string);
          if (student && canTeacherAccessStudent(currentUser, student)) {
            result = await storage.getAssignmentsByStudent(studentId as string);
          } else {
            return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الطالب" });
          }
        } else if (currentUser.mosqueId) {
          const mosqueAssignments = await storage.getAssignmentsByMosque(currentUser.mosqueId);
          const teacherLevels = getTeacherLevelsArray(currentUser);
          const mosqueStudents = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student");
          const levelStudentIds = new Set(mosqueStudents.filter(s => !s.pendingApproval && teacherLevels.includes(s.level || 1)).map(s => s.id));
          result = mosqueAssignments.filter(a => levelStudentIds.has(a.studentId));
        } else {
          result = await storage.getAssignmentsByTeacher(currentUser.id);
        }
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        if (studentId) {
          const student = await storage.getUser(studentId as string);
          if (student && student.mosqueId === currentUser.mosqueId) {
            result = await storage.getAssignmentsByStudent(studentId as string);
          } else {
            return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الطالب" });
          }
        } else if (teacherId) {
          const teacher = await storage.getUser(teacherId as string);
          if (teacher && teacher.mosqueId === currentUser.mosqueId) {
            result = await storage.getAssignmentsByTeacher(teacherId as string);
          } else {
            return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الأستاذ" });
          }
        } else {
          result = await storage.getAssignmentsByMosque(currentUser.mosqueId);
        }
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/assignments", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء واجبات" });
      }

      const contentCheck = filterTextFields(req.body, ["notes"]);
      if (contentCheck.blocked) {
        return res.status(400).json({ message: contentCheck.reason });
      }

      const { studentId, surahName, fromVerse, toVerse, type, scheduledDate, status, notes } = req.body;
      if (!studentId || !surahName || fromVerse === undefined || toVerse === undefined || !scheduledDate) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const typeCheck = validateEnum(type || "new", "type", ["new", "review", "test", "memorization", "revision", "حفظ", "مراجعة"]);
      if (!typeCheck.valid) return res.status(400).json({ message: typeCheck.error });
      const statusCheck = validateEnum(status || "pending", "status", ["pending", "done", "missed", "incomplete"]);
      if (!statusCheck.valid) return res.status(400).json({ message: statusCheck.error });
      const dateCheck = validateDate(scheduledDate, "scheduledDate");
      if (!dateCheck.valid) return res.status(400).json({ message: dateCheck.error });
      const notesCheck = validateFields(req.body, ["notes", "surahName"]);
      if (!notesCheck.valid) return res.status(400).json({ message: notesCheck.error });

      const fromVerseNum = Number(fromVerse);
      const toVerseNum = Number(toVerse);
      if (!Number.isInteger(fromVerseNum) || !Number.isInteger(toVerseNum) || fromVerseNum < 1 || toVerseNum < 1 || toVerseNum < fromVerseNum) {
        return res.status(400).json({ message: "أرقام الآيات غير صحيحة" });
      }

      const student = await storage.getUser(studentId);
      if (!student || student.role !== "student") {
        return res.status(400).json({ message: "الطالب غير موجود" });
      }

      if (currentUser.role === "teacher" && !canTeacherAccessStudent(currentUser, student)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء واجبات لهذا الطالب - مستوى الطالب لا يتطابق مع مستوياتك" });
      }
      if (currentUser.role === "supervisor" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بإنشاء واجبات لطالب من جامع آخر" });
      }

      const data = {
        studentId,
        teacherId: currentUser.id,
        mosqueId: currentUser.role === "admin" ? (req.body.mosqueId || currentUser.mosqueId) : currentUser.mosqueId,
        surahName,
        fromVerse: fromVerseNum,
        toVerse: toVerseNum,
        type: type || "new",
        scheduledDate: new Date(scheduledDate),
        status: status || "pending",
        notes,
      };
      const assignment = await storage.createAssignment(data);
      await storage.createNotification({
        userId: req.body.studentId,
        mosqueId: currentUser.mosqueId,
        title: "واجب جديد",
        message: `تم تعيين واجب جديد: ${req.body.surahName} (${req.body.fromVerse}-${req.body.toVerse})`,
        type: "info",
        isRead: false,
      });
      await logActivity(currentUser, `إنشاء واجب: ${req.body.surahName}`, "assignments", `للطالب ${req.body.studentId}`);
      res.status(201).json(assignment);
    } catch (err: any) {
      console.error(err); res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  app.patch("/api/assignments/:id/seen", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });
      const currentUser = req.user!;
      if (currentUser.role === "student" && assignment.studentId !== currentUser.id) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "teacher") {
        const student = await storage.getUser(assignment.studentId);
        if (!student || !canTeacherAccessStudent(currentUser, student)) {
          return res.status(403).json({ message: "غير مصرح" });
        }
      }
      if (currentUser.role === "supervisor" && assignment.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const updated = await storage.updateAssignment(req.params.id, { 
        seenByStudent: true, 
        seenAt: new Date() 
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.patch("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
    const currentUser = req.user!;
    if (currentUser.role === "student") {
      return res.status(403).json({ message: "غير مصرح بتعديل الواجبات" });
    }

    const assignment = await storage.getAssignment(req.params.id);
    if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });

    if (currentUser.role === "teacher") {
      const student = await storage.getUser(assignment.studentId);
      if (!student || !canTeacherAccessStudent(currentUser, student)) {
        return res.status(403).json({ message: "غير مصرح بتعديل هذا الواجب" });
      }
    }
    if (currentUser.role === "supervisor" && assignment.mosqueId !== currentUser.mosqueId) {
      return res.status(403).json({ message: "غير مصرح بتعديل هذا الواجب" });
    }

    const updateData: any = {};
    if (req.body.surahName !== undefined) updateData.surahName = req.body.surahName;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.seenByStudent !== undefined) updateData.seenByStudent = req.body.seenByStudent;
    if (req.body.seenAt !== undefined) updateData.seenAt = new Date(req.body.seenAt);
    if (req.body.scheduledDate !== undefined) updateData.scheduledDate = new Date(req.body.scheduledDate);
    if (req.body.fromVerse !== undefined) {
      const v = Number(req.body.fromVerse);
      if (!Number.isInteger(v) || v < 1) return res.status(400).json({ message: "رقم الآية غير صحيح" });
      updateData.fromVerse = v;
    }
    if (req.body.toVerse !== undefined) {
      const v = Number(req.body.toVerse);
      if (!Number.isInteger(v) || v < 1) return res.status(400).json({ message: "رقم الآية غير صحيح" });
      updateData.toVerse = v;
    }
    if (req.body.grade !== undefined) {
      const g = Number(req.body.grade);
      if (!Number.isInteger(g) || g < 0 || g > 100) return res.status(400).json({ message: "الدرجة يجب أن تكون بين 0 و 100" });
      updateData.grade = g;
    }
    if (req.body.status === "done" && assignment.hasAudio) {
      updateData.audioGradedAt = new Date();
    }
    const updated = await storage.updateAssignment(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "الواجب غير موجود" });
    // نقاط تلقائية عند إتمام الواجب
    if (req.body.status === "done" && assignment.status !== "done") {
      try {
        const verses = assignment.toVerse - assignment.fromVerse + 1;
        const autoPoints = Math.min(Math.max(verses, 3), 30);
        await storage.createPoint({
          userId: assignment.studentId, mosqueId: assignment.mosqueId,
          amount: autoPoints, category: "assignment",
          reason: `إتمام: ${assignment.surahName} (${assignment.fromVerse}-${assignment.toVerse}) — ${verses} آية`,
        });
        await storage.createNotification({
          userId: assignment.studentId, mosqueId: assignment.mosqueId,
          title: "أحسنت! واجب مكتمل",
          message: `تم منحك ${autoPoints} نقطة لإتمام واجب ${assignment.surahName}`,
          type: "success",
        });
      } catch (e) { console.error("خطأ في منح نقاط الإتمام:", e); }
    }
    if (req.body.grade !== undefined) {
      await logActivity(req.user!, `تقييم واجب بدرجة ${req.body.grade}`, "assignments", `واجب ${req.params.id}`);
    }
    if (req.body.grade !== undefined && assignment.grade === null) {
      const g = Number(req.body.grade);
      try {
        const autoPoints = g >= 90 ? 10 : g >= 75 ? 7 : g >= 60 ? 5 : 0;
        if (autoPoints > 0) {
          await storage.createPoint({
            userId: assignment.studentId,
            mosqueId: assignment.mosqueId,
            amount: autoPoints,
            category: "assignment",
            reason: `نقاط تلقائية - درجة ${g} في ${assignment.surahName || "واجب"}`,
          });
        }
        if (g < 60 && assignment.surahName) {
          await storage.createAssignment({
            studentId: assignment.studentId,
            teacherId: currentUser.id,
            mosqueId: assignment.mosqueId,
            surahName: assignment.surahName,
            fromVerse: assignment.fromVerse,
            toVerse: assignment.toVerse,
            type: "review",
            status: "pending",
            scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            notes: `مراجعة تلقائية - الدرجة السابقة: ${g}`,
          });
          await storage.createNotification({
            userId: assignment.studentId,
            mosqueId: assignment.mosqueId,
            title: "واجب مراجعة جديد",
            message: `تم إنشاء واجب مراجعة تلقائي لسورة ${assignment.surahName} (الآيات ${assignment.fromVerse}-${assignment.toVerse})`,
            type: "warning",
          });
        }
      } catch (e) { console.error("خطأ في منح نقاط التقييم:", e); }
    }
    res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تحديث الواجب" });
    }
  });

  const audioUploadDir = path.join(process.cwd(), "uploads", "audio");
  if (!fs.existsSync(audioUploadDir)) {
    fs.mkdirSync(audioUploadDir, { recursive: true });
  }
  const audioStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, audioUploadDir),
    filename: (req, file, cb) => {
      const ext = file.originalname.split(".").pop() || "webm";
      cb(null, `recitation_${req.params.id}_${Date.now()}.${ext}`);
    },
  });
  const audioUpload = multer({
    storage: audioStorage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("audio/")) cb(null, true);
      else cb(new Error("يُسمح فقط بملفات الصوت"));
    },
  });

  app.post("/api/assignments/:id/audio", requireAuth, audioUpload.single("audio"), async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "student") {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "فقط الطالب يمكنه رفع التسميع الصوتي" });
      }
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "الواجب غير موجود" });
      }
      if (assignment.studentId !== currentUser.id) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "غير مصرح برفع تسجيل لهذا الواجب" });
      }
      if (assignment.status === "done") {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "لا يمكن رفع تسجيل لواجب مكتمل" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم إرسال ملف صوتي" });
      }
      if (assignment.hasAudio && assignment.audioFileName) {
        const oldPath = path.join(audioUploadDir, assignment.audioFileName);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const updated = await storage.updateAssignment(req.params.id, {
        hasAudio: true,
        audioFileName: req.file.filename,
        audioUploadedAt: new Date(),
        audioGradedAt: null,
      });
      await storage.createNotification({
        userId: assignment.teacherId,
        mosqueId: assignment.mosqueId,
        title: "تسميع صوتي جديد",
        message: `قام الطالب ${currentUser.name} برفع تسميع صوتي لسورة ${assignment.surahName} (${assignment.fromVerse}-${assignment.toVerse})`,
        type: "info",
      });
      await logActivity(currentUser, "رفع تسميع صوتي", "assignments", `واجب ${req.params.id}`);
      res.json({ message: "تم رفع التسجيل بنجاح", assignment: updated });
    } catch (err: any) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ message: "حدث خطأ في رفع التسجيل" });
    }
  });

  app.get("/api/assignments/:id/audio", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });
      if (!assignment.hasAudio || !assignment.audioFileName) {
        return res.status(404).json({ message: "لا يوجد تسجيل صوتي لهذا الواجب" });
      }
      const currentUser = req.user!;
      const isOwner = assignment.studentId === currentUser.id;
      const isTeacher = currentUser.role === "teacher" && assignment.teacherId === currentUser.id;
      const isSupervisor = currentUser.role === "supervisor" && assignment.mosqueId === currentUser.mosqueId;
      const isAdmin = currentUser.role === "admin";
      if (!isOwner && !isTeacher && !isSupervisor && !isAdmin) {
        return res.status(403).json({ message: "غير مصرح بالاستماع لهذا التسجيل" });
      }
      const filePath = path.join(audioUploadDir, assignment.audioFileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "ملف التسجيل غير موجود (ربما تم حذفه تلقائياً)" });
      }
      const stat = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = ext === ".mp4" ? "audio/mp4" : ext === ".ogg" ? "audio/ogg" : "audio/webm";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Accept-Ranges", "bytes");
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunkSize = end - start + 1;
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
        res.setHeader("Content-Length", chunkSize);
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        fs.createReadStream(filePath).pipe(res);
      }
    } catch {
      res.status(500).json({ message: "حدث خطأ في تحميل التسجيل" });
    }
  });

  app.delete("/api/assignments/:id/audio", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });
      const isOwner = assignment.studentId === currentUser.id;
      const isTeacher = currentUser.role === "teacher" && assignment.teacherId === currentUser.id;
      const isAdmin = currentUser.role === "admin";
      if (!isOwner && !isTeacher && !isAdmin) {
        return res.status(403).json({ message: "غير مصرح بحذف هذا التسجيل" });
      }
      if (assignment.hasAudio && assignment.audioFileName) {
        const filePath = path.join(audioUploadDir, assignment.audioFileName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await storage.updateAssignment(req.params.id, {
        hasAudio: false,
        audioFileName: null,
        audioUploadedAt: null,
        audioGradedAt: null,
      });
      await logActivity(currentUser, "حذف تسميع صوتي", "assignments", `واجب ${req.params.id}`);
      res.json({ message: "تم حذف التسجيل بنجاح" });
    } catch {
      res.status(500).json({ message: "حدث خطأ في حذف التسجيل" });
    }
  });

  setInterval(async () => {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const gradedAssignments = await db
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.hasAudio, true),
            dsql`${assignments.audioGradedAt} IS NOT NULL AND ${assignments.audioGradedAt} < ${fiveMinAgo.toISOString()}`
          )
        );
      for (const a of gradedAssignments) {
        if (a.audioFileName) {
          try {
            const filePath = path.join(audioUploadDir, a.audioFileName);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (fileErr) {
            console.error(`خطأ في حذف ملف صوتي ${a.audioFileName}:`, fileErr);
          }
          await db
            .update(assignments)
            .set({ hasAudio: false, audioFileName: null })
            .where(eq(assignments.id, a.id));
        }
      }
    } catch (err) {
      console.error("خطأ في تنظيف الملفات الصوتية:", err);
    }
  }, 60 * 1000);

  app.delete("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "غير مصرح بحذف الواجبات" });
      }

      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });

      if (currentUser.role === "teacher") {
        const student = await storage.getUser(assignment.studentId);
        if (!student || !canTeacherAccessStudent(currentUser, student)) {
          return res.status(403).json({ message: "غير مصرح بحذف هذا الواجب" });
        }
      }
      if (currentUser.role === "supervisor" && assignment.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بحذف هذا الواجب" });
      }

      await storage.deleteAssignment(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف الواجب" });
    }
  });

  // ==================== RATINGS ====================
  app.get("/api/ratings", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { userId, mosqueId } = req.query;

      if (currentUser.role === "admin") {
        if (userId) {
          return res.json(await storage.getRatingsByUser(userId as string));
        }
        if (mosqueId) {
          return res.json(await storage.getRatingsByMosque(mosqueId as string));
        }
        return res.json([]);
      }

      if (userId) {
        const targetUser = await storage.getUser(userId as string);
        if (!targetUser || targetUser.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لتقييمات هذا المستخدم" });
        }
        return res.json(await storage.getRatingsByUser(userId as string));
      }

      if (mosqueId) {
        if (currentUser.mosqueId !== mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لتقييمات هذا الجامع" });
        }
        return res.json(await storage.getRatingsByMosque(mosqueId as string));
      }

      if (currentUser.mosqueId) {
        return res.json(await storage.getRatingsByMosque(currentUser.mosqueId));
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/ratings", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { toUserId, stars, honorBadge, comment, type } = req.body;

      if (!toUserId || !stars || !type) {
        return res.status(400).json({ message: "يرجى تعبئة جميع الحقول المطلوبة" });
      }

      const starsNum = Number(stars);
      if (!Number.isInteger(starsNum) || starsNum < 1 || starsNum > 5) {
        return res.status(400).json({ message: "التقييم يجب أن يكون بين 1 و 5 نجوم" });
      }

      const targetUser = await storage.getUser(toUserId);
      if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });

      if (!["supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالتقييم" });
      }

      if (currentUser.mosqueId && targetUser.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتقييم مستخدم من جامع آخر" });
      }

      if (currentUser.role === "supervisor" && targetUser.role !== "teacher") {
        return res.status(403).json({ message: "المشرف يمكنه تقييم الأساتذة فقط" });
      }
      if (currentUser.role === "teacher" && targetUser.role !== "student") {
        return res.status(403).json({ message: "الأستاذ يمكنه تقييم الطلاب فقط" });
      }
      if (currentUser.role === "teacher" && !canTeacherAccessStudent(currentUser, targetUser)) {
        return res.status(403).json({ message: "لا يمكنك تقييم طالب غير تابع لك" });
      }

      const rating = await storage.createRating({
        fromUserId: currentUser.id,
        toUserId,
        mosqueId: currentUser.mosqueId,
        stars: Number(stars),
        honorBadge: honorBadge || false,
        comment,
        type,
      });

      await storage.createNotification({
        userId: toUserId,
        mosqueId: currentUser.mosqueId,
        title: honorBadge ? "وسام شرف!" : "تقييم جديد",
        message: honorBadge
          ? `حصلت على وسام شرف من ${currentUser.name} - ${stars} نجوم`
          : `حصلت على تقييم ${stars} نجوم من ${currentUser.name}`,
        type: honorBadge ? "success" : "info",
        isRead: false,
      });

      await logActivity(currentUser, `تقييم ${targetUser.name}: ${stars} نجوم${honorBadge ? ' + وسام شرف' : ''}`, "ratings");
      res.status(201).json(rating);
    } catch (err: any) {
      console.error(err); res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  // ==================== EXAMS ====================
  app.get("/api/exams", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "teacher" && currentUser.mosqueId) {
        return res.json(await storage.getExamsByMosque(currentUser.mosqueId));
      } else if (currentUser.role === "teacher") {
        return res.json(await storage.getExamsByTeacher(currentUser.id));
      }
      if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        return res.json(await storage.getExamsByMosque(currentUser.mosqueId));
      }
      if (currentUser.role === "admin") {
        const mosqueId = req.query.mosqueId as string;
        if (mosqueId) return res.json(await storage.getExamsByMosque(mosqueId));
        return res.json([]);
      }
      if (currentUser.role === "student") {
        const examStudentList = await storage.getExamsByStudent(currentUser.id);
        const examIds = examStudentList.map(es => es.examId);
        const examsList = [];
        for (const eid of examIds) {
          const e = await storage.getExam(eid);
          if (e) examsList.push(e);
        }
        return res.json(examsList);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.get("/api/exams/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const exam = await storage.getExam(req.params.id);
      if (!exam) return res.status(404).json({ message: "الامتحان غير موجود" });

      if (currentUser.role === "student") {
        const examStudentList = await storage.getExamsByStudent(currentUser.id);
        const isEnrolled = examStudentList.some(es => es.examId === req.params.id);
        if (!isEnrolled) {
          return res.status(403).json({ message: "غير مصرح بالوصول لهذا الامتحان" });
        }
      } else if (currentUser.role === "teacher") {
        if (exam.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لهذا الامتحان" });
        }
      } else if (currentUser.role === "supervisor") {
        if (exam.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لهذا الامتحان" });
        }
      }

      const students = await storage.getExamStudents(req.params.id);
      res.json({ ...exam, students });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/exams", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const { title, surahName, fromVerse, toVerse, examDate, examTime, description, isForAll, studentIds } = req.body;

      if (!title || typeof title !== "string" || title.length > 200) {
        return res.status(400).json({ message: "عنوان الامتحان مطلوب ويجب ألا يتجاوز 200 حرف" });
      }
      if (!surahName || !examDate) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const examFieldCheck = validateFields(req.body, ["surahName", "description"]);
      if (!examFieldCheck.valid) return res.status(400).json({ message: examFieldCheck.error });
      const examDateCheck = validateDate(examDate, "examDate");
      if (!examDateCheck.valid) return res.status(400).json({ message: examDateCheck.error });
      const fromVerseNum = Number(fromVerse);
      const toVerseNum = Number(toVerse);
      if (!Number.isInteger(fromVerseNum) || !Number.isInteger(toVerseNum) || fromVerseNum < 1 || toVerseNum < 1) {
        return res.status(400).json({ message: "أرقام الآيات غير صحيحة" });
      }

      const exam = await storage.createExam({
        teacherId: currentUser.id,
        mosqueId: currentUser.mosqueId,
        title,
        surahName,
        fromVerse: fromVerseNum,
        toVerse: toVerseNum,
        examDate: new Date(examDate),
        examTime,
        description,
        isForAll: isForAll !== false,
      });

      let myStudents: any[];
      if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        const mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
        myStudents = mosqueUsers.filter(u => u.role === "student" && !u.pendingApproval);
      } else if (currentUser.mosqueId) {
        const allStudents = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student");
        myStudents = allStudents.filter(s => canTeacherAccessStudent(currentUser, s) && !s.pendingApproval);
      } else {
        myStudents = (await storage.getUsersByTeacher(currentUser.id)).filter(s => !s.pendingApproval);
      }
      const myStudentIds = new Set(myStudents.map(s => s.id));

      let targetStudents: string[] = [];
      if (isForAll !== false) {
        targetStudents = myStudents.map(s => s.id);
      } else if (studentIds && studentIds.length > 0) {
        targetStudents = studentIds.filter((sid: string) => myStudentIds.has(sid));
      }

      for (const sid of targetStudents) {
        await storage.createExamStudent({
          examId: exam.id,
          studentId: sid,
          status: "pending",
        });
        await storage.createNotification({
          userId: sid,
          mosqueId: currentUser.mosqueId,
          title: "امتحان جديد",
          message: `تم تحديد امتحان: ${title} - ${surahName} (${fromVerse}-${toVerse})${examTime ? ` في ${examTime}` : ''}`,
          type: "warning",
          isRead: false,
        });
      }

      await logActivity(currentUser, `إنشاء امتحان: ${title}`, "exams", `${surahName} (${fromVerse}-${toVerse}) - ${targetStudents.length} طالب`);
      res.status(201).json(exam);
    } catch (err: any) {
      console.error(err); res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  app.patch("/api/exams/:examId/students/:studentId", requireRole("teacher", "supervisor"), async (req, res) => {
    const currentUser = req.user!;
    const exam = await storage.getExam(req.params.examId);
    if (!exam) return res.status(404).json({ message: "الامتحان غير موجود" });

    const isOwner = exam.teacherId === currentUser.id;
    const isSameMosqueTeacher = currentUser.role === "teacher" && exam.mosqueId === currentUser.mosqueId;
    const isMosqueSupervisor = currentUser.role === "supervisor" && exam.mosqueId === currentUser.mosqueId;
    if (!isOwner && !isSameMosqueTeacher && !isMosqueSupervisor) {
      return res.status(403).json({ message: "غير مصرح بتعديل درجات هذا الامتحان" });
    }

    const students = await storage.getExamStudents(req.params.examId);
    const entry = students.find(s => s.studentId === req.params.studentId);
    if (!entry) return res.status(404).json({ message: "الطالب غير مسجل في هذا الامتحان" });
    const examUpdateData: any = {};
    if (req.body.grade !== undefined) {
      const g = Number(req.body.grade);
      if (!Number.isInteger(g) || g < 0 || g > 100) return res.status(400).json({ message: "الدرجة يجب أن تكون بين 0 و 100" });
      examUpdateData.grade = g;
    }
    if (req.body.status !== undefined) examUpdateData.status = req.body.status;
    const updated = await storage.updateExamStudent(entry.id, examUpdateData);
    res.json(updated);
  });

  app.delete("/api/exams/:id", requireAuth, async (req, res) => {
    const currentUser = req.user!;
    const exam = await storage.getExam(req.params.id);
    if (!exam) return res.status(404).json({ message: "الامتحان غير موجود" });

    if (currentUser.role === "teacher" && exam.mosqueId !== currentUser.mosqueId) {
      return res.status(403).json({ message: "غير مصرح بحذف هذا الامتحان" });
    }
    if (currentUser.role === "supervisor" && exam.mosqueId !== currentUser.mosqueId) {
      return res.status(403).json({ message: "غير مصرح بحذف هذا الامتحان" });
    }
    if (currentUser.role === "student") {
      return res.status(403).json({ message: "غير مصرح بحذف الامتحانات" });
    }

    await storage.deleteExam(req.params.id);
    res.json({ message: "تم حذف الامتحان بنجاح" });
  });

  // ==================== LEVELS ====================
  app.get("/api/levels/info", requireAuth, async (req, res) => {
    res.json({
      levels: LEVEL_NAMES,
      description: {
        1: "الجزء 30-26 (5 أجزاء)",
        2: "الجزء 25-21 (5 أجزاء)",
        3: "الجزء 20-16 (5 أجزاء)",
        4: "الجزء 15-11 (5 أجزاء)",
        5: "الجزء 10-6 (5 أجزاء)",
        6: "الجزء 5-1 (5 أجزاء)",
        7: "حافظ القرآن كاملاً (30 جزء)",
      },
    });
  });

  app.post("/api/levels/calculate", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { studentId, juzCount } = req.body;
      if (!studentId) return res.status(400).json({ message: "معرف الطالب مطلوب" });
      const student = await storage.getUser(studentId);
      if (!student || student.role !== "student") return res.status(404).json({ message: "الطالب غير موجود" });
      if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتعديل مستوى طالب من جامع آخر" });
      }
      const newLevel = calculateStudentLevel(juzCount || 0);
      const oldLevel = student.level || 1;
      await storage.updateUser(studentId, { level: newLevel });
      if (oldLevel !== newLevel) {
        await storage.createNotification({
          userId: studentId,
          mosqueId: student.mosqueId,
          title: newLevel > oldLevel ? "ترقية مستوى!" : "تعديل مستوى",
          message: `تم ${newLevel > oldLevel ? 'ترقيتك' : 'تعديل مستواك'} من ${LEVEL_NAMES[oldLevel]?.ar} إلى ${LEVEL_NAMES[newLevel]?.ar}`,
          type: newLevel > oldLevel ? "success" : "info",
          isRead: false,
        });
        await logActivity(currentUser, `تعديل مستوى الطالب ${student.name}`, "levels", `من ${LEVEL_NAMES[oldLevel]?.ar} إلى ${LEVEL_NAMES[newLevel]?.ar}`);
      }
      res.json({ studentId, oldLevel, newLevel, levelName: LEVEL_NAMES[newLevel] });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.patch("/api/levels/teacher/:teacherId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "فقط المشرف أو المدير يمكنه تعيين مستويات الأساتذة" });
      }
      const teacher = await storage.getUser(req.params.teacherId);
      if (!teacher || teacher.role !== "teacher") return res.status(404).json({ message: "الأستاذ غير موجود" });
      if (currentUser.role === "supervisor" && teacher.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { levels } = req.body;
      if (!levels || !Array.isArray(levels) || levels.length === 0) {
        return res.status(400).json({ message: "يجب تحديد مستوى واحد على الأقل" });
      }
      const validLevels = levels.filter((l: number) => l >= 1 && l <= 7);
      if (validLevels.length === 0) return res.status(400).json({ message: "المستويات غير صحيحة" });
      const teacherLevels = validLevels.sort().join(",");
      await storage.updateUser(req.params.teacherId, { teacherLevels });
      await logActivity(currentUser, `تعيين مستويات الأستاذ ${teacher.name}`, "levels", `المستويات: ${validLevels.map((l: number) => LEVEL_NAMES[l]?.ar).join(', ')}`);
      res.json({ teacherId: req.params.teacherId, teacherLevels, levelNames: validLevels.map((l: number) => LEVEL_NAMES[l]) });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.patch("/api/levels/student/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const student = await storage.getUser(req.params.studentId);
      if (!student || student.role !== "student") return res.status(404).json({ message: "الطالب غير موجود" });
      if (currentUser.role === "supervisor" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "teacher" && !canTeacherAccessStudent(currentUser, student)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { level } = req.body;
      if (!level || level < 1 || level > 7) return res.status(400).json({ message: "المستوى يجب أن يكون بين 1 و 7" });
      const oldLevel = student.level || 1;
      await storage.updateUser(req.params.studentId, { level });
      if (oldLevel !== level) {
        await storage.createNotification({
          userId: req.params.studentId,
          mosqueId: student.mosqueId,
          title: level > oldLevel ? "ترقية مستوى!" : "تعديل مستوى",
          message: `تم ${level > oldLevel ? 'ترقيتك' : 'تعديل مستواك'} من ${LEVEL_NAMES[oldLevel]?.ar} إلى ${LEVEL_NAMES[level]?.ar}`,
          type: level > oldLevel ? "success" : "info",
          isRead: false,
        });
        await logActivity(currentUser, `تعديل مستوى الطالب ${student.name}`, "levels", `من ${LEVEL_NAMES[oldLevel]?.ar} إلى ${LEVEL_NAMES[level]?.ar}`);
      }
      res.json({ studentId: req.params.studentId, oldLevel, newLevel: level, levelName: LEVEL_NAMES[level] });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/levels/stats", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const mosqueId = (req.query.mosqueId as string) || currentUser.mosqueId;
      if (!mosqueId) return res.json({ levels: {} });
      if (currentUser.role !== "admin" && currentUser.mosqueId !== mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const students = (await storage.getUsersByMosqueAndRole(mosqueId, "student")).filter(s => !s.pendingApproval);
      const teachers = await storage.getUsersByMosqueAndRole(mosqueId, "teacher");
      const levelStats: Record<number, { students: number; teachers: string[] }> = {};
      for (let i = 1; i <= 6; i++) {
        levelStats[i] = { students: 0, teachers: [] };
      }
      for (const s of students) {
        const lv = s.level || 1;
        if (levelStats[lv]) levelStats[lv].students++;
      }
      for (const t of teachers) {
        const tLevels = getTeacherLevelsArray(t);
        for (const lv of tLevels) {
          if (levelStats[lv]) levelStats[lv].teachers.push(t.name);
        }
      }
      res.json({ levels: levelStats, levelNames: LEVEL_NAMES });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== ACTIVITY LOGS ====================
  app.get("/api/activity-logs", requireRole("admin"), async (req, res) => {
    try {
      const mosqueId = req.query.mosqueId as string | undefined;
      if (mosqueId) {
        const logs = await storage.getActivityLogsByMosque(mosqueId);
        return res.json(logs);
      }
      const logs = await storage.getActivityLogs();
      return res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.get("/api/teacher-activities", requireRole("admin", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "admin") {
        const logs = await storage.getActivityLogs();
        const teacherLogs = logs.filter((l: any) => l.userRole === "teacher");
        return res.json(teacherLogs);
      }
      if (!currentUser.mosqueId) return res.json([]);
      const logs = await storage.getActivityLogsByMosqueAndRole(currentUser.mosqueId, "teacher");
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });


  // ==================== NOTIFICATIONS ====================
  app.post("/api/notifications/send", requireAuth, requireRole("admin", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const { title, message, type, targetType, targetUserId, targetMosqueId } = req.body;
      
      if (!title || !message) {
        return res.status(400).json({ message: "العنوان والرسالة مطلوبان" });
      }

      const contentCheck = filterTextFields(req.body, ["title", "message"]);
      if (contentCheck.blocked) {
        return res.status(400).json({ message: contentCheck.reason });
      }
      
      const notifType = type || "info";
      let targetUsers: any[] = [];
      
      if (currentUser.role === "admin") {
        if (targetType === "all") {
          targetUsers = await storage.getUsers();
        } else if (targetType === "user" && targetUserId) {
          const u = await storage.getUser(targetUserId);
          if (u) targetUsers = [u];
        } else if (targetType === "mosque" && targetMosqueId) {
          targetUsers = await storage.getUsersByMosque(targetMosqueId);
        } else {
          return res.status(400).json({ message: "يرجى تحديد الهدف" });
        }
      } else if (currentUser.role === "supervisor") {
        if (!currentUser.mosqueId) {
          return res.status(400).json({ message: "المشرف غير مرتبط بجامع" });
        }
        if (targetType === "all") {
          targetUsers = await storage.getUsersByMosque(currentUser.mosqueId);
        } else if (targetType === "user" && targetUserId) {
          const u = await storage.getUser(targetUserId);
          if (u && u.mosqueId === currentUser.mosqueId) {
            targetUsers = [u];
          } else {
            return res.status(403).json({ message: "المستخدم ليس من نفس الجامع" });
          }
        } else {
          return res.status(400).json({ message: "يرجى تحديد الهدف" });
        }
      }
      
      let count = 0;
      for (const u of targetUsers) {
        if (u.id === currentUser.id) continue;
        await storage.createNotification({
          userId: u.id,
          mosqueId: u.mosqueId || currentUser.mosqueId,
          title,
          message,
          type: notifType,
          isRead: false,
        });
        count++;
      }
      
      await logActivity(currentUser, `إرسال إشعار: ${title}`, "notifications", `${count} مستخدم`);
      res.json({ message: `تم إرسال الإشعار إلى ${count} مستخدم` });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إرسال الإشعار" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifs = await storage.getNotifications(req.user!.id);
      res.json(notifs);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب الإشعارات" });
    }
  });

  app.post("/api/notifications/read-selected", requireAuth, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ message: "ids مطلوب" });
      if (ids.length > 100) return res.status(400).json({ message: "الحد الأقصى 100 إشعار" });
      if (!ids.every((id: any) => typeof id === "string")) return res.status(400).json({ message: "معرفات غير صالحة" });
      for (const id of ids) {
        const notif = await storage.getNotification(id);
        if (notif && notif.userId === req.user!.id) {
          await storage.updateNotification(id, { isRead: true });
        }
      }
      res.json({ message: "تم" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/notifications/delete-all", requireAuth, async (req, res) => {
    try {
      const notifs = await storage.getNotifications(req.user!.id);
      for (const notif of notifs) {
        await storage.deleteNotification(notif.id);
      }
      res.json({ message: "تم حذف جميع الإشعارات" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) return res.status(404).json({ message: "الإشعار غير موجود" });
      if (notification.userId !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح بتعديل هذا الإشعار" });
      }
      await storage.markNotificationRead(req.params.id);
      res.json({ message: "تم التحديث" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ message: "تم تحديد الكل كمقروء" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) return res.status(404).json({ message: "الإشعار غير موجود" });
      if (notification.userId !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح بحذف هذا الإشعار" });
      }
      await storage.deleteNotification(req.params.id);
      res.json({ message: "تم حذف الإشعار" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/notifications/delete-selected", requireAuth, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "يرجى تحديد الإشعارات" });
      }
      if (ids.length > 100) return res.status(400).json({ message: "الحد الأقصى 100 إشعار" });
      if (!ids.every((id: any) => typeof id === "string")) return res.status(400).json({ message: "معرفات غير صالحة" });
      await storage.deleteNotifications(ids, req.user!.id);
      res.json({ message: "تم حذف الإشعارات المحددة" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== COURSES & CERTIFICATES ====================
  app.get("/api/certificates/verify/:certNumber", async (req, res) => {
    try {
      const cert = await storage.getCertificateByNumber(req.params.certNumber);
      if (!cert) return res.status(404).json({ valid: false, message: "الشهادة غير موجودة" });

      const course = await storage.getCourse(cert.courseId);
      const student = await storage.getUser(cert.studentId);
      const issuer = await storage.getUser(cert.issuedBy);

      res.json({
        valid: true,
        certificateNumber: cert.certificateNumber,
        courseName: course?.title || "",
        studentName: student?.name || "",
        issuerName: issuer?.name || "",
        issuedAt: cert.issuedAt,
        graduationGrade: cert.graduationGrade,
        notes: cert.notes,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/courses/stats", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let courseList: any[] = [];

      if (currentUser.role === "admin") {
        courseList = await storage.getCourses();
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        courseList = await storage.getCoursesByMosque(currentUser.mosqueId);
      } else if (currentUser.role === "teacher") {
        courseList = await storage.getCoursesByCreator(currentUser.id);
      }

      let totalStudents = 0;
      let totalGraduated = 0;
      let totalCertificates = 0;

      for (const course of courseList) {
        const students = await storage.getCourseStudents(course.id);
        const certs = await storage.getCertificatesByCourse(course.id);
        totalStudents += students.length;
        totalGraduated += students.filter(s => s.graduated).length;
        totalCertificates += certs.length;
      }

      res.json({
        totalCourses: courseList.length,
        activeCourses: courseList.filter(c => c.status === "active").length,
        completedCourses: courseList.filter(c => c.status === "completed").length,
        cancelledCourses: courseList.filter(c => c.status === "cancelled").length,
        totalStudents,
        totalGraduated,
        totalCertificates,
        graduationRate: totalStudents > 0 ? Math.round((totalGraduated / totalStudents) * 100) : 0,
      });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.get("/api/courses", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let courseList: any[] = [];

      if (currentUser.role === "admin") {
        courseList = await storage.getCourses();
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        courseList = await storage.getCoursesByMosque(currentUser.mosqueId);
      } else if (currentUser.role === "teacher") {
        courseList = await storage.getCoursesByCreator(currentUser.id);
      } else if (currentUser.role === "student") {
        const courseStudentEntries = await storage.getCoursesByStudent(currentUser.id);
        for (const cs of courseStudentEntries) {
          const course = await storage.getCourse(cs.courseId);
          if (course) courseList.push(course);
        }
      }

      const enriched = [];
      for (const course of courseList) {
        const students = await storage.getCourseStudents(course.id);
        const teachers = await storage.getCourseTeachers(course.id);
        const certs = await storage.getCertificatesByCourse(course.id);
        enriched.push({ ...course, students, teachers, certificates: certs });
      }

      res.json(enriched);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.post("/api/courses", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { title, description, startDate, endDate, targetType, studentIds, teacherIds, category, maxStudents, notes } = req.body;

      const course = await storage.createCourse({
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        targetType: targetType || "specific",
        createdBy: currentUser.id,
        mosqueId: currentUser.mosqueId,
        category: category || "memorization",
        maxStudents: maxStudents || null,
        notes: notes || null,
      });

      if (studentIds && Array.isArray(studentIds)) {
        for (const sid of studentIds) {
          await storage.createCourseStudent({ courseId: course.id, studentId: sid });
        }
      }

      const allTeacherIds = Array.from(new Set<string>([...(teacherIds || []), currentUser.id]));
      for (const tid of allTeacherIds) {
        await storage.createCourseTeacher({ courseId: course.id, teacherId: tid });
      }

      await logActivity(currentUser, `إنشاء دورة: ${title}`, "courses");
      res.status(201).json(course);
    } catch (err: any) {
      console.error(err); res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  app.patch("/api/courses/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "غير مصرح بتعديل الدورات" });
      }
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      if (currentUser.role !== "admin") {
        const isOwner = course.createdBy === currentUser.id;
        const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
        if (!isOwner && !isSameMosqueSupervisor) {
          return res.status(403).json({ message: "غير مصرح بتعديل هذه الدورة" });
        }
      }

      const updateData: any = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.startDate !== undefined) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate !== undefined) updateData.endDate = new Date(req.body.endDate);
      if (req.body.status !== undefined) updateData.status = req.body.status;

      const updated = await storage.updateCourse(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "الدورة غير موجودة" });
      res.json(updated);
    } catch (err: any) {
      console.error(err); res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  app.delete("/api/courses/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "غير مصرح بحذف الدورات" });
      }
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      if (currentUser.role !== "admin") {
        const isOwner = course.createdBy === currentUser.id;
        const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
        if (!isOwner && !isSameMosqueSupervisor) {
          return res.status(403).json({ message: "غير مصرح بحذف هذه الدورة" });
        }
      }

      await storage.deleteCourse(req.params.id);
      await logActivity(currentUser, `حذف دورة: ${course.title}`, "courses");
      res.json({ message: "تم حذف الدورة بنجاح" });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.post("/api/courses/:id/students", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const isOwner = course.createdBy === currentUser.id;
      const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
      if (!isOwner && !isSameMosqueSupervisor) {
        return res.status(403).json({ message: "غير مصرح بتعديل هذه الدورة" });
      }

      const { studentIds } = req.body;
      if (!studentIds || !Array.isArray(studentIds)) {
        return res.status(400).json({ message: "يرجى تحديد الطلاب" });
      }

      const existing = await storage.getCourseStudents(req.params.id);
      const existingIds = new Set(existing.map(e => e.studentId));

      const created = [];
      for (const sid of studentIds) {
        if (!existingIds.has(sid)) {
          const entry = await storage.createCourseStudent({ courseId: req.params.id, studentId: sid });
          created.push(entry);
          await storage.createNotification({
            userId: sid,
            mosqueId: req.user!.mosqueId || null,
            title: "تم تسجيلك في دورة جديدة",
            message: `تم تسجيلك في الدورة: ${course.title}`,
            type: "info",
            isRead: false,
          });
        }
      }

      res.status(201).json(created);
    } catch (err: any) {
      console.error(err); res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  app.post("/api/courses/:id/graduate", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const isOwner = course.createdBy === currentUser.id;
      const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
      if (!isOwner && !isSameMosqueSupervisor) {
        return res.status(403).json({ message: "غير مصرح بتخريج طلاب هذه الدورة" });
      }

      const { studentIds, graduationGrade } = req.body;
      if (!studentIds || !Array.isArray(studentIds)) {
        return res.status(400).json({ message: "يرجى تحديد الطلاب" });
      }

      const courseStudentsList = await storage.getCourseStudents(req.params.id);
      const createdCertificates = [];

      for (const sid of studentIds) {
        const csEntry = courseStudentsList.find(cs => cs.studentId === sid);
        if (csEntry) {
          await storage.updateCourseStudent(csEntry.id, { graduated: true, graduatedAt: new Date(), graduationGrade: graduationGrade || null });
          const cert = await storage.createCertificate({
            courseId: req.params.id,
            studentId: sid,
            issuedBy: currentUser.id,
            mosqueId: currentUser.mosqueId,
            certificateNumber: `MTQ-CERT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            graduationGrade: graduationGrade || null,
          });
          createdCertificates.push(cert);

          const studentUser = await storage.getUser(sid);
          await storage.createNotification({
            userId: sid,
            mosqueId: currentUser.mosqueId || null,
            title: "تهانينا! تم تخريجك",
            message: `تم تخريجك من الدورة: ${course.title}${graduationGrade ? ` بتقدير ${graduationGrade === "excellent" ? "ممتاز" : graduationGrade === "very_good" ? "جيد جداً" : graduationGrade === "good" ? "جيد" : "مقبول"}` : ""}`,
            type: "success",
            isRead: false,
          });

          try {
            const pointsEnabled = await storage.isFeatureEnabled("points_rewards");
            if (pointsEnabled) {
              await storage.createPoint({
                userId: sid,
                mosqueId: currentUser.mosqueId,
                amount: graduationGrade === "excellent" ? 50 : graduationGrade === "very_good" ? 40 : graduationGrade === "good" ? 30 : 20,
                reason: `تخريج من دورة: ${course.title}`,
                category: "graduation",
              });
            }
          } catch {}
        }
      }

      const updatedStudents = await storage.getCourseStudents(req.params.id);
      const allGraduated = updatedStudents.length > 0 && updatedStudents.every(s => s.graduated);
      if (allGraduated) {
        await storage.updateCourse(req.params.id, { status: "completed" });
      }

      await logActivity(currentUser, `تخريج ${studentIds.length} طالب من دورة: ${course.title}`, "courses");
      res.json({ message: "تم تخريج الطلاب ومنح الشهادات بنجاح", certificates: createdCertificates });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.get("/api/certificates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let certs: any[] = [];

      if (currentUser.role === "admin") {
        const allCourses = await storage.getCourses();
        for (const course of allCourses) {
          const courseCerts = await storage.getCertificatesByCourse(course.id);
          certs.push(...courseCerts);
        }
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        certs = await storage.getCertificatesByMosque(currentUser.mosqueId);
      } else if (currentUser.role === "teacher") {
        const teacherCourses = await storage.getCoursesByCreator(currentUser.id);
        for (const course of teacherCourses) {
          const courseCerts = await storage.getCertificatesByCourse(course.id);
          certs.push(...courseCerts);
        }
      } else if (currentUser.role === "student") {
        certs = await storage.getCertificatesByStudent(currentUser.id);
      }

      res.json(certs);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.get("/api/certificates/all", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let certs: any[] = [];

      if (currentUser.role === "admin") {
        const allCourses = await storage.getCourses();
        for (const course of allCourses) {
          const courseCerts = await storage.getCertificatesByCourse(course.id);
          certs.push(...courseCerts);
        }
        const mosqueCerts = currentUser.mosqueId ? await storage.getCertificatesByMosque(currentUser.mosqueId) : [];
        for (const mc of mosqueCerts) {
          if (!certs.find((c: any) => c.id === mc.id)) certs.push(mc);
        }
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        certs = await storage.getCertificatesByMosque(currentUser.mosqueId);
      } else if (currentUser.role === "teacher") {
        const teacherCourses = await storage.getCoursesByCreator(currentUser.id);
        for (const course of teacherCourses) {
          const courseCerts = await storage.getCertificatesByCourse(course.id);
          certs.push(...courseCerts);
        }
      } else if (currentUser.role === "student") {
        certs = await storage.getCertificatesByStudent(currentUser.id);
      }

      const userIds = new Set<string>();
      const courseIds = new Set<string>();
      const mosqueIds = new Set<string>();
      const graduateIds = new Set<string>();
      for (const cert of certs) {
        if (cert.studentId) userIds.add(cert.studentId);
        if (cert.issuedBy) userIds.add(cert.issuedBy);
        if (cert.courseId) courseIds.add(cert.courseId);
        if (cert.mosqueId) mosqueIds.add(cert.mosqueId);
        if (cert.graduateId) graduateIds.add(cert.graduateId);
      }
      const usersMap = new Map<string, any>();
      for (const uid of userIds) {
        try { const u = await storage.getUser(uid); if (u) usersMap.set(uid, u); } catch {}
      }
      const coursesMap = new Map<string, any>();
      for (const cid of courseIds) {
        try { const c = await storage.getCourse(cid); if (c) coursesMap.set(cid, c); } catch {}
      }
      const mosquesMap = new Map<string, any>();
      for (const mid of mosqueIds) {
        try { const m = await storage.getMosque(mid); if (m) mosquesMap.set(mid, m); } catch {}
      }
      const graduatesMap = new Map<string, any>();
      for (const gid of graduateIds) {
        try { const g = await storage.getGraduate(gid); if (g) graduatesMap.set(gid, g); } catch {}
      }
      const enriched = certs.map((cert: any) => {
        const student = usersMap.get(cert.studentId);
        const issuer = usersMap.get(cert.issuedBy);
        const course = coursesMap.get(cert.courseId);
        const mosque = mosquesMap.get(cert.mosqueId);
        const graduateData = graduatesMap.get(cert.graduateId);
        return {
          ...cert,
          studentName: student?.name || "",
          issuerName: issuer?.name || "",
          courseName: course?.title || "",
          mosqueName: mosque?.name || "",
          totalJuz: graduateData?.totalJuz || undefined,
          recitationStyle: graduateData?.recitationStyle || undefined,
          ijazahTeacher: graduateData?.ijazahTeacher || undefined,
        };
      });

      res.json(enriched);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.delete("/api/courses/:id/students/:studentId", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const isOwner = course.createdBy === currentUser.id;
      const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
      if (!isOwner && !isSameMosqueSupervisor) {
        return res.status(403).json({ message: "غير مصرح بتعديل هذه الدورة" });
      }

      const students = await storage.getCourseStudents(req.params.id);
      const entry = students.find(s => s.studentId === req.params.studentId);
      if (!entry) return res.status(404).json({ message: "الطالب غير مسجل في هذه الدورة" });

      await storage.deleteCourseStudent(entry.id);
      res.json({ message: "تم إزالة الطالب من الدورة" });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.post("/api/courses/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const original = await storage.getCourse(req.params.id);
      if (!original) return res.status(404).json({ message: "الدورة غير موجودة" });

      const newCourse = await storage.createCourse({
        title: `${original.title} (نسخة)`,
        description: original.description,
        startDate: new Date(),
        endDate: null,
        targetType: original.targetType,
        createdBy: currentUser.id,
        mosqueId: currentUser.mosqueId,
        category: original.category,
        maxStudents: original.maxStudents,
        notes: original.notes,
      });

      const originalTeachers = await storage.getCourseTeachers(req.params.id);
      for (const t of originalTeachers) {
        await storage.createCourseTeacher({ courseId: newCourse.id, teacherId: t.teacherId });
      }

      await logActivity(currentUser, `نسخ دورة: ${original.title}`, "courses");
      res.status(201).json(newCourse);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.post("/api/courses/:id/ungraduate", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const { studentId } = req.body;
      if (!studentId) return res.status(400).json({ message: "يرجى تحديد الطالب" });

      const students = await storage.getCourseStudents(req.params.id);
      const entry = students.find(s => s.studentId === studentId);
      if (!entry) return res.status(404).json({ message: "الطالب غير مسجل" });

      await storage.updateCourseStudent(entry.id, { graduated: false, graduatedAt: null, graduationGrade: null });

      const certs = await storage.getCertificatesByCourse(req.params.id);
      const cert = certs.find(c => c.studentId === studentId);
      if (cert) await storage.deleteCertificate(cert.id);

      if (course.status === "completed") {
        await storage.updateCourse(req.params.id, { status: "active" });
      }

      await logActivity(currentUser, `إلغاء تخريج طالب من دورة: ${course.title}`, "courses");
      res.json({ message: "تم إلغاء التخريج بنجاح" });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== AVATAR UPLOAD ====================
  app.post("/api/users/:id/avatar", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const targetId = req.params.id;
      const targetUser = await storage.getUser(targetId);
      if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });

      const canUpload =
        currentUser.id === targetId ||
        currentUser.role === "admin" ||
        (currentUser.role === "supervisor" && targetUser.mosqueId === currentUser.mosqueId);

      if (!canUpload) {
        return res.status(403).json({ message: "غير مصرح بتعديل صورة هذا المستخدم" });
      }

      const { avatar } = req.body;
      if (!avatar || typeof avatar !== "string" || !avatar.startsWith("data:image/")) {
        return res.status(400).json({ message: "صيغة الصورة غير صحيحة" });
      }

      if (avatar.length > 500000) {
        return res.status(400).json({ message: "حجم الصورة كبير جداً (الحد الأقصى ~375KB)" });
      }

      const updated = await storage.updateUser(targetId, { avatar });
      if (!updated) return res.status(500).json({ message: "فشل في تحديث الصورة" });

      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== STATS ====================
  app.get("/api/stats", requireAuth, async (req, res) => {
    const currentUser = req.user!;

    if (currentUser.role === "student") {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const filterMosqueId = req.query.mosqueId as string | undefined;
    const filterTeacherId = req.query.teacherId as string | undefined;

    if (currentUser.role === "admin") {
      let usersList: User[];
      if (filterMosqueId) {
        usersList = await storage.getUsersByMosque(filterMosqueId);
      } else {
        usersList = await storage.getUsers();
      }
      let assignmentsList = await storage.getAssignments();
      const mosquesList = await storage.getMosques();

      if (filterMosqueId) {
        assignmentsList = assignmentsList.filter(a => a.mosqueId === filterMosqueId);
      }
      if (filterTeacherId) {
        usersList = usersList.filter(u => u.teacherId === filterTeacherId || u.id === filterTeacherId);
        assignmentsList = assignmentsList.filter(a => a.teacherId === filterTeacherId);
      }

      const studentsList = usersList.filter(u => u.role === "student");
      return res.json({
        totalStudents: studentsList.length,
        totalTeachers: usersList.filter(u => u.role === "teacher").length,
        totalSupervisors: usersList.filter(u => u.role === "supervisor").length,
        totalMosques: mosquesList.length,
        totalAssignments: assignmentsList.length,
        completedAssignments: assignmentsList.filter(a => a.status === "done").length,
        pendingAssignments: assignmentsList.filter(a => a.status === "pending").length,
        activeStudents: studentsList.filter(s => s.isActive).length,
        inactiveStudents: studentsList.filter(s => !s.isActive).length,
        specialNeedsStudents: studentsList.filter(s => s.isSpecialNeeds).length,
        orphanStudents: studentsList.filter(s => s.isOrphan).length,
        users: usersList.map(({ password, ...u }) => u),
        assignments: assignmentsList,
      });
    }

    if (currentUser.role === "teacher") {
      const myStudents = (await storage.getUsersByTeacher(currentUser.id)).filter(s => !s.pendingApproval);
      const myAssignments = await storage.getAssignmentsByTeacher(currentUser.id);
      return res.json({
        totalStudents: myStudents.length,
        totalAssignments: myAssignments.length,
        completedAssignments: myAssignments.filter(a => a.status === "done").length,
        pendingAssignments: myAssignments.filter(a => a.status === "pending").length,
        activeStudents: myStudents.filter(s => s.isActive).length,
        inactiveStudents: myStudents.filter(s => !s.isActive).length,
        specialNeedsStudents: myStudents.filter(s => s.isSpecialNeeds).length,
        orphanStudents: myStudents.filter(s => s.isOrphan).length,
        users: myStudents.map(({ password, address, telegramId, educationLevel, parentPhone: _pp, ...u }) => u),
        assignments: myAssignments,
      });
    }

    if (currentUser.role === "supervisor" && currentUser.mosqueId) {
      let mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
      let assignmentsList = await storage.getAssignmentsByMosque(currentUser.mosqueId);

      if (filterTeacherId) {
        mosqueUsers = mosqueUsers.filter(u => u.teacherId === filterTeacherId || u.id === filterTeacherId);
        assignmentsList = assignmentsList.filter(a => a.teacherId === filterTeacherId);
      }

      const mosqueStudents = mosqueUsers.filter(u => u.role === "student");
      return res.json({
        totalTeachers: mosqueUsers.filter(u => u.role === "teacher").length,
        totalStudents: mosqueStudents.length,
        totalAssignments: assignmentsList.length,
        completedAssignments: assignmentsList.filter(a => a.status === "done").length,
        pendingAssignments: assignmentsList.filter(a => a.status === "pending").length,
        activeStudents: mosqueStudents.filter(s => s.isActive).length,
        inactiveStudents: mosqueStudents.filter(s => !s.isActive).length,
        specialNeedsStudents: mosqueStudents.filter(s => s.isSpecialNeeds).length,
        orphanStudents: mosqueStudents.filter(s => s.isOrphan).length,
        users: mosqueUsers.map(({ password, ...u }) => u),
        assignments: assignmentsList,
      });
    }

    res.json({});
  });

  // ==================== TRANSFER STUDENT ====================
  app.post("/api/users/:id/transfer", requireRole("supervisor"), async (req, res) => {
    const currentUser = req.user!;
    const { newTeacherId } = req.body;

    if (!newTeacherId) {
      return res.status(400).json({ message: "يرجى تحديد الأستاذ الجديد" });
    }

    const student = await storage.getUser(req.params.id);
    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "الطالب غير موجود" });
    }

    if (student.mosqueId !== currentUser.mosqueId) {
      return res.status(403).json({ message: "غير مصرح بنقل طالب من جامع آخر" });
    }

    const newTeacher = await storage.getUser(newTeacherId);
    if (!newTeacher || newTeacher.role !== "teacher" || newTeacher.mosqueId !== currentUser.mosqueId) {
      return res.status(400).json({ message: "الأستاذ الجديد غير صالح أو من جامع آخر" });
    }

    const oldTeacherId = student.teacherId;
    const updated = await storage.updateUser(req.params.id, { teacherId: newTeacherId });
    if (!updated) return res.status(500).json({ message: "فشل في نقل الطالب" });

    await storage.updateAssignments(req.params.id, oldTeacherId, newTeacherId);

    await logActivity(currentUser, `نقل الطالب ${student.name} إلى الأستاذ ${newTeacher.name}`, "students", `من الأستاذ ${oldTeacherId || "غير محدد"} إلى ${newTeacher.name}`);

    const { password, ...safe } = updated;
    res.json(safe);
  });

  // ==================== QURAN SURAHS API ====================
  app.get("/api/quran-surahs", requireAuth, async (_req, res) => {
    const { quranSurahs } = await import("@shared/quran-surahs");
    res.json(quranSurahs);
  });

  // ==================== SEED DATA ====================
  app.post("/api/seed", async (req, res) => {
    try {
      if (process.env.NODE_ENV === "production" || process.env.REPL_DEPLOYMENT) {
        return res.status(403).json({ message: "غير مسموح في بيئة الإنتاج" });
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

      const existingAdmin = await storage.getUserByUsername("ahrrfy");
      const adminUser = existingAdmin || await storage.createUser({
        username: "ahrrfy",
        password: await hashPassword("6399137"),
        name: "المدير",
        role: "admin",
        phone: "",
        isActive: true,
        canPrintIds: true,
        mosqueId: null,
      });

      const sup1 = await storage.createUser({
        username: "supervisor1",
        password: await hashPassword("Sup3r!vis0r#1"),
        name: "المشرف أحمد",
        role: "supervisor",
        mosqueId: mosque1.id,
        phone: "07801111111",
        isActive: true,
      });

      const sup2 = await storage.createUser({
        username: "supervisor2",
        password: await hashPassword("Sup3r!vis0r#2"),
        name: "المشرف خالد",
        role: "supervisor",
        mosqueId: mosque2.id,
        phone: "07802222222",
        isActive: true,
      });

      const teacher1 = await storage.createUser({
        username: "teacher1",
        password: await hashPassword("T3ach!ng#Q1"),
        name: "الشيخ أحمد",
        role: "teacher",
        mosqueId: mosque1.id,
        phone: "07801234567",
        isActive: true,
      });

      const teacher2 = await storage.createUser({
        username: "teacher2",
        password: await hashPassword("T3ach!ng#Q2"),
        name: "الشيخ عبد الله",
        role: "teacher",
        mosqueId: mosque1.id,
        phone: "07811234567",
        isActive: true,
      });

      const teacher3 = await storage.createUser({
        username: "teacher3",
        password: await hashPassword("T3ach!ng#Q3"),
        name: "الشيخ محمد",
        role: "teacher",
        mosqueId: mosque2.id,
        phone: "07821234567",
        isActive: true,
      });

      const s1 = await storage.createUser({ username: "student1", password: await hashPassword("Stud3nt!Q1"), name: "عمر خالد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, phone: "07901234567", isActive: true });
      const s2 = await storage.createUser({ username: "student2", password: await hashPassword("Stud3nt!Q2"), name: "أحمد محمد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, phone: "07911234567", isActive: true });
      const s3 = await storage.createUser({ username: "student3", password: await hashPassword("Stud3nt!Q3"), name: "يوسف علي", role: "student", mosqueId: mosque1.id, teacherId: teacher2.id, phone: "07921234567", isActive: true });
      const s4 = await storage.createUser({ username: "student4", password: await hashPassword("Stud3nt!Q4"), name: "سعيد حسن", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, phone: "07931234567", isActive: true });
      const s5 = await storage.createUser({ username: "student5", password: await hashPassword("Stud3nt!Q5"), name: "كريم محمود", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, phone: "07941234567", isActive: true });

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
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
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
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
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

      const { comparePasswords } = await import("./auth");
      const valid = await comparePasswords(password, admin.password);
      if (!valid) {
        return res.status(403).json({ message: "كلمة المرور غير صحيحة" });
      }

      await storage.resetSystemData();
      await logActivity(req.user!, "تصفير النظام بالكامل", "system", "تم مسح جميع بيانات المساجد والمستخدمين");
      res.json({ message: "تم تصفير النظام بنجاح" });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ أثناء تصفير النظام" });
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
      console.error(err); res.status(500).json({ message: "حدث خطأ أثناء إنشاء النسخة الاحتياطية" });
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
          if (!user.username || !user.name || !user.password) {
            errors.push("بعض سجلات المستخدمين تفتقد حقول مطلوبة (username, name, password)");
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
      res.status(500).json({ valid: false, summary: null, errors: [err.message || "حدث خطأ أثناء التحقق"] });
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

      const { comparePasswords } = await import("./auth");
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
        const validRoles = ["admin", "supervisor", "teacher", "student"];
        for (const u of data.users) {
          if (u.role && !validRoles.includes(u.role)) {
            return res.status(400).json({ message: `دور غير صالح في بيانات المستخدمين: ${u.role}` });
          }
        }
        const currentAdmin = data.users.find((u: any) => u.id === req.user!.id && u.role === "admin");
        if (!currentAdmin) {
          return res.status(400).json({ message: "النسخة الاحتياطية يجب أن تحتوي على حساب المدير الحالي" });
        }
      }

      const { pool } = await import("./db");
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
      console.error(err); res.status(500).json({ message: "حدث خطأ أثناء استعادة النسخة الاحتياطية" });
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
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
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
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.delete("/api/admin/banned-devices/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteBannedDevice(req.params.id);
      await logActivity(req.user!, `إزالة حظر جهاز`, "security");
      res.json({ message: "تم إزالة الحظر" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== FEATURE FLAGS ====================
  app.get("/api/feature-flags", requireRole("admin"), async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      res.json(flags);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
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
      res.status(500).json({ message: "حدث خطأ في تحديث البيانات" });
    }
  });

  app.get("/api/features/check/:key", requireAuth, async (req, res) => {
    try {
      const enabled = await storage.isFeatureEnabled(req.params.key);
      res.json({ enabled });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/features/enabled", requireAuth, async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      const enabled = flags.filter(f => f.isEnabled).map(f => f.featureKey);
      res.json({ enabled });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
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
      res.status(500).json({ message: "حدث خطأ في إنشاء الميزات" });
    }
  });

  // ==================== ATTENDANCE ====================
  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { studentId, teacherId, mosqueId, date } = req.query;

      if (date && teacherId) {
        if (currentUser.role !== "admin") {
          const teacher = await storage.getUser(teacherId as string);
          if (!teacher || teacher.mosqueId !== currentUser.mosqueId) {
            return res.status(403).json({ message: "غير مصرح بالوصول" });
          }
        }
        const records = await storage.getAttendanceByDate(new Date(date as string), teacherId as string);
        return res.json(records);
      }
      if (studentId) {
        if (currentUser.role === "student" && studentId !== currentUser.id) {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
        if (currentUser.role !== "admin") {
          const student = await storage.getUser(studentId as string);
          if (!student || student.mosqueId !== currentUser.mosqueId) {
            return res.status(403).json({ message: "غير مصرح بالوصول" });
          }
          if (currentUser.role === "teacher" && !canTeacherAccessStudent(currentUser, student)) {
            return res.status(403).json({ message: "غير مصرح بالوصول" });
          }
        }
        const records = await storage.getAttendanceByStudent(studentId as string);
        return res.json(records);
      }
      if (teacherId) {
        if (currentUser.role === "student") {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
        if (currentUser.role !== "admin") {
          const teacher = await storage.getUser(teacherId as string);
          if (!teacher || teacher.mosqueId !== currentUser.mosqueId) {
            return res.status(403).json({ message: "غير مصرح بالوصول" });
          }
        }
        const records = await storage.getAttendanceByTeacher(teacherId as string);
        return res.json(records);
      }
      if (mosqueId) {
        if (currentUser.role === "student") {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
        if (currentUser.role !== "admin" && mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لحضور مسجد آخر" });
        }
        const records = await storage.getAttendanceByMosque(mosqueId as string);
        return res.json(records);
      }
      if (currentUser.role === "student") {
        const records = await storage.getAttendanceByStudent(currentUser.id);
        return res.json(records);
      }
      if (currentUser.role === "teacher") {
        const records = await storage.getAttendanceByTeacher(currentUser.id);
        return res.json(records);
      }
      if (currentUser.mosqueId) {
        const records = await storage.getAttendanceByMosque(currentUser.mosqueId);
        return res.json(records);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/attendance", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتسجيل الحضور" });
      }
      const { studentId, date, status, notes } = req.body;
      if (!studentId || !date || !status) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const record = await storage.createAttendance({
        studentId,
        teacherId: currentUser.id,
        mosqueId: currentUser.mosqueId,
        date: new Date(date),
        status,
        notes,
      });
      await logActivity(currentUser, "تسجيل حضور", "attendance");
      res.status(201).json(record);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تسجيل الحضور" });
    }
  });

  app.patch("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتعديل الحضور" });
      }
      const { status, notes } = req.body;
      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      const updated = await storage.updateAttendance(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "سجل الحضور غير موجود" });
      await logActivity(currentUser, "تعديل حضور", "attendance");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تعديل الحضور" });
    }
  });

  app.delete("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بحذف الحضور" });
      }
      const record = await storage.getAttendance(req.params.id);
      if (!record) return res.status(404).json({ message: "سجل الحضور غير موجود" });
      if (currentUser.role !== "admin" && record.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteAttendance(req.params.id);
      await logActivity(currentUser, "حذف سجل حضور", "attendance");
      res.json({ message: "تم حذف سجل الحضور" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف الحضور" });
    }
  });

  app.post("/api/attendance/bulk", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتسجيل الحضور" });
      }
      const { date, students } = req.body;
      if (!date || !students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ message: "التاريخ وقائمة الطلاب مطلوبة" });
      }
      if (students.length > 200) {
        return res.status(400).json({ message: "لا يمكن تسجيل أكثر من 200 طالب في وقت واحد" });
      }
      const created = [];
      for (const s of students) {
        if (!s.studentId || !s.status) continue;
        if (currentUser.role !== "admin") {
          const student = await storage.getUser(s.studentId);
          if (!student || student.mosqueId !== currentUser.mosqueId) continue;
        }
        const record = await storage.createAttendance({
          studentId: s.studentId,
          teacherId: currentUser.id,
          mosqueId: currentUser.mosqueId,
          date: new Date(date),
          status: s.status,
          notes: typeof s.notes === "string" ? s.notes.slice(0, 500) : undefined,
        });
        created.push(record);
      }
      const presentStudents = created.filter(r => r.status === "present" || r.status === "late");
      for (const record of presentStudents) {
        try {
          await storage.createPoint({
            userId: record.studentId,
            mosqueId: currentUser.mosqueId,
            amount: 5,
            category: "attendance",
            reason: "نقاط حضور تلقائية",
          });
          const allAttendance = await storage.getAttendanceByStudent(record.studentId);
          const sorted = allAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          let streak = 0;
          for (const a of sorted) {
            if (a.status === "present" || a.status === "late") streak++;
            else break;
          }
          if (streak === 7 || streak === 14 || streak === 30) {
            await storage.createPoint({
              userId: record.studentId,
              mosqueId: currentUser.mosqueId,
              amount: streak === 7 ? 25 : streak === 14 ? 50 : 100,
              category: "attendance",
              reason: `مكافأة سلسلة حضور ${streak} يوم متتالي`,
            });
          }
        } catch {}
      }
      await logActivity(currentUser, `تسجيل حضور جماعي: ${created.length} طالب`, "attendance");
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تسجيل الحضور الجماعي" });
    }
  });

  // ==================== MESSAGES ====================
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const msgs = await storage.getMessagesByUser(req.user!.id);
      res.json(msgs);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب الرسائل" });
    }
  });

  app.get("/api/messages/conversations", requireAuth, async (req, res) => {
    try {
      const msgs = await storage.getMessagesByUser(req.user!.id);
      const userIds = new Set<string>();
      for (const msg of msgs) {
        if (msg.senderId !== req.user!.id) userIds.add(msg.senderId);
        if (msg.receiverId !== req.user!.id) userIds.add(msg.receiverId);
      }
      const conversations = [];
      for (const uid of Array.from(userIds)) {
        const user = await storage.getUser(uid);
        if (user) {
          const { password, ...safe } = user;
          const conv = await storage.getConversation(req.user!.id, uid);
          const lastMsg = conv[conv.length - 1];
          const unread = conv.filter(m => m.receiverId === req.user!.id && !m.isRead).length;
          conversations.push({ user: safe, lastMessage: lastMsg, unreadCount: unread });
        }
      }
      conversations.sort((a, b) => new Date(b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessage?.createdAt || 0).getTime());
      res.json(conversations);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب المحادثات" });
    }
  });

  app.get("/api/messages/conversation/:userId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "admin") {
        const otherUser = await storage.getUser(req.params.userId);
        if (otherUser && otherUser.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لمحادثات مستخدم من جامع آخر" });
        }
      }
      const msgs = await storage.getConversation(req.user!.id, req.params.userId);
      res.json(msgs);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب المحادثة" });
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const { receiverId } = req.body;
      let { content } = req.body;
      if (!receiverId || !content || typeof content !== "string") {
        return res.status(400).json({ message: "المستلم والمحتوى مطلوبان" });
      }
      if (content.length > 2000) return res.status(400).json({ message: "الرسالة طويلة جداً (الحد الأقصى 2000 حرف)" });
      if (receiverId === req.user!.id) return res.status(400).json({ message: "لا يمكنك إرسال رسالة لنفسك" });
      content = content.replace(/<[^>]*>/g, "").trim();
      if (!content) return res.status(400).json({ message: "المحتوى مطلوب" });
      const receiver = await storage.getUser(receiverId);
      if (!receiver) return res.status(404).json({ message: "المستلم غير موجود" });
      if (req.user!.role !== "admin" && receiver.mosqueId !== req.user!.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بمراسلة مستخدم من جامع آخر" });
      }
      if (receiver.suspendedUntil && new Date(receiver.suspendedUntil) > new Date()) {
        return res.status(403).json({ message: "هذا المستخدم موقوف" });
      }
      const now = Date.now();
      const userTimes = messageSendTimes.get(req.user!.id) || [];
      const recentTimes = userTimes.filter(t => now - t < 60000);
      if (recentTimes.length >= 30) {
        return res.status(429).json({ message: "عدد كبير من الرسائل. انتظر قليلاً" });
      }
      recentTimes.push(now);
      messageSendTimes.set(req.user!.id, recentTimes);
      const msg = await storage.createMessage({
        senderId: req.user!.id,
        receiverId,
        mosqueId: req.user!.mosqueId,
        content,
        isRead: false,
      });
      await logActivity(req.user!, "إرسال رسالة", "messages");
      res.status(201).json(msg);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إرسال الرسالة" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const msg = await storage.getMessage(req.params.id);
      if (!msg) return res.status(404).json({ message: "الرسالة غير موجودة" });
      if (msg.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      await storage.markMessageRead(req.params.id);
      res.json({ message: "تم التحديث" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/messages/mark-all-read/:senderId", requireAuth, async (req, res) => {
    try {
      await storage.markAllMessagesRead(req.params.senderId, req.user!.id);
      res.json({ message: "تم تحديد الكل كمقروء" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const msg = await storage.getMessage(req.params.id);
      if (!msg) return res.status(404).json({ message: "الرسالة غير موجودة" });
      if (msg.senderId !== req.user!.id) {
        return res.status(403).json({ message: "يمكنك حذف رسائلك فقط" });
      }
      await storage.deleteMessage(req.params.id);
      await logActivity(req.user!, "حذف رسالة", "messages");
      res.json({ message: "تم حذف الرسالة" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف الرسالة" });
    }
  });

  app.post("/api/messages/broadcast", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "admin" && req.user!.role !== "supervisor") {
        return res.status(403).json({ message: "غير مصرح بإرسال رسائل جماعية" });
      }
      const { content, targetRole } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "المحتوى مطلوب" });
      }
      const sanitized = content.replace(/<[^>]*>/g, "").trim();
      if (sanitized.length === 0 || sanitized.length > 2000) {
        return res.status(400).json({ message: "محتوى غير صالح" });
      }
      const allUsers = await storage.getUsersByMosque(req.user!.mosqueId!);
      const targets = targetRole ? allUsers.filter(u => u.role === targetRole && u.id !== req.user!.id) : allUsers.filter(u => u.id !== req.user!.id);
      let sent = 0;
      for (const target of targets) {
        await storage.createMessage({
          senderId: req.user!.id,
          receiverId: target.id,
          mosqueId: req.user!.mosqueId,
          content: sanitized,
          isRead: false,
        });
        sent++;
      }
      await logActivity(req.user!, `إرسال رسالة جماعية إلى ${sent} مستخدم`, "messages");
      res.status(201).json({ message: `تم إرسال الرسالة إلى ${sent} مستخدم`, count: sent });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إرسال الرسالة الجماعية" });
    }
  });

  app.delete("/api/messages/conversation/:userId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const otherUser = await storage.getUser(req.params.userId);
      if (otherUser && currentUser.role !== "admin" && otherUser.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذه المحادثة" });
      }
      const conv = await storage.getConversation(currentUser.id, req.params.userId);
      for (const msg of conv) {
        await storage.deleteMessage(msg.id);
      }
      await logActivity(currentUser, "حذف محادثة", "messages");
      res.json({ message: "تم حذف المحادثة" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف المحادثة" });
    }
  });

  app.get("/api/messages/search", requireAuth, async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim().toLowerCase();
      if (!query || query.length < 2) return res.status(400).json({ message: "كلمة البحث قصيرة جداً" });
      const msgs = await storage.getMessagesByUser(req.user!.id);
      const results = msgs.filter(m => m.content.toLowerCase().includes(query)).slice(0, 50);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في البحث" });
    }
  });

  // ==================== POINTS & BADGES ====================
  app.get("/api/points", requireAuth, async (req, res) => {
    try {
      const userId = (req.query.userId as string) || req.user!.id;
      const pts = await storage.getPointsByUser(userId);
      res.json(pts);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب النقاط" });
    }
  });

  app.get("/api/points/total/:userId", requireAuth, async (req, res) => {
    try {
      const total = await storage.getTotalPoints(req.params.userId);
      res.json({ total });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/points/leaderboard", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let mosqueId = req.query.mosqueId as string | undefined;
      if (currentUser.role !== "admin") {
        mosqueId = currentUser.mosqueId || undefined;
      }
      const leaderboard = await storage.getLeaderboard(mosqueId);
      res.json(leaderboard);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب لوحة المتصدرين" });
    }
  });

  app.post("/api/points", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بمنح النقاط" });
      }
      const { userId, amount, reason, category } = req.body;
      if (!userId || amount === undefined || !reason) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount === 0 || Math.abs(numAmount) > 10000) {
        return res.status(400).json({ message: "قيمة النقاط غير صحيحة (الحد الأقصى 10000)" });
      }
      if (typeof reason !== "string" || reason.length > 500) {
        return res.status(400).json({ message: "السبب مطلوب ويجب ألا يتجاوز 500 حرف" });
      }
      const targetStudent = await storage.getUser(userId);
      if (!targetStudent) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (currentUser.role !== "admin" && targetStudent.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بمنح نقاط لطالب من جامع آخر" });
      }
      const point = await storage.createPoint({
        userId,
        mosqueId: currentUser.mosqueId,
        amount: numAmount,
        reason: reason.slice(0, 500),
        category: category || "assignment",
      });
      await logActivity(currentUser, `منح ${amount} نقطة`, "points");
      res.status(201).json(point);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في منح النقاط" });
    }
  });

  app.get("/api/badges", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let userId = (req.query.userId as string) || currentUser.id;
      if (userId !== currentUser.id && currentUser.role !== "admin") {
        const targetUser = await storage.getUser(userId);
        if (targetUser && targetUser.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لأوسمة مستخدم من جامع آخر" });
        }
      }
      const userBadges = await storage.getBadgesByUser(userId);
      res.json(userBadges);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب الأوسمة" });
    }
  });

  app.post("/api/badges", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بمنح الأوسمة" });
      }
      const { userId, badgeType, badgeName, description } = req.body;
      if (!userId || !badgeType || !badgeName) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const badgeTarget = await storage.getUser(userId);
      if (!badgeTarget) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (currentUser.role !== "admin" && badgeTarget.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بمنح أوسمة لمستخدم من جامع آخر" });
      }
      const badge = await storage.createBadge({
        userId,
        mosqueId: currentUser.mosqueId,
        badgeType,
        badgeName,
        description,
      });
      await logActivity(currentUser, `منح وسام: ${badgeName}`, "badges");
      res.status(201).json(badge);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في منح الوسام" });
    }
  });

  app.delete("/api/badges/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteBadge(req.params.id);
      await logActivity(req.user!, "حذف وسام", "badges");
      res.json({ message: "تم حذف الوسام" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف الوسام" });
    }
  });

  // ==================== SCHEDULES ====================
  app.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { mosqueId, teacherId } = req.query;
      if (mosqueId) {
        if (currentUser.role !== "admin" && mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لجداول جامع آخر" });
        }
        const scheds = await storage.getSchedulesByMosque(mosqueId as string);
        return res.json(scheds);
      }
      if (teacherId) {
        if (currentUser.role !== "admin" && currentUser.role !== "supervisor") {
          if (currentUser.id !== teacherId) {
            return res.status(403).json({ message: "غير مصرح بالوصول لجداول معلم آخر" });
          }
        }
        const scheds = await storage.getSchedulesByTeacher(teacherId as string);
        return res.json(scheds);
      }
      if (currentUser.role === "teacher") {
        const scheds = await storage.getSchedulesByTeacher(currentUser.id);
        return res.json(scheds);
      }
      if (currentUser.mosqueId) {
        const scheds = await storage.getSchedulesByMosque(currentUser.mosqueId);
        return res.json(scheds);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب الجداول" });
    }
  });

  app.post("/api/schedules", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء جدول" });
      }
      const schedTextCheck = filterTextFields(req.body, ["title", "location"]);
      if (schedTextCheck.blocked) {
        return res.status(400).json({ message: schedTextCheck.reason });
      }
      const { teacherId, title, dayOfWeek, startTime, endTime, location } = req.body;
      if (!title || dayOfWeek === undefined || !startTime || !endTime) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const schedule = await storage.createSchedule({
        mosqueId: currentUser.mosqueId,
        teacherId: teacherId || currentUser.id,
        title,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        location,
      });
      await logActivity(currentUser, `إنشاء جدول: ${title}`, "schedules");
      res.status(201).json(schedule);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إنشاء الجدول" });
    }
  });

  app.patch("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتعديل الجدول" });
      }
      const existingSchedule = await storage.getSchedule(req.params.id);
      if (!existingSchedule) return res.status(404).json({ message: "الجدول غير موجود" });
      if (currentUser.role !== "admin" && existingSchedule.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتعديل جدول جامع آخر" });
      }
      const updateData: any = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.dayOfWeek !== undefined) updateData.dayOfWeek = Number(req.body.dayOfWeek);
      if (req.body.startTime !== undefined) updateData.startTime = req.body.startTime;
      if (req.body.endTime !== undefined) updateData.endTime = req.body.endTime;
      if (req.body.location !== undefined) updateData.location = req.body.location;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      const updated = await storage.updateSchedule(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "الجدول غير موجود" });
      await logActivity(currentUser, "تعديل جدول", "schedules");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تعديل الجدول" });
    }
  });

  app.delete("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بحذف الجدول" });
      }
      const schedToDelete = await storage.getSchedule(req.params.id);
      if (!schedToDelete) return res.status(404).json({ message: "الجدول غير موجود" });
      if (currentUser.role !== "admin" && schedToDelete.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بحذف جدول جامع آخر" });
      }
      await storage.deleteSchedule(req.params.id);
      await logActivity(currentUser, "حذف جدول", "schedules");
      res.json({ message: "تم حذف الجدول" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف الجدول" });
    }
  });

  // ==================== COMPETITIONS ====================
  app.get("/api/competitions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const mosqueId = req.query.mosqueId as string | undefined;
      if (mosqueId) {
        if (currentUser.role !== "admin" && mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لمسابقات جامع آخر" });
        }
        const comps = await storage.getCompetitionsByMosque(mosqueId);
        return res.json(comps);
      }
      if (currentUser.role === "admin") {
        const comps = await storage.getCompetitions();
        return res.json(comps);
      }
      if (currentUser.mosqueId) {
        const comps = await storage.getCompetitionsByMosque(currentUser.mosqueId);
        return res.json(comps);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب المسابقات" });
    }
  });

  app.get("/api/competitions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const comp = await storage.getCompetition(req.params.id);
      if (!comp) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && comp.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذه المسابقة" });
      }
      const participants = await storage.getCompetitionParticipants(req.params.id);
      res.json({ ...comp, participants });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب المسابقة" });
    }
  });

  app.post("/api/competitions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء مسابقة" });
      }
      const compTextCheck = filterTextFields(req.body, ["title", "description"]);
      if (compTextCheck.blocked) {
        return res.status(400).json({ message: compTextCheck.reason });
      }
      const { title, description, surahName, fromVerse, toVerse, competitionDate } = req.body;
      if (!title || !competitionDate) {
        return res.status(400).json({ message: "العنوان وتاريخ المسابقة مطلوبان" });
      }
      const comp = await storage.createCompetition({
        mosqueId: currentUser.mosqueId,
        createdBy: currentUser.id,
        title,
        description,
        surahName,
        fromVerse: fromVerse ? Number(fromVerse) : undefined,
        toVerse: toVerse ? Number(toVerse) : undefined,
        competitionDate: new Date(competitionDate),
      });
      await logActivity(currentUser, `إنشاء مسابقة: ${title}`, "competitions");
      res.status(201).json(comp);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إنشاء المسابقة" });
    }
  });

  app.patch("/api/competitions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتعديل المسابقة" });
      }
      const existingComp = await storage.getCompetition(req.params.id);
      if (!existingComp) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && existingComp.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتعديل مسابقة جامع آخر" });
      }
      const updateData: any = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.surahName !== undefined) updateData.surahName = req.body.surahName;
      if (req.body.fromVerse !== undefined) updateData.fromVerse = Number(req.body.fromVerse);
      if (req.body.toVerse !== undefined) updateData.toVerse = Number(req.body.toVerse);
      if (req.body.competitionDate !== undefined) updateData.competitionDate = new Date(req.body.competitionDate);
      if (req.body.status !== undefined) updateData.status = req.body.status;
      const updated = await storage.updateCompetition(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "المسابقة غير موجودة" });
      await logActivity(currentUser, "تعديل مسابقة", "competitions");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تعديل المسابقة" });
    }
  });

  app.delete("/api/competitions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بحذف المسابقة" });
      }
      const compToDelete = await storage.getCompetition(req.params.id);
      if (!compToDelete) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && compToDelete.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بحذف مسابقة جامع آخر" });
      }
      await storage.deleteCompetition(req.params.id);
      await logActivity(currentUser, "حذف مسابقة", "competitions");
      res.json({ message: "تم حذف المسابقة" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف المسابقة" });
    }
  });

  app.post("/api/competitions/:id/participants", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإضافة مشاركين" });
      }
      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ message: "معرف الطالب مطلوب" });
      }
      const participant = await storage.createCompetitionParticipant({
        competitionId: req.params.id,
        studentId,
      });
      await logActivity(currentUser, "إضافة مشارك في مسابقة", "competitions");
      res.status(201).json(participant);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إضافة المشارك" });
    }
  });

  app.patch("/api/competitions/:id/participants/:participantId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتعديل نتائج المشاركين" });
      }
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && competition.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتعديل مسابقة جامع آخر" });
      }
      const updateData: any = {};
      if (req.body.score !== undefined) updateData.score = Number(req.body.score);
      if (req.body.rank !== undefined) updateData.rank = Number(req.body.rank);
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      const updated = await storage.updateCompetitionParticipant(req.params.participantId, updateData);
      if (!updated) return res.status(404).json({ message: "المشارك غير موجود" });
      await logActivity(currentUser, "تعديل نتيجة مشارك", "competitions");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تعديل المشارك" });
    }
  });

  app.delete("/api/competitions/:id/participants/:participantId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإزالة المشاركين" });
      }
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && competition.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذه المسابقة" });
      }
      await storage.deleteCompetitionParticipant(req.params.participantId);
      await logActivity(currentUser, "إزالة مشارك من مسابقة", "competitions");
      res.json({ message: "تم إزالة المشارك" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إزالة المشارك" });
    }
  });

  // ==================== PARENT REPORTS ====================
  app.get("/api/parent-reports", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بعرض التقارير" });
      }
      const studentId = req.query.studentId as string;
      if (!studentId) {
        return res.status(400).json({ message: "معرف الطالب مطلوب" });
      }
      const reports = await storage.getParentReportsByStudent(studentId);
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب التقارير" });
    }
  });

  app.post("/api/parent-reports", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء تقرير" });
      }
      const { studentId, reportType, content, expiresAt } = req.body;
      if (!studentId || !content) {
        return res.status(400).json({ message: "معرف الطالب والمحتوى مطلوبان" });
      }
      const student = await storage.getUser(studentId);
      if (!student) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }
      const accessToken = crypto.randomBytes(32).toString("hex");
      const mosqueId = currentUser.mosqueId || student.mosqueId;
      const report = await storage.createParentReport({
        studentId,
        mosqueId: mosqueId || undefined,
        reportType: reportType || "weekly",
        content,
        accessToken,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });
      await logActivity(currentUser, "إنشاء تقرير ولي أمر", "parent_reports");
      res.status(201).json(report);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إنشاء التقرير" });
    }
  });

  app.delete("/api/parent-reports/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بحذف التقرير" });
      }
      const report = await storage.getParentReport(req.params.id);
      if (!report) return res.status(404).json({ message: "التقرير غير موجود" });
      if (currentUser.role !== "admin" && report.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا التقرير" });
      }
      await storage.deleteParentReport(req.params.id);
      await logActivity(currentUser, "حذف تقرير ولي أمر", "parent_reports");
      res.json({ message: "تم حذف التقرير" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف التقرير" });
    }
  });

  app.get("/api/parent-report/:token", async (req, res) => {
    try {
      const report = await storage.getParentReportByToken(req.params.token);
      if (!report) return res.status(404).json({ message: "التقرير غير موجود" });
      if (report.expiresAt && new Date(report.expiresAt) < new Date()) {
        return res.status(410).json({ message: "انتهت صلاحية التقرير" });
      }
      const student = await storage.getUser(report.studentId);
      const mosque = report.mosqueId ? await storage.getMosque(report.mosqueId) : null;
      res.json({
        ...report,
        studentName: student?.name || "",
        mosqueName: mosque?.name || "",
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب التقرير" });
    }
  });

  // تقرير أسبوعي لولي الأمر
  app.get("/api/weekly-report/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
      if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId)
        return res.status(403).json({ message: "غير مصرح" });

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [attendanceAll, assignmentsAll] = await Promise.all([
        db.select().from(attendance).where(eq(attendance.studentId, student.id)),
        db.select().from(assignments).where(eq(assignments.studentId, student.id)),
      ]);
      const weekAtt = attendanceAll.filter(a => new Date(a.date) >= weekAgo);
      const present = weekAtt.filter(a => ["present","حاضر"].includes(a.status)).length;
      const absent  = weekAtt.filter(a => ["absent","غائب"].includes(a.status)).length;
      const weekAsgn = assignmentsAll.filter(a => new Date(a.createdAt) >= weekAgo);
      const done    = weekAsgn.filter(a => a.status === "done").length;
      const pending = weekAsgn.filter(a => a.status === "pending").length;

      const whatsappText = [
        `*التقرير الأسبوعي - ${student.name}*`,
        `الحضور: ${present}/${weekAtt.length}`,
        `الواجبات: ${done}/${weekAsgn.length} مكتملة`,
        absent > 0 ? `غياب: ${absent} يوم` : `لا غياب هذا الأسبوع`,
      ].join("\n");

      res.json({
        student: { id: student.id, name: student.name, parentPhone: student.parentPhone },
        stats: { present, absent, done, pending, weekPoints: 0 },
        whatsappText,
        whatsappUrl: student.parentPhone
          ? `https://wa.me/964${student.parentPhone.replace(/^0/,"")}?text=${encodeURIComponent(whatsappText)}`
          : null,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== EXPORT ====================
  app.get("/api/export/students", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتصدير البيانات" });
      }
      let students: User[] = [];
      if (currentUser.role === "admin") {
        const mosqueId = req.query.mosqueId as string | undefined;
        if (mosqueId) {
          students = (await storage.getUsersByMosqueAndRole(mosqueId, "student")).filter(s => !s.pendingApproval);
        } else {
          students = (await storage.getUsersByRole("student")).filter(s => !s.pendingApproval);
        }
      } else if (currentUser.mosqueId) {
        students = (await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student")).filter(s => !s.pendingApproval);
      }
      const exported = students.map(({ password, ...s }) => s);
      res.json(exported);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تصدير البيانات" });
    }
  });

  app.get("/api/export/attendance", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتصدير البيانات" });
      }
      let records: any[] = [];
      if (currentUser.role === "admin") {
        const mosqueId = req.query.mosqueId as string | undefined;
        if (mosqueId) {
          records = await storage.getAttendanceByMosque(mosqueId);
        } else {
          const allMosques = await storage.getMosques();
          for (const m of allMosques) {
            const mr = await storage.getAttendanceByMosque(m.id);
            records.push(...mr);
          }
        }
      } else if (currentUser.role === "teacher") {
        records = await storage.getAttendanceByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        records = await storage.getAttendanceByMosque(currentUser.mosqueId);
      }
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تصدير البيانات" });
    }
  });

  app.get("/api/export/assignments", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتصدير البيانات" });
      }
      let result: Assignment[] = [];
      if (currentUser.role === "admin") {
        const mosqueId = req.query.mosqueId as string | undefined;
        if (mosqueId) {
          result = await storage.getAssignmentsByMosque(mosqueId);
        } else {
          result = await storage.getAssignments();
        }
      } else if (currentUser.role === "teacher") {
        result = await storage.getAssignmentsByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        result = await storage.getAssignmentsByMosque(currentUser.mosqueId);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تصدير البيانات" });
    }
  });

  // ==================== SMART ALERTS ====================
  app.get("/api/smart-alerts", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بعرض التنبيهات" });
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      let students: User[] = [];
      let teachersList: User[] = [];
      let assignmentsList: Assignment[] = [];

      if (currentUser.role === "admin") {
        students = (await storage.getUsersByRole("student")).filter(s => !s.pendingApproval);
        teachersList = await storage.getUsersByRole("teacher");
        assignmentsList = await storage.getAssignments();
      } else if (currentUser.role === "teacher") {
        students = (await storage.getUsersByTeacher(currentUser.id)).filter(s => !s.pendingApproval);
        assignmentsList = await storage.getAssignmentsByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        const mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
        students = mosqueUsers.filter(u => u.role === "student" && !u.pendingApproval);
        teachersList = mosqueUsers.filter(u => u.role === "teacher");
        assignmentsList = await storage.getAssignmentsByMosque(currentUser.mosqueId);
      }

      const studentsWithoutAssignments: any[] = [];
      const lowGrades: any[] = [];

      for (const student of students) {
        if (!student.isActive) continue;
        const studentAssignments = assignmentsList.filter(a => a.studentId === student.id);
        const hasRecent = studentAssignments.some(a => new Date(a.createdAt) > sevenDaysAgo);
        if (!hasRecent) {
          const lastAssignment = studentAssignments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          studentsWithoutAssignments.push({
            id: student.id,
            name: student.name,
            date: lastAssignment ? new Date(lastAssignment.createdAt).toLocaleDateString("ar") : "لا يوجد",
          });
        }
        const lowGradeAssignments = studentAssignments.filter(a => a.grade !== null && a.grade !== undefined && Number(a.grade) < 60);
        for (const a of lowGradeAssignments) {
          lowGrades.push({
            id: `${student.id}-${a.id}`,
            name: student.name,
            grade: a.grade,
            subject: a.surahName || "واجب",
          });
        }
      }

      const inactiveTeachers: any[] = [];
      for (const teacher of teachersList) {
        if (!teacher.isActive) continue;
        const teacherAssignments = assignmentsList.filter(a => a.teacherId === teacher.id);
        const hasRecent = teacherAssignments.some(a => new Date(a.createdAt) > sevenDaysAgo);
        if (!hasRecent) {
          const lastAssignment = teacherAssignments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          inactiveTeachers.push({
            id: teacher.id,
            name: teacher.name,
            date: lastAssignment ? new Date(lastAssignment.createdAt).toLocaleDateString("ar") : "لا يوجد نشاط",
          });
        }
      }

      let examsList: any[] = [];
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        for (const m of allMosques) {
          const me = await storage.getExamsByMosque(m.id);
          examsList.push(...me);
        }
      } else if (currentUser.role === "teacher") {
        examsList = await storage.getExamsByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        examsList = await storage.getExamsByMosque(currentUser.mosqueId);
      }

      const upcomingExams: any[] = [];
      for (const exam of examsList) {
        const examDate = new Date(exam.examDate);
        if (examDate >= new Date() && examDate <= threeDaysFromNow) {
          upcomingExams.push({
            id: exam.id,
            examName: exam.title,
            name: exam.title,
            date: examDate.toLocaleDateString("ar"),
            subject: exam.surahName || "",
          });
        }
      }

      res.json({
        studentsWithoutAssignments,
        inactiveTeachers,
        upcomingExams,
        lowGrades,
      });
    } catch (err: any) {
      console.error("Smart alerts error:", err);
      res.status(500).json({ message: "حدث خطأ في تحليل التنبيهات" });
    }
  });

  // ==================== EMERGENCY SUBSTITUTIONS ====================
  app.get("/api/emergency-substitutions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const subs = await storage.getEmergencySubstitutionsByMosque(m.id);
          all.push(...subs);
        }
        return res.json(all);
      }
      if (currentUser.mosqueId) {
        const subs = await storage.getEmergencySubstitutionsByMosque(currentUser.mosqueId);
        return res.json(subs);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/emergency-substitutions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { absentTeacherId, substituteTeacherId, reason, date, notes } = req.body;
      if (!absentTeacherId || !substituteTeacherId || !date) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const mosqueId = currentUser.role === "admin" ? (req.body.mosqueId || currentUser.mosqueId) : currentUser.mosqueId;
      const absentTeacher = await storage.getUser(absentTeacherId);
      const students = absentTeacher ? await storage.getUsersByTeacher(absentTeacherId) : [];
      const sub = await storage.createEmergencySubstitution({
        mosqueId, absentTeacherId, substituteTeacherId, reason, date: new Date(date), notes,
        status: "active", studentsCount: students.length, createdBy: currentUser.id,
      });
      await storage.createNotification({
        userId: substituteTeacherId, mosqueId,
        title: "تكليف بالإنابة", message: `تم تكليفك كمعلم بديل عن ${absentTeacher?.name || "معلم غائب"}`,
        type: "emergency",
      });
      await logActivity(currentUser, "إنشاء إنابة طارئة", "emergency_substitutions");
      res.status(201).json(sub);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.patch("/api/emergency-substitutions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const sub = await storage.getEmergencySubstitution(req.params.id);
      if (!sub) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && sub.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const allowedFields: Record<string, boolean> = { status: true, notes: true, endDate: true };
      const safeData: any = {};
      for (const key of Object.keys(req.body)) {
        if (allowedFields[key]) safeData[key] = req.body[key];
      }
      const updated = await storage.updateEmergencySubstitution(req.params.id, safeData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في التحديث" });
    }
  });

  app.delete("/api/emergency-substitutions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const sub = await storage.getEmergencySubstitution(req.params.id);
      if (!sub) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && sub.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteEmergencySubstitution(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في الحذف" });
    }
  });

  app.post("/api/emergency-substitutions/auto-assign", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { absentTeacherId, reason, date } = req.body;
      if (!absentTeacherId || !date) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const absentTeacher = await storage.getUser(absentTeacherId);
      if (!absentTeacher || !absentTeacher.mosqueId) {
        return res.status(404).json({ message: "المعلم غير موجود" });
      }
      const absentLevels = getTeacherLevelsArray(absentTeacher);
      const allTeachers = await storage.getUsersByMosqueAndRole(absentTeacher.mosqueId, "teacher");
      const availableTeachers = allTeachers.filter(t => {
        if (t.id === absentTeacherId || !t.isActive) return false;
        const tLevels = getTeacherLevelsArray(t);
        return absentLevels.some(l => tLevels.includes(l));
      });
      if (availableTeachers.length === 0) {
        return res.status(400).json({ message: "لا يوجد معلمون بديلون متاحون بنفس المستويات" });
      }
      const students = await storage.getUsersByTeacher(absentTeacherId);
      const activeStudents = students.filter(s => s.isActive);
      const created: any[] = [];
      for (let i = 0; i < activeStudents.length; i++) {
        const teacher = availableTeachers[i % availableTeachers.length];
        const sub = await storage.createEmergencySubstitution({
          mosqueId: absentTeacher.mosqueId, absentTeacherId, substituteTeacherId: teacher.id,
          reason, date: new Date(date), status: "active", studentsCount: 1,
          notes: `توزيع تلقائي - طالب: ${activeStudents[i].name}`, createdBy: currentUser.id,
        });
        created.push(sub);
      }
      const notifiedTeachers = new Set<string>();
      for (const t of availableTeachers) {
        if (!notifiedTeachers.has(t.id)) {
          notifiedTeachers.add(t.id);
          const assignedCount = created.filter(s => s.substituteTeacherId === t.id).length;
          await storage.createNotification({
            userId: t.id, mosqueId: absentTeacher.mosqueId,
            title: "تكليف إنابة تلقائي",
            message: `تم تكليفك بتدريس ${assignedCount} طالب بدلاً عن ${absentTeacher.name}`,
            type: "emergency",
          });
        }
      }
      await logActivity(currentUser, `توزيع تلقائي لطلاب ${absentTeacher.name}`, "emergency_substitutions");
      res.status(201).json({ created, totalStudents: activeStudents.length, totalTeachers: availableTeachers.length });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== INCIDENT RECORDS ====================
  app.get("/api/incidents", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const records = await storage.getIncidentRecordsByMosque(m.id);
          all.push(...records);
        }
        return res.json(all);
      }
      if (currentUser.mosqueId) {
        const records = await storage.getIncidentRecordsByMosque(currentUser.mosqueId);
        return res.json(records);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/incidents", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { title, description, severity, actionTaken } = req.body;
      if (!title) {
        return res.status(400).json({ message: "عنوان الحادثة مطلوب" });
      }
      const record = await storage.createIncidentRecord({
        mosqueId: currentUser.mosqueId, reportedBy: currentUser.id,
        title, description: description || "", severity: severity || "medium", status: "open",
        actionTaken: actionTaken || null,
      });
      await logActivity(currentUser, `تسجيل حادثة: ${title}`, "incidents");
      res.status(201).json(record);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.patch("/api/incidents/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const incident = await storage.getIncidentRecord(req.params.id);
      if (!incident) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && incident.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const incidentAllowed: Record<string, boolean> = { title: true, description: true, severity: true, status: true, actionTaken: true, resolution: true };
      const safeIncidentData: any = {};
      for (const key of Object.keys(req.body)) {
        if (incidentAllowed[key]) safeIncidentData[key] = req.body[key];
      }
      const updated = await storage.updateIncidentRecord(req.params.id, safeIncidentData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في التحديث" });
    }
  });

  app.delete("/api/incidents/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const incident = await storage.getIncidentRecord(req.params.id);
      if (!incident) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && incident.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteIncidentRecord(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في الحذف" });
    }
  });

  // ==================== GRADUATES ====================
  app.get("/api/graduates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const grads = await storage.getGraduatesByMosque(m.id);
          all.push(...grads);
        }
        return res.json(all);
      }
      if (currentUser.mosqueId) {
        const grads = await storage.getGraduatesByMosque(currentUser.mosqueId);
        return res.json(grads);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/graduates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { studentId, graduationDate, totalJuz, ijazahChain, ijazahTeacher, recitationStyle, finalGrade, certificateId, notes } = req.body;
      if (!studentId || !graduationDate) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const student = await storage.getUser(studentId);
      if (!student || student.role !== "student") {
        return res.status(400).json({ message: "الطالب غير موجود" });
      }
      if (currentUser.role === "teacher" && !canTeacherAccessStudent(currentUser, student)) {
        return res.status(403).json({ message: "غير مصرح بتخريج طالب ليس في مستوياتك" });
      }
      if (currentUser.role === "supervisor" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتخريج طالب من جامع آخر" });
      }
      const totalJuzNum = Number(totalJuz) || 30;
      if (totalJuzNum < 1 || totalJuzNum > 30) {
        return res.status(400).json({ message: "عدد الأجزاء يجب أن يكون بين 1 و 30" });
      }
      const mosqueId = currentUser.role === "admin" ? (req.body.mosqueId || currentUser.mosqueId) : currentUser.mosqueId;
      const grad = await storage.createGraduate({
        studentId, mosqueId, graduationDate: new Date(graduationDate),
        totalJuz: totalJuz || 30, ijazahChain, ijazahTeacher, recitationStyle, finalGrade, certificateId, notes,
      });

      try {
        const certNumber = `MTQ-GRAD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const student = await storage.getUser(studentId);
        const cert = await storage.createCertificate({
          studentId,
          issuedBy: currentUser.id,
          mosqueId: mosqueId || null,
          graduateId: grad.id,
          certificateNumber: certNumber,
          certificateType: "graduation",
          templateId: req.body.templateId || "classic-gold",
          title: `شهادة إتمام حفظ القرآن الكريم`,
          graduationGrade: finalGrade || null,
        });
        await storage.updateGraduate(grad.id, { certificateId: cert.id });

        await storage.createNotification({
          userId: studentId,
          mosqueId: mosqueId || null,
          title: "تهانينا! شهادة تخرج جديدة",
          message: `تم إصدار شهادة تخرج لكم بمناسبة إتمام حفظ ${totalJuz || 30} جزءاً من القرآن الكريم`,
          type: "success",
          isRead: false,
        });
      } catch (certErr: any) {
        console.error("Failed to create graduation certificate:", certErr);
      }

      await logActivity(currentUser, "تسجيل تخرج طالب", "graduates");
      res.status(201).json(grad);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.patch("/api/graduates/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const grad = await storage.getGraduate(req.params.id);
      if (!grad) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && grad.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const allowedFields = ["graduationDate", "totalJuz", "ijazahChain", "ijazahTeacher", "recitationStyle", "finalGrade", "certificateId", "notes"];
      const updateData: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }
      const updated = await storage.updateGraduate(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في التحديث" });
    }
  });

  app.delete("/api/graduates/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const grad = await storage.getGraduate(req.params.id);
      if (!grad) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && grad.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteGraduate(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في الحذف" });
    }
  });

  app.get("/api/graduates/:id/followups", requireAuth, async (req, res) => {
    try {
      const followups = await storage.getGraduateFollowupsByGraduate(req.params.id);
      res.json(followups);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/graduates/:id/followups", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { followupDate, retentionLevel, juzReviewed, notes } = req.body;
      if (!followupDate || !retentionLevel) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const graduate = await storage.getGraduate(req.params.id);
      if (!graduate) return res.status(404).json({ message: "الخريج غير موجود" });
      const followup = await storage.createGraduateFollowup({
        graduateId: req.params.id, mosqueId: graduate.mosqueId,
        followupDate: new Date(followupDate), retentionLevel, juzReviewed, notes,
        contactedBy: currentUser.id,
      });
      res.status(201).json(followup);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== STUDENT TRANSFERS ====================
  app.get("/api/student-transfers", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const transfers = await storage.getStudentTransfersByMosque(m.id);
          all.push(...transfers);
        }
        return res.json(all);
      }
      if (currentUser.mosqueId) {
        const transfers = await storage.getStudentTransfersByMosque(currentUser.mosqueId);
        return res.json(transfers);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/student-transfers", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { studentId, fromMosqueId, toMosqueId, reason, transferData } = req.body;
      if (!studentId || !toMosqueId) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const transfer = await storage.createStudentTransfer({
        studentId, fromMosqueId: fromMosqueId || currentUser.mosqueId,
        toMosqueId, reason, transferData, status: "pending",
      });
      await logActivity(currentUser, "طلب نقل طالب", "student_transfers");
      res.status(201).json(transfer);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.patch("/api/student-transfers/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const transfer = await storage.getStudentTransfer(req.params.id);
      if (!transfer) return res.status(404).json({ message: "طلب النقل غير موجود" });
      if (currentUser.role !== "admin" && transfer.fromMosqueId !== currentUser.mosqueId && transfer.toMosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const allowedFields = ["status", "reason", "transferData"];
      const updateData: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }
      if (req.body.status === "approved") {
        updateData.approvedBy = currentUser.id;
        const student = await storage.getUser(transfer.studentId);
        if (student) {
          await storage.updateUser(student.id, { mosqueId: transfer.toMosqueId });
        }
      }
      const updated = await storage.updateStudentTransfer(req.params.id, updateData);
      await logActivity(currentUser, `تحديث طلب نقل: ${req.body.status}`, "student_transfers");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في التحديث" });
    }
  });

  // ==================== FAMILY LINKS ====================
  app.get("/api/family-links", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const parentPhone = req.query.parentPhone as string;
      if (parentPhone) {
        const links = await storage.getFamilyLinksByParentPhone(parentPhone);
        return res.json(links);
      }
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const links = await storage.getFamilyLinksByMosque(m.id);
          all.push(...links);
        }
        return res.json(all);
      }
      if (currentUser.mosqueId) {
        const links = await storage.getFamilyLinksByMosque(currentUser.mosqueId);
        return res.json(links);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/family-links", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { parentPhone, studentId, relationship } = req.body;
      if (!parentPhone || !studentId) {
        return res.status(400).json({ message: "رقم ولي الأمر ومعرف الطالب مطلوبان" });
      }
      if (currentUser.role !== "admin") {
        const student = await storage.getUser(studentId);
        if (!student || student.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "الطالب لا ينتمي لمسجدك" });
        }
      }
      const mosqueId = currentUser.role === "admin" ? (req.body.mosqueId || currentUser.mosqueId) : currentUser.mosqueId;
      const link = await storage.createFamilyLink({
        parentPhone, studentId, mosqueId, relationship: relationship || "parent",
      });
      res.status(201).json(link);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.delete("/api/family-links/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const link = await storage.getFamilyLink(req.params.id);
      if (!link) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && link.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteFamilyLink(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في الحذف" });
    }
  });

  app.get("/api/family-dashboard/:phone", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const phone = req.params.phone;
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        const cleanDigits = (s: string) => (s || "").replace(/[^\d]/g, "");
        const requestedPhone = cleanDigits(phone);
        const myStudents = await storage.getUsersByTeacher(currentUser.id);
        const hasAccess = myStudents.some(s => cleanDigits(s.parentPhone || "") === requestedPhone);
        if (!hasAccess) {
          return res.status(403).json({ message: "غير مصرح بالوصول لهذا الرقم" });
        }
      }
      const links = await storage.getFamilyLinksByParentPhone(phone);
      if (links.length === 0) {
        return res.json({ children: [] });
      }
      const children: any[] = [];
      for (const link of links) {
        const student = await storage.getUser(link.studentId);
        if (!student) continue;
        if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId) continue;
        const studentAssignments = await storage.getAssignmentsByStudent(student.id);
        const totalAssignments = studentAssignments.length;
        const completedAssignments = studentAssignments.filter(a => a.status === "done").length;
        const avgGrade = studentAssignments.filter(a => a.grade != null).reduce((sum, a) => sum + (a.grade || 0), 0) / (studentAssignments.filter(a => a.grade != null).length || 1);
        const studentAttendance = await storage.getAttendanceByStudent(student.id);
        const presentCount = studentAttendance.filter(a => a.status === "present").length;
        const studentPoints = await storage.getPointsByUser(student.id);
        const totalPoints = studentPoints.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        children.push({
          id: student.id, studentName: student.name, name: student.name, level: student.level,
          relationship: link.relationship,
          attendance: presentCount, points: totalPoints, assignments: completedAssignments,
          stats: { totalAssignments, completedAssignments, avgGrade: Math.round(avgGrade) },
        });
      }
      res.json({ children });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  // ==================== FEEDBACK & SUGGESTIONS ====================
  app.get("/api/feedback", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "admin") {
        const all = await storage.getAllFeedback();
        return res.json(all);
      }
      if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        const fb = await storage.getFeedbackByMosque(currentUser.mosqueId);
        return res.json(fb);
      }
      const fb = await storage.getFeedbackByUser(currentUser.id);
      res.json(fb);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { type, title, description, priority, isAnonymous } = req.body;
      if (!title || !description) {
        return res.status(400).json({ message: "العنوان والوصف مطلوبان" });
      }
      const fb = await storage.createFeedback({
        userId: isAnonymous ? null : currentUser.id,
        mosqueId: currentUser.mosqueId,
        type: type || "suggestion", title, description,
        priority: priority || "medium", status: "open",
        isAnonymous: isAnonymous || false,
      });
      await logActivity(currentUser, `إرسال ملاحظة: ${title}`, "feedback");
      res.status(201).json(fb);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.patch("/api/feedback/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const fb = await storage.getFeedback(req.params.id);
      if (!fb) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && fb.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const allowedFields = ["status", "response", "priority"];
      const updateData: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }
      if (req.body.response) {
        updateData.respondedBy = currentUser.id;
      }
      const updated = await storage.updateFeedback(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في التحديث" });
    }
  });

  app.delete("/api/feedback/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      await storage.deleteFeedback(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في الحذف" });
    }
  });

  // ==================== TAJWEED RULES ====================
  app.get("/api/tajweed-rules", requireAuth, async (req, res) => {
    try {
      const category = req.query.category as string;
      if (category) {
        const rules = await storage.getTajweedRulesByCategory(category);
        return res.json(rules);
      }
      const rules = await storage.getAllTajweedRules();
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/tajweed-rules", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { category, title, description, examples, surahReference, sortOrder } = req.body;
      if (!category || !title || !description) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const rule = await storage.createTajweedRule({
        category, title, description, examples, surahReference, sortOrder: sortOrder || 0,
      });
      res.status(201).json(rule);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.patch("/api/tajweed-rules/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const tajweedAllowed = ["category", "title", "description", "examples", "surahReference", "sortOrder"];
      const safeTajweedData: any = {};
      for (const key of tajweedAllowed) {
        if (req.body[key] !== undefined) safeTajweedData[key] = req.body[key];
      }
      const updated = await storage.updateTajweedRule(req.params.id, safeTajweedData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في التحديث" });
    }
  });

  app.delete("/api/tajweed-rules/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      await storage.deleteTajweedRule(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في الحذف" });
    }
  });

  // ==================== SIMILAR VERSES ====================
  app.get("/api/similar-verses", requireAuth, async (req, res) => {
    try {
      const verses = await storage.getAllSimilarVerses();
      res.json(verses);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/similar-verses", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { verse1Surah, verse1Number, verse1Text, verse2Surah, verse2Number, verse2Text, explanation, difficulty } = req.body;
      if (!verse1Surah || !verse1Text || !verse2Surah || !verse2Text) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const verse = await storage.createSimilarVerse({
        verse1Surah, verse1Number, verse1Text, verse2Surah, verse2Number, verse2Text,
        explanation, difficulty: difficulty || "medium",
      });
      res.status(201).json(verse);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.delete("/api/similar-verses/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      await storage.deleteSimilarVerse(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في الحذف" });
    }
  });

  // ==================== STUDENT STREAKS ====================
  app.get("/api/student-streaks/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const allAttendance = await storage.getAttendanceByStudent(studentId);

      const sorted = allAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;

      for (const record of sorted) {
        if (record.status === "present" || record.status === "late") {
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          if (currentStreak === 0) currentStreak = tempStreak;
          tempStreak = 0;
        }
      }
      if (currentStreak === 0) currentStreak = tempStreak;
      if (tempStreak > maxStreak) maxStreak = tempStreak;

      const totalPresent = allAttendance.filter(a => a.status === "present" || a.status === "late").length;

      res.json({ currentStreak, maxStreak, totalPresent, totalRecords: allAttendance.length });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== ACTIVITY HEATMAP ====================
  app.get("/api/activity-heatmap/:userId", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const now = new Date();
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      const [attendanceData, assignmentsData, pointsData] = await Promise.all([
        storage.getAttendanceByStudent(userId),
        storage.getAssignmentsByStudent(userId),
        storage.getPointsByUser(userId),
      ]);

      const dayMap: Record<string, number> = {};

      attendanceData.forEach(a => {
        const day = new Date(a.date).toISOString().split("T")[0];
        dayMap[day] = (dayMap[day] || 0) + 1;
      });

      assignmentsData.forEach(a => {
        if (a.status === "done") {
          const day = new Date(a.createdAt).toISOString().split("T")[0];
          dayMap[day] = (dayMap[day] || 0) + 1;
        }
      });

      pointsData.forEach(p => {
        const day = new Date(p.createdAt).toISOString().split("T")[0];
        dayMap[day] = (dayMap[day] || 0) + 1;
      });

      const heatmapData = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

      res.json(heatmapData);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== STAR OF THE WEEK ====================
  app.get("/api/star-of-week", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const mosqueId = currentUser.mosqueId;
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const students = mosqueId
        ? (await storage.getUsersByMosqueAndRole(mosqueId, "student")).filter(s => s.isActive && !s.pendingApproval)
        : [];

      if (students.length === 0) {
        return res.json({ star: null });
      }

      const studentScores: { student: any; score: number; details: any }[] = [];

      for (const student of students) {
        let score = 0;
        const details: any = { attendance: 0, assignments: 0, points: 0 };

        const attendance = await storage.getAttendanceByStudent(student.id);
        const weekAttendance = attendance.filter(a => new Date(a.date) >= weekStart);
        details.attendance = weekAttendance.filter(a => a.status === "present").length;
        score += details.attendance * 10;

        const assignments = await storage.getAssignmentsByStudent(student.id);
        const weekAssignments = assignments.filter(a => new Date(a.createdAt) >= weekStart && a.status === "done");
        details.assignments = weekAssignments.length;
        score += weekAssignments.reduce((sum, a) => sum + (a.grade || 0), 0);

        const points = await storage.getPointsByUser(student.id);
        const weekPoints = points.filter(p => new Date(p.createdAt) >= weekStart);
        details.points = weekPoints.reduce((sum, p) => sum + p.amount, 0);
        score += details.points;

        studentScores.push({ student: { id: student.id, name: student.name, level: student.level, avatar: student.avatar }, score, details });
      }

      studentScores.sort((a, b) => b.score - a.score);

      const top3 = studentScores.slice(0, 3);

      res.json({ star: top3[0] || null, topStudents: top3 });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== PREDICTION ====================
  app.get("/api/prediction/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const student = await storage.getUser(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const assignments = await storage.getAssignmentsByStudent(studentId);
      const completedAssignments = assignments.filter(a => a.status === "done");

      if (completedAssignments.length < 2) {
        return res.json({ prediction: null, message: "Not enough data" });
      }

      const totalMemorizedVerses = completedAssignments.reduce((sum, a) => sum + (a.toVerse - a.fromVerse + 1), 0);

      const totalQuranVerses = 6236;
      const remainingVerses = totalQuranVerses - totalMemorizedVerses;

      const sortedByDate = completedAssignments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const firstDate = new Date(sortedByDate[0].createdAt);
      const lastDate = new Date(sortedByDate[sortedByDate.length - 1].createdAt);
      const weeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const versesPerWeek = totalMemorizedVerses / weeks;

      const remainingWeeks = versesPerWeek > 0 ? remainingVerses / versesPerWeek : 0;
      const predictedDate = new Date();
      predictedDate.setDate(predictedDate.getDate() + (remainingWeeks * 7));

      const grades = completedAssignments.filter(a => a.grade !== null).map(a => a.grade!);
      const avgGrade = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length) : 0;

      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const lastWeekAssignments = completedAssignments.filter(a => new Date(a.createdAt) >= oneWeekAgo).length;
      const prevWeekAssignments = completedAssignments.filter(a => new Date(a.createdAt) >= twoWeeksAgo && new Date(a.createdAt) < oneWeekAgo).length;

      const trend = lastWeekAssignments > prevWeekAssignments ? "improving" : lastWeekAssignments < prevWeekAssignments ? "declining" : "stable";

      res.json({
        prediction: {
          totalMemorizedVerses,
          totalQuranVerses,
          progressPercent: Math.round((totalMemorizedVerses / totalQuranVerses) * 100),
          versesPerWeek: Math.round(versesPerWeek * 10) / 10,
          remainingWeeks: Math.round(remainingWeeks),
          predictedCompletionDate: predictedDate.toISOString(),
          avgGrade,
          trend,
          lastWeekAssignments,
          prevWeekAssignments,
        }
      });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== SMART REVIEW ====================
  app.get("/api/smart-review/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const assignments = await storage.getAssignmentsByStudent(studentId);
      const completed = assignments.filter(a => a.status === "done" && a.grade !== null);

      const surahPerformance: Record<string, { avgGrade: number; lastReviewed: Date; count: number; grades: number[] }> = {};

      completed.forEach(a => {
        if (!surahPerformance[a.surahName]) {
          surahPerformance[a.surahName] = { avgGrade: 0, lastReviewed: new Date(a.createdAt), count: 0, grades: [] };
        }
        surahPerformance[a.surahName].grades.push(a.grade!);
        surahPerformance[a.surahName].count++;
        const d = new Date(a.createdAt);
        if (d > surahPerformance[a.surahName].lastReviewed) {
          surahPerformance[a.surahName].lastReviewed = d;
        }
      });

      Object.keys(surahPerformance).forEach(surah => {
        const sp = surahPerformance[surah];
        sp.avgGrade = Math.round(sp.grades.reduce((s, g) => s + g, 0) / sp.grades.length);
      });

      const now = new Date();
      const needsReview = Object.entries(surahPerformance)
        .map(([surah, data]) => {
          const daysSinceReview = Math.floor((now.getTime() - data.lastReviewed.getTime()) / (24 * 60 * 60 * 1000));
          const reviewInterval = data.avgGrade >= 90 ? 30 : data.avgGrade >= 75 ? 14 : data.avgGrade >= 60 ? 7 : 3;
          const urgency = daysSinceReview / reviewInterval;
          return { surah, avgGrade: data.avgGrade, daysSinceReview, reviewInterval, urgency, needsReview: urgency >= 1 };
        })
        .sort((a, b) => b.urgency - a.urgency);

      const weakSpots = Object.entries(surahPerformance)
        .filter(([_, data]) => data.avgGrade < 70)
        .map(([surah, data]) => ({ surah, avgGrade: data.avgGrade, count: data.count }))
        .sort((a, b) => a.avgGrade - b.avgGrade);

      const todayReview = needsReview.filter(r => r.needsReview).slice(0, 5);

      res.json({ todayReview, weakSpots, allSurahs: needsReview });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== MOSQUE RANKINGS ====================
  app.get("/api/mosque-rankings", requireAuth, async (req, res) => {
    try {
      const allMosques = await storage.getMosques();
      const activeMosques = allMosques.filter(m => m.isActive);

      const rankings = await Promise.all(activeMosques.map(async (mosque) => {
        const students = (await storage.getUsersByMosqueAndRole(mosque.id, "student")).filter(s => s.isActive && !s.pendingApproval);
        const teachers = (await storage.getUsersByMosqueAndRole(mosque.id, "teacher")).filter(t => t.isActive);

        let totalPoints = 0;
        let totalAssignments = 0;
        let completedAssignments = 0;

        for (const student of students) {
          const pts = await storage.getPointsByUser(student.id);
          totalPoints += pts.reduce((sum, p) => sum + p.amount, 0);
          const studentAssignments = await storage.getAssignmentsByStudent(student.id);
          totalAssignments += studentAssignments.length;
          completedAssignments += studentAssignments.filter(a => a.status === "done").length;
        }

        const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

        return {
          mosqueId: mosque.id,
          mosqueName: mosque.name,
          province: mosque.province,
          studentsCount: students.length,
          teachersCount: teachers.length,
          totalPoints,
          completionRate,
          score: totalPoints + (completionRate * 10) + (students.length * 5),
        };
      }));

      rankings.sort((a, b) => b.score - a.score);

      const ranked = rankings.map((r, i) => ({ ...r, rank: i + 1 }));

      res.json(ranked);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== SMART DAILY SUMMARY ====================
  app.get("/api/daily-summary", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      let students: User[] = [];
      let assignmentsList: Assignment[] = [];

      if (currentUser.role === "admin") {
        students = (await storage.getUsersByRole("student")).filter(s => s.isActive && !s.pendingApproval);
        assignmentsList = await storage.getAssignments();
      } else if (currentUser.role === "teacher") {
        students = (await storage.getUsersByTeacher(currentUser.id)).filter(s => s.isActive && !s.pendingApproval);
        assignmentsList = await storage.getAssignmentsByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        const mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
        students = mosqueUsers.filter(u => u.role === "student" && u.isActive && !u.pendingApproval);
        assignmentsList = await storage.getAssignmentsByMosque(currentUser.mosqueId);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const consecutiveAbsences: any[] = [];
      const ungradedAssignments = assignmentsList.filter(a => a.status === "pending" || (a.status === "done" && a.grade === null));
      const overdueAssignments = assignmentsList.filter(a => a.status === "pending" && a.scheduledDate && new Date(a.scheduledDate) < today);
      const nearLevelUp: any[] = [];

      let todayPresent = 0;
      let todayTotal = 0;

      for (const student of students) {
        const attendance = await storage.getAttendanceByStudent(student.id);
        const sorted = attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        let absences = 0;
        for (const a of sorted) {
          if (a.status === "absent") absences++;
          else break;
        }
        if (absences >= 2) {
          consecutiveAbsences.push({ id: student.id, name: student.name, days: absences, parentPhone: student.parentPhone });
        }

        const todayRecord = sorted.find(a => {
          const d = new Date(a.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });
        if (todayRecord) {
          todayTotal++;
          if (todayRecord.status === "present" || todayRecord.status === "late") todayPresent++;
        }

        const studentAssignments = assignmentsList.filter(a => a.studentId === student.id && a.status === "done");
        const juzMap = new Set<string>();
        for (const a of studentAssignments) {
          if (a.surahName) juzMap.add(a.surahName);
        }
        const currentLevel = student.level || 1;
        const thresholds = [5, 10, 15, 20, 25, 30];
        if (currentLevel < 6) {
          const nextThreshold = thresholds[currentLevel];
          const surahs = juzMap.size;
          if (nextThreshold && surahs >= nextThreshold - 2) {
            nearLevelUp.push({ id: student.id, name: student.name, currentLevel, surahsCount: surahs });
          }
        }
      }

      const attendanceRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : null;

      const items: any[] = [];

      if (consecutiveAbsences.length > 0) {
        items.push({
          type: "consecutive_absence",
          severity: "critical",
          title: `${consecutiveAbsences.length} طالب غائب بشكل متتالي`,
          description: consecutiveAbsences.map(s => `${s.name} (${s.days} أيام)`).join("، "),
          data: consecutiveAbsences,
          actionType: "whatsapp",
        });
      }

      if (ungradedAssignments.length > 0) {
        items.push({
          type: "ungraded",
          severity: "warning",
          title: `${ungradedAssignments.length} واجب بحاجة للتصحيح`,
          description: "واجبات مكتملة تنتظر التقييم",
          data: { count: ungradedAssignments.length },
          actionType: "navigate",
          actionTarget: "/assignments",
        });
      }

      if (overdueAssignments.length > 0) {
        items.push({
          type: "overdue",
          severity: "warning",
          title: `${overdueAssignments.length} واجب متأخر`,
          description: "واجبات تجاوزت موعدها المحدد",
          data: { count: overdueAssignments.length },
          actionType: "navigate",
          actionTarget: "/assignments",
        });
      }

      if (nearLevelUp.length > 0) {
        items.push({
          type: "near_level_up",
          severity: "positive",
          title: `${nearLevelUp.length} طالب قريب من الترقية`,
          description: nearLevelUp.map(s => s.name).join("، "),
          data: nearLevelUp,
          actionType: "navigate",
          actionTarget: "/students",
        });
      }

      items.sort((a, b) => {
        const order: Record<string, number> = { critical: 0, warning: 1, positive: 2, info: 3 };
        return (order[a.severity] || 3) - (order[b.severity] || 3);
      });

      res.json({
        items,
        attendanceRate,
        todayPresent,
        todayTotal,
        studentsCount: students.length,
        ungradedCount: ungradedAssignments.length,
        overdueCount: overdueAssignments.length,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب الملخص" });
    }
  });

  // ==================== MOSQUE HEALTH SCORE ====================
  app.get("/api/mosque-health/:mosqueId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "supervisor" && currentUser.mosqueId !== req.params.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const mosqueUsers = await storage.getUsersByMosque(req.params.mosqueId);
      const students = mosqueUsers.filter(u => u.role === "student" && u.isActive && !u.pendingApproval);
      const totalStudents = students.length;
      if (totalStudents === 0) return res.json({ score: 0, attendance: 0, completion: 0, activeRatio: 0 });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let totalAttendance = 0;
      let presentCount = 0;
      let totalAssignments = 0;
      let completedAssignments = 0;
      let activeStudents = 0;

      for (const student of students) {
        const att = await storage.getAttendanceByStudent(student.id);
        const recent = att.filter(a => new Date(a.date) > sevenDaysAgo);
        totalAttendance += recent.length;
        presentCount += recent.filter(a => a.status === "present" || a.status === "late").length;

        const assignments = await storage.getAssignmentsByStudent(student.id);
        totalAssignments += assignments.length;
        completedAssignments += assignments.filter(a => a.status === "done").length;

        const hasRecentActivity = att.some(a => new Date(a.date) > sevenDaysAgo) ||
          assignments.some(a => new Date(a.createdAt) > sevenDaysAgo);
        if (hasRecentActivity) activeStudents++;
      }

      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
      const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
      const activeRatio = Math.round((activeStudents / totalStudents) * 100);

      const score = Math.round(attendanceRate * 0.4 + completionRate * 0.3 + activeRatio * 0.3);

      res.json({ score, attendance: attendanceRate, completion: completionRate, activeRatio });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== SMART ASSIGNMENT SUGGESTION ====================
  app.get("/api/assignment-suggestion/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });

      const assignments = await storage.getAssignmentsByStudent(req.params.studentId);
      const doneAssignments = assignments.filter(a => a.status === "done" && a.surahName).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (doneAssignments.length === 0) {
        const firstSurah = quranSurahs[quranSurahs.length - 1];
        return res.json({
          surahName: firstSurah.name,
          fromVerse: 1,
          toVerse: Math.min(5, firstSurah.versesCount),
          reason: "أول واجب - البدء من جزء عمّ",
          type: "new",
        });
      }

      const lastDone = doneAssignments[0];
      const lastSurah = quranSurahs.find(s => s.name === lastDone.surahName);

      if (lastDone.grade !== null && Number(lastDone.grade) < 60) {
        return res.json({
          surahName: lastDone.surahName,
          fromVerse: lastDone.fromVerse,
          toVerse: lastDone.toVerse,
          reason: `مراجعة - الدرجة السابقة ${lastDone.grade}`,
          type: "review",
        });
      }

      if (lastSurah && lastDone.toVerse && lastDone.toVerse < lastSurah.versesCount) {
        const nextFrom = lastDone.toVerse + 1;
        const nextTo = Math.min(nextFrom + 4, lastSurah.versesCount);
        return res.json({
          surahName: lastSurah.name,
          fromVerse: nextFrom,
          toVerse: nextTo,
          reason: `إكمال سورة ${lastSurah.name}`,
          type: "new",
        });
      }

      if (lastSurah) {
        const currentIndex = quranSurahs.findIndex(s => s.number === lastSurah.number);
        const nextSurah = currentIndex > 0 ? quranSurahs[currentIndex - 1] : null;
        if (nextSurah) {
          return res.json({
            surahName: nextSurah.name,
            fromVerse: 1,
            toVerse: Math.min(5, nextSurah.versesCount),
            reason: `الانتقال لسورة ${nextSurah.name}`,
            type: "new",
          });
        }
      }

      const weakSurahs = doneAssignments.filter(a => a.grade !== null && Number(a.grade) < 75);
      if (weakSurahs.length > 0) {
        const weakest = weakSurahs[0];
        return res.json({
          surahName: weakest.surahName,
          fromVerse: weakest.fromVerse,
          toVerse: weakest.toVerse,
          reason: `تقوية نقطة ضعف - ${weakest.surahName}`,
          type: "review",
        });
      }

      res.json({ surahName: null, reason: "لا توجد اقتراحات حالياً", type: null });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== ATTENDANCE PATTERNS & DISCIPLINE SCORE ====================
  app.get("/api/attendance-patterns/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const attendance = await storage.getAttendanceByStudent(req.params.studentId);
      if (attendance.length === 0) return res.json({ disciplineScore: 100, patterns: [], totalDays: 0 });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentAtt = attendance.filter(a => new Date(a.date) > thirtyDaysAgo);

      const totalDays = recentAtt.length;
      const presentDays = recentAtt.filter(a => a.status === "present").length;
      const lateDays = recentAtt.filter(a => a.status === "late").length;
      const absentDays = recentAtt.filter(a => a.status === "absent").length;

      const disciplineScore = totalDays > 0
        ? Math.round(((presentDays + lateDays * 0.7) / totalDays) * 100)
        : 100;

      const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const absentByDay: Record<number, number> = {};
      const totalByDay: Record<number, number> = {};
      for (const a of recentAtt) {
        const day = new Date(a.date).getDay();
        totalByDay[day] = (totalByDay[day] || 0) + 1;
        if (a.status === "absent") absentByDay[day] = (absentByDay[day] || 0) + 1;
      }

      const patterns: string[] = [];
      for (const [day, count] of Object.entries(absentByDay)) {
        const total = totalByDay[Number(day)] || 1;
        if (count >= 2 && count / total >= 0.5) {
          patterns.push(`يتغيب كثيراً يوم ${dayNames[Number(day)]}`);
        }
      }

      res.json({
        disciplineScore,
        patterns,
        totalDays,
        presentDays,
        lateDays,
        absentDays,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== COLLECTIVE WEAKNESS ====================
  app.get("/api/collective-weakness/:mosqueId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "supervisor" && currentUser.mosqueId !== req.params.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const assignments = await storage.getAssignmentsByMosque(req.params.mosqueId);
      const graded = assignments.filter(a => a.status === "done" && a.grade !== null && a.surahName);

      const surahStats: Record<string, { total: number; sumGrades: number; lowCount: number }> = {};

      for (const a of graded) {
        const name = a.surahName!;
        if (!surahStats[name]) surahStats[name] = { total: 0, sumGrades: 0, lowCount: 0 };
        surahStats[name].total++;
        surahStats[name].sumGrades += Number(a.grade);
        if (Number(a.grade) < 70) surahStats[name].lowCount++;
      }

      const weakSurahs = Object.entries(surahStats)
        .map(([name, stats]) => ({
          surahName: name,
          avgGrade: Math.round(stats.sumGrades / stats.total),
          totalAssignments: stats.total,
          lowGradeCount: stats.lowCount,
          lowPercentage: Math.round((stats.lowCount / stats.total) * 100),
        }))
        .filter(s => s.totalAssignments >= 3 && s.lowPercentage >= 30)
        .sort((a, b) => a.avgGrade - b.avgGrade)
        .slice(0, 10);

      res.json(weakSurahs);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== TEACHER PERFORMANCE METRICS ====================
  app.get("/api/teacher-performance/:teacherId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const teacher = await storage.getUser(req.params.teacherId);
      if (!teacher || teacher.role !== "teacher") return res.status(404).json({ message: "المعلم غير موجود" });
      if (currentUser.role === "supervisor" && teacher.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const teacherAssignments = await storage.getAssignmentsByTeacher(req.params.teacherId);
      const students = await storage.getUsersByTeacher(req.params.teacherId);
      const activeStudents = students.filter(s => s.isActive);

      const graded = teacherAssignments.filter(a => a.status === "done" && a.grade !== null);
      const avgGrade = graded.length > 0 ? Math.round(graded.reduce((s, a) => s + Number(a.grade), 0) / graded.length) : 0;

      const gradingSpeeds: number[] = [];
      for (const a of graded) {
        if (a.scheduledDate) {
          const scheduled = new Date(a.scheduledDate).getTime();
          const created = new Date(a.createdAt).getTime();
          const days = Math.max(0, Math.ceil((created - scheduled) / (1000 * 60 * 60 * 24)));
          gradingSpeeds.push(days);
        }
      }
      const avgGradingDays = gradingSpeeds.length > 0 ? Math.round(gradingSpeeds.reduce((s, d) => s + d, 0) / gradingSpeeds.length) : 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentAssignments = teacherAssignments.filter(a => new Date(a.createdAt) > thirtyDaysAgo);
      const weeklyAssignmentRate = Math.round((recentAssignments.length / 4.3) * 10) / 10;

      const pendingCount = teacherAssignments.filter(a => a.status === "pending").length;

      res.json({
        teacherId: req.params.teacherId,
        teacherName: teacher.name,
        totalStudents: students.length,
        activeStudents: activeStudents.length,
        totalAssignments: teacherAssignments.length,
        gradedAssignments: graded.length,
        pendingAssignments: pendingCount,
        avgStudentGrade: avgGrade,
        avgGradingDays,
        weeklyAssignmentRate,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/teacher-comparison", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      let teachers: User[] = [];
      if (currentUser.role === "admin") {
        teachers = await storage.getUsersByRole("teacher");
      } else if (currentUser.mosqueId) {
        teachers = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "teacher");
      }

      const comparison = await Promise.all(teachers.filter(t => t.isActive).map(async (teacher) => {
        const assignments = await storage.getAssignmentsByTeacher(teacher.id);
        const students = await storage.getUsersByTeacher(teacher.id);
        const graded = assignments.filter(a => a.status === "done" && a.grade !== null);
        const avgGrade = graded.length > 0 ? Math.round(graded.reduce((s, a) => s + Number(a.grade), 0) / graded.length) : 0;
        const pending = assignments.filter(a => a.status === "pending").length;

        return {
          id: teacher.id,
          name: teacher.name,
          studentsCount: students.length,
          assignmentsCount: assignments.length,
          avgGrade,
          pendingCount: pending,
          completionRate: assignments.length > 0 ? Math.round((graded.length / assignments.length) * 100) : 0,
        };
      }));

      comparison.sort((a, b) => b.avgGrade - a.avgGrade);
      res.json(comparison);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/teaching-recommendations/:teacherId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "teacher" && currentUser.id !== req.params.teacherId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const assignments = await storage.getAssignmentsByTeacher(req.params.teacherId);
      const graded = assignments.filter(a => a.status === "done" && a.grade !== null && a.surahName);

      const surahPerformance: Record<string, { total: number; sum: number; low: number }> = {};
      for (const a of graded) {
        const name = a.surahName!;
        if (!surahPerformance[name]) surahPerformance[name] = { total: 0, sum: 0, low: 0 };
        surahPerformance[name].total++;
        surahPerformance[name].sum += Number(a.grade);
        if (Number(a.grade) < 70) surahPerformance[name].low++;
      }

      const recommendations: any[] = [];
      for (const [surah, stats] of Object.entries(surahPerformance)) {
        const avg = Math.round(stats.sum / stats.total);
        if (stats.total >= 2 && avg < 75) {
          recommendations.push({
            type: "weak_surah",
            surahName: surah,
            avgGrade: avg,
            studentsAffected: stats.low,
            suggestion: `طلابك يحتاجون تركيز أكثر على سورة ${surah} (متوسط الدرجات: ${avg})`,
          });
        }
      }

      const students = await storage.getUsersByTeacher(req.params.teacherId);
      const pending = assignments.filter(a => a.status === "pending");
      if (pending.length > students.length * 2) {
        recommendations.push({
          type: "grading_backlog",
          count: pending.length,
          suggestion: `لديك ${pending.length} واجب بحاجة للتصحيح - حاول تصحيحها لتحفيز الطلاب`,
        });
      }

      const inactiveStudents = students.filter(s => {
        const studentAssignments = assignments.filter(a => a.studentId === s.id);
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 14);
        return !studentAssignments.some(a => new Date(a.createdAt) > lastWeek);
      });

      if (inactiveStudents.length > 0) {
        recommendations.push({
          type: "inactive_students",
          count: inactiveStudents.length,
          students: inactiveStudents.map(s => ({ id: s.id, name: s.name })),
          suggestion: `${inactiveStudents.length} طالب لم يحصلوا على واجبات منذ أسبوعين`,
        });
      }

      recommendations.sort((a, b) => {
        const order: Record<string, number> = { grading_backlog: 0, weak_surah: 1, inactive_students: 2 };
        return (order[a.type] || 3) - (order[b.type] || 3);
      });

      res.json(recommendations);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== STUDENT TIMELINE & ACHIEVEMENTS ====================
  app.get("/api/student-timeline/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "student" && currentUser.id !== req.params.studentId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });

      const assignments = await storage.getAssignmentsByStudent(req.params.studentId);
      const allPoints = await storage.getPointsByUser(req.params.studentId);
      const allBadges = await storage.getBadgesByUser(req.params.studentId);
      const attendance = await storage.getAttendanceByStudent(req.params.studentId);

      const timeline: any[] = [];

      const doneAssignments = assignments.filter(a => a.status === "done").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const surahs = new Set<string>();
      for (const a of doneAssignments) {
        if (a.surahName && !surahs.has(a.surahName)) {
          surahs.add(a.surahName);
          timeline.push({ type: "new_surah", date: a.createdAt, title: `بدء حفظ سورة ${a.surahName}`, icon: "book" });
        }
        if (a.grade !== null && Number(a.grade) >= 95) {
          timeline.push({ type: "excellent_grade", date: a.createdAt, title: `درجة ممتازة (${a.grade}) في ${a.surahName || "واجب"}`, icon: "star" });
        }
      }

      for (const b of allBadges) {
        timeline.push({ type: "badge", date: b.createdAt, title: `حصل على شارة: ${b.badgeName}`, icon: "award" });
      }

      const streakMilestones = [7, 14, 30, 60, 100];
      let streak = 0;
      const sortedAtt = attendance.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (const a of sortedAtt) {
        if (a.status === "present" || a.status === "late") {
          streak++;
          if (streakMilestones.includes(streak)) {
            timeline.push({ type: "streak", date: a.date, title: `سلسلة حضور ${streak} يوم`, icon: "flame" });
          }
        } else {
          streak = 0;
        }
      }

      const milestones = [{ count: 10, label: "10 سور" }, { count: 20, label: "20 سورة" }, { count: 50, label: "50 سورة" }, { count: 100, label: "100 سورة" }];
      let surahCount = 0;
      const surahsSeen = new Set<string>();
      for (const a of doneAssignments) {
        if (a.surahName && !surahsSeen.has(a.surahName)) {
          surahsSeen.add(a.surahName);
          surahCount++;
          const milestone = milestones.find(m => m.count === surahCount);
          if (milestone) {
            timeline.push({ type: "milestone", date: a.createdAt, title: `إنجاز: حفظ ${milestone.label}`, icon: "trophy" });
          }
        }
      }

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(timeline.slice(0, 50));
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/student-titles/:studentId", requireAuth, async (req, res) => {
    try {
      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });

      const assignments = await storage.getAssignmentsByStudent(req.params.studentId);
      const attendance = await storage.getAttendanceByStudent(req.params.studentId);
      const allPoints = await storage.getPointsByUser(req.params.studentId);
      const allBadges = await storage.getBadgesByUser(req.params.studentId);

      const titles: any[] = [];

      const graded = assignments.filter(a => a.status === "done" && a.grade !== null);
      const avgGrade = graded.length > 0 ? graded.reduce((s, a) => s + Number(a.grade), 0) / graded.length : 0;
      if (avgGrade >= 90 && graded.length >= 5) titles.push({ title: "الحافظ المتميز", icon: "crown", color: "gold" });
      if (avgGrade >= 80 && graded.length >= 10) titles.push({ title: "المجتهد", icon: "zap", color: "blue" });

      const recentAtt = attendance.filter(a => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return new Date(a.date) > d;
      });
      const presentRate = recentAtt.length > 0 ? recentAtt.filter(a => a.status === "present" || a.status === "late").length / recentAtt.length : 0;
      if (presentRate >= 0.95 && recentAtt.length >= 15) titles.push({ title: "بطل الحضور", icon: "flame", color: "orange" });

      const totalPoints = allPoints.reduce((s, p) => s + p.amount, 0);
      if (totalPoints >= 500) titles.push({ title: "جامع النقاط", icon: "coins", color: "emerald" });
      if (allBadges.length >= 3) titles.push({ title: "صاحب الشارات", icon: "award", color: "purple" });

      const surahs = new Set(graded.filter(a => a.surahName).map(a => a.surahName));
      if (surahs.size >= 30) titles.push({ title: "المثابر", icon: "mountain", color: "indigo" });

      res.json(titles);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/student-challenges", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "student") {
        return res.status(403).json({ message: "غير مصرح" });
      }

      // Generate or fetch weekly challenges
      // For now, return static challenges based on current date
      const now = new Date();
      const weekNumber = Math.floor(now.getDate() / 7);
      
      const challenges = [
        { id: "c1", title: "حافظ الأسبوع", description: "احفظ 10 آيات جديدة هذا الأسبوع", target: 10, current: 0, type: "memorization", reward: 50 },
        { id: "c2", title: "المواظب", description: "احضر 5 أيام متتالية", target: 5, current: 0, type: "attendance", reward: 30 },
        { id: "c3", title: "نجم التجويد", description: "احصل على درجة 95+ في تسميع واحد", target: 1, current: 0, type: "grade", reward: 40 }
      ];

      res.json(challenges);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== MESSAGE TEMPLATES ====================
  app.get("/api/message-templates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const allTemplates = await db.select().from(messageTemplates);
      const filtered = allTemplates.filter(t =>
        !t.mosqueId || t.mosqueId === currentUser.mosqueId || currentUser.role === "admin"
      );
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/message-templates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { category, title, content } = req.body;
      if (!category || !title || !content) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const [template] = await db.insert(messageTemplates).values({
        mosqueId: currentUser.mosqueId,
        category,
        title,
        content,
        createdBy: currentUser.id,
      }).returning();
      res.status(201).json(template);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.delete("/api/message-templates/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { eq } = await import("drizzle-orm");
      const [template] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, req.params.id));
      if (!template) return res.status(404).json({ message: "القالب غير موجود" });
      if (currentUser.role !== "admin" && template.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بحذف هذا القالب" });
      }
      await db.delete(messageTemplates).where(eq(messageTemplates.id, req.params.id));
      res.json({ message: "تم الحذف" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== COMMUNICATION LOG ====================
  app.get("/api/communication-log/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role !== "admin") {
        const student = await storage.getUser(req.params.studentId);
        if (!student || student.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لسجل طالب من جامع آخر" });
        }
      }
      const { eq } = await import("drizzle-orm");
      const logs = await db.select().from(communicationLogs).where(eq(communicationLogs.studentId, req.params.studentId));
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/communication-log", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { studentId, method, subject, notes, parentPhone } = req.body;
      if (!studentId || !method || !subject) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      if (currentUser.role !== "admin") {
        const student = await storage.getUser(studentId);
        if (!student || student.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالتواصل مع طالب من جامع آخر" });
        }
      }
      const [log] = await db.insert(communicationLogs).values({
        studentId,
        mosqueId: currentUser.mosqueId,
        contactedBy: currentUser.id,
        method,
        subject,
        notes,
        parentPhone,
      }).returning();
      res.status(201).json(log);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  // ==================== QURAN PROGRESS ====================
  app.get("/api/quran-progress", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const userId = (req.query.userId as string) || currentUser.id;
      if (userId !== currentUser.id && !["admin","supervisor","teacher"].includes(currentUser.role))
        return res.status(403).json({ message: "غير مصرح" });
      const surahNumber = req.query.surahNumber ? Number(req.query.surahNumber) : null;
      if (surahNumber) {
        const row = await storage.getQuranProgress(userId, surahNumber);
        return res.json(row || { verseStatuses: "{}", notes: null, reviewStreak: 0, reviewedToday: false });
      }
      res.json(await storage.getQuranProgressByUser(userId));
    } catch { res.status(500).json({ message: "حدث خطأ" }); }
  });

  app.post("/api/quran-progress", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { surahNumber, verseStatuses, notes, reviewedToday, reviewStreak, lastReviewDate, totalVerses } = req.body;
      if (!surahNumber || surahNumber < 1 || surahNumber > 114)
        return res.status(400).json({ message: "رقم السورة غير صحيح" });
      const statusesObj = typeof verseStatuses === "object" ? verseStatuses : JSON.parse(verseStatuses || "{}");
      const row = await storage.upsertQuranProgress({
        userId: currentUser.id, mosqueId: currentUser.mosqueId,
        surahNumber: Number(surahNumber), verseStatuses: JSON.stringify(statusesObj),
        notes: notes || null, reviewedToday: reviewedToday ?? false,
        reviewStreak: reviewStreak ?? 0, lastReviewDate: lastReviewDate || null,
      });
      if (totalVerses > 0) {
        const memorized = Object.values(statusesObj).filter((s: any) => s === "memorized").length;
        if (memorized >= totalVerses) {
          const existing = await db.select().from(badges)
            .where(and(eq(badges.userId, currentUser.id), eq(badges.badgeType, `surah_complete_${surahNumber}`)));
          if (existing.length === 0) {
            await storage.createBadge({
              userId: currentUser.id, mosqueId: currentUser.mosqueId,
              badgeType: `surah_complete_${surahNumber}`,
              badgeName: `حافظ سورة رقم ${surahNumber}`,
              description: `تم حفظ السورة كاملاً`,
            });
            await storage.createPoint({
              userId: currentUser.id, mosqueId: currentUser.mosqueId,
              amount: Math.min(totalVerses * 2, 100), category: "achievement",
              reason: `إتمام حفظ سورة كاملة (${totalVerses} آية)`,
            });
            await storage.createNotification({
              userId: currentUser.id, mosqueId: currentUser.mosqueId,
              title: "إنجاز رائع!", type: "success",
              message: `أتممت حفظ السورة رقم ${surahNumber} كاملاً — تم منحك شارة ونقاط!`,
            });
          }
        }
      }
      res.json(row);
    } catch { res.status(500).json({ message: "حدث خطأ في حفظ التقدم" }); }
  });

  // ==================== MOSQUE REGISTRATION & VOUCHING SYSTEM ====================
  const registrationLimiter = new Map<string, number[]>();

  app.post("/api/register-mosque", async (req, res) => {
    try {
      const ip = req.ip || "unknown";
      const now = Date.now();
      const attempts = registrationLimiter.get(ip) || [];
      const recentAttempts = attempts.filter(t => now - t < 3600000);
      if (recentAttempts.length >= 3) {
        return res.status(429).json({ message: "تم تجاوز الحد المسموح. حاول بعد ساعة" });
      }
      registrationLimiter.set(ip, [...recentAttempts, now]);

      const { mosqueName, province, city, area, landmark, mosquePhone,
              applicantName, applicantPhone, requestedUsername, requestedPassword } = req.body;

      if (!mosqueName || !province || !city || !area || !applicantName || !applicantPhone || !requestedUsername || !requestedPassword) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب ملؤها" });
      }
      const regFieldCheck = validateFields(req.body, ["mosqueName", "province", "city", "area", "landmark", "mosquePhone", "applicantName", "applicantPhone", "requestedUsername", "requestedPassword"]);
      if (!regFieldCheck.valid) return res.status(400).json({ message: regFieldCheck.error });

      if (requestedPassword.length < 8) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
      }
      if (!/[A-Za-z]/.test(requestedPassword) || !/[0-9]/.test(requestedPassword)) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تحتوي على حروف وأرقام" });
      }

      const existingUser = await storage.getUserByUsername(requestedUsername);
      if (existingUser) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }

      const { eq } = await import("drizzle-orm");
      const existingPending = await db.select().from(mosqueRegistrations)
        .where(eq(mosqueRegistrations.requestedUsername, requestedUsername));
      if (existingPending.some(r => r.status === "pending")) {
        return res.status(400).json({ message: "يوجد طلب معلّق بنفس اسم المستخدم" });
      }

      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(requestedPassword);

      const contentCheck = filterTextFields(req.body, ["mosqueName", "city", "area", "applicantName"]);
      if (contentCheck.blocked) {
        return res.status(400).json({ message: `محتوى غير مسموح في حقل ${contentCheck.field}` });
      }

      const [registration] = await db.insert(mosqueRegistrations).values({
        mosqueName,
        province,
        city,
        area,
        landmark: landmark || null,
        mosquePhone,
        applicantName,
        applicantPhone,
        requestedUsername,
        requestedPassword: hashedPassword,
        registrationType: "direct",
        status: "pending",
      }).returning();

      try {
        const admins = (await storage.getUsers()).filter(u => u.role === "admin" && u.isActive);
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            title: "طلب تسجيل مسجد جديد",
            message: `تم تقديم طلب تسجيل مباشر لمسجد "${mosqueName}" من ${applicantName}. يرجى مراجعته في طلبات الانضمام.`,
            type: "registration_request",
            isRead: false,
          });
        }
      } catch {}

      res.status(201).json({ message: "تم تقديم طلبك بنجاح. سيتم مراجعته من قبل الإدارة", id: registration.id });
    } catch (err: any) {
      console.error("[register-mosque] Error:", err?.message || err);
      res.status(500).json({ message: "حدث خطأ في تقديم الطلب" });
    }
  });

  app.post("/api/vouch-mosque", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "supervisor") {
        return res.status(403).json({ message: "التزكية متاحة للمشرفين فقط" });
      }

      const { mosqueName, province, city, area, landmark, mosquePhone,
              applicantName, applicantPhone, requestedUsername, requestedPassword,
              voucherRelationship, vouchReason } = req.body;

      if (!mosqueName || !province || !city || !area || !applicantName || !applicantPhone ||
          !requestedUsername || !requestedPassword || !voucherRelationship || !vouchReason) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب ملؤها" });
      }

      if (requestedPassword.length < 8) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
      }
      if (!/[A-Za-z]/.test(requestedPassword) || !/[0-9]/.test(requestedPassword)) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تحتوي على حروف وأرقام" });
      }

      const existingUser = await storage.getUserByUsername(requestedUsername);
      if (existingUser) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }

      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(requestedPassword);

      const contentCheck = filterTextFields(req.body, ["mosqueName", "city", "area", "applicantName", "vouchReason"]);
      if (contentCheck.blocked) {
        return res.status(400).json({ message: `محتوى غير مسموح في حقل ${contentCheck.field}` });
      }

      const [registration] = await db.insert(mosqueRegistrations).values({
        mosqueName,
        province,
        city,
        area,
        landmark: landmark || null,
        mosquePhone,
        applicantName,
        applicantPhone,
        requestedUsername,
        requestedPassword: hashedPassword,
        registrationType: "vouching",
        vouchedByUserId: currentUser.id,
        vouchedByMosqueId: currentUser.mosqueId,
        voucherRelationship,
        vouchReason,
        status: "pending",
      }).returning();

      await logActivity(currentUser, `تزكية مسجد جديد: ${mosqueName}`, "registration");

      try {
        const admins = (await storage.getUsers()).filter(u => u.role === "admin" && u.isActive);
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            title: "تزكية مسجد جديدة",
            message: `قام المشرف "${currentUser.name}" بتزكية مسجد "${mosqueName}" لصالح ${applicantName}. يرجى مراجعة الطلب.`,
            type: "vouching_request",
            isRead: false,
          });
        }
      } catch {}

      res.status(201).json({ message: "تم تقديم التزكية بنجاح", id: registration.id });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/mosque-registrations", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const allRegs = await db.select().from(mosqueRegistrations);
      allRegs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const enriched = await Promise.all(allRegs.map(async (reg) => {
        let voucherName = null;
        let voucherMosqueName = null;
        if (reg.vouchedByUserId) {
          const voucher = await storage.getUser(reg.vouchedByUserId);
          voucherName = voucher?.name || null;
        }
        if (reg.vouchedByMosqueId) {
          const mosque = await storage.getMosque(reg.vouchedByMosqueId);
          voucherMosqueName = mosque?.name || null;
        }
        return { ...reg, voucherName, voucherMosqueName, requestedPassword: undefined };
      }));

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.patch("/api/mosque-registrations/:id/approve", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const { eq } = await import("drizzle-orm");
      const [reg] = await db.select().from(mosqueRegistrations).where(eq(mosqueRegistrations.id, req.params.id));
      if (!reg) return res.status(404).json({ message: "الطلب غير موجود" });
      if (reg.status !== "pending") return res.status(400).json({ message: "الطلب تمت معالجته مسبقاً" });

      const existingUser = await storage.getUserByUsername(reg.requestedUsername);
      if (existingUser) {
        return res.status(400).json({ message: "اسم المستخدم أصبح مستخدماً. يرجى رفض الطلب" });
      }

      const mosque = await storage.createMosque({
        name: reg.mosqueName,
        province: reg.province,
        city: reg.city,
        area: reg.area,
        landmark: reg.landmark,
        phone: reg.mosquePhone,
        managerName: reg.applicantName,
        status: "active",
        isActive: true,
      });

      const user = await storage.createUser({
        username: reg.requestedUsername,
        password: reg.requestedPassword,
        name: reg.applicantName,
        role: "supervisor",
        mosqueId: mosque.id,
        phone: reg.applicantPhone,
        isActive: true,
      });

      await db.update(mosqueRegistrations)
        .set({ status: "approved", adminNotes: req.body.adminNotes || null, reviewedAt: new Date() })
        .where(eq(mosqueRegistrations.id, req.params.id));

      await logActivity(currentUser, `موافقة على تسجيل مسجد: ${reg.mosqueName}`, "registration");

      if (reg.vouchedByUserId) {
        try {
          await storage.createNotification({
            userId: reg.vouchedByUserId,
            mosqueId: reg.vouchedByMosqueId || undefined,
            title: "تمت الموافقة على تزكيتك",
            message: `تمت الموافقة على طلب تزكية مسجد "${reg.mosqueName}" الذي قدمته. تم إنشاء المسجد وحساب المشرف بنجاح.`,
            type: "vouching_approved",
            isRead: false,
          });
        } catch {}
      }

      res.json({ message: "تمت الموافقة وإنشاء المسجد والمشرف بنجاح", mosqueId: mosque.id, userId: user.id });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.patch("/api/mosque-registrations/:id/reject", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const { eq } = await import("drizzle-orm");
      const [reg] = await db.select().from(mosqueRegistrations).where(eq(mosqueRegistrations.id, req.params.id));
      if (!reg) return res.status(404).json({ message: "الطلب غير موجود" });
      if (reg.status !== "pending") return res.status(400).json({ message: "الطلب تمت معالجته مسبقاً" });

      const { rejectionReason } = req.body;
      if (!rejectionReason) return res.status(400).json({ message: "يرجى كتابة سبب الرفض" });

      await db.update(mosqueRegistrations)
        .set({ status: "rejected", rejectionReason, adminNotes: req.body.adminNotes || null, reviewedAt: new Date() })
        .where(eq(mosqueRegistrations.id, req.params.id));

      await logActivity(currentUser, `رفض تسجيل مسجد: ${reg.mosqueName}`, "registration");

      if (reg.vouchedByUserId) {
        try {
          await storage.createNotification({
            userId: reg.vouchedByUserId,
            mosqueId: reg.vouchedByMosqueId || undefined,
            title: "تم رفض طلب التزكية",
            message: `تم رفض طلب تزكية مسجد "${reg.mosqueName}". السبب: ${rejectionReason}`,
            type: "vouching_rejected",
            isRead: false,
          });
        } catch {}
      }

      res.json({ message: "تم رفض الطلب" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/my-vouchings", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "supervisor") {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { eq } = await import("drizzle-orm");
      const myVouchings = await db.select().from(mosqueRegistrations)
        .where(eq(mosqueRegistrations.vouchedByUserId, currentUser.id));
      myVouchings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(myVouchings.map(v => ({ ...v, requestedPassword: undefined })));
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // ==================== INVITE CODES ====================
  app.get("/api/my-invite-code", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!currentUser.mosqueId) {
        return res.status(400).json({ message: "لا يوجد مسجد مرتبط بحسابك" });
      }
      const mosque = await storage.getMosque(currentUser.mosqueId);
      const inviteCode = currentUser.mosqueId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase();
      res.json({
        inviteCode,
        mosqueName: mosque?.name || "مسجد",
        stats: {
          totalInvites: 0,
          joinedFromInvite: 0,
        },
      });
    } catch {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/registration-stats", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const allRegs = await db.select().from(mosqueRegistrations);
      res.json({
        total: allRegs.length,
        pending: allRegs.filter(r => r.status === "pending").length,
        approved: allRegs.filter(r => r.status === "approved").length,
        rejected: allRegs.filter(r => r.status === "rejected").length,
        vouching: allRegs.filter(r => r.registrationType === "vouching").length,
        direct: allRegs.filter(r => r.registrationType === "direct").length,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/public-testimonials", async (_req, res) => {
    try {
      const all = await db.select().from(testimonials).where(eq(testimonials.isActive, true)).orderBy(asc(testimonials.sortOrder));
      res.json(all);
    } catch {
      res.json([]);
    }
  });

  app.get("/api/admin/testimonials", requireRole("admin"), async (_req, res) => {
    try {
      const all = await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt));
      res.json(all);
    } catch {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/admin/testimonials", requireRole("admin"), async (req, res) => {
    try {
      const { name, role, text, rating, isActive, sortOrder } = req.body;
      if (!name || !role || !text) return res.status(400).json({ message: "الاسم والدور والنص مطلوبة" });
      const [created] = await db.insert(testimonials).values({
        name, role, text,
        rating: Math.min(Math.max(Number(rating) || 5, 1), 5),
        isActive: isActive !== false,
        sortOrder: Number(sortOrder) || 0,
      }).returning();
      await logActivity(req.user!, "إضافة رأي مستخدم", "testimonials", `${name}`);
      res.json(created);
    } catch {
      res.status(500).json({ message: "حدث خطأ في إضافة الرأي" });
    }
  });

  app.patch("/api/admin/testimonials/:id", requireRole("admin"), async (req, res) => {
    try {
      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.role !== undefined) updateData.role = req.body.role;
      if (req.body.text !== undefined) updateData.text = req.body.text;
      if (req.body.rating !== undefined) updateData.rating = Math.min(Math.max(Number(req.body.rating), 1), 5);
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      if (req.body.sortOrder !== undefined) updateData.sortOrder = Number(req.body.sortOrder);
      const [updated] = await db.update(testimonials).set(updateData).where(eq(testimonials.id, req.params.id)).returning();
      if (!updated) return res.status(404).json({ message: "الرأي غير موجود" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "حدث خطأ في تحديث الرأي" });
    }
  });

  app.delete("/api/admin/testimonials/:id", requireRole("admin"), async (req, res) => {
    try {
      const [deleted] = await db.delete(testimonials).where(eq(testimonials.id, req.params.id)).returning();
      if (!deleted) return res.status(404).json({ message: "الرأي غير موجود" });
      await logActivity(req.user!, "حذف رأي مستخدم", "testimonials", `${deleted.name}`);
      res.json({ message: "تم الحذف" });
    } catch {
      res.status(500).json({ message: "حدث خطأ في حذف الرأي" });
    }
  });

  app.get("/api/public-stats", async (_req, res) => {
    try {
      const [mosquesCount] = await db.select({ c: count() }).from(mosques);
      const [studentsCount] = await db.select({ c: count() }).from(users).where(eq(users.role, "student"));
      const [teachersCount] = await db.select({ c: count() }).from(users).where(eq(users.role, "teacher"));
      const [assignmentsCount] = await db.select({ c: count() }).from(assignments).where(eq(assignments.status, "done"));
      res.json({
        mosques: mosquesCount?.c || 0,
        students: studentsCount?.c || 0,
        teachers: teachersCount?.c || 0,
        completedAssignments: assignmentsCount?.c || 0,
      });
    } catch {
      res.json({ mosques: 0, students: 0, teachers: 0, completedAssignments: 0 });
    }
  });

  return httpServer;
}
