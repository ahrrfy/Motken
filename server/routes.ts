import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, hashPassword } from "./auth";
import { insertUserSchema, insertAssignmentSchema, insertActivityLogSchema, insertNotificationSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // ==================== USERS ====================
  app.get("/api/users", requireAuth, async (req, res) => {
    const role = req.query.role as string | undefined;
    const users = role ? await storage.getUsersByRole(role) : await storage.getUsers();
    const safe = users.map(({ password, ...u }) => u);
    res.json(safe);
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    const { password, ...safe } = user;
    res.json(safe);
  });

  app.post("/api/users", requireRole("admin"), async (req, res) => {
    try {
      const data = { ...req.body, password: await hashPassword(req.body.password || "123456") };
      const user = await storage.createUser(data);
      const { password, ...safe } = user;
      res.status(201).json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    const updated = await storage.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "المستخدم غير موجود" });
    const { password, ...safe } = updated;
    res.json(safe);
  });

  app.delete("/api/users/:id", requireRole("admin"), async (req, res) => {
    await storage.deleteUser(req.params.id);
    res.json({ message: "تم الحذف بنجاح" });
  });

  // ==================== ASSIGNMENTS ====================
  app.get("/api/assignments", requireAuth, async (req, res) => {
    const { studentId, teacherId } = req.query;
    let result;
    if (studentId) result = await storage.getAssignmentsByStudent(studentId as string);
    else if (teacherId) result = await storage.getAssignmentsByTeacher(teacherId as string);
    else result = await storage.getAssignments();
    res.json(result);
  });

  app.post("/api/assignments", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.createAssignment(req.body);
      await storage.createNotification({
        userId: req.body.studentId,
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
  app.get("/api/activity-logs", requireRole("admin", "supervisor"), async (_req, res) => {
    const logs = await storage.getActivityLogs();
    res.json(logs);
  });

  app.post("/api/activity-logs", requireAuth, async (req, res) => {
    const log = await storage.createActivityLog(req.body);
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

  // ==================== SEED DATA ====================
  app.post("/api/seed", async (_req, res) => {
    try {
      const existing = await storage.getUserByUsername("admin");
      if (existing) return res.json({ message: "البيانات موجودة مسبقًا" });

      const seedUsers = [
        { username: "admin", password: await hashPassword("admin123"), name: "د. عبد الله (المدير)", role: "admin" as const, email: "admin@huffaz.iq", phone: "07701234567", isActive: true },
        { username: "teacher1", password: await hashPassword("teacher123"), name: "الشيخ أحمد", role: "teacher" as const, email: "ahmed@huffaz.iq", phone: "07801234567", isActive: true },
        { username: "teacher2", password: await hashPassword("teacher123"), name: "الشيخ عبد الله", role: "teacher" as const, email: "abdullah@huffaz.iq", phone: "07811234567", isActive: true },
        { username: "student1", password: await hashPassword("student123"), name: "عمر خالد", role: "student" as const, email: "omar@huffaz.iq", phone: "07901234567", isActive: true },
        { username: "student2", password: await hashPassword("student123"), name: "أحمد محمد", role: "student" as const, email: "ahmad@huffaz.iq", phone: "07911234567", isActive: true },
        { username: "student3", password: await hashPassword("student123"), name: "يوسف علي", role: "student" as const, email: "yusuf@huffaz.iq", phone: "07921234567", isActive: true },
        { username: "supervisor1", password: await hashPassword("super123"), name: "المشرف محمد", role: "supervisor" as const, email: "mohammed@huffaz.iq", phone: "07701111111", isActive: true },
      ];

      for (const u of seedUsers) {
        await storage.createUser(u);
      }

      res.json({ message: "تم إنشاء البيانات الأولية بنجاح", count: seedUsers.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
