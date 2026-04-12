import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  attendance,
} from "@shared/schema";
import { logActivity, canTeacherAccessStudent } from "./shared";
import { sendError } from "../error-handler";
import { ensureSameMosque } from "../lib/mosque-guard";

  const enrichWithStudentNames = async (records: any[]) => {
    const studentIds = [...new Set(records.map(r => r.studentId))];
    const nameMap = new Map<string, string>();
    await Promise.all(studentIds.map(async (id) => {
      const student = await storage.getUser(id);
      if (student) nameMap.set(id, student.name);
    }));
    return records.map(r => ({ ...r, studentName: nameMap.get(r.studentId) || r.studentId }));
  };

export function registerAttendanceRoutes(app: Express) {
  // ==================== ATTENDANCE ====================
  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { studentId, teacherId, mosqueId, date } = req.query;

      if (date && teacherId) {
        if (currentUser.role !== "admin") {
          const teacher = await storage.getUser(teacherId as string);
          if (!teacher || teacher.mosqueId !== currentUser.mosqueId) {
            return res.status(403).json({ message: "غير مصرح بالوصول" });
          }
        }
        const records = await storage.getAttendanceByDate(new Date(date as string), teacherId as string);
        return res.json(await enrichWithStudentNames(records));
      }
      if (studentId) {
        if (currentUser.role === "student" && studentId !== currentUser.id) {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
        if (currentUser.role !== "admin") {
          const student = await storage.getUser(studentId as string);
          if (!student || student.mosqueId !== currentUser.mosqueId) {
            return res.status(403).json({ message: "غير مصرح بالوصول" });
          }
          if (currentUser.role === "teacher" && !canTeacherAccessStudent(currentUser, student)) {
            return res.status(403).json({ message: "غير مصرح بالوصول" });
          }
        }
        const records = await storage.getAttendanceByStudent(studentId as string);
        return res.json(await enrichWithStudentNames(records));
      }
      if (teacherId) {
        if (currentUser.role === "student") {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
        if (currentUser.role !== "admin") {
          const teacher = await storage.getUser(teacherId as string);
          if (!teacher || teacher.mosqueId !== currentUser.mosqueId) {
            return res.status(403).json({ message: "غير مصرح بالوصول" });
          }
        }
        const records = await storage.getAttendanceByTeacher(teacherId as string);
        return res.json(await enrichWithStudentNames(records));
      }
      if (mosqueId) {
        if (currentUser.role === "student") {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
        if (currentUser.role !== "admin" && mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لحضور مسجد آخر" });
        }
        const records = await storage.getAttendanceByMosque(mosqueId as string);
        return res.json(await enrichWithStudentNames(records));
      }
      if (currentUser.role === "student") {
        const records = await storage.getAttendanceByStudent(currentUser.id);
        return res.json(await enrichWithStudentNames(records));
      }
      if (currentUser.role === "teacher") {
        const records = await storage.getAttendanceByTeacher(currentUser.id);
        return res.json(await enrichWithStudentNames(records));
      }
      if (currentUser.mosqueId) {
        const records = await storage.getAttendanceByMosque(currentUser.mosqueId);
        return res.json(await enrichWithStudentNames(records));
      }
      res.json([]);
    } catch (err: unknown) {
      sendError(res, err, "جلب سجلات الحضور");
    }
  });

  app.post("/api/attendance", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتسجيل الحضور" });
      }
      const { studentId, date, status, notes } = req.body;
      if (!studentId || !date || !status) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      await ensureSameMosque(currentUser, studentId);
      const record = await storage.createAttendance({
        studentId,
        teacherId: currentUser.id,
        mosqueId: currentUser.mosqueId,
        date: new Date(date),
        status,
        notes,
      });
      await logActivity(currentUser, "تسجيل حضور", "attendance");
      res.status(201).json(record);
    } catch (err: unknown) {
      sendError(res, err, "تسجيل الحضور");
    }
  });

  app.patch("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتعديل الحضور" });
      }
      const { status, notes } = req.body;
      const updateData: Record<string, unknown> = {};
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      const updated = await storage.updateAttendance(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "سجل الحضور غير موجود" });
      await logActivity(currentUser, "تعديل حضور", "attendance");
      res.json(updated);
    } catch (err: unknown) {
      sendError(res, err, "تعديل الحضور");
    }
  });

  app.delete("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بحذف الحضور" });
      }
      const record = await storage.getAttendance(req.params.id);
      if (!record) return res.status(404).json({ message: "سجل الحضور غير موجود" });
      if (currentUser.role !== "admin" && record.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteAttendance(req.params.id);
      await logActivity(currentUser, "حذف سجل حضور", "attendance");
      res.json({ message: "تم حذف سجل الحضور" });
    } catch (err: unknown) {
      sendError(res, err, "حذف الحضور");
    }
  });

  app.post("/api/attendance/bulk", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتسجيل الحضور" });
      }
      const { date, students } = req.body;
      if (!date || !students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ message: "التاريخ وقائمة الطلاب مطلوبة" });
      }
      if (students.length > 200) {
        return res.status(400).json({ message: "لا يمكن تسجيل أكثر من 200 طالب في وقت واحد" });
      }
      const created = [];
      for (const s of students) {
        if (!s.studentId || !s.status) continue;
        const student = await storage.getUser(s.studentId);
        if (!student || (currentUser.mosqueId && student.mosqueId !== currentUser.mosqueId)) continue;
        const record = await storage.createAttendance({
          studentId: s.studentId,
          teacherId: currentUser.id,
          mosqueId: currentUser.mosqueId,
          date: new Date(date),
          status: s.status,
          notes: typeof s.notes === "string" ? s.notes.slice(0, 500) : undefined,
        });
        created.push(record);
      }
      const presentStudents = created.filter(r => r.status === "present" || r.status === "late");
      for (const record of presentStudents) {
        try {
          await storage.createPoint({
            userId: record.studentId,
            mosqueId: currentUser.mosqueId,
            amount: 5,
            category: "attendance",
            reason: "نقاط حضور تلقائية",
          });
          const allAttendance = await storage.getAttendanceByStudent(record.studentId);
          const sorted = allAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          let streak = 0;
          for (const a of sorted) {
            if (a.status === "present" || a.status === "late") streak++;
            else break;
          }
          if (streak === 7 || streak === 14 || streak === 30) {
            await storage.createPoint({
              userId: record.studentId,
              mosqueId: currentUser.mosqueId,
              amount: streak === 7 ? 25 : streak === 14 ? 50 : 100,
              category: "attendance",
              reason: `مكافأة سلسلة حضور ${streak} يوم متتالي`,
            });
          }
        } catch {}
      }
      await logActivity(currentUser, `تسجيل حضور جماعي: ${created.length} طالب`, "attendance");
      res.status(201).json(created);
    } catch (err: unknown) {
      sendError(res, err, "تسجيل الحضور الجماعي");
    }
  });

  // ==================== BULK IMPORT FROM EXCEL ====================
  // POST /api/attendance/bulk-import
  // Accepts { rows: [{اسم الطالب, التاريخ, الحالة, ملاحظات}] }
  app.post("/api/attendance/bulk-import", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "لا توجد بيانات للاستيراد" });
      }
      const STATUS_MAP: Record<string, string> = {
        "حاضر": "present", "غائب": "absent", "متأخر": "late", "معذور": "excused",
        "present": "present", "absent": "absent", "late": "late", "excused": "excused",
      };
      let success = 0, failed = 0;
      for (const row of rows) {
        try {
          const nameQuery = (row["اسم الطالب"] || row["الاسم"] || "").trim();
          const dateStr = (row["التاريخ"] || "").trim();
          if (!nameQuery || !dateStr) { failed++; continue; }
          const { pool } = await import("../db");
          const sr = await pool.query(
            `SELECT id FROM users WHERE mosque_id = $1 AND role = 'student' AND (LOWER(name) = LOWER($2) OR LOWER(username) = LOWER($2)) LIMIT 1`,
            [currentUser.mosqueId, nameQuery]
          );
          if (sr.rows.length === 0) { failed++; continue; }
          const student = { id: sr.rows[0].id };
          if (!student) { failed++; continue; }
          const status = STATUS_MAP[row["الحالة"]?.trim()] || "present";
          await storage.createAttendance({
            studentId: student.id,
            teacherId: currentUser.id,
            mosqueId: currentUser.mosqueId,
            date: new Date(dateStr),
            status,
            notes: row["ملاحظات"]?.trim() || undefined,
          });
          success++;
        } catch { failed++; }
      }
      res.json({ success, failed, total: rows.length });
    } catch (err: unknown) { sendError(res, err, "استيراد الحضور"); }
  });

}
