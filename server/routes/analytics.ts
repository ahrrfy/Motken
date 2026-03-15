import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { min, max } from "drizzle-orm";
import {
  assignments,
  attendance,
  points,
  type User,
  type Assignment,
} from "@shared/schema";
import { quranSurahs } from "@shared/quran-surahs";
import { canTeacherAccessStudent } from "./shared";

// SECURITY FIX: Authorization check for accessing student/user data
async function checkDataAccess(currentUser: any, targetUserId: string, res: any): Promise<boolean> {
  const target = await storage.getUser(targetUserId);
  if (!target) { res.status(404).json({ message: "المستخدم غير موجود" }); return false; }
  if (currentUser.role === "admin") return true;
  if (currentUser.role === "student" && currentUser.id !== targetUserId) {
    res.status(403).json({ message: "غير مصرح بالوصول لبيانات مستخدم آخر" }); return false;
  }
  if (currentUser.role === "student") return true;
  if (target.mosqueId !== currentUser.mosqueId) {
    res.status(403).json({ message: "غير مصرح بالوصول لبيانات مستخدم من جامع آخر" }); return false;
  }
  if (currentUser.role === "teacher" && target.role === "student" && !canTeacherAccessStudent(currentUser, target)) {
    res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الطالب" }); return false;
  }
  return true;
}

