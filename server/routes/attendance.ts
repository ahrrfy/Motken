import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  attendance,
} from "@shared/schema";
import { logActivity, canTeacherAccessStudent } from "./shared";

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
        return res.json(records);
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
        return res.json(records);
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
        return res.json(records);
      }
      if (mosqueId) {
        if (currentUser.role === "student") {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
        if (currentUser.role !== "admin" && mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لحضور مسجد آخر" });
        }
        const records = await storage.getAttendanceByMosque(mosqueId as string);
        return res.json(records);
      }
      if (currentUser.role === "student") {
        const records = await storage.getAttendanceByStudent(currentUser.id);
        return res.json(records);
      }
      if (currentUser.role === "teacher") {
        const records = await storage.getAttendanceByTeacher(currentUser.id);
        return res.json(records);
      }
      if (currentUser.mosqueId) {
        const records = await storage.getAttendanceByMosque(currentUser.mosqueId);
        return res.json(records);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
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
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تسجيل الحضور" });
    }
  });

  app.patch("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتعديل الحضور" });
      }
      const { status, notes } = req.body;
      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      const updated = await storage.updateAttendance(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "سجل الحضور غير موجود" });
      await logActivity(currentUser, "تعديل حضور", "attendance");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تعديل الحضور" });
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
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف الحضور" });
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
        if (currentUser.role !== "admin") {
          const student = await storage.getUser(s.studentId);
          if (!student || student.mosqueId !== currentUser.mosqueId) continue;
        }
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
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تسجيل الحضور الجماعي" });
    }
  });

}
