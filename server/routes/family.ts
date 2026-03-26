import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  assignments,
  attendance,
  points,
  feedback,
} from "@shared/schema";
import { logActivity } from "./shared";
import { sendError } from "../error-handler";

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
        const cleanDigits = (s: string) => (s || "").replace(/[^\d]/g, "");
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

  // Parent self-registration
  app.post("/api/auth/register-parent", async (req, res) => {
    try {
      const { phone, name, password, username } = req.body;

      if (!phone || !name || !password || !username) {
        return res.status(400).json({
          message: "جميع الحقول مطلوبة: الاسم، اسم المستخدم، كلمة المرور، رقم الهاتف",
          source: "validation"
        });
      }

      // Check if phone is linked to any student
      const familyLinks = await storage.getFamilyLinksByParentPhone(phone);
      if (familyLinks.length === 0) {
        return res.status(400).json({
          message: "رقم الهاتف غير مرتبط بأي طالب. يجب أن يقوم المعلم بربط رقمك أولاً.",
          field: "phone",
          source: "validation"
        });
      }

      // Check username uniqueness
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          message: "اسم المستخدم مُستخدم مسبقاً",
          field: "username",
          source: "database"
        });
      }

      const { hashPassword } = await import("../auth");
      const hashedPassword = await hashPassword(password);

      // Get the mosque from the first linked student
      const firstStudent = await storage.getUser(familyLinks[0].studentId);

      const parent = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        phone,
        role: "parent",
        mosqueId: firstStudent?.mosqueId || null,
        gender: null,
        isActive: true,
        acceptedPrivacyPolicy: true,
      });

      res.status(201).json({
        message: "تم إنشاء حساب ولي الأمر بنجاح",
        linkedStudents: familyLinks.length,
      });
    } catch (err: any) {
      sendError(res, err, "تسجيل ولي أمر");
    }
  });

  // Get parent's linked children with stats
  app.get("/api/parent/children", requireAuth, async (req, res) => {
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

        const studentAssignments = await storage.getAssignmentsByStudent(link.studentId);
        const totalAssignments = studentAssignments.length;
        const doneAssignments = studentAssignments.filter(a => a.status === "done").length;

        children.push({
          id: student.id,
          name: student.name,
          avatar: student.avatar,
          gender: student.gender,
          relationship: link.relationship,
          mosqueId: student.mosqueId,
          stats: {
            totalAssignments,
            doneAssignments,
            completionRate: totalAssignments > 0 ? Math.round((doneAssignments / totalAssignments) * 100) : 0,
          }
        });
      }

      res.json(children);
    } catch (err: any) {
      sendError(res, err, "جلب بيانات الأبناء");
    }
  });

  // Get specific child's assignments (parent view)
  app.get("/api/parent/child/:childId/assignments", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "parent") {
        return res.status(403).json({ message: "هذا الطلب متاح لأولياء الأمور فقط" });
      }

      // Verify parent is linked to this child
      const links = await storage.getFamilyLinksByParentPhone(currentUser.phone || "");
      const isLinked = links.some(l => l.studentId === req.params.childId);
      if (!isLinked) {
        return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الطالب" });
      }

      const studentAssignments = await storage.getAssignmentsByStudent(req.params.childId);
      // Return last 20 assignments
      res.json(studentAssignments.slice(0, 20));
    } catch (err: any) {
      sendError(res, err, "جلب واجبات الابن");
    }
  });

  // Get specific child's attendance (parent view)
  app.get("/api/parent/child/:childId/attendance", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "parent") {
        return res.status(403).json({ message: "هذا الطلب متاح لأولياء الأمور فقط" });
      }

      const links = await storage.getFamilyLinksByParentPhone(currentUser.phone || "");
      const isLinked = links.some(l => l.studentId === req.params.childId);
      if (!isLinked) {
        return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الطالب" });
      }

      const studentAttendance = await storage.getAttendanceByStudent(req.params.childId);
      res.json(studentAttendance.slice(0, 30)); // Last 30 records
    } catch (err: any) {
      sendError(res, err, "جلب حضور الابن");
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
