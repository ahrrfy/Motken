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

  // ==================== QURAN PASSPORT ====================
  app.get("/api/quran-passport/:userId", requireAuth, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const targetUserId = req.params.userId;

      if (targetUserId !== currentUser.id && !["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const student = await storage.getUser(targetUserId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });

      let mosque = null;
      if (student.mosqueId) mosque = await storage.getMosque(student.mosqueId);

      const progress = await storage.getQuranProgressByUser(targetUserId);
      const { quranSurahs } = await import("@shared/quran-surahs");

      // Page-based surah → juz mapping
      const surahStartPages: Record<number, number> = {
        1:1,2:2,3:50,4:77,5:106,6:128,7:151,8:177,9:187,10:208,
        11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,
        19:305,20:312,21:322,22:332,23:342,24:350,25:359,26:367,
        27:377,28:385,29:396,30:404,31:411,32:415,33:418,34:428,
        35:434,36:440,37:446,38:453,39:458,40:467,41:477,42:483,
        43:489,44:496,45:499,46:502,47:507,48:511,49:515,50:518,
        51:520,52:523,53:526,54:528,55:531,56:534,57:537,58:542,
        59:545,60:549,61:551,62:553,63:554,64:556,65:558,66:560,
        67:562,68:564,69:566,70:568,71:570,72:572,73:574,74:575,
        75:577,76:578,77:580,78:582,79:583,80:585,81:586,82:587,
        83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,
        91:595,92:595,93:596,94:596,95:597,96:597,97:598,98:598,
        99:599,100:599,101:600,102:600,103:601,104:601,105:601,
        106:602,107:602,108:602,109:603,110:603,111:603,112:604,
        113:604,114:604,
      };
      const juzStartPages = [1,22,42,62,82,102,121,142,162,182,201,221,241,261,281,301,321,341,361,381,401,421,441,461,481,501,521,542,562,582];

      const getSurahJuz = (surahNum: number) => {
        const page = surahStartPages[surahNum] || 1;
        for (let i = juzStartPages.length - 1; i >= 0; i--) {
          if (page >= juzStartPages[i]) return i + 1;
        }
        return 1;
      };

      const juzMap = new Map<number, { surahs: any[] }>();
      for (let j = 1; j <= 30; j++) juzMap.set(j, { surahs: [] });

      for (const surah of quranSurahs) {
        const juz = getSurahJuz(surah.number);
        const prog = progress.find((p: any) => p.surahNumber === surah.number);
        let memorizedVerses = 0;
        if (prog) {
          const statuses = JSON.parse(prog.verseStatuses || "{}");
          memorizedVerses = Object.values(statuses).filter((s: any) => s === "memorized").length;
        }
        juzMap.get(juz)!.surahs.push({
          number: surah.number,
          name: surah.name,
          totalVerses: surah.versesCount,
          memorizedVerses,
          complete: memorizedVerses >= surah.versesCount,
        });
      }

      const juzProgress = Array.from(juzMap.entries()).map(([juz, data]) => {
        const totalVerses = data.surahs.reduce((sum: number, s: any) => sum + s.totalVerses, 0);
        const memorizedVerses = data.surahs.reduce((sum: number, s: any) => sum + s.memorizedVerses, 0);
        const completionPercent = totalVerses > 0 ? Math.round((memorizedVerses / totalVerses) * 100) : 0;
        const complete = completionPercent >= 95;
        // حالة المسيرة: لم يبدأ / قيد الحفظ / محفوظ / مُتقَن
        let masteryStatus: "not_started" | "memorizing" | "memorized" | "mastered" = "not_started";
        if (complete) masteryStatus = "memorized";
        else if (memorizedVerses > 0) masteryStatus = "memorizing";
        // مُتقَن = محفوظ + اجتاز الاختبار (يُحدَّث لاحقاً عند إضافة جدول الاختبارات)
        return { juz, surahs: data.surahs, totalVerses, memorizedVerses, completionPercent, complete, masteryStatus };
      });

      const totalMemorizedVerses = juzProgress.reduce((s, j) => s + j.memorizedVerses, 0);
      const TOTAL_QURAN_VERSES = 6236;

      res.json({
        student: { id: student.id, name: student.name, age: student.age, joinedAt: student.createdAt },
        mosque: { name: mosque?.name || "", image: (mosque as any)?.image || null },
        juzProgress,
        totalMemorizedVerses,
        totalVerses: TOTAL_QURAN_VERSES,
        totalCompletionPercent: Math.round((totalMemorizedVerses / TOTAL_QURAN_VERSES) * 100),
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) { sendError(res, err, "جواز سفر القرآن"); }
  });

}
