import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import { eq, and, min } from "drizzle-orm";
import {
  badges,
} from "@shared/schema";
import { quranSurahs } from "@shared/quran-surahs";

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
    } catch { res.status(500).json({ message: "حدث خطأ" }); }
  });

  app.post("/api/quran-progress", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { surahNumber, verseStatuses, notes, reviewedToday, reviewStreak, lastReviewDate, totalVerses } = req.body;
      if (!surahNumber || surahNumber < 1 || surahNumber > 114)
        return res.status(400).json({ message: "رقم السورة غير صحيح" });
      const statusesObj = typeof verseStatuses === "object" ? verseStatuses : JSON.parse(verseStatuses || "{}");
      const row = await storage.upsertQuranProgress({
        userId: currentUser.id, mosqueId: currentUser.mosqueId,
        surahNumber: Number(surahNumber), verseStatuses: JSON.stringify(statusesObj),
        notes: notes || null, reviewedToday: reviewedToday ?? false,
        reviewStreak: reviewStreak ?? 0, lastReviewDate: lastReviewDate || null,
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
    } catch { res.status(500).json({ message: "حدث خطأ في حفظ التقدم" }); }
  });

}
