import type { Express } from "express";
import { requireAuth, requireRole, hashPassword } from "../auth";
import { storage } from "../storage";
import {
  users,
  type User,
} from "@shared/schema";
import { sessionTracker } from "../session-tracker";
import { filterTextFields } from "@shared/content-filter";
import { validateFields, validateAge, validateBoolean, validateEnum, validateDate, sanitizeImageUrl, validateTeacherLevels } from "@shared/security-utils";
import { logActivity, canTeacherAccessStudent } from "./shared";
import { sendError } from "../error-handler";
import crypto from "crypto";

export function registerUsersRoutes(app: Express) {
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

      // Gender separation: teachers only see students matching their gender
      if (currentUser.role === "teacher" && currentUser.gender) {
        result = result.filter(u => !u.gender || u.gender === currentUser.gender);
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
      sendError(res, err, "جلب المستخدمين");
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
      // Gender separation: teachers only see students matching their gender
      if (currentUser.role === "teacher" && currentUser.gender) {
        students = students.filter(s => !s.gender || s.gender === currentUser.gender);
      }

      const safe = students.map(({ password, ...u }) => u);
      res.json(safe);
    } catch (err: any) {
      sendError(res, err, "جلب بيانات الطلاب");
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
      sendError(res, err, "جلب طلبات الموافقة");
    }
  });

  app.patch("/api/users/batch-study-mode", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { studentIds, studyMode } = req.body;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "يجب تحديد طالب واحد على الأقل" });
      }
      if (!["in-person", "online"].includes(studyMode)) {
        return res.status(400).json({ message: "نوع الدراسة غير صالح" });
      }
      let updated = 0;
      for (const id of studentIds) {
        const student = await storage.getUser(id);
        if (!student || student.role !== "student") continue;
        if (currentUser.role === "supervisor" && student.mosqueId !== currentUser.mosqueId) continue;
        await storage.updateUser(id, { studyMode });
        updated++;
      }
      res.json({ message: `تم تحديث ${updated} طالب`, updated });
    } catch (err: any) {
      sendError(res, err, "تحديث نوع الدراسة");
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
      sendError(res, err, "جلب بيانات المستخدم");
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
        if (!["supervisor", "teacher", "student"].includes(targetRole)) {
          return res.status(403).json({ message: "المشرف يمكنه إنشاء حسابات المشرفين والأساتذة والطلاب فقط" });
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

      const { username, name, role: userRole, mosqueId: bodyMosqueId, teacherId, phone, address, gender, avatar, isActive, canPrintIds, age, telegramId, parentPhone, educationLevel, isChild, isSpecialNeeds, isOrphan, level, teacherLevels, studyMode } = req.body;
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
        validateBoolean(isChild, "isChild"),
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
        const isStaffRole = ["teacher", "supervisor"].includes(req.body.role);
        const phoneDup = await storage.checkPhoneExists(phone, undefined, isStaffRole ? ["teacher", "supervisor"] : undefined);
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
        phone, address, gender, avatar, isActive, canPrintIds, age, telegramId, parentPhone, educationLevel, isChild, isSpecialNeeds, isOrphan,
        studyMode: req.body.role === "student" ? (studyMode || "in-person") : undefined,
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
      sendError(res, err, "إنشاء مستخدم");
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
      (currentUser.role === "supervisor" && ["supervisor", "teacher", "student"].includes(targetUser.role) && targetUser.mosqueId === currentUser.mosqueId) ||
      isTeacherOfStudent;

    if (!canEdit) {
      return res.status(403).json({ message: "غير مصرح بتعديل هذا المستخدم" });
    }

    const safeFields = ["name", "phone", "address", "gender", "avatar", "age", "telegramId", "parentPhone", "educationLevel", "isChild", "isSpecialNeeds", "isOrphan", "password"];
    const supervisorFields = ["teacherId", "level", "teacherLevels", "studyMode"];
    const adminOnlyFields = ["role", "mosqueId", "isActive", "canPrintIds", "username", "adminNotes", "suspendedUntil", "supervisorPermissions"];
    const allAllowedFields = [...safeFields, ...supervisorFields, ...adminOnlyFields];
    const receivedKeys = Object.keys(req.body);
    const forbiddenKeys = receivedKeys.filter(k => !allAllowedFields.includes(k));
    if (forbiddenKeys.length > 0) {
      return res.status(400).json({ message: `حقول غير مسموحة: ${forbiddenKeys.join(", ")}` });
    }
    if (currentUser.role !== "admin") {
      const attemptedAdminFields = receivedKeys.filter(k => {
        // المشرف يمكنه تغيير الدور فقط بالترقية المسموحة — يُعالَج لاحقاً
        if (k === "role" && currentUser.role === "supervisor") return false;
        return adminOnlyFields.includes(k);
      });
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
    const { name, phone, address, gender, avatar, teacherId, age, telegramId, parentPhone, educationLevel, isChild, isSpecialNeeds, isOrphan, level, teacherLevels, studyMode } = req.body;

    const patchFieldCheck = validateFields(req.body, ["name", "phone", "parentPhone", "address", "telegramId", "educationLevel"]);
    if (!patchFieldCheck.valid) return res.status(400).json({ message: patchFieldCheck.error });
    const patchAgeCheck = validateAge(age);
    if (!patchAgeCheck.valid) return res.status(400).json({ message: patchAgeCheck.error });
    if (gender !== undefined && gender !== null) {
      const gCheck = validateEnum(gender, "gender", ["male", "female", "ذكر", "أنثى"]);
      if (!gCheck.valid) return res.status(400).json({ message: gCheck.error });
    }
    if (isChild !== undefined) {
      const bCheck = validateBoolean(isChild, "isChild");
      if (!bCheck.valid) return res.status(400).json({ message: bCheck.error });
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
      const isStaffRole = ["teacher", "supervisor"].includes(targetUser.role);
      const phoneDup = await storage.checkPhoneExists(phone, req.params.id, isStaffRole ? ["teacher", "supervisor"] : undefined);
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
    if (isChild !== undefined) updateData.isChild = isChild;
    if (isSpecialNeeds !== undefined) updateData.isSpecialNeeds = isSpecialNeeds;
    if (isOrphan !== undefined) updateData.isOrphan = isOrphan;
    if (level !== undefined) updateData.level = level;
    if (teacherLevels !== undefined) updateData.teacherLevels = teacherLevels;
    if (studyMode !== undefined) {
      if (!["in-person", "online"].includes(studyMode)) {
        return res.status(400).json({ message: "نوع الدراسة غير صالح" });
      }
      updateData.studyMode = studyMode;
    }

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

    // ── ترقية الأدوار من قِبَل المشرف ──────────────────────────────────────────
    if (currentUser.role === "supervisor" && req.body.role !== undefined) {
      const allowedPromotions: Record<string, string> = {
        student: "teacher",
        teacher: "supervisor",
      };
      const allowed = allowedPromotions[targetUser.role];
      if (!allowed || allowed !== req.body.role) {
        return res.status(403).json({
          message: `لا يمكن ترقية ${targetUser.role} إلى ${req.body.role}. المسموح: طالب → أستاذ، أستاذ → مشرف`,
        });
      }
      updateData.role = req.body.role;
      await logActivity(currentUser, `ترقية ${targetUser.name} من ${targetUser.role} إلى ${req.body.role}`, "users");
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
      if (req.body.supervisorPermissions !== undefined) {
        const targetRole = req.body.role ?? targetUser.role;
        if (targetRole !== "supervisor") {
          return res.status(400).json({ message: "الصلاحيات الإضافية للمشرفين فقط" });
        }
        const allowedPermKeys = ["canExportData", "canManageTemplates", "canViewActivityLogs", "canSendBroadcast", "canManageAttendance", "canManageCourses", "canViewAllMosques"];
        const perms = req.body.supervisorPermissions;
        if (typeof perms !== "object" || perms === null || Array.isArray(perms)) {
          return res.status(400).json({ message: "صيغة الصلاحيات غير صالحة" });
        }
        for (const key of Object.keys(perms)) {
          if (!allowedPermKeys.includes(key)) {
            return res.status(400).json({ message: `صلاحية غير معروفة: ${key}` });
          }
          if (typeof perms[key] !== "boolean") {
            return res.status(400).json({ message: "قيم الصلاحيات يجب أن تكون true/false" });
          }
        }
        updateData.supervisorPermissions = perms;
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
      sendError(res, err, "تحديث بيانات المستخدم");
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
      sendError(res, err, "حذف المستخدم");
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
      sendError(res, err, "الموافقة على المستخدم");
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
      sendError(res, err, "رفض المستخدم");
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
      sendError(res, err, "تحديث صلاحية الطباعة");
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
      sendError(res, err, "رفع صورة المستخدم");
    }
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

  app.get("/api/users/:id/linked-accounts", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (!["teacher", "supervisor"].includes(user.role)) {
        return res.json([]);
      }
      if (!user.phone) return res.json([]);
      const linked = await storage.getLinkedAccounts(user.phone, user.id);
      const mosqueIds = [...new Set(linked.map(l => l.mosqueId).filter(Boolean))];
      const mosqueNames: Record<string, string> = {};
      for (const mId of mosqueIds) {
        if (mId) {
          const mosque = await storage.getMosque(mId);
          if (mosque) mosqueNames[mId] = mosque.name;
        }
      }
      const result = linked.map(l => ({
        id: l.id,
        username: l.username,
        name: l.name,
        role: l.role,
        mosqueId: l.mosqueId,
        mosqueName: l.mosqueId ? mosqueNames[l.mosqueId] || "غير معروف" : "بدون مسجد",
      }));
      res.json(result);
    } catch (err: any) {
      sendError(res, err, "جلب الحسابات المرتبطة");
    }
  });

  // ==================== BULK IMPORT ====================
  // POST /api/users/bulk-import?role=student|teacher|supervisor
  // Accepts { rows: [{الاسم, اسم المستخدم, كلمة المرور, الهاتف, العمر, ...}] }
  app.post("/api/users/bulk-import", requireAuth, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const role = (req.query.role as string) || "student";
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "لا توجد بيانات للاستيراد" });
      }
      let success = 0, failed = 0;
      for (const row of rows) {
        try {
          const name = row["الاسم"]?.trim();
          const username = row["اسم المستخدم"]?.trim();
          const rawPassword = row["كلمة المرور"]?.trim() || row["الرمز"]?.trim();
          if (!name || !username || !rawPassword) { failed++; continue; }
          const data: any = {
            name,
            username,
            password: await hashPassword(rawPassword),
            role,
            mosqueId: currentUser.mosqueId || null,
            phone: row["الهاتف"]?.trim() || null,
            age: row["العمر"] ? parseInt(row["العمر"]) : null,
            address: row["العنوان"]?.trim() || null,
            parentPhone: row["هاتف ولي الأمر"]?.trim() || null,
            educationLevel: row["المستوى الدراسي"]?.trim() || null,
            isActive: true,
            pendingApproval: false,
          };
          await storage.createUser(data);
          success++;
        } catch { failed++; }
      }
      res.json({ success, failed, total: rows.length });
    } catch (err: any) { sendError(res, err, "استيراد المستخدمين"); }
  });

}
