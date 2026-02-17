import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, hashPassword } from "./auth";
import { insertUserSchema, insertAssignmentSchema, insertActivityLogSchema, insertNotificationSchema, insertMosqueSchema, type User, type Assignment } from "@shared/schema";
import { sessionTracker } from "./session-tracker";
import { filterTextFields } from "@shared/content-filter";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Auto-seed feature flags
  try {
    const existingFlags = await storage.getFeatureFlags();
    if (existingFlags.length === 0) {
      const defaults = [
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
      ];
      for (const flag of defaults) {
        await storage.createFeatureFlag(flag);
      }
      console.log("Feature flags seeded successfully");
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
      const mosque = await storage.createMosque({ name, province, city, area, landmark, address, phone, managerName, description, image, isActive });
      await logActivity(req.user!, `إنشاء جامع: ${mosque.name}`, "mosques");
      res.status(201).json(mosque);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
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
      if (image !== undefined) updateData.image = image;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (req.body.status !== undefined) {
        if (!["active", "suspended", "permanently_closed"].includes(req.body.status)) {
          return res.status(400).json({ message: "حالة الجامع غير صحيحة" });
        }
        updateData.status = req.body.status;
      }
      if (req.body.adminNotes !== undefined) updateData.adminNotes = req.body.adminNotes;
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
        if (role === "student") {
          result = await storage.getUsersByTeacher(currentUser.id);
        } else if (currentUser.mosqueId) {
          if (role) {
            result = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, role);
          } else {
            result = await storage.getUsersByMosque(currentUser.mosqueId);
          }
        } else {
          result = await storage.getUsersByTeacher(currentUser.id);
        }
      } else if (currentUser.mosqueId) {
        if (role) {
          result = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, role);
        } else {
          result = await storage.getUsersByMosque(currentUser.mosqueId);
        }
      }

      const safe = result.map(({ password, ...u }) => u);
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
        req.body.isActive = true;
        delete req.body.canPrintIds;
      } else {
        return res.status(403).json({ message: "غير مصرح بإنشاء حسابات" });
      }

      const contentCheck = filterTextFields(req.body, ["name", "address", "notes"]);
      if (contentCheck.blocked) {
        return res.status(400).json({ message: contentCheck.reason });
      }

      const { username, name, role: userRole, mosqueId: bodyMosqueId, teacherId, phone, address, gender, avatar, isActive, canPrintIds, age, telegramId, parentPhone, educationLevel, isSpecialNeeds, isOrphan } = req.body;
      if (!username || typeof username !== "string" || username.length < 3 || username.length > 50) {
        return res.status(400).json({ message: "اسم المستخدم مطلوب ويجب أن يكون بين 3 و 50 حرف" });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط" });
      }
      if (!name || typeof name !== "string" || name.length > 200) {
        return res.status(400).json({ message: "الاسم مطلوب ويجب ألا يتجاوز 200 حرف" });
      }
      const rawPassword = req.body.password || "123456";
      if (req.body.password && (typeof req.body.password !== "string" || req.body.password.length < 6)) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      const data: any = {
        username, name, password: await hashPassword(rawPassword),
        role: req.body.role, mosqueId: req.body.mosqueId, teacherId,
        phone, address, gender, avatar, isActive, canPrintIds, age, telegramId, parentPhone, educationLevel, isSpecialNeeds, isOrphan,
      };
      const user = await storage.createUser(data);
      const { password, ...safe } = user;
      await logActivity(currentUser, `إنشاء حساب: ${user.name} (${targetRole})`, "users");
      res.status(201).json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
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

    const canEdit =
      currentUser.role === "admin" ||
      currentUser.id === req.params.id ||
      (currentUser.role === "supervisor" && ["teacher", "student"].includes(targetUser.role)) ||
      (currentUser.role === "teacher" && targetUser.role === "student");

    if (!canEdit) {
      return res.status(403).json({ message: "غير مصرح بتعديل هذا المستخدم" });
    }

    const updateData: any = {};
    const { name, phone, address, gender, avatar, teacherId, age, telegramId, parentPhone, educationLevel, isSpecialNeeds, isOrphan } = req.body;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (gender !== undefined) updateData.gender = gender;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (teacherId !== undefined) updateData.teacherId = teacherId;
    if (age !== undefined) updateData.age = age;
    if (telegramId !== undefined) updateData.telegramId = telegramId;
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone;
    if (educationLevel !== undefined) updateData.educationLevel = educationLevel;
    if (isSpecialNeeds !== undefined) updateData.isSpecialNeeds = isSpecialNeeds;
    if (isOrphan !== undefined) updateData.isOrphan = isOrphan;

    if (req.body.password) {
      if (typeof req.body.password !== "string" || req.body.password.length < 6) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      updateData.password = await hashPassword(req.body.password);
    }

    if (currentUser.role === "admin") {
      if (req.body.role !== undefined) updateData.role = req.body.role;
      if (req.body.mosqueId !== undefined) updateData.mosqueId = req.body.mosqueId;
      if (req.body.isActive !== undefined) {
        if (targetUser.role === "admin" && req.body.isActive === false) {
          return res.status(403).json({ message: "لا يمكن التحكم بحساب مدير النظام" });
        }
        updateData.isActive = req.body.isActive;
      }
      if (req.body.canPrintIds !== undefined) updateData.canPrintIds = req.body.canPrintIds;
      if (req.body.username !== undefined) updateData.username = req.body.username;
      if (req.body.adminNotes !== undefined) updateData.adminNotes = req.body.adminNotes;
      if (req.body.suspendedUntil !== undefined) {
        if (targetUser.role === "admin") {
          return res.status(403).json({ message: "لا يمكن التحكم بحساب مدير النظام" });
        }
        updateData.suspendedUntil = req.body.suspendedUntil ? new Date(req.body.suspendedUntil) : null;
      }
    }

    const updated = await storage.updateUser(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "المستخدم غير موجود" });
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
      await storage.deleteUser(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف المستخدم" });
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
          if (student && student.teacherId === currentUser.id) {
            result = await storage.getAssignmentsByStudent(studentId as string);
          } else {
            return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الطالب" });
          }
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

      if (currentUser.role === "student") {
        const stripped = result.map(({ seenByStudent, seenAt, ...rest }) => rest);
        return res.json(stripped);
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

      const fromVerseNum = Number(fromVerse);
      const toVerseNum = Number(toVerse);
      if (!Number.isInteger(fromVerseNum) || !Number.isInteger(toVerseNum) || fromVerseNum < 1 || toVerseNum < 1 || toVerseNum < fromVerseNum) {
        return res.status(400).json({ message: "أرقام الآيات غير صحيحة" });
      }

      const student = await storage.getUser(studentId);
      if (!student || student.role !== "student") {
        return res.status(400).json({ message: "الطالب غير موجود" });
      }

      if (currentUser.role === "teacher" && student.teacherId !== currentUser.id) {
        return res.status(403).json({ message: "غير مصرح بإنشاء واجبات لهذا الطالب" });
      }
      if (currentUser.role === "supervisor" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بإنشاء واجبات لطالب من جامع آخر" });
      }

      const data = {
        studentId,
        teacherId: currentUser.role === "teacher" ? currentUser.id : (req.body.teacherId || currentUser.id),
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
      res.status(400).json({ message: err.message });
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
      if (currentUser.role === "teacher" && assignment.teacherId !== currentUser.id) {
        return res.status(403).json({ message: "غير مصرح" });
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

    if (currentUser.role === "teacher" && assignment.teacherId !== currentUser.id) {
      return res.status(403).json({ message: "غير مصرح بتعديل هذا الواجب" });
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
    const updated = await storage.updateAssignment(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "الواجب غير موجود" });
    if (req.body.grade !== undefined) {
      await logActivity(req.user!, `تقييم واجب بدرجة ${req.body.grade}`, "assignments", `واجب ${req.params.id}`);
    }
    res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تحديث الواجب" });
    }
  });

  app.delete("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "غير مصرح بحذف الواجبات" });
      }

      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });

      if (currentUser.role === "teacher" && assignment.teacherId !== currentUser.id) {
        return res.status(403).json({ message: "غير مصرح بحذف هذا الواجب" });
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
      res.status(400).json({ message: err.message });
    }
  });

  // ==================== EXAMS ====================
  app.get("/api/exams", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "teacher") {
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
        if (exam.teacherId !== currentUser.id) {
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
        myStudents = mosqueUsers.filter(u => u.role === "student");
      } else {
        myStudents = await storage.getUsersByTeacher(currentUser.id);
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
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/exams/:examId/students/:studentId", requireRole("teacher", "supervisor"), async (req, res) => {
    const currentUser = req.user!;
    const exam = await storage.getExam(req.params.examId);
    if (!exam) return res.status(404).json({ message: "الامتحان غير موجود" });

    const isOwner = exam.teacherId === currentUser.id;
    const isMosqueSupervisor = currentUser.role === "supervisor" && exam.mosqueId === currentUser.mosqueId;
    if (!isOwner && !isMosqueSupervisor) {
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

    if (currentUser.role === "teacher" && exam.teacherId !== currentUser.id) {
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
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/courses", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const { title, description, startDate, endDate, targetType, studentIds, teacherIds } = req.body;

      const course = await storage.createCourse({
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        targetType: targetType || "specific",
        createdBy: currentUser.id,
        mosqueId: currentUser.mosqueId,
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
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/courses/:id", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const isOwner = course.createdBy === currentUser.id;
      const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
      if (!isOwner && !isSameMosqueSupervisor) {
        return res.status(403).json({ message: "غير مصرح بتعديل هذه الدورة" });
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
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/courses/:id", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const isOwner = course.createdBy === currentUser.id;
      const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
      if (!isOwner && !isSameMosqueSupervisor) {
        return res.status(403).json({ message: "غير مصرح بحذف هذه الدورة" });
      }

      await storage.deleteCourse(req.params.id);
      await logActivity(currentUser, `حذف دورة: ${course.title}`, "courses");
      res.json({ message: "تم حذف الدورة بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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
      res.status(400).json({ message: err.message });
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

      const { studentIds } = req.body;
      if (!studentIds || !Array.isArray(studentIds)) {
        return res.status(400).json({ message: "يرجى تحديد الطلاب" });
      }

      const courseStudentsList = await storage.getCourseStudents(req.params.id);
      const createdCertificates = [];

      for (const sid of studentIds) {
        const csEntry = courseStudentsList.find(cs => cs.studentId === sid);
        if (csEntry) {
          await storage.updateCourseStudent(csEntry.id, { graduated: true, graduatedAt: new Date() });
          const cert = await storage.createCertificate({
            courseId: req.params.id,
            studentId: sid,
            issuedBy: currentUser.id,
            mosqueId: currentUser.mosqueId,
            certificateNumber: `MTQ-CERT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          });
          createdCertificates.push(cert);
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
      res.status(500).json({ message: err.message });
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
      res.status(500).json({ message: err.message });
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
      res.status(500).json({ message: err.message });
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
      res.status(500).json({ message: err.message });
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
      let usersList = await storage.getUsers();
      let assignmentsList = await storage.getAssignments();
      const mosquesList = await storage.getMosques();

      if (filterMosqueId) {
        usersList = usersList.filter(u => u.mosqueId === filterMosqueId);
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
      const myStudents = await storage.getUsersByTeacher(currentUser.id);
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
        users: myStudents.map(({ password, ...u }) => u),
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
      const existing = await storage.getUserByUsername("ahrrfy");
      if (existing) {
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
        password: await hashPassword("super123"),
        name: "المشرف أحمد",
        role: "supervisor",
        mosqueId: mosque1.id,
        phone: "07801111111",
        isActive: true,
      });

      const sup2 = await storage.createUser({
        username: "supervisor2",
        password: await hashPassword("super123"),
        name: "المشرف خالد",
        role: "supervisor",
        mosqueId: mosque2.id,
        phone: "07802222222",
        isActive: true,
      });

      const teacher1 = await storage.createUser({
        username: "teacher1",
        password: await hashPassword("teacher123"),
        name: "الشيخ أحمد",
        role: "teacher",
        mosqueId: mosque1.id,
        phone: "07801234567",
        isActive: true,
      });

      const teacher2 = await storage.createUser({
        username: "teacher2",
        password: await hashPassword("teacher123"),
        name: "الشيخ عبد الله",
        role: "teacher",
        mosqueId: mosque1.id,
        phone: "07811234567",
        isActive: true,
      });

      const teacher3 = await storage.createUser({
        username: "teacher3",
        password: await hashPassword("teacher123"),
        name: "الشيخ محمد",
        role: "teacher",
        mosqueId: mosque2.id,
        phone: "07821234567",
        isActive: true,
      });

      const s1 = await storage.createUser({ username: "student1", password: await hashPassword("student123"), name: "عمر خالد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, phone: "07901234567", isActive: true });
      const s2 = await storage.createUser({ username: "student2", password: await hashPassword("student123"), name: "أحمد محمد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, phone: "07911234567", isActive: true });
      const s3 = await storage.createUser({ username: "student3", password: await hashPassword("student123"), name: "يوسف علي", role: "student", mosqueId: mosque1.id, teacherId: teacher2.id, phone: "07921234567", isActive: true });
      const s4 = await storage.createUser({ username: "student4", password: await hashPassword("student123"), name: "سعيد حسن", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, phone: "07931234567", isActive: true });
      const s5 = await storage.createUser({ username: "student5", password: await hashPassword("student123"), name: "كريم محمود", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, phone: "07941234567", isActive: true });

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
      res.status(500).json({ message: err.message });
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
      res.status(500).json({ message: err.message });
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
      res.status(500).json({ message: err.message || "حدث خطأ أثناء تصفير النظام" });
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

  app.post("/api/feature-flags/seed", requireRole("admin"), async (req, res) => {
    try {
      const existing = await storage.getFeatureFlags();
      if (existing.length > 0) {
        return res.status(400).json({ message: "الميزات موجودة مسبقاً" });
      }
      const defaults = [
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
      ];
      const created = [];
      for (const flag of defaults) {
        const f = await storage.createFeatureFlag(flag);
        created.push(f);
      }
      await logActivity(req.user!, "إنشاء الميزات الافتراضية", "feature_flags");
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
        const records = await storage.getAttendanceByDate(new Date(date as string), teacherId as string);
        return res.json(records);
      }
      if (studentId) {
        const records = await storage.getAttendanceByStudent(studentId as string);
        return res.json(records);
      }
      if (teacherId) {
        const records = await storage.getAttendanceByTeacher(teacherId as string);
        return res.json(records);
      }
      if (mosqueId) {
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
      const created = [];
      for (const s of students) {
        if (!s.studentId || !s.status) continue;
        const record = await storage.createAttendance({
          studentId: s.studentId,
          teacherId: currentUser.id,
          mosqueId: currentUser.mosqueId,
          date: new Date(date),
          status: s.status,
          notes: s.notes,
        });
        created.push(record);
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
      res.json(conversations);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب المحادثات" });
    }
  });

  app.get("/api/messages/conversation/:userId", requireAuth, async (req, res) => {
    try {
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
      const { receiverId, content } = req.body;
      if (!receiverId || !content || typeof content !== "string") {
        return res.status(400).json({ message: "المستلم والمحتوى مطلوبان" });
      }
      const receiver = await storage.getUser(receiverId);
      if (!receiver) return res.status(404).json({ message: "المستلم غير موجود" });
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
      const mosqueId = req.query.mosqueId as string | undefined;
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
      if (!userId || !amount || !reason) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const point = await storage.createPoint({
        userId,
        mosqueId: currentUser.mosqueId,
        amount: Number(amount),
        reason,
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
      const userId = (req.query.userId as string) || req.user!.id;
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
      const { mosqueId, teacherId } = req.query;
      if (mosqueId) {
        const scheds = await storage.getSchedulesByMosque(mosqueId as string);
        return res.json(scheds);
      }
      if (teacherId) {
        const scheds = await storage.getSchedulesByTeacher(teacherId as string);
        return res.json(scheds);
      }
      const currentUser = req.user!;
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
      const mosqueId = req.query.mosqueId as string | undefined;
      if (mosqueId) {
        const comps = await storage.getCompetitionsByMosque(mosqueId);
        return res.json(comps);
      }
      const currentUser = req.user!;
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
      const comp = await storage.getCompetition(req.params.id);
      if (!comp) return res.status(404).json({ message: "المسابقة غير موجودة" });
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
      const updateData: any = {};
      if (req.body.score !== undefined) updateData.score = Number(req.body.score);
      if (req.body.rank !== undefined) updateData.rank = Number(req.body.rank);
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      const updated = await storage.updateCompetitionParticipant(req.params.participantId, updateData);
      if (!updated) return res.status(404).json({ message: "المشارك غير موجود" });
      await logActivity(req.user!, "تعديل نتيجة مشارك", "competitions");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تعديل المشارك" });
    }
  });

  app.delete("/api/competitions/:id/participants/:participantId", requireAuth, async (req, res) => {
    try {
      await storage.deleteCompetitionParticipant(req.params.participantId);
      await logActivity(req.user!, "إزالة مشارك من مسابقة", "competitions");
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
      const accessToken = crypto.randomBytes(32).toString("hex");
      const report = await storage.createParentReport({
        studentId,
        mosqueId: currentUser.mosqueId,
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
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب التقرير" });
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
          students = await storage.getUsersByMosqueAndRole(mosqueId, "student");
        } else {
          students = await storage.getUsersByRole("student");
        }
      } else if (currentUser.mosqueId) {
        students = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student");
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
        students = await storage.getUsersByRole("student");
        teachersList = await storage.getUsersByRole("teacher");
        assignmentsList = await storage.getAssignments();
      } else if (currentUser.role === "teacher") {
        students = await storage.getUsersByTeacher(currentUser.id);
        assignmentsList = await storage.getAssignmentsByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        const mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
        students = mosqueUsers.filter(u => u.role === "student");
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

  return httpServer;
}
