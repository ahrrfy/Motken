import type { Express } from "express";
import { requireAuth, requireRole } from "../auth";
import { storage } from "../storage";
import {
  points,
  badges,
} from "@shared/schema";
import { logActivity } from "./shared";

export function registerPointsRoutes(app: Express) {
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
      const currentUser = req.user!;
      let mosqueId = req.query.mosqueId as string | undefined;
      if (currentUser.role !== "admin") {
        mosqueId = currentUser.mosqueId || undefined;
      }
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
      if (!userId || amount === undefined || !reason) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount === 0 || Math.abs(numAmount) > 10000) {
        return res.status(400).json({ message: "قيمة النقاط غير صحيحة (الحد الأقصى 10000)" });
      }
      if (typeof reason !== "string" || reason.length > 500) {
        return res.status(400).json({ message: "السبب مطلوب ويجب ألا يتجاوز 500 حرف" });
      }
      const targetStudent = await storage.getUser(userId);
      if (!targetStudent) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (currentUser.role !== "admin" && targetStudent.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بمنح نقاط لطالب من جامع آخر" });
      }
      const point = await storage.createPoint({
        userId,
        mosqueId: currentUser.mosqueId,
        amount: numAmount,
        reason: reason.slice(0, 500),
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
      const currentUser = req.user!;
      let userId = (req.query.userId as string) || currentUser.id;
      if (userId !== currentUser.id && currentUser.role !== "admin") {
        const targetUser = await storage.getUser(userId);
        if (targetUser && targetUser.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لأوسمة مستخدم من جامع آخر" });
        }
      }
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
      const badgeTarget = await storage.getUser(userId);
      if (!badgeTarget) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (currentUser.role !== "admin" && badgeTarget.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بمنح أوسمة لمستخدم من جامع آخر" });
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

}
