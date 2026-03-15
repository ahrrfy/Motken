import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  graduates,
} from "@shared/schema";
import { logActivity, canTeacherAccessStudent, isStudentOrTeacherAsStudent } from "./shared";

export function registerGraduatesRoutes(app: Express) {
  // ==================== GRADUATES ====================
  app.get("/api/graduates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const enrichGraduates = async (grads: any[]) => {
        return Promise.all(grads.map(async (g) => {
          const student = await storage.getUser(g.studentId);
          const mosque = g.mosqueId ? await storage.getMosque(g.mosqueId) : null;
          return { ...g, studentName: student?.name || g.studentId, mosqueName: mosque?.name || "" };
        }));
      };
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const grads = await storage.getGraduatesByMosque(m.id);
          all.push(...grads);
        }
        return res.json(await enrichGraduates(all));
      }
      if (currentUser.mosqueId) {
        const grads = await storage.getGraduatesByMosque(currentUser.mosqueId);
        return res.json(await enrichGraduates(grads));
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/graduates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { studentId, graduationDate, totalJuz, ijazahChain, ijazahTeacher, recitationStyle, finalGrade, certificateId, notes } = req.body;
      if (!studentId || !graduationDate) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const student = await storage.getUser(studentId);
      if (!student || !isStudentOrTeacherAsStudent(student)) {
        return res.status(400).json({ message: "الطالب غير موجود" });
      }
      if (currentUser.role === "teacher" && !canTeacherAccessStudent(currentUser, student)) {
        return res.status(403).json({ message: "غير مصرح بتخريج طالب ليس في مستوياتك" });
      }
      if (currentUser.role === "supervisor" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتخريج طالب من جامع آخر" });
      }
      const totalJuzNum = Number(totalJuz) || 30;
      if (totalJuzNum < 1 || totalJuzNum > 30) {
        return res.status(400).json({ message: "عدد الأجزاء يجب أن يكون بين 1 و 30" });
      }
      const mosqueId = currentUser.role === "admin" ? (req.body.mosqueId || currentUser.mosqueId) : currentUser.mosqueId;
      const grad = await storage.createGraduate({
        studentId, mosqueId, graduationDate: new Date(graduationDate),
        totalJuz: totalJuz || 30, ijazahChain, ijazahTeacher, recitationStyle, finalGrade, certificateId, notes,
      });

      try {
        const certNumber = `MTQ-GRAD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const student = await storage.getUser(studentId);
        const cert = await storage.createCertificate({
          studentId,
          issuedBy: currentUser.id,
          mosqueId: mosqueId || null,
          graduateId: grad.id,
          certificateNumber: certNumber,
          certificateType: "graduation",
          templateId: req.body.templateId || "classic-gold",
          title: `شهادة إتمام حفظ القرآن الكريم`,
          graduationGrade: finalGrade || null,
        });
        await storage.updateGraduate(grad.id, { certificateId: cert.id });

        await storage.createNotification({
          userId: studentId,
          mosqueId: mosqueId || null,
          title: "تهانينا! شهادة تخرج جديدة",
          message: `تم إصدار شهادة تخرج لكم بمناسبة إتمام حفظ ${totalJuz || 30} جزءاً من القرآن الكريم`,
          type: "success",
          isRead: false,
        });
      } catch (certErr: any) {
        console.error("Failed to create graduation certificate:", certErr);
      }

      await logActivity(currentUser, "تسجيل تخرج طالب", "graduates");
      res.status(201).json(grad);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.patch("/api/graduates/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const grad = await storage.getGraduate(req.params.id);
      if (!grad) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && grad.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const allowedFields = ["graduationDate", "totalJuz", "ijazahChain", "ijazahTeacher", "recitationStyle", "finalGrade", "certificateId", "notes"];
      const updateData: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }
      const updated = await storage.updateGraduate(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في التحديث" });
    }
  });

  app.delete("/api/graduates/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const grad = await storage.getGraduate(req.params.id);
      if (!grad) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && grad.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteGraduate(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في الحذف" });
    }
  });

  app.get("/api/graduates/:id/followups", requireAuth, async (req, res) => {
    try {
      const followups = await storage.getGraduateFollowupsByGraduate(req.params.id);
      res.json(followups);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/graduates/:id/followups", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { followupDate, retentionLevel, juzReviewed, notes } = req.body;
      if (!followupDate || !retentionLevel) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const graduate = await storage.getGraduate(req.params.id);
      if (!graduate) return res.status(404).json({ message: "الخريج غير موجود" });
      const followup = await storage.createGraduateFollowup({
        graduateId: req.params.id, mosqueId: graduate.mosqueId,
        followupDate: new Date(followupDate), retentionLevel, juzReviewed, notes,
        contactedBy: currentUser.id,
      });
      res.status(201).json(followup);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });


  // ==================== STUDENT TRANSFERS ====================
  app.get("/api/student-transfers", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const transfers = await storage.getStudentTransfersByMosque(m.id);
          all.push(...transfers);
        }
        return res.json(all);
      }
      if (currentUser.mosqueId) {
        const transfers = await storage.getStudentTransfersByMosque(currentUser.mosqueId);
        return res.json(transfers);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/student-transfers", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { studentId, fromMosqueId, toMosqueId, reason, transferData } = req.body;
      if (!studentId || !toMosqueId) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const transfer = await storage.createStudentTransfer({
        studentId, fromMosqueId: fromMosqueId || currentUser.mosqueId,
        toMosqueId, reason, transferData, status: "pending",
      });
      await logActivity(currentUser, "طلب نقل طالب", "student_transfers");
      res.status(201).json(transfer);
    } catch (err: any) {
      console.error(err); res.status(500).json({ message: "حدث خطأ داخلي" });
    }
  });

  app.patch("/api/student-transfers/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const transfer = await storage.getStudentTransfer(req.params.id);
      if (!transfer) return res.status(404).json({ message: "طلب النقل غير موجود" });
      if (currentUser.role !== "admin" && transfer.fromMosqueId !== currentUser.mosqueId && transfer.toMosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const allowedFields = ["status", "reason", "transferData"];
      const updateData: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }
      if (req.body.status === "approved") {
        updateData.approvedBy = currentUser.id;
        const student = await storage.getUser(transfer.studentId);
        if (student) {
          await storage.updateUser(student.id, { mosqueId: transfer.toMosqueId });
        }
      }
      const updated = await storage.updateStudentTransfer(req.params.id, updateData);
      await logActivity(currentUser, `تحديث طلب نقل: ${req.body.status}`, "student_transfers");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في التحديث" });
    }
  });

}
