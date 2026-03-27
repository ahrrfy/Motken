import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import { eq, and, min } from "drizzle-orm";
import {
  badges,
} from "@shared/schema";
import { quranSurahs } from "@shared/quran-surahs";
import { sendError } from "../error-handler";

export function registerQuranRoutes(app: Express) {
  // ==================== QURAN SURAHS API ====================
  app.get("/api/quran-surahs", requireAuth, async (_req, res) => {
    const { quranSurahs } = await import("@shared/quran-surahs");
    res.json(quranSurahs);
  });


  // ==================== QURAN PROGRESS ====================
  app.get("/api/quran-progress", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const userId = (req.query.userId as string) || currentUser.id;
      if (userId !== currentUser.id && !["admin","supervisor","teacher"].includes(currentUser.role))
        return res.status(403).json({ message: "غير مصرح" });
      const surahNumber = req.query.surahNumber ? Number(req.query.surahNumber) : null;
      if (surahNumber) {
        const row = await storage.getQuranProgress(userId, surahNumber);
        return res.json(row || { verseStatuses: "{}", notes: null, reviewStreak: 0, reviewedToday: false });
      }
      res.json(await storage.getQuranProgressByUser(userId));
    } catch (err: any) { sendError(res, err, "جلب تقدم القرآن"); }
  });

  app.post("/api/quran-progress", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { surahNumber, verseStatuses, notes, reviewedToday, reviewStreak, lastReviewDate, totalVerses } = req.body;
      if (!surahNumber || surahNumber < 1 || surahNumber > 114)
        return res.status(400).json({ message: "رقم السورة غير صحيح" });
      const statusesObj = typeof verseStatuses === "object" ? verseStatuses : JSON.parse(verseStatuses || "{}");
      const row = await storage.upsertQuranProgress({
        userId: currentUser.id, mosqueId: currentUser.mosqueId || undefined,
        surahNumber: Number(surahNumber), verseStatuses: JSON.stringify(statusesObj),
        notes: notes || undefined, reviewedToday: reviewedToday ?? false,
        reviewStreak: reviewStreak ?? 0, lastReviewDate: lastReviewDate || undefined,
      });
      if (totalVerses > 0) {
        const memorized = Object.values(statusesObj).filter((s: any) => s === "memorized").length;
        if (memorized >= totalVerses) {
          const existing = await db.select().from(badges)
            .where(and(eq(badges.userId, currentUser.id), eq(badges.badgeType, `surah_complete_${surahNumber}`)));
          if (existing.length === 0) {
            const surahInfo = quranSurahs.find(s => s.number === Number(surahNumber));
            const surahDisplayName = surahInfo ? surahInfo.name : `سورة رقم ${surahNumber}`;
            await storage.createBadge({
              userId: currentUser.id, mosqueId: currentUser.mosqueId,
              badgeType: `surah_complete_${surahNumber}`,
              badgeName: `حافظ سورة ${surahDisplayName}`,
              description: `تم حفظ سورة ${surahDisplayName} كاملاً`,
            });
            await storage.createPoint({
              userId: currentUser.id, mosqueId: currentUser.mosqueId,
              amount: Math.min(totalVerses * 2, 100), category: "achievement",
              reason: `إتمام حفظ سورة ${surahDisplayName} كاملة (${totalVerses} آية)`,
            });
            await storage.createNotification({
              userId: currentUser.id, mosqueId: currentUser.mosqueId,
              title: "إنجاز رائع!", type: "success",
              message: `أتممت حفظ سورة ${surahDisplayName} كاملاً — تم منحك شارة ونقاط!`,
            });
          }
        }
      }
      res.json(row);
    } catch (err: any) { sendError(res, err, "حفظ تقدم القرآن"); }
  });

  // ==================== SPACED REPETITION - مراجعة ذكية ====================

  /**
   * جلب جدول المراجعة — السور المستحقة للمراجعة اليوم
   */
  app.get("/api/quran-review-schedule", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const userId = (req.query.userId as string) || currentUser.id;
      if (userId !== currentUser.id && !["admin", "supervisor", "teacher"].includes(currentUser.role))
        return res.status(403).json({ message: "غير مصرح" });

      const allProgress = await storage.getQuranProgressByUser(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { calculateReviewPriority, getRetentionLevel } = await import("@shared/spaced-repetition");

      const dueReviews = [];
      const upcomingReviews = [];

      for (const progress of allProgress) {
        // فقط السور التي بها آيات محفوظة
        const statuses = JSON.parse(progress.verseStatuses || "{}");
        const memorizedCount = Object.values(statuses).filter((s: any) => s === "memorized").length;
        if (memorizedCount === 0) continue;

        const surahInfo = quranSurahs.find(s => s.number === progress.surahNumber);
        const nextReview = progress.nextReviewDate ? new Date(progress.nextReviewDate) : null;
        const interval = progress.reviewInterval || 0;
        const easeFactor = parseFloat(progress.easeFactor || "2.5");

        const item = {
          surahNumber: progress.surahNumber,
          surahName: surahInfo?.name || `سورة ${progress.surahNumber}`,
          memorizedVerses: memorizedCount,
          totalVerses: surahInfo?.versesCount || 0,
          reviewStreak: progress.reviewStreak,
          interval,
          easeFactor,
          nextReviewDate: nextReview?.toISOString() || null,
          lastReviewDate: progress.lastReviewDate,
          retentionLevel: getRetentionLevel(interval, progress.reviewStreak),
          priority: 0,
        };

        if (!nextReview || nextReview <= today) {
          // مستحقة للمراجعة
          item.priority = nextReview
            ? calculateReviewPriority(nextReview, interval, easeFactor)
            : 1; // لم تتم مراجعتها أبداً — أعلى أولوية
          dueReviews.push(item);
        } else {
          upcomingReviews.push(item);
        }
      }

      // ترتيب حسب الأولوية (الأعلى أولاً)
      dueReviews.sort((a, b) => b.priority - a.priority);
      upcomingReviews.sort((a, b) => {
        const dateA = a.nextReviewDate ? new Date(a.nextReviewDate).getTime() : 0;
        const dateB = b.nextReviewDate ? new Date(b.nextReviewDate).getTime() : 0;
        return dateA - dateB;
      });

      res.json({
        dueToday: dueReviews,
        upcoming: upcomingReviews.slice(0, 10),
        totalDue: dueReviews.length,
        totalTracked: allProgress.filter(p => {
          const s = JSON.parse(p.verseStatuses || "{}");
          return Object.values(s).some((v: any) => v === "memorized");
        }).length,
      });
    } catch (err: any) { sendError(res, err, "جلب جدول المراجعة"); }
  });

  /**
   * تسجيل نتيجة مراجعة
   */
  app.post("/api/quran-review-result", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { surahNumber, grade } = req.body;

      if (!surahNumber || surahNumber < 1 || surahNumber > 114)
        return res.status(400).json({ message: "رقم السورة غير صحيح", field: "surahNumber", source: "validation" });
      if (!grade || grade < 1 || grade > 5)
        return res.status(400).json({ message: "الدرجة يجب أن تكون بين 1 و 5", field: "grade", source: "validation" });

      const progress = await storage.getQuranProgress(currentUser.id, Number(surahNumber));
      if (!progress) {
        return res.status(404).json({ message: "لا يوجد تقدم مسجل لهذه السورة" });
      }

      const { calculateNextReview } = await import("@shared/spaced-repetition");

      const result = calculateNextReview({
        grade: Number(grade),
        currentInterval: progress.reviewInterval || 0,
        currentEaseFactor: parseFloat(progress.easeFactor || "2.5"),
        currentStreak: progress.reviewStreak || 0,
      });

      const today = new Date().toISOString().split("T")[0];

      const updated = await storage.upsertQuranProgress({
        userId: currentUser.id,
        mosqueId: currentUser.mosqueId || undefined,
        surahNumber: Number(surahNumber),
        verseStatuses: progress.verseStatuses,
        notes: progress.notes || undefined,
        reviewedToday: true,
        reviewStreak: result.reviewStreak,
        lastReviewDate: today,
        easeFactor: String(result.newEaseFactor),
        reviewInterval: result.newInterval,
        nextReviewDate: result.nextReviewDate.toISOString().split("T")[0],
      });

      const surahInfo = quranSurahs.find(s => s.number === Number(surahNumber));
      const surahName = surahInfo?.name || `سورة ${surahNumber}`;

      // منح نقاط على المراجعة
      if (grade >= 3) {
        await storage.createPoint({
          userId: currentUser.id,
          mosqueId: currentUser.mosqueId,
          amount: grade >= 4 ? 5 : 2,
          category: "review",
          reason: `مراجعة ${surahName} — درجة ${grade}/5`,
        });
      }

      res.json({
        ...updated,
        nextReviewDate: result.nextReviewDate.toISOString().split("T")[0],
        newInterval: result.newInterval,
        reviewStreak: result.reviewStreak,
        message: grade >= 4
          ? `أحسنت! المراجعة القادمة بعد ${result.newInterval} يوم`
          : grade === 3
            ? `جيد — المراجعة القادمة بعد ${result.newInterval} يوم`
            : `تحتاج مراجعة أكثر — المراجعة القادمة غداً`,
      });
    } catch (err: any) { sendError(res, err, "تسجيل نتيجة المراجعة"); }
  });

}
