import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, hashPassword } from "./auth";
import { insertUserSchema, insertAssignmentSchema, insertActivityLogSchema, insertNotificationSchema, insertMosqueSchema, type User, type Assignment } from "@shared/schema";

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

  // ==================== MOSQUES ====================
  app.get("/api/mosques", requireAuth, async (req, res) => {
    if (req.user!.role === "admin") {
      const all = await storage.getMosques();
      return res.json(all);
    }
    if (req.user!.mosqueId) {
      const mosque = await storage.getMosque(req.user!.mosqueId);
      return res.json(mosque ? [mosque] : []);
    }
    res.json([]);
  });

  app.get("/api/mosques/:id", requireAuth, async (req, res) => {
    const mosque = await storage.getMosque(req.params.id);
    if (!mosque) return res.status(404).json({ message: "الجامع غير موجود" });
    if (req.user!.role !== "admin" && req.user!.mosqueId !== req.params.id) {
      return res.status(403).json({ message: "غير مصرح بالوصول" });
    }
    res.json(mosque);
  });

  app.post("/api/mosques", requireRole("admin"), async (req, res) => {
    try {
      const mosque = await storage.createMosque(req.body);
      await logActivity(req.user!, `إنشاء جامع: ${mosque.name}`, "mosques");
      res.status(201).json(mosque);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/mosques/:id", requireRole("admin"), async (req, res) => {
    const updated = await storage.updateMosque(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "الجامع غير موجود" });
    res.json(updated);
  });

  app.delete("/api/mosques/:id", requireRole("admin"), async (req, res) => {
    await storage.deleteMosque(req.params.id);
    res.json({ message: "تم الحذف بنجاح" });
  });

  // ==================== USERS ====================
  app.get("/api/users", requireAuth, async (req, res) => {
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
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    const currentUser = req.user!;
    if (currentUser.role !== "admin" && user.mosqueId !== currentUser.mosqueId) {
      return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا المستخدم" });
    }
    const { password, ...safe } = user;
    res.json(safe);
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
        if (targetRole !== "teacher") {
          return res.status(403).json({ message: "المشرف يمكنه إنشاء حسابات الأساتذة فقط" });
        }
        req.body.mosqueId = currentUser.mosqueId;
      } else if (currentUser.role === "teacher") {
        if (targetRole !== "student") {
          return res.status(403).json({ message: "الأستاذ يمكنه إضافة الطلاب فقط" });
        }
        req.body.mosqueId = currentUser.mosqueId;
        req.body.teacherId = currentUser.id;
      } else {
        return res.status(403).json({ message: "غير مصرح بإنشاء حسابات" });
      }

      const data = { ...req.body, password: await hashPassword(req.body.password || "123456") };
      const user = await storage.createUser(data);
      const { password, ...safe } = user;
      await logActivity(currentUser, `إنشاء حساب: ${user.name} (${targetRole})`, "users");
      res.status(201).json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
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

    const updateData = { ...req.body };
    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    } else {
      delete updateData.password;
    }

    if (updateData.canPrintIds !== undefined && currentUser.role !== "admin") {
      delete updateData.canPrintIds;
    }

    const updated = await storage.updateUser(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "المستخدم غير موجود" });
    const { password, ...safe } = updated;
    return res.json(safe);
  });

  app.delete("/api/users/:id", requireRole("admin"), async (req, res) => {
    await storage.deleteUser(req.params.id);
    res.json({ message: "تم الحذف بنجاح" });
  });

  // ==================== TOGGLE PRINT PERMISSION ====================
  app.post("/api/users/:id/toggle-print", requireRole("admin"), async (req, res) => {
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
  });

  // ==================== ASSIGNMENTS ====================
  app.get("/api/assignments", requireAuth, async (req, res) => {
    const currentUser = req.user!;
    const { studentId, teacherId } = req.query;
    let result: Assignment[] = [];

    if (studentId) {
      result = await storage.getAssignmentsByStudent(studentId as string);
    } else if (teacherId) {
      result = await storage.getAssignmentsByTeacher(teacherId as string);
    } else if (currentUser.role === "admin") {
      result = await storage.getAssignments();
    } else if (currentUser.role === "student") {
      result = await storage.getAssignmentsByStudent(currentUser.id);
    } else if (currentUser.role === "teacher") {
      result = await storage.getAssignmentsByTeacher(currentUser.id);
    } else if (currentUser.mosqueId) {
      result = await storage.getAssignmentsByMosque(currentUser.mosqueId);
    }

    res.json(result);
  });

  app.post("/api/assignments", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء واجبات" });
      }
      const data = {
        ...req.body,
        mosqueId: currentUser.mosqueId,
        scheduledDate: new Date(req.body.scheduledDate),
        fromVerse: Number(req.body.fromVerse),
        toVerse: Number(req.body.toVerse),
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

  app.patch("/api/assignments/:id", requireAuth, async (req, res) => {
    const updateData = { ...req.body };
    if (updateData.scheduledDate) updateData.scheduledDate = new Date(updateData.scheduledDate);
    if (updateData.fromVerse !== undefined) updateData.fromVerse = Number(updateData.fromVerse);
    if (updateData.toVerse !== undefined) updateData.toVerse = Number(updateData.toVerse);
    if (updateData.grade !== undefined) updateData.grade = Number(updateData.grade);
    const updated = await storage.updateAssignment(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "الواجب غير موجود" });
    if (req.body.grade !== undefined) {
      await logActivity(req.user!, `تقييم واجب بدرجة ${req.body.grade}`, "assignments", `واجب ${req.params.id}`);
    }
    res.json(updated);
  });

  app.delete("/api/assignments/:id", requireAuth, async (req, res) => {
    await storage.deleteAssignment(req.params.id);
    res.json({ message: "تم الحذف بنجاح" });
  });

  // ==================== RATINGS ====================
  app.get("/api/ratings", requireAuth, async (req, res) => {
    const { userId, mosqueId } = req.query;
    if (userId) {
      const result = await storage.getRatingsByUser(userId as string);
      return res.json(result);
    }
    if (mosqueId) {
      const result = await storage.getRatingsByMosque(mosqueId as string);
      return res.json(result);
    }
    const currentUser = req.user!;
    if (currentUser.mosqueId) {
      const result = await storage.getRatingsByMosque(currentUser.mosqueId);
      return res.json(result);
    }
    res.json([]);
  });

  app.post("/api/ratings", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { toUserId, stars, honorBadge, comment, type } = req.body;

      if (!toUserId || !stars || !type) {
        return res.status(400).json({ message: "يرجى تعبئة جميع الحقول المطلوبة" });
      }

      const targetUser = await storage.getUser(toUserId);
      if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });

      if (currentUser.role === "supervisor" && targetUser.role !== "teacher") {
        return res.status(403).json({ message: "المشرف يمكنه تقييم الأساتذة فقط" });
      }
      if (currentUser.role === "teacher" && targetUser.role !== "student") {
        return res.status(403).json({ message: "الأستاذ يمكنه تقييم الطلاب فقط" });
      }
      if (!["supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالتقييم" });
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
  });

  app.get("/api/exams/:id", requireAuth, async (req, res) => {
    const exam = await storage.getExam(req.params.id);
    if (!exam) return res.status(404).json({ message: "الامتحان غير موجود" });
    const students = await storage.getExamStudents(req.params.id);
    res.json({ ...exam, students });
  });

  app.post("/api/exams", requireRole("teacher"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const { title, surahName, fromVerse, toVerse, examDate, examTime, description, isForAll, studentIds } = req.body;

      const exam = await storage.createExam({
        teacherId: currentUser.id,
        mosqueId: currentUser.mosqueId,
        title,
        surahName,
        fromVerse: Number(fromVerse),
        toVerse: Number(toVerse),
        examDate: new Date(examDate),
        examTime,
        description,
        isForAll: isForAll !== false,
      });

      let targetStudents: string[] = [];
      if (isForAll !== false) {
        const myStudents = await storage.getUsersByTeacher(currentUser.id);
        targetStudents = myStudents.map(s => s.id);
      } else if (studentIds && studentIds.length > 0) {
        targetStudents = studentIds;
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
          message: `تم تحديد امتحان: ${title} - ${surahName} (${fromVerse}-${toVerse}) في ${examTime}`,
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

  app.patch("/api/exams/:examId/students/:studentId", requireRole("teacher"), async (req, res) => {
    const students = await storage.getExamStudents(req.params.examId);
    const entry = students.find(s => s.studentId === req.params.studentId);
    if (!entry) return res.status(404).json({ message: "الطالب غير مسجل في هذا الامتحان" });
    const updated = await storage.updateExamStudent(entry.id, req.body);
    res.json(updated);
  });

  app.delete("/api/exams/:id", requireRole("teacher"), async (req, res) => {
    await storage.deleteExam(req.params.id);
    res.json({ message: "تم حذف الامتحان بنجاح" });
  });

  // ==================== ACTIVITY LOGS ====================
  app.get("/api/activity-logs", requireRole("admin"), async (req, res) => {
    const mosqueId = req.query.mosqueId as string | undefined;
    if (mosqueId) {
      const logs = await storage.getActivityLogsByMosque(mosqueId);
      return res.json(logs);
    }
    const logs = await storage.getActivityLogs();
    return res.json(logs);
  });

  // Supervisor sees teacher activities in their mosque
  app.get("/api/teacher-activities", requireRole("supervisor"), async (req, res) => {
    const currentUser = req.user!;
    if (!currentUser.mosqueId) return res.json([]);
    const logs = await storage.getActivityLogsByMosqueAndRole(currentUser.mosqueId, "teacher");
    res.json(logs);
  });

  app.post("/api/activity-logs", requireAuth, async (req, res) => {
    const data = { ...req.body, mosqueId: req.user!.mosqueId, userRole: req.user!.role };
    const log = await storage.createActivityLog(data);
    res.status(201).json(log);
  });

  // ==================== NOTIFICATIONS ====================
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifs = await storage.getNotifications(req.user!.id);
    res.json(notifs);
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(req.params.id);
    res.json({ message: "تم التحديث" });
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead(req.user!.id);
    res.json({ message: "تم تحديد الكل كمقروء" });
  });

  // ==================== STATS ====================
  app.get("/api/stats", requireAuth, async (req, res) => {
    const currentUser = req.user!;

    if (currentUser.role === "student") {
      return res.status(403).json({ message: "غير مصرح" });
    }

    if (currentUser.role === "admin") {
      const usersList = await storage.getUsers();
      const assignmentsList = await storage.getAssignments();
      const mosquesList = await storage.getMosques();
      return res.json({
        totalStudents: usersList.filter(u => u.role === "student").length,
        totalTeachers: usersList.filter(u => u.role === "teacher").length,
        totalSupervisors: usersList.filter(u => u.role === "supervisor").length,
        totalMosques: mosquesList.length,
        totalAssignments: assignmentsList.length,
        completedAssignments: assignmentsList.filter(a => a.status === "done").length,
      });
    }

    if (currentUser.role === "teacher") {
      const myStudents = await storage.getUsersByTeacher(currentUser.id);
      const myAssignments = await storage.getAssignmentsByTeacher(currentUser.id);
      return res.json({
        totalStudents: myStudents.length,
        totalAssignments: myAssignments.length,
        completedAssignments: myAssignments.filter(a => a.status === "done").length,
      });
    }

    if (currentUser.role === "supervisor" && currentUser.mosqueId) {
      const mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
      const assignmentsList = await storage.getAssignmentsByMosque(currentUser.mosqueId);
      return res.json({
        totalTeachers: mosqueUsers.filter(u => u.role === "teacher").length,
        totalStudents: mosqueUsers.filter(u => u.role === "student").length,
        totalAssignments: assignmentsList.length,
        completedAssignments: assignmentsList.filter(a => a.status === "done").length,
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
  app.post("/api/seed", async (_req, res) => {
    try {
      const existing = await storage.getUserByUsername("admin");
      if (existing) return res.json({ message: "البيانات موجودة مسبقًا" });

      const mosque1 = await storage.createMosque({
        name: "جامع النور الكبير",
        city: "بغداد",
        address: "الكرخ - شارع حيفا",
        phone: "07701000001",
        imam: "الشيخ عبد الكريم",
        description: "جامع رئيسي لتحفيظ القرآن الكريم",
        isActive: true,
      });

      const mosque2 = await storage.createMosque({
        name: "جامع الإمام أبي حنيفة",
        city: "بغداد",
        address: "الأعظمية",
        phone: "07701000002",
        imam: "الشيخ محمود",
        description: "من أعرق مساجد بغداد",
        isActive: true,
      });

      const mosque3 = await storage.createMosque({
        name: "جامع الرحمن",
        city: "البصرة",
        address: "شارع الجمهورية",
        phone: "07701000003",
        imam: "الشيخ حسن",
        description: "مسجد تحفيظ القرآن في البصرة",
        isActive: true,
      });

      const adminUser = await storage.createUser({
        username: "admin",
        password: await hashPassword("admin123"),
        name: "د. عبد الله المدير",
        role: "admin",
        email: "admin@huffaz.iq",
        phone: "07701234567",
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
        email: "sup1@huffaz.iq",
        phone: "07801111111",
        isActive: true,
      });

      const sup2 = await storage.createUser({
        username: "supervisor2",
        password: await hashPassword("super123"),
        name: "المشرف خالد",
        role: "supervisor",
        mosqueId: mosque2.id,
        email: "sup2@huffaz.iq",
        phone: "07802222222",
        isActive: true,
      });

      const teacher1 = await storage.createUser({
        username: "teacher1",
        password: await hashPassword("teacher123"),
        name: "الشيخ أحمد",
        role: "teacher",
        mosqueId: mosque1.id,
        email: "ahmed@huffaz.iq",
        phone: "07801234567",
        isActive: true,
      });

      const teacher2 = await storage.createUser({
        username: "teacher2",
        password: await hashPassword("teacher123"),
        name: "الشيخ عبد الله",
        role: "teacher",
        mosqueId: mosque1.id,
        email: "abdullah@huffaz.iq",
        phone: "07811234567",
        isActive: true,
      });

      const teacher3 = await storage.createUser({
        username: "teacher3",
        password: await hashPassword("teacher123"),
        name: "الشيخ محمد",
        role: "teacher",
        mosqueId: mosque2.id,
        email: "mohammed@huffaz.iq",
        phone: "07821234567",
        isActive: true,
      });

      const s1 = await storage.createUser({ username: "student1", password: await hashPassword("student123"), name: "عمر خالد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, email: "omar@huffaz.iq", phone: "07901234567", isActive: true });
      const s2 = await storage.createUser({ username: "student2", password: await hashPassword("student123"), name: "أحمد محمد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, email: "ahmad@huffaz.iq", phone: "07911234567", isActive: true });
      const s3 = await storage.createUser({ username: "student3", password: await hashPassword("student123"), name: "يوسف علي", role: "student", mosqueId: mosque1.id, teacherId: teacher2.id, email: "yusuf@huffaz.iq", phone: "07921234567", isActive: true });
      const s4 = await storage.createUser({ username: "student4", password: await hashPassword("student123"), name: "سعيد حسن", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, email: "saeed@huffaz.iq", phone: "07931234567", isActive: true });
      const s5 = await storage.createUser({ username: "student5", password: await hashPassword("student123"), name: "كريم محمود", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, email: "kareem@huffaz.iq", phone: "07941234567", isActive: true });

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

  return httpServer;
}