export function registerAnalyticsRoutes(app: Express) {
  // ==================== STUDENT STREAKS ====================
  app.get("/api/student-streaks/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      if (!(await checkDataAccess(req.user!, studentId, res))) return;
      const allAttendance = await storage.getAttendanceByStudent(studentId);

      const sorted = allAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;

      for (const record of sorted) {
        if (record.status === "present" || record.status === "late") {
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          if (currentStreak === 0) currentStreak = tempStreak;
          tempStreak = 0;
        }
      }
      if (currentStreak === 0) currentStreak = tempStreak;
      if (tempStreak > maxStreak) maxStreak = tempStreak;

      const totalPresent = allAttendance.filter(a => a.status === "present" || a.status === "late").length;

      res.json({ currentStreak, maxStreak, totalPresent, totalRecords: allAttendance.length });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });


  // ==================== ACTIVITY HEATMAP ====================
  app.get("/api/activity-heatmap/:userId", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      if (!(await checkDataAccess(req.user!, userId, res))) return;
      const now = new Date();
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      const [attendanceData, assignmentsData, pointsData] = await Promise.all([
        storage.getAttendanceByStudent(userId),
        storage.getAssignmentsByStudent(userId),
        storage.getPointsByUser(userId),
      ]);

      const dayMap: Record<string, number> = {};

      attendanceData.forEach(a => {
        const day = new Date(a.date).toISOString().split("T")[0];
        dayMap[day] = (dayMap[day] || 0) + 1;
      });

      assignmentsData.forEach(a => {
        if (a.status === "done") {
          const day = new Date(a.createdAt).toISOString().split("T")[0];
          dayMap[day] = (dayMap[day] || 0) + 1;
        }
      });

      pointsData.forEach(p => {
        const day = new Date(p.createdAt).toISOString().split("T")[0];
        dayMap[day] = (dayMap[day] || 0) + 1;
      });

      const heatmapData = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

      res.json(heatmapData);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });


  // ==================== STAR OF THE WEEK ====================
  app.get("/api/star-of-week", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const mosqueId = currentUser.mosqueId;
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const students = mosqueId
        ? (await storage.getUsersByMosqueAndRole(mosqueId, "student")).filter(s => s.isActive && !s.pendingApproval)
        : [];

      if (students.length === 0) {
        return res.json({ star: null });
      }

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const eligibleStudents = students.filter(s => {
        const createdAt = s.createdAt ? new Date(s.createdAt) : now;
        return createdAt < sevenDaysAgo;
      });

      if (eligibleStudents.length === 0) {
        return res.json({ star: null, topStudents: [] });
      }

      const studentScores: { student: any; score: number; details: any }[] = [];

      for (const student of eligibleStudents) {
        let score = 0;
        const details: any = { attendance: 0, assignments: 0, points: 0 };

        const attendance = await storage.getAttendanceByStudent(student.id);
        const weekAttendance = attendance.filter(a => new Date(a.date) >= weekStart);
        details.attendance = weekAttendance.filter(a => a.status === "present").length;
        score += details.attendance * 10;

        const assignments = await storage.getAssignmentsByStudent(student.id);
        const weekAssignments = assignments.filter(a => new Date(a.createdAt) >= weekStart && a.status === "done");
        details.assignments = weekAssignments.length;
        score += weekAssignments.reduce((sum, a) => sum + (a.grade || 0), 0);

        const points = await storage.getPointsByUser(student.id);
        const weekPoints = points.filter(p => new Date(p.createdAt) >= weekStart);
        details.points = weekPoints.reduce((sum, p) => sum + p.amount, 0);
        score += details.points;

        studentScores.push({ student: { id: student.id, name: student.name, level: student.level, avatar: student.avatar }, score, details });
      }

      studentScores.sort((a, b) => b.score - a.score);

      const top3 = studentScores.filter(s => s.score > 0).slice(0, 3);

      res.json({ star: top3[0] || null, topStudents: top3 });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });


  // ==================== PREDICTION ====================
  app.get("/api/prediction/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      if (!(await checkDataAccess(req.user!, studentId, res))) return;
      const student = await storage.getUser(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const assignments = await storage.getAssignmentsByStudent(studentId);
      const completedAssignments = assignments.filter(a => a.status === "done");

      if (completedAssignments.length < 2) {
        return res.json({ prediction: null, message: "Not enough data" });
      }

      const totalMemorizedVerses = completedAssignments.reduce((sum, a) => sum + (a.toVerse - a.fromVerse + 1), 0);

      const totalQuranVerses = 6236;
      const remainingVerses = totalQuranVerses - totalMemorizedVerses;

      const sortedByDate = completedAssignments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const firstDate = new Date(sortedByDate[0].createdAt);
      const lastDate = new Date(sortedByDate[sortedByDate.length - 1].createdAt);
      const weeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const versesPerWeek = totalMemorizedVerses / weeks;

      const remainingWeeks = versesPerWeek > 0 ? remainingVerses / versesPerWeek : 0;
      const predictedDate = new Date();
      predictedDate.setDate(predictedDate.getDate() + (remainingWeeks * 7));

      const grades = completedAssignments.filter(a => a.grade !== null).map(a => a.grade!);
      const avgGrade = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length) : 0;

      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const lastWeekAssignments = completedAssignments.filter(a => new Date(a.createdAt) >= oneWeekAgo).length;
      const prevWeekAssignments = completedAssignments.filter(a => new Date(a.createdAt) >= twoWeeksAgo && new Date(a.createdAt) < oneWeekAgo).length;

      const trend = lastWeekAssignments > prevWeekAssignments ? "improving" : lastWeekAssignments < prevWeekAssignments ? "declining" : "stable";

      res.json({
        prediction: {
          totalMemorizedVerses,
          totalQuranVerses,
          progressPercent: Math.round((totalMemorizedVerses / totalQuranVerses) * 100),
          versesPerWeek: Math.round(versesPerWeek * 10) / 10,
          remainingWeeks: Math.round(remainingWeeks),
          predictedCompletionDate: predictedDate.toISOString(),
          avgGrade,
          trend,
          lastWeekAssignments,
          prevWeekAssignments,
        }
      });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });


  // ==================== SMART REVIEW ====================
  app.get("/api/smart-review/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const assignments = await storage.getAssignmentsByStudent(studentId);
      const completed = assignments.filter(a => a.status === "done" && a.grade !== null);

      const surahPerformance: Record<string, { avgGrade: number; lastReviewed: Date; count: number; grades: number[] }> = {};

      completed.forEach(a => {
        if (!surahPerformance[a.surahName]) {
          surahPerformance[a.surahName] = { avgGrade: 0, lastReviewed: new Date(a.createdAt), count: 0, grades: [] };
        }
        surahPerformance[a.surahName].grades.push(a.grade!);
        surahPerformance[a.surahName].count++;
        const d = new Date(a.createdAt);
        if (d > surahPerformance[a.surahName].lastReviewed) {
          surahPerformance[a.surahName].lastReviewed = d;
        }
      });

      Object.keys(surahPerformance).forEach(surah => {
        const sp = surahPerformance[surah];
        sp.avgGrade = Math.round(sp.grades.reduce((s, g) => s + g, 0) / sp.grades.length);
      });

      const now = new Date();
      const needsReview = Object.entries(surahPerformance)
        .map(([surah, data]) => {
          const daysSinceReview = Math.floor((now.getTime() - data.lastReviewed.getTime()) / (24 * 60 * 60 * 1000));
          const reviewInterval = data.avgGrade >= 90 ? 30 : data.avgGrade >= 75 ? 14 : data.avgGrade >= 60 ? 7 : 3;
          const urgency = daysSinceReview / reviewInterval;
          return { surah, avgGrade: data.avgGrade, daysSinceReview, reviewInterval, urgency, needsReview: urgency >= 1 };
        })
        .sort((a, b) => b.urgency - a.urgency);

      const weakSpots = Object.entries(surahPerformance)
        .filter(([_, data]) => data.avgGrade < 70)
        .map(([surah, data]) => ({ surah, avgGrade: data.avgGrade, count: data.count }))
        .sort((a, b) => a.avgGrade - b.avgGrade);

      const todayReview = needsReview.filter(r => r.needsReview).slice(0, 5);

      res.json({ todayReview, weakSpots, allSurahs: needsReview });
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });


  // ==================== MOSQUE RANKINGS ====================
  app.get("/api/mosque-rankings", requireAuth, async (req, res) => {
    try {
      const allMosques = await storage.getMosques();
      const activeMosques = allMosques.filter(m => m.isActive);

      const rankings = await Promise.all(activeMosques.map(async (mosque) => {
        const students = (await storage.getUsersByMosqueAndRole(mosque.id, "student")).filter(s => s.isActive && !s.pendingApproval);
        const teachers = (await storage.getUsersByMosqueAndRole(mosque.id, "teacher")).filter(t => t.isActive);

        let totalPoints = 0;
        let totalAssignments = 0;
        let completedAssignments = 0;

        for (const student of students) {
          const pts = await storage.getPointsByUser(student.id);
          totalPoints += pts.reduce((sum, p) => sum + p.amount, 0);
          const studentAssignments = await storage.getAssignmentsByStudent(student.id);
          totalAssignments += studentAssignments.length;
          completedAssignments += studentAssignments.filter(a => a.status === "done").length;
        }

        const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

        return {
          mosqueId: mosque.id,
          mosqueName: mosque.name,
          province: mosque.province,
          studentsCount: students.length,
          teachersCount: teachers.length,
          totalPoints,
          completionRate,
          score: totalPoints + (completionRate * 10) + (students.length * 5),
        };
      }));

      rankings.sort((a, b) => b.score - a.score);

      const ranked = rankings.map((r, i) => ({ ...r, rank: i + 1 }));

      res.json(ranked);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });


  // ==================== SMART DAILY SUMMARY ====================
  app.get("/api/daily-summary", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      let students: User[] = [];
      let assignmentsList: Assignment[] = [];

      if (currentUser.role === "admin") {
        students = (await storage.getUsersByRole("student")).filter(s => s.isActive && !s.pendingApproval);
        assignmentsList = await storage.getAssignments();
      } else if (currentUser.role === "teacher") {
        students = (await storage.getUsersByTeacher(currentUser.id)).filter(s => s.isActive && !s.pendingApproval);
        assignmentsList = await storage.getAssignmentsByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        const mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
        students = mosqueUsers.filter(u => u.role === "student" && u.isActive && !u.pendingApproval);
        assignmentsList = await storage.getAssignmentsByMosque(currentUser.mosqueId);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const consecutiveAbsences: any[] = [];
      const ungradedAssignments = assignmentsList.filter(a => a.status === "pending" || (a.status === "done" && a.grade === null));
      const overdueAssignments = assignmentsList.filter(a => a.status === "pending" && a.scheduledDate && new Date(a.scheduledDate) < today);
      const nearLevelUp: any[] = [];

      let todayPresent = 0;
      let todayTotal = 0;

      for (const student of students) {
        const attendance = await storage.getAttendanceByStudent(student.id);
        const sorted = attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        let absences = 0;
        for (const a of sorted) {
          if (a.status === "absent") absences++;
          else break;
        }
        if (absences >= 2) {
          consecutiveAbsences.push({ id: student.id, name: student.name, days: absences, parentPhone: student.parentPhone });
        }

        const todayRecord = sorted.find(a => {
          const d = new Date(a.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });
        if (todayRecord) {
          todayTotal++;
          if (todayRecord.status === "present" || todayRecord.status === "late") todayPresent++;
        }

        const studentAssignments = assignmentsList.filter(a => a.studentId === student.id && a.status === "done");
        const juzMap = new Set<string>();
        for (const a of studentAssignments) {
          if (a.surahName) juzMap.add(a.surahName);
        }
        const currentLevel = student.level || 1;
        const thresholds = [5, 10, 15, 20, 25, 30];
        if (currentLevel < 6) {
          const nextThreshold = thresholds[currentLevel];
          const surahs = juzMap.size;
          if (nextThreshold && surahs >= nextThreshold - 2) {
            nearLevelUp.push({ id: student.id, name: student.name, currentLevel, surahsCount: surahs });
          }
        }
      }

      const attendanceRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : null;

      const items: any[] = [];

      if (consecutiveAbsences.length > 0) {
        items.push({
          type: "consecutive_absence",
          severity: "critical",
          title: `${consecutiveAbsences.length} طالب غائب بشكل متتالي`,
          description: consecutiveAbsences.map(s => `${s.name} (${s.days} أيام)`).join("، "),
          data: consecutiveAbsences,
          actionType: "whatsapp",
        });
      }

      if (ungradedAssignments.length > 0) {
        items.push({
          type: "ungraded",
          severity: "warning",
          title: `${ungradedAssignments.length} واجب بحاجة للتصحيح`,
          description: "واجبات مكتملة تنتظر التقييم",
          data: { count: ungradedAssignments.length },
          actionType: "navigate",
          actionTarget: "/assignments",
        });
      }

      if (overdueAssignments.length > 0) {
        items.push({
          type: "overdue",
          severity: "warning",
          title: `${overdueAssignments.length} واجب متأخر`,
          description: "واجبات تجاوزت موعدها المحدد",
          data: { count: overdueAssignments.length },
          actionType: "navigate",
          actionTarget: "/assignments",
        });
      }

      if (nearLevelUp.length > 0) {
        items.push({
          type: "near_level_up",
          severity: "positive",
          title: `${nearLevelUp.length} طالب قريب من الترقية`,
          description: nearLevelUp.map(s => s.name).join("، "),
          data: nearLevelUp,
          actionType: "navigate",
          actionTarget: "/students",
        });
      }

      items.sort((a, b) => {
        const order: Record<string, number> = { critical: 0, warning: 1, positive: 2, info: 3 };
        return (order[a.severity] || 3) - (order[b.severity] || 3);
      });

      res.json({
        items,
        attendanceRate,
        todayPresent,
        todayTotal,
        studentsCount: students.length,
        ungradedCount: ungradedAssignments.length,
        overdueCount: overdueAssignments.length,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب الملخص" });
    }
  });


  // ==================== MOSQUE HEALTH SCORE ====================
  app.get("/api/mosque-health/:mosqueId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "supervisor" && currentUser.mosqueId !== req.params.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const mosqueUsers = await storage.getUsersByMosque(req.params.mosqueId);
      const students = mosqueUsers.filter(u => u.role === "student" && u.isActive && !u.pendingApproval);
      const totalStudents = students.length;
      if (totalStudents === 0) return res.json({ score: 0, attendance: 0, completion: 0, activeRatio: 0 });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let totalAttendance = 0;
      let presentCount = 0;
      let totalAssignments = 0;
      let completedAssignments = 0;
      let activeStudents = 0;

      for (const student of students) {
        const att = await storage.getAttendanceByStudent(student.id);
        const recent = att.filter(a => new Date(a.date) > sevenDaysAgo);
        totalAttendance += recent.length;
        presentCount += recent.filter(a => a.status === "present" || a.status === "late").length;

        const assignments = await storage.getAssignmentsByStudent(student.id);
        totalAssignments += assignments.length;
        completedAssignments += assignments.filter(a => a.status === "done").length;

        const hasRecentActivity = att.some(a => new Date(a.date) > sevenDaysAgo) ||
          assignments.some(a => new Date(a.createdAt) > sevenDaysAgo);
        if (hasRecentActivity) activeStudents++;
      }

      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
      const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
      const activeRatio = Math.round((activeStudents / totalStudents) * 100);

      const score = Math.round(attendanceRate * 0.4 + completionRate * 0.3 + activeRatio * 0.3);

      res.json({ score, attendance: attendanceRate, completion: completionRate, activeRatio });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });


  // ==================== SMART ASSIGNMENT SUGGESTION ====================
  app.get("/api/assignment-suggestion/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      if (!(await checkDataAccess(req.user!, req.params.studentId, res))) return;
      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });

      const assignments = await storage.getAssignmentsByStudent(req.params.studentId);
      const doneAssignments = assignments.filter(a => a.status === "done" && a.surahName).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (doneAssignments.length === 0) {
        const firstSurah = quranSurahs[quranSurahs.length - 1];
        return res.json({
          surahName: firstSurah.name,
          fromVerse: 1,
          toVerse: Math.min(5, firstSurah.versesCount),
          reason: "أول واجب - البدء من جزء عمّ",
          type: "new",
        });
      }

      const lastDone = doneAssignments[0];
      const lastSurah = quranSurahs.find(s => s.name === lastDone.surahName);

      if (lastDone.grade !== null && Number(lastDone.grade) < 60) {
        return res.json({
          surahName: lastDone.surahName,
          fromVerse: lastDone.fromVerse,
          toVerse: lastDone.toVerse,
          reason: `مراجعة - الدرجة السابقة ${lastDone.grade}`,
          type: "review",
        });
      }

      if (lastSurah && lastDone.toVerse && lastDone.toVerse < lastSurah.versesCount) {
        const nextFrom = lastDone.toVerse + 1;
        const nextTo = Math.min(nextFrom + 4, lastSurah.versesCount);
        return res.json({
          surahName: lastSurah.name,
          fromVerse: nextFrom,
          toVerse: nextTo,
          reason: `إكمال سورة ${lastSurah.name}`,
          type: "new",
        });
      }

      if (lastSurah) {
        const currentIndex = quranSurahs.findIndex(s => s.number === lastSurah.number);
        const nextSurah = currentIndex > 0 ? quranSurahs[currentIndex - 1] : null;
        if (nextSurah) {
          return res.json({
            surahName: nextSurah.name,
            fromVerse: 1,
            toVerse: Math.min(5, nextSurah.versesCount),
            reason: `الانتقال لسورة ${nextSurah.name}`,
            type: "new",
          });
        }
      }

      const weakSurahs = doneAssignments.filter(a => a.grade !== null && Number(a.grade) < 75);
      if (weakSurahs.length > 0) {
        const weakest = weakSurahs[0];
        return res.json({
          surahName: weakest.surahName,
          fromVerse: weakest.fromVerse,
          toVerse: weakest.toVerse,
          reason: `تقوية نقطة ضعف - ${weakest.surahName}`,
          type: "review",
        });
      }

      res.json({ surahName: null, reason: "لا توجد اقتراحات حالياً", type: null });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });


  // ==================== ATTENDANCE PATTERNS & DISCIPLINE SCORE ====================
  app.get("/api/attendance-patterns/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      if (!(await checkDataAccess(req.user!, req.params.studentId, res))) return;
      const attendance = await storage.getAttendanceByStudent(req.params.studentId);
      if (attendance.length === 0) return res.json({ disciplineScore: 100, patterns: [], totalDays: 0 });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentAtt = attendance.filter(a => new Date(a.date) > thirtyDaysAgo);

      const totalDays = recentAtt.length;
      const presentDays = recentAtt.filter(a => a.status === "present").length;
      const lateDays = recentAtt.filter(a => a.status === "late").length;
      const absentDays = recentAtt.filter(a => a.status === "absent").length;

      const disciplineScore = totalDays > 0
        ? Math.round(((presentDays + lateDays * 0.7) / totalDays) * 100)
        : 100;

      const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const absentByDay: Record<number, number> = {};
      const totalByDay: Record<number, number> = {};
      for (const a of recentAtt) {
        const day = new Date(a.date).getDay();
        totalByDay[day] = (totalByDay[day] || 0) + 1;
        if (a.status === "absent") absentByDay[day] = (absentByDay[day] || 0) + 1;
      }

      const patterns: string[] = [];
      for (const [day, count] of Object.entries(absentByDay)) {
        const total = totalByDay[Number(day)] || 1;
        if (count >= 2 && count / total >= 0.5) {
          patterns.push(`يتغيب كثيراً يوم ${dayNames[Number(day)]}`);
        }
      }

      res.json({
        disciplineScore,
        patterns,
        totalDays,
        presentDays,
        lateDays,
        absentDays,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });


  // ==================== COLLECTIVE WEAKNESS ====================
  app.get("/api/collective-weakness/:mosqueId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "supervisor" && currentUser.mosqueId !== req.params.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const assignments = await storage.getAssignmentsByMosque(req.params.mosqueId);
      const graded = assignments.filter(a => a.status === "done" && a.grade !== null && a.surahName);

      const surahStats: Record<string, { total: number; sumGrades: number; lowCount: number }> = {};

      for (const a of graded) {
        const name = a.surahName!;
        if (!surahStats[name]) surahStats[name] = { total: 0, sumGrades: 0, lowCount: 0 };
        surahStats[name].total++;
        surahStats[name].sumGrades += Number(a.grade);
        if (Number(a.grade) < 70) surahStats[name].lowCount++;
      }

      const weakSurahs = Object.entries(surahStats)
        .map(([name, stats]) => ({
          surahName: name,
          avgGrade: Math.round(stats.sumGrades / stats.total),
          totalAssignments: stats.total,
          lowGradeCount: stats.lowCount,
          lowPercentage: Math.round((stats.lowCount / stats.total) * 100),
        }))
        .filter(s => s.totalAssignments >= 3 && s.lowPercentage >= 30)
        .sort((a, b) => a.avgGrade - b.avgGrade)
        .slice(0, 10);

      res.json(weakSurahs);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });


  // ==================== TEACHER PERFORMANCE METRICS ====================
  app.get("/api/teacher-performance/:teacherId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const teacher = await storage.getUser(req.params.teacherId);
      if (!teacher || teacher.role !== "teacher") return res.status(404).json({ message: "المعلم غير موجود" });
      if (currentUser.role === "supervisor" && teacher.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const teacherAssignments = await storage.getAssignmentsByTeacher(req.params.teacherId);
      const students = await storage.getUsersByTeacher(req.params.teacherId);
      const activeStudents = students.filter(s => s.isActive);

      const graded = teacherAssignments.filter(a => a.status === "done" && a.grade !== null);
      const avgGrade = graded.length > 0 ? Math.round(graded.reduce((s, a) => s + Number(a.grade), 0) / graded.length) : 0;

      const gradingSpeeds: number[] = [];
      for (const a of graded) {
        if (a.scheduledDate) {
          const scheduled = new Date(a.scheduledDate).getTime();
          const created = new Date(a.createdAt).getTime();
          const days = Math.max(0, Math.ceil((created - scheduled) / (1000 * 60 * 60 * 24)));
          gradingSpeeds.push(days);
        }
      }
      const avgGradingDays = gradingSpeeds.length > 0 ? Math.round(gradingSpeeds.reduce((s, d) => s + d, 0) / gradingSpeeds.length) : 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentAssignments = teacherAssignments.filter(a => new Date(a.createdAt) > thirtyDaysAgo);
      const weeklyAssignmentRate = Math.round((recentAssignments.length / 4.3) * 10) / 10;

      const pendingCount = teacherAssignments.filter(a => a.status === "pending").length;

      res.json({
        teacherId: req.params.teacherId,
        teacherName: teacher.name,
        totalStudents: students.length,
        activeStudents: activeStudents.length,
        totalAssignments: teacherAssignments.length,
        gradedAssignments: graded.length,
        pendingAssignments: pendingCount,
        avgStudentGrade: avgGrade,
        avgGradingDays,
        weeklyAssignmentRate,
      });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/teacher-comparison", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      let teachers: User[] = [];
      if (currentUser.role === "admin") {
        teachers = await storage.getUsersByRole("teacher");
      } else if (currentUser.mosqueId) {
        teachers = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "teacher");
      }

      const comparison = await Promise.all(teachers.filter(t => t.isActive).map(async (teacher) => {
        const assignments = await storage.getAssignmentsByTeacher(teacher.id);
        const students = await storage.getUsersByTeacher(teacher.id);
        const graded = assignments.filter(a => a.status === "done" && a.grade !== null);
        const avgGrade = graded.length > 0 ? Math.round(graded.reduce((s, a) => s + Number(a.grade), 0) / graded.length) : 0;
        const pending = assignments.filter(a => a.status === "pending").length;

        return {
          id: teacher.id,
          name: teacher.name,
          studentsCount: students.length,
          assignmentsCount: assignments.length,
          avgGrade,
          pendingCount: pending,
          completionRate: assignments.length > 0 ? Math.round((graded.length / assignments.length) * 100) : 0,
        };
      }));

      comparison.sort((a, b) => b.avgGrade - a.avgGrade);
      res.json(comparison);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/teaching-recommendations/:teacherId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "teacher" && currentUser.id !== req.params.teacherId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const assignments = await storage.getAssignmentsByTeacher(req.params.teacherId);
      const graded = assignments.filter(a => a.status === "done" && a.grade !== null && a.surahName);

      const surahPerformance: Record<string, { total: number; sum: number; low: number }> = {};
      for (const a of graded) {
        const name = a.surahName!;
        if (!surahPerformance[name]) surahPerformance[name] = { total: 0, sum: 0, low: 0 };
        surahPerformance[name].total++;
        surahPerformance[name].sum += Number(a.grade);
        if (Number(a.grade) < 70) surahPerformance[name].low++;
      }

      const recommendations: any[] = [];
      for (const [surah, stats] of Object.entries(surahPerformance)) {
        const avg = Math.round(stats.sum / stats.total);
        if (stats.total >= 2 && avg < 75) {
          recommendations.push({
            type: "weak_surah",
            surahName: surah,
            avgGrade: avg,
            studentsAffected: stats.low,
            suggestion: `طلابك يحتاجون تركيز أكثر على سورة ${surah} (متوسط الدرجات: ${avg})`,
          });
        }
      }

      const students = await storage.getUsersByTeacher(req.params.teacherId);
      const pending = assignments.filter(a => a.status === "pending");
      if (pending.length > students.length * 2) {
        recommendations.push({
          type: "grading_backlog",
          count: pending.length,
          suggestion: `لديك ${pending.length} واجب بحاجة للتصحيح - حاول تصحيحها لتحفيز الطلاب`,
        });
      }

      const inactiveStudents = students.filter(s => {
        const studentAssignments = assignments.filter(a => a.studentId === s.id);
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 14);
        return !studentAssignments.some(a => new Date(a.createdAt) > lastWeek);
      });

      if (inactiveStudents.length > 0) {
        recommendations.push({
          type: "inactive_students",
          count: inactiveStudents.length,
          students: inactiveStudents.map(s => ({ id: s.id, name: s.name })),
          suggestion: `${inactiveStudents.length} طالب لم يحصلوا على واجبات منذ أسبوعين`,
        });
      }

      recommendations.sort((a, b) => {
        const order: Record<string, number> = { grading_backlog: 0, weak_surah: 1, inactive_students: 2 };
        return (order[a.type] || 3) - (order[b.type] || 3);
      });

      res.json(recommendations);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });


  // ==================== STUDENT TIMELINE & ACHIEVEMENTS ====================
  app.get("/api/student-timeline/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "student" && currentUser.id !== req.params.studentId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      if (!(await checkDataAccess(req.user!, req.params.studentId, res))) return;
      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });

      const assignments = await storage.getAssignmentsByStudent(req.params.studentId);
      const allPoints = await storage.getPointsByUser(req.params.studentId);
      const allBadges = await storage.getBadgesByUser(req.params.studentId);
      const attendance = await storage.getAttendanceByStudent(req.params.studentId);

      const timeline: any[] = [];

      const doneAssignments = assignments.filter(a => a.status === "done").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const surahs = new Set<string>();
      for (const a of doneAssignments) {
        if (a.surahName && !surahs.has(a.surahName)) {
          surahs.add(a.surahName);
          timeline.push({ type: "new_surah", date: a.createdAt, title: `بدء حفظ سورة ${a.surahName}`, icon: "book" });
        }
        if (a.grade !== null && Number(a.grade) >= 95) {
          timeline.push({ type: "excellent_grade", date: a.createdAt, title: `درجة ممتازة (${a.grade}) في ${a.surahName || "واجب"}`, icon: "star" });
        }
      }

      for (const b of allBadges) {
        timeline.push({ type: "badge", date: b.createdAt, title: `حصل على شارة: ${b.badgeName}`, icon: "award" });
      }

      const streakMilestones = [7, 14, 30, 60, 100];
      let streak = 0;
      const sortedAtt = attendance.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (const a of sortedAtt) {
        if (a.status === "present" || a.status === "late") {
          streak++;
          if (streakMilestones.includes(streak)) {
            timeline.push({ type: "streak", date: a.date, title: `سلسلة حضور ${streak} يوم`, icon: "flame" });
          }
        } else {
          streak = 0;
        }
      }

      const milestones = [{ count: 10, label: "10 سور" }, { count: 20, label: "20 سورة" }, { count: 50, label: "50 سورة" }, { count: 100, label: "100 سورة" }];
      let surahCount = 0;
      const surahsSeen = new Set<string>();
      for (const a of doneAssignments) {
        if (a.surahName && !surahsSeen.has(a.surahName)) {
          surahsSeen.add(a.surahName);
          surahCount++;
          const milestone = milestones.find(m => m.count === surahCount);
          if (milestone) {
            timeline.push({ type: "milestone", date: a.createdAt, title: `إنجاز: حفظ ${milestone.label}`, icon: "trophy" });
          }
        }
      }

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(timeline.slice(0, 50));
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/student-titles/:studentId", requireAuth, async (req, res) => {
    try {
      if (!(await checkDataAccess(req.user!, req.params.studentId, res))) return;
      if (!(await checkDataAccess(req.user!, req.params.studentId, res))) return;
      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });

      const assignments = await storage.getAssignmentsByStudent(req.params.studentId);
      const attendance = await storage.getAttendanceByStudent(req.params.studentId);
      const allPoints = await storage.getPointsByUser(req.params.studentId);
      const allBadges = await storage.getBadgesByUser(req.params.studentId);

      const titles: any[] = [];

      const graded = assignments.filter(a => a.status === "done" && a.grade !== null);
      const avgGrade = graded.length > 0 ? graded.reduce((s, a) => s + Number(a.grade), 0) / graded.length : 0;
      if (avgGrade >= 90 && graded.length >= 5) titles.push({ title: "الحافظ المتميز", icon: "crown", color: "gold" });
      if (avgGrade >= 80 && graded.length >= 10) titles.push({ title: "المجتهد", icon: "zap", color: "blue" });

      const recentAtt = attendance.filter(a => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return new Date(a.date) > d;
      });
      const presentRate = recentAtt.length > 0 ? recentAtt.filter(a => a.status === "present" || a.status === "late").length / recentAtt.length : 0;
      if (presentRate >= 0.95 && recentAtt.length >= 15) titles.push({ title: "بطل الحضور", icon: "flame", color: "orange" });

      const totalPoints = allPoints.reduce((s, p) => s + p.amount, 0);
      if (totalPoints >= 500) titles.push({ title: "جامع النقاط", icon: "coins", color: "emerald" });
      if (allBadges.length >= 3) titles.push({ title: "صاحب الشارات", icon: "award", color: "purple" });

      const surahs = new Set(graded.filter(a => a.surahName).map(a => a.surahName));
      if (surahs.size >= 30) titles.push({ title: "المثابر", icon: "mountain", color: "indigo" });

      res.json(titles);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/student-challenges", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "student") {
        return res.status(403).json({ message: "غير مصرح" });
      }

      // Generate or fetch weekly challenges
      // For now, return static challenges based on current date
      const now = new Date();
      const weekNumber = Math.floor(now.getDate() / 7);
      
      const challenges = [
        { id: "c1", title: "حافظ الأسبوع", description: "احفظ 10 آيات جديدة هذا الأسبوع", target: 10, current: 0, type: "memorization", reward: 50 },
        { id: "c2", title: "المواظب", description: "احضر 5 أيام متتالية", target: 5, current: 0, type: "attendance", reward: 30 },
        { id: "c3", title: "نجم التجويد", description: "احصل على درجة 95+ في تسميع واحد", target: 1, current: 0, type: "grade", reward: 40 }
      ];

      res.json(challenges);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

}
