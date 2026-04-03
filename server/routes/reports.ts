import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  assignments,
  attendance,
  type User,
  type Assignment,
} from "@shared/schema";
import { logActivity } from "./shared";
import { sendError } from "../error-handler";
import { buildWhatsAppUrl } from "@shared/phone-utils";
import crypto from "crypto";

export function registerReportsRoutes(app: Express) {
  // ==================== PARENT REPORTS ====================
  app.get("/api/parent-reports", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بعرض التقارير" });
      }
      const studentId = req.query.studentId as string;
      if (!studentId) {
        return res.status(400).json({ message: "معرف الطالب مطلوب" });
      }
      const reports = await storage.getParentReportsByStudent(studentId);
      res.json(reports);
    } catch (err: any) {
      sendError(res, err, "جلب التقارير");
    }
  });

  app.post("/api/parent-reports", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء تقرير" });
      }
      const { studentId, reportType, content, expiresAt } = req.body;
      if (!studentId || !content) {
        return res.status(400).json({ message: "معرف الطالب والمحتوى مطلوبان" });
      }
      const student = await storage.getUser(studentId);
      if (!student) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }
      const accessToken = crypto.randomBytes(32).toString("hex");
      const mosqueId = currentUser.mosqueId || student.mosqueId;
      const report = await storage.createParentReport({
        studentId,
        mosqueId: mosqueId || undefined,
        reportType: reportType || "weekly",
        content,
        accessToken,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });
      await logActivity(currentUser, "إنشاء تقرير ولي أمر", "parent_reports");
      res.status(201).json(report);
    } catch (err: any) {
      sendError(res, err, "إنشاء تقرير ولي أمر");
    }
  });

  app.delete("/api/parent-reports/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بحذف التقرير" });
      }
      const report = await storage.getParentReport(req.params.id);
      if (!report) return res.status(404).json({ message: "التقرير غير موجود" });
      if (currentUser.role !== "admin" && report.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا التقرير" });
      }
      await storage.deleteParentReport(req.params.id);
      await logActivity(currentUser, "حذف تقرير ولي أمر", "parent_reports");
      res.json({ message: "تم حذف التقرير" });
    } catch (err: any) {
      sendError(res, err, "حذف التقرير");
    }
  });

  app.get("/api/parent-report/:token", async (req, res) => {
    try {
      const report = await storage.getParentReportByToken(req.params.token);
      if (!report) return res.status(404).json({ message: "التقرير غير موجود" });
      if (report.expiresAt && new Date(report.expiresAt) < new Date()) {
        return res.status(410).json({ message: "انتهت صلاحية التقرير" });
      }
      const student = await storage.getUser(report.studentId);
      const mosque = report.mosqueId ? await storage.getMosque(report.mosqueId) : null;
      res.json({
        ...report,
        studentName: student?.name || "",
        mosqueName: mosque?.name || "",
      });
    } catch (err: any) {
      sendError(res, err, "جلب التقرير بالرمز");
    }
  });

  // تقرير أسبوعي لولي الأمر
  app.get("/api/weekly-report/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
      if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId)
        return res.status(403).json({ message: "غير مصرح" });

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [attendanceAll, assignmentsAll] = await Promise.all([
        db.select().from(attendance).where(eq(attendance.studentId, student.id)),
        db.select().from(assignments).where(eq(assignments.studentId, student.id)),
      ]);
      const weekAtt = attendanceAll.filter(a => new Date(a.date) >= weekAgo);
      const present = weekAtt.filter(a => ["present","حاضر"].includes(a.status)).length;
      const absent  = weekAtt.filter(a => ["absent","غائب"].includes(a.status)).length;
      const weekAsgn = assignmentsAll.filter(a => new Date(a.createdAt) >= weekAgo);
      const done    = weekAsgn.filter(a => a.status === "done").length;
      const pending = weekAsgn.filter(a => a.status === "pending").length;

      const whatsappText = [
        `*التقرير الأسبوعي - ${student.name}*`,
        `الحضور: ${present}/${weekAtt.length}`,
        `الواجبات: ${done}/${weekAsgn.length} مكتملة`,
        absent > 0 ? `غياب: ${absent} يوم` : `لا غياب هذا الأسبوع`,
      ].join("\n");

      res.json({
        student: { id: student.id, name: student.name, parentPhone: student.parentPhone },
        stats: { present, absent, done, pending, weekPoints: 0 },
        whatsappText,
        whatsappUrl: student.parentPhone
          ? buildWhatsAppUrl(student.parentPhone, whatsappText)
          : null,
      });
    } catch (err: any) {
      sendError(res, err, "جلب التقرير الأسبوعي");
    }
  });


  // ==================== EXPORT ====================
  app.get("/api/export/students", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتصدير البيانات" });
      }
      let students: User[] = [];
      if (currentUser.role === "admin") {
        const mosqueId = req.query.mosqueId as string | undefined;
        if (mosqueId) {
          students = (await storage.getUsersByMosqueAndRole(mosqueId, "student")).filter(s => !s.pendingApproval);
        } else {
          students = (await storage.getUsersByRole("student")).filter(s => !s.pendingApproval);
        }
      } else if (currentUser.mosqueId) {
        students = (await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student")).filter(s => !s.pendingApproval);
      }
      const exported = students.map(({ password, ...s }) => s);
      res.json(exported);
    } catch (err: any) {
      sendError(res, err, "تصدير بيانات الطلاب");
    }
  });

  app.get("/api/export/attendance", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتصدير البيانات" });
      }
      let records: any[] = [];
      if (currentUser.role === "admin") {
        const mosqueId = req.query.mosqueId as string | undefined;
        if (mosqueId) {
          records = await storage.getAttendanceByMosque(mosqueId);
        } else {
          const allMosques = await storage.getMosques();
          for (const m of allMosques) {
            const mr = await storage.getAttendanceByMosque(m.id);
            records.push(...mr);
          }
        }
      } else if (currentUser.role === "teacher") {
        records = await storage.getAttendanceByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        records = await storage.getAttendanceByMosque(currentUser.mosqueId);
      }
      res.json(records);
    } catch (err: any) {
      sendError(res, err, "تصدير بيانات الحضور");
    }
  });

  app.get("/api/export/assignments", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتصدير البيانات" });
      }
      let result: Assignment[] = [];
      if (currentUser.role === "admin") {
        const mosqueId = req.query.mosqueId as string | undefined;
        if (mosqueId) {
          result = await storage.getAssignmentsByMosque(mosqueId);
        } else {
          result = await storage.getAssignments();
        }
      } else if (currentUser.role === "teacher") {
        result = await storage.getAssignmentsByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        result = await storage.getAssignmentsByMosque(currentUser.mosqueId);
      }
      res.json(result);
    } catch (err: any) {
      sendError(res, err, "تصدير بيانات الواجبات");
    }
  });

}
