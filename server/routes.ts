import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, hashPassword } from "./auth";
import { insertUserSchema, insertAssignmentSchema, insertActivityLogSchema, insertNotificationSchema, insertMosqueSchema, type User, type Assignment } from "@shared/schema";

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
      } else {
        return res.status(403).json({ message: "غير مصرح بإنشاء حسابات" });
      }

      const data = { ...req.body, password: await hashPassword(req.body.password || "123456") };
      const user = await storage.createUser(data);
      const { password, ...safe } = user;
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

    const updated = await storage.updateUser(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "المستخدم غير موجود" });
    const { password, ...safe } = updated;
    return res.json(safe);
  });

  app.delete("/api/users/:id", requireRole("admin"), async (req, res) => {
    await storage.deleteUser(req.params.id);
    res.json({ message: "تم الحذف بنجاح" });
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
      const data = { ...req.body, mosqueId: currentUser.mosqueId };
      const assignment = await storage.createAssignment(data);
      await storage.createNotification({
        userId: req.body.studentId,
        mosqueId: currentUser.mosqueId,
        title: "واجب جديد",
        message: `تم تعيين واجب جديد: ${req.body.surahName} (${req.body.fromVerse}-${req.body.toVerse})`,
        type: "info",
        isRead: false,
      });
      res.status(201).json(assignment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/assignments/:id", requireAuth, async (req, res) => {
    const updated = await storage.updateAssignment(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "الواجب غير موجود" });
    res.json(updated);
  });

  app.delete("/api/assignments/:id", requireAuth, async (req, res) => {
    await storage.deleteAssignment(req.params.id);
    res.json({ message: "تم الحذف بنجاح" });
  });

  // ==================== ACTIVITY LOGS ====================
  app.get("/api/activity-logs", requireRole("admin", "supervisor"), async (req, res) => {
    const currentUser = req.user!;
    if (currentUser.role === "admin") {
      const mosqueId = req.query.mosqueId as string | undefined;
      if (mosqueId) {
        const logs = await storage.getActivityLogsByMosque(mosqueId);
        return res.json(logs);
      }
      const logs = await storage.getActivityLogs();
      return res.json(logs);
    }
    if (currentUser.mosqueId) {
      const logs = await storage.getActivityLogsByMosque(currentUser.mosqueId);
      return res.json(logs);
    }
    res.json([]);
  });

  app.post("/api/activity-logs", requireAuth, async (req, res) => {
    const data = { ...req.body, mosqueId: req.user!.mosqueId };
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
    let usersList: User[] = [];
    let assignmentsList: Assignment[] = [];

    if (currentUser.role === "admin") {
      usersList = await storage.getUsers();
      assignmentsList = await storage.getAssignments();
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

    if (currentUser.mosqueId) {
      usersList = await storage.getUsersByMosque(currentUser.mosqueId);
      assignmentsList = await storage.getAssignmentsByMosque(currentUser.mosqueId);
    } else {
      usersList = [];
      assignmentsList = [];
    }

    res.json({
      totalStudents: usersList.filter(u => u.role === "student").length,
      totalTeachers: usersList.filter(u => u.role === "teacher").length,
      totalSupervisors: usersList.filter(u => u.role === "supervisor").length,
      totalAssignments: assignmentsList.length,
      completedAssignments: assignmentsList.filter(a => a.status === "done").length,
    });
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

      const s1 = await storage.createUser({ username: "student1", password: await hashPassword("student123"), name: "عمر خالد", role: "student", mosqueId: mosque1.id, email: "omar@huffaz.iq", phone: "07901234567", isActive: true });
      const s2 = await storage.createUser({ username: "student2", password: await hashPassword("student123"), name: "أحمد محمد", role: "student", mosqueId: mosque1.id, email: "ahmad@huffaz.iq", phone: "07911234567", isActive: true });
      const s3 = await storage.createUser({ username: "student3", password: await hashPassword("student123"), name: "يوسف علي", role: "student", mosqueId: mosque1.id, email: "yusuf@huffaz.iq", phone: "07921234567", isActive: true });
      const s4 = await storage.createUser({ username: "student4", password: await hashPassword("student123"), name: "سعيد حسن", role: "student", mosqueId: mosque2.id, email: "saeed@huffaz.iq", phone: "07931234567", isActive: true });
      const s5 = await storage.createUser({ username: "student5", password: await hashPassword("student123"), name: "كريم محمود", role: "student", mosqueId: mosque2.id, email: "kareem@huffaz.iq", phone: "07941234567", isActive: true });

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
