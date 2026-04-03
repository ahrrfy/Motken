import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  assignments,
  attendance,
  points,
  feedback,
  testimonials,
  users,
} from "@shared/schema";
import { logActivity } from "./shared";
import { sendError } from "../error-handler";
import { cleanDigits, normalizePhone, buildWhatsAppUrl, phoneMatchesSearch } from "@shared/phone-utils";

export function registerFamilyRoutes(app: Express) {
  // ==================== FAMILY LINKS ====================
  app.get("/api/family-links", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const parentPhone = req.query.parentPhone as string;
      if (parentPhone) {
        const links = await storage.getFamilyLinksByParentPhone(parentPhone);
        return res.json(links);
      }
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const links = await storage.getFamilyLinksByMosque(m.id);
          all.push(...links);
        }
        return res.json(all);
      }
      if (currentUser.mosqueId) {
        const links = await storage.getFamilyLinksByMosque(currentUser.mosqueId);
        return res.json(links);
      }
      res.json([]);
    } catch (err: any) {
      sendError(res, err, "جلب روابط الأسر");
    }
  });

  app.post("/api/family-links", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { parentPhone, studentId, relationship } = req.body;
      if (!parentPhone || !studentId) {
        return res.status(400).json({ message: "رقم ولي الأمر ومعرف الطالب مطلوبان" });
      }
      if (currentUser.role !== "admin") {
        const student = await storage.getUser(studentId);
        if (!student || student.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "الطالب لا ينتمي لمسجدك" });
        }
      }
      const mosqueId = currentUser.role === "admin" ? (req.body.mosqueId || currentUser.mosqueId) : currentUser.mosqueId;
      const link = await storage.createFamilyLink({
        parentPhone, studentId, mosqueId, relationship: relationship || "parent",
      });
      res.status(201).json(link);
    } catch (err: any) {
      sendError(res, err, "إنشاء رابط أسري");
    }
  });

  app.delete("/api/family-links/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const link = await storage.getFamilyLink(req.params.id);
      if (!link) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && link.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteFamilyLink(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      sendError(res, err, "حذف رابط أسري");
    }
  });

  app.get("/api/family-dashboard/:phone", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const phone = req.params.phone;
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        const requestedPhone = cleanDigits(phone);
        const myStudents = await storage.getUsersByTeacher(currentUser.id);
        const hasAccess = myStudents.some(s => cleanDigits(s.parentPhone || "") === requestedPhone);
        if (!hasAccess) {
          return res.status(403).json({ message: "غير مصرح بالوصول لهذا الرقم" });
        }
      }
      const links = await storage.getFamilyLinksByParentPhone(phone);
      if (links.length === 0) {
        return res.json({ children: [] });
      }
      const filteredLinks = [];
      for (const link of links) {
        const student = await storage.getUser(link.studentId);
        if (!student) continue;
        if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId) continue;
        filteredLinks.push({ link, student });
      }
      const children = await Promise.all(filteredLinks.map(async ({ link, student }) => {
        const [studentAssignments, studentAttendance, studentPoints] = await Promise.all([
          storage.getAssignmentsByStudent(student.id),
          storage.getAttendanceByStudent(student.id),
          storage.getPointsByUser(student.id),
        ]);
        const totalAssignments = studentAssignments.length;
        const completedAssignments = studentAssignments.filter(a => a.status === "done").length;
        const avgGrade = studentAssignments.filter(a => a.grade != null).reduce((sum, a) => sum + (a.grade || 0), 0) / (studentAssignments.filter(a => a.grade != null).length || 1);
        const presentCount = studentAttendance.filter(a => a.status === "present").length;
        const totalPoints = studentPoints.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        return {
          id: student.id, studentName: student.name, name: student.name, level: student.level,
          relationship: link.relationship,
          attendance: presentCount, points: totalPoints, assignments: completedAssignments,
          stats: { totalAssignments, completedAssignments, avgGrade: Math.round(avgGrade) },
        };
      }));
      res.json({ children });
    } catch (err: any) {
      sendError(res, err, "جلب لوحة الأسر");
    }
  });


  // ==================== PARENT ACCOUNT ====================

  // Smart phone search — find students by parent phone
  app.get("/api/family/students-by-parent-phone/:phone", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const phone = req.params.phone;
      const cleanPhone = cleanDigits(phone);
      if (cleanPhone.length < 7) {
        return res.json([]);
      }

      // Search students by parentPhone field
      let allStudents;
      if (currentUser.role === "admin") {
        allStudents = await storage.getUsersByRole("student");
      } else {
        allStudents = currentUser.mosqueId
          ? await storage.getUsersByMosque(currentUser.mosqueId)
          : [];
        allStudents = allStudents.filter(u => u.role === "student");
      }

      const matched = allStudents.filter(s => {
        const sp = cleanDigits(s.parentPhone || "");
        return sp && sp.includes(cleanPhone);
      }).map(s => ({
        id: s.id,
        name: s.name,
        gender: s.gender,
        level: s.level,
        parentPhone: s.parentPhone,
      }));

      res.json(matched);
    } catch (err: any) {
      sendError(res, err, "بحث طلاب برقم ولي الأمر");
    }
  });

  // Create parent account — supervisor/admin only
  app.post("/api/family/create-parent-account", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }

      const { phone, name, username, password, gender, studentIds } = req.body;

      if (!phone || !name || !username || !password) {
        return res.status(400).json({
          message: "جميع الحقول مطلوبة: الاسم، اسم المستخدم، كلمة المرور، رقم الهاتف",
        });
      }

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({
          message: "يجب اختيار طالب واحد على الأقل لربطه بولي الأمر",
        });
      }

      // Validate username uniqueness
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "اسم المستخدم مُستخدم مسبقاً" });
      }

      // Validate students exist and belong to supervisor's mosque
      for (const sid of studentIds) {
        const student = await storage.getUser(sid);
        if (!student) {
          return res.status(400).json({ message: `الطالب غير موجود: ${sid}` });
        }
        if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: `الطالب ${student.name} لا ينتمي لمسجدك` });
        }
      }

      const { hashPassword } = await import("../auth");
      const hashedPassword = await hashPassword(password);

      // Get mosque from first student
      const firstStudent = await storage.getUser(studentIds[0]);

      const parent = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        phone,
        role: "parent",
        gender: gender || null,
        mosqueId: firstStudent?.mosqueId || currentUser.mosqueId || null,
        isActive: true,
        acceptedPrivacyPolicy: true,
      });

      // Create family links for each student
      for (const sid of studentIds) {
        try {
          await storage.createFamilyLink({
            parentPhone: phone,
            studentId: sid,
            mosqueId: firstStudent?.mosqueId || currentUser.mosqueId || null,
            relationship: "parent",
          });
        } catch {}
      }

      await logActivity(currentUser, `إنشاء حساب ولي أمر: ${name} — ${studentIds.length} طالب`, "users");

      res.status(201).json({
        message: "تم إنشاء حساب ولي الأمر بنجاح",
        parentId: parent.id,
        linkedStudents: studentIds.length,
      });
    } catch (err: any) {
      sendError(res, err, "إنشاء حساب ولي أمر");
    }
  });

  // Get parent's linked children with FULL stats
  app.get("/api/family/children", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "parent") {
        return res.status(403).json({ message: "هذا الطلب متاح لأولياء الأمور فقط" });
      }

      const familyLinks = await storage.getFamilyLinksByParentPhone(currentUser.phone || "");
      const children = [];

      for (const link of familyLinks) {
        const student = await storage.getUser(link.studentId);
        if (!student) continue;

        const [studentAssignments, studentAttendance, studentPoints, studentBadges, studentQuranProgress] = await Promise.all([
          storage.getAssignmentsByStudent(link.studentId),
          storage.getAttendanceByStudent(link.studentId),
          storage.getPointsByUser(link.studentId),
          storage.getBadgesByUser(link.studentId),
          storage.getQuranProgressByUser(link.studentId),
        ]);

        const totalAssignments = studentAssignments.length;
        const completedAssignments = studentAssignments.filter(a => a.status === "done").length;
        const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

        const totalAttendance = studentAttendance.length;
        const presentCount = studentAttendance.filter(a => a.status === "present").length;
        const absentCount = studentAttendance.filter(a => a.status === "absent").length;
        const lateCount = studentAttendance.filter(a => a.status === "late").length;
        const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

        const totalPoints = studentPoints.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        const recentAssignments = studentAssignments
          .sort((a: any, b: any) => new Date(b.scheduledDate || b.createdAt).getTime() - new Date(a.scheduledDate || a.createdAt).getTime())
          .slice(0, 20)
          .map((a: any) => ({
            id: a.id,
            surahName: a.surahName,
            fromVerse: a.fromVerse,
            toVerse: a.toVerse,
            status: a.status,
            grade: a.grade,
            scheduledDate: a.scheduledDate || a.createdAt,
          }));

        const recentAttendance = studentAttendance
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 30)
          .map((a: any) => ({
            id: a.id,
            date: a.date,
            status: a.status,
            notes: a.notes,
          }));

        const quranProgress = studentQuranProgress.map((p: any) => ({
          surahNumber: p.surahNumber,
          verseStatuses: p.verseStatuses,
          reviewStreak: p.reviewStreak,
          lastReviewDate: p.lastReviewDate,
          nextReviewDate: p.nextReviewDate,
        }));

        const badges = studentBadges.map((b: any) => ({
          id: b.id,
          badgeType: b.badgeType,
          badgeName: b.badgeName,
          earnedAt: b.earnedAt,
        }));

        children.push({
          id: student.id,
          name: student.name,
          avatar: student.avatar,
          gender: student.gender,
          level: student.level || 1,
          studyMode: student.studyMode || "in-person",
          isActive: student.isActive,
          relationship: link.relationship,
          stats: {
            totalAssignments,
            completedAssignments,
            completionRate,
            totalAttendance,
            presentCount,
            absentCount,
            lateCount,
            attendanceRate,
            totalPoints,
          },
          recentAssignments,
          recentAttendance,
          quranProgress,
          badges,
        });
      }

      res.json(children);
    } catch (err: any) {
      sendError(res, err, "جلب بيانات الأبناء");
    }
  });

  // Parent testimonial / rating
  app.post("/api/family/testimonial", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "parent") {
        return res.status(403).json({ message: "هذا الطلب متاح لأولياء الأمور فقط" });
      }

      const { rating, text } = req.body;
      if (!text || !rating) {
        return res.status(400).json({ message: "التقييم والتعليق مطلوبان" });
      }

      const [created] = await db.insert(testimonials).values({
        name: currentUser.name,
        role: "ولي أمر",
        text,
        rating: Math.min(Math.max(Number(rating) || 5, 1), 5),
        isActive: false, // Requires admin approval
        sortOrder: 0,
      }).returning();

      res.status(201).json({ message: "شكراً لتقييمك! سيظهر بعد موافقة الإدارة.", testimonial: created });
    } catch (err: any) {
      sendError(res, err, "إرسال تقييم ولي الأمر");
    }
  });

  // Check if parent already submitted a testimonial
  app.get("/api/family/testimonial", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "parent") {
        return res.status(403).json({ message: "هذا الطلب متاح لأولياء الأمور فقط" });
      }

      const all = await db.select().from(testimonials).where(eq(testimonials.name, currentUser.name));
      const myTestimonial = all.find(t => t.role === "ولي أمر");
      res.json({ submitted: !!myTestimonial, testimonial: myTestimonial || null });
    } catch (err: any) {
      sendError(res, err, "جلب تقييم ولي الأمر");
    }
  });

  // ==================== FEEDBACK & SUGGESTIONS ====================
  app.get("/api/feedback", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "admin") {
        const all = await storage.getAllFeedback();
        return res.json(all);
      }
      if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        const fb = await storage.getFeedbackByMosque(currentUser.mosqueId);
        return res.json(fb);
      }
      const fb = await storage.getFeedbackByUser(currentUser.id);
      res.json(fb);
    } catch (err: any) {
      sendError(res, err, "جلب الملاحظات");
    }
  });

  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { type, title, description, priority, isAnonymous } = req.body;
      if (!title || !description) {
        return res.status(400).json({ message: "العنوان والوصف مطلوبان" });
      }
      const fb = await storage.createFeedback({
        userId: isAnonymous ? null : currentUser.id,
        mosqueId: currentUser.mosqueId,
        type: type || "suggestion", title, description,
        priority: priority || "medium", status: "open",
        isAnonymous: isAnonymous || false,
      });
      await logActivity(currentUser, `إرسال ملاحظة: ${title}`, "feedback");
      res.status(201).json(fb);
    } catch (err: any) {
      sendError(res, err, "إرسال ملاحظة");
    }
  });

  app.patch("/api/feedback/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const fb = await storage.getFeedback(req.params.id);
      if (!fb) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && fb.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const allowedFields = ["status", "response", "priority"];
      const updateData: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }
      if (req.body.response) {
        updateData.respondedBy = currentUser.id;
      }
      const updated = await storage.updateFeedback(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      sendError(res, err, "تحديث ملاحظة");
    }
  });

  app.delete("/api/feedback/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      await storage.deleteFeedback(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      sendError(res, err, "حذف ملاحظة");
    }
  });

}
