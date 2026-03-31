import type { Express } from "express";
import { requireAuth, requireRole } from "../auth";
import { storage } from "../storage";
import {
  notifications,
} from "@shared/schema";
import { filterTextFields } from "@shared/content-filter";
import { logActivity } from "./shared";
import { sendError } from "../error-handler";
import { broadcastToUser } from "../websocket";

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
      
      const { targetRole } = req.body;
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
        } else if (targetType === "role" && targetRole) {
          const validRoles = ["admin", "supervisor", "teacher", "student", "parent"];
          if (!validRoles.includes(targetRole)) {
            return res.status(400).json({ message: "الدور غير صالح" });
          }
          targetUsers = await storage.getUsersByRole(targetRole);
        } else {
          return res.status(400).json({ message: "يرجى تحديد الهدف" });
        }
      } else if (currentUser.role === "supervisor") {
        const perms = (currentUser as any).supervisorPermissions || {};
        if (perms.canSendBroadcast === false) {
          return res.status(403).json({ message: "ليس لديك صلاحية إرسال الإعلانات" });
        }
        if (!currentUser.mosqueId) {
          return res.status(400).json({ message: "المشرف غير مرتبط بجامع" });
        }
        if (targetType === "all") {
          targetUsers = await storage.getUsersByMosque(currentUser.mosqueId);
        } else if (targetType === "role" && targetRole) {
          const validRoles = ["teacher", "student"];
          if (!validRoles.includes(targetRole)) {
            return res.status(400).json({ message: "المشرف يمكنه الإرسال للأساتذة والطلاب فقط" });
          }
          targetUsers = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, targetRole);
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
      
      const isBroadcast = ["all", "role", "mosque"].includes(targetType) || targetUsers.length > 1;
      let announcementId: string | undefined;
      const recipientCount = targetUsers.filter(u => u.id !== currentUser.id).length;
      if (isBroadcast && recipientCount > 0) {
        const ann = await storage.createAnnouncement({
          senderId: currentUser.id,
          title,
          message,
          type: notifType,
          targetType,
          targetValue: targetType === "role" ? req.body.targetRole : targetType === "mosque" ? targetMosqueId : null,
          mosqueId: currentUser.mosqueId || null,
          totalRecipients: recipientCount,
        });
        announcementId = ann.id;
      }

      let count = 0;
      for (const u of targetUsers) {
        if (u.id === currentUser.id) continue;
        const notification = await storage.createNotification({
          userId: u.id,
          mosqueId: u.mosqueId || currentUser.mosqueId,
          title,
          message,
          type: notifType,
          isRead: false,
          announcementId: announcementId || null,
        } as any);
        broadcastToUser(u.id, { type: "notification", data: notification });
        count++;
      }

      await logActivity(currentUser, `إرسال إشعار: ${title}`, "notifications", `${count} مستخدم`);
      res.json({ message: `تم إرسال الإشعار إلى ${count} مستخدم` });
    } catch (err: any) {
      sendError(res, err, "إرسال الإشعار");
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifs = await storage.getNotifications(req.user!.id);
      res.json(notifs);
    } catch (err: any) {
      sendError(res, err, "جلب الإشعارات");
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
      sendError(res, err, "تحديد إشعارات كمقروءة");
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
      sendError(res, err, "حذف جميع الإشعارات");
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
      sendError(res, err, "تحديث حالة الإشعار");
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ message: "تم تحديد الكل كمقروء" });
    } catch (err: any) {
      sendError(res, err, "تحديد الكل كمقروء");
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
      sendError(res, err, "حذف إشعار");
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
      sendError(res, err, "حذف إشعارات محددة");
    }
  });

  // ==================== ANNOUNCEMENTS HISTORY ====================
  app.get("/api/announcements", requireAuth, requireRole("admin", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      let announcements;
      if (currentUser.role === "admin") {
        announcements = await storage.getAnnouncements();
      } else if (currentUser.mosqueId) {
        announcements = await storage.getAnnouncementsByMosque(currentUser.mosqueId);
      } else {
        announcements = await storage.getAnnouncementsBySender(currentUser.id);
      }
      res.json(announcements);
    } catch (err: any) {
      sendError(res, err, "جلب الإعلانات");
    }
  });

}
