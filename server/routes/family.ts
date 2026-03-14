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
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
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
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
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
      res.status(500).json({ message: "حدث خطأ في الحذف" });
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
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
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
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
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
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
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
      res.status(500).json({ message: "حدث خطأ في التحديث" });
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
      res.status(500).json({ message: "حدث خطأ في الحذف" });
    }
  });

}
