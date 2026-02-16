import type { Express } from "express";
import { createServer, type Server } from "http";
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
        result = await storage.getUsersByTeacher(currentUser.id);
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

  return httpServer;
}
