import type { Express } from "express";
import { requireAuth, requireRole, hashPassword } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import { eq, and, desc, asc, count, min, max, sql as dsql } from "drizzle-orm";
import {
  mosques,
  users,
  assignments,
  attendance,
  notifications,
  messages,
  activityLogs,
  mosqueRegistrations,
  mosqueHistory,
  mosqueMessages,
  type User,
} from "@shared/schema";
import { filterTextFields } from "@shared/content-filter";
import { validateFields, validateBoolean, sanitizeImageUrl } from "@shared/security-utils";
import { logActivity } from "./shared";

export function registerMosquesRoutes(app: Express) {
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

}
