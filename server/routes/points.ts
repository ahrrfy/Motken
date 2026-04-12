import type { Express } from "express";
import { requireAuth, requireRole } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import {
  points,
  badges,
  pointRedemptions,
  users,
} from "@shared/schema";
import { eq, desc, sql, and, sum } from "drizzle-orm";
import { logActivity } from "./shared";
import { sendError } from "../error-handler";
import { ensureSameMosque } from "../lib/mosque-guard";

export function registerPointsRoutes(app: Express) {
  // ==================== POINTS & BADGES ====================
  app.get("/api/points", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const userId = req.query.userId as string | undefined;
      if (userId) {
        await ensureSameMosque(currentUser, userId);
        const pts = await storage.getPointsByUser(userId);
        return res.json(pts);
      }
      if (["admin", "teacher", "supervisor"].includes(currentUser.role) && currentUser.mosqueId) {
        const pts = await storage.getPointsByMosque(currentUser.mosqueId);
        const enriched = await Promise.all(pts.map(async (p) => {
          const u = await storage.getUser(p.userId);
          return { ...p, userName: u?.name || p.userId };
        }));
        return res.json(enriched);
      }
      const pts = await storage.getPointsByUser(currentUser.id);
      res.json(pts);
    } catch (err: unknown) {
      sendError(res, err, "جلب النقاط");
    }
  });

  app.get("/api/points/total/:userId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      await ensureSameMosque(currentUser, req.params.userId);
      const total = await storage.getTotalPoints(req.params.userId);
      res.json({ total });
    } catch (err: unknown) {
      sendError(res, err, "جلب مجموع النقاط");
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
    } catch (err: unknown) {
      sendError(res, err, "جلب لوحة المتصدرين");
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
    } catch (err: unknown) {
      sendError(res, err, "منح النقاط");
    }
  });

  app.get("/api/badges", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const userId = req.query.userId as string | undefined;
      if (userId) {
        await ensureSameMosque(currentUser, userId);
        const userBadges = await storage.getBadgesByUser(userId);
        return res.json(userBadges);
      }
      if (["admin", "teacher", "supervisor"].includes(currentUser.role) && currentUser.mosqueId) {
        const mosqueBadges = await storage.getBadgesByMosque(currentUser.mosqueId);
        const enriched = await Promise.all(mosqueBadges.map(async (b) => {
          const u = await storage.getUser(b.userId);
          return { ...b, userName: u?.name || b.userId };
        }));
        return res.json(enriched);
      }
      const userBadges = await storage.getBadgesByUser(currentUser.id);
      res.json(userBadges);
    } catch (err: unknown) {
      sendError(res, err, "جلب الأوسمة");
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
    } catch (err: unknown) {
      sendError(res, err, "منح الوسام");
    }
  });

  app.delete("/api/badges/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteBadge(req.params.id);
      await logActivity(req.user!, "حذف وسام", "badges");
      res.json({ message: "تم حذف الوسام" });
    } catch (err: unknown) {
      sendError(res, err, "حذف الوسام");
    }
  });

  app.get("/api/point-redemptions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const studentId = req.query.studentId as string | undefined;
      const conditions = [];
      if (studentId) {
        conditions.push(eq(pointRedemptions.studentId, studentId));
      } else if (currentUser.role === "student") {
        conditions.push(eq(pointRedemptions.studentId, currentUser.id));
      }
      if (currentUser.mosqueId && currentUser.role !== "admin") {
        conditions.push(eq(pointRedemptions.mosqueId, currentUser.mosqueId));
      }
      const records = conditions.length > 0
        ? await db.select().from(pointRedemptions).where(and(...conditions)).orderBy(desc(pointRedemptions.createdAt))
        : await db.select().from(pointRedemptions).orderBy(desc(pointRedemptions.createdAt));
      const enriched = await Promise.all(records.map(async (r) => {
        const student = await storage.getUser(r.studentId);
        const redeemer = r.redeemedBy ? await storage.getUser(r.redeemedBy) : null;
        return { ...r, studentName: student?.name || r.studentId, redeemedByName: redeemer?.name || "" };
      }));
      res.json(enriched);
    } catch (err: unknown) {
      sendError(res, err, "جلب سجل التصريف");
    }
  });

  app.post("/api/point-redemptions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتصريف النقاط" });
      }
      const { studentId, amount, rewardName } = req.body;
      if (!studentId || !amount || !rewardName) {
        return res.status(400).json({ message: "جميع الحقول مطلوبة" });
      }
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "عدد النقاط يجب أن يكون أكبر من صفر" });
      }
      const student = await storage.getUser(studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
      if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      // Transaction with row lock to prevent double-spend race condition
      const [redemption] = await db.transaction(async (tx) => {
        // Lock user row to serialize concurrent point operations
        await tx.execute(sql`SELECT id FROM users WHERE id = ${studentId} FOR UPDATE`);

        // Compute balance inside transaction (consistent read after lock)
        const [result] = await tx.select({ total: sum(points.amount) })
          .from(points).where(eq(points.userId, studentId));
        const totalPoints = Number(result?.total ?? 0);

        if (totalPoints < numAmount) {
          throw Object.assign(
            new Error(`رصيد الطالب غير كافٍ (${totalPoints} نقطة فقط)`),
            { status: 400 }
          );
        }

        // Deduct points
        await tx.insert(points).values({
          userId: studentId,
          mosqueId: currentUser.mosqueId,
          amount: -numAmount,
          reason: `تصريف: ${rewardName}`,
          category: "redemption",
        });

        // Record redemption
        return tx.insert(pointRedemptions).values({
          studentId,
          mosqueId: currentUser.mosqueId,
          amount: numAmount,
          rewardName,
          redeemedBy: currentUser.id,
        }).returning();
      });

      await logActivity(currentUser, `تصريف ${numAmount} نقطة للطالب ${student.name}: ${rewardName}`, "points");
      res.status(201).json(redemption);
    } catch (err: unknown) {
      sendError(res, err, "تصريف النقاط");
    }
  });

  app.post("/api/points/reset", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "فقط المشرف أو المسؤول يمكنه تصفير النقاط" });
      }
      const { studentId } = req.body;
      if (!studentId) return res.status(400).json({ message: "معرف الطالب مطلوب" });
      const student = await storage.getUser(studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
      if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      // Transaction with row lock to prevent double-reset race condition
      const totalPoints = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM users WHERE id = ${studentId} FOR UPDATE`);

        const [result] = await tx.select({ total: sum(points.amount) })
          .from(points).where(eq(points.userId, studentId));
        const total = Number(result?.total ?? 0);

        if (total > 0) {
          await tx.insert(points).values({
            userId: studentId,
            mosqueId: currentUser.mosqueId,
            amount: -total,
            reason: "تصفير النقاط",
            category: "reset",
          });
        }
        return total;
      });

      await logActivity(currentUser, `تصفير نقاط الطالب ${student.name} (${totalPoints} نقطة)`, "points");
      res.json({ message: `تم تصفير ${totalPoints} نقطة`, previousTotal: totalPoints });
    } catch (err: unknown) {
      sendError(res, err, "تصفير النقاط");
    }
  });

  app.post("/api/points/reset-all", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const students = currentUser.mosqueId
        ? await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student")
        : (await storage.getUsers()).filter(u => u.role === "student");
      let totalReset = 0;
      for (const student of students) {
        const total = await storage.getTotalPoints(student.id);
        if (total > 0) {
          await storage.createPoint({
            userId: student.id,
            mosqueId: currentUser.mosqueId,
            amount: -total,
            reason: "تصفير جماعي للنقاط",
            category: "reset",
          });
          totalReset++;
        }
      }
      await logActivity(currentUser, `تصفير جماعي لنقاط ${totalReset} طالب`, "points");
      res.json({ message: `تم تصفير نقاط ${totalReset} طالب` });
    } catch (err: unknown) {
      sendError(res, err, "تصفير جماعي للنقاط");
    }
  });

  // ==================== BULK IMPORT FROM EXCEL ====================
  // POST /api/points/bulk-import
  // Accepts { rows: [{اسم الطالب, النقاط, السبب, التصنيف}] }
  app.post("/api/points/bulk-import", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "لا توجد بيانات للاستيراد" });
      }
      const CATEGORY_MAP: Record<string, string> = {
        "حفظ": "memorization", "مراجعة": "review", "حضور": "attendance",
        "إنجاز": "achievement", "أخرى": "other",
      };
      const { pool } = await import("../db");
      let success = 0, failed = 0;
      for (const row of rows) {
        try {
          const nameQuery = (row["اسم الطالب"] || row["الاسم"] || "").trim();
          const amount = parseInt(row["النقاط"] || "0");
          const reason = (row["السبب"] || "").trim();
          if (!nameQuery || !amount || !reason) { failed++; continue; }
          const sr = await pool.query(
            `SELECT id FROM users WHERE mosque_id = $1 AND role = 'student' AND (LOWER(name) = LOWER($2) OR LOWER(username) = LOWER($2)) LIMIT 1`,
            [currentUser.mosqueId, nameQuery]
          );
          if (sr.rows.length === 0) { failed++; continue; }
          const category = CATEGORY_MAP[row["التصنيف"]?.trim()] || "other";
          await storage.createPoint({
            userId: sr.rows[0].id,
            mosqueId: currentUser.mosqueId,
            amount,
            category,
            reason,
          });
          success++;
        } catch { failed++; }
      }
      res.json({ success, failed, total: rows.length });
    } catch (err: unknown) { sendError(res, err, "استيراد النقاط"); }
  });

}
