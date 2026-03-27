import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  ratings,
} from "@shared/schema";
import { logActivity, canTeacherAccessStudent } from "./shared";
import { sendError } from "../error-handler";

export function registerRatingsRoutes(app: Express) {
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
      sendError(res, err, "جلب التقييمات");
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

      if (currentUser.role === "supervisor") {
        if (targetUser.role !== "teacher" && targetUser.role !== "student") {
          return res.status(403).json({ message: "المشرف يمكنه تقييم الأساتذة والطلاب فقط" });
        }
      } else if (currentUser.role === "teacher") {
        if (targetUser.role !== "student") {
          return res.status(403).json({ message: "الأستاذ يمكنه تقييم الطلاب فقط" });
        }
        if (!canTeacherAccessStudent(currentUser, targetUser)) {
          return res.status(403).json({ message: "لا يمكنك تقييم طالب غير تابع لك" });
        }
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
      sendError(res, err, "إنشاء تقييم");
    }
  });

}
