import type { Express } from "express";
import { requireAuth, requireRole } from "../auth";
import { storage } from "../storage";
import {
  notifications,
} from "@shared/schema";
import { filterTextFields } from "@shared/content-filter";
import { logActivity } from "./shared";

export function registerNotificationsRoutes(app: Express) {
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

}
