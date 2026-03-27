import type { Express } from "express";
import { requireRole } from "../auth";
import { storage } from "../storage";

export function registerActivityRoutes(app: Express) {
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


}
