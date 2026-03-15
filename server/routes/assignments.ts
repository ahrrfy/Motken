import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import { eq, and, min, max, sql as dsql } from "drizzle-orm";
import {
  assignments,
  assignmentAudio,
  type Assignment,
} from "@shared/schema";
import { filterTextFields } from "@shared/content-filter";
import { validateFields, validateEnum, validateDate } from "@shared/security-utils";
import { logActivity, canTeacherAccessStudent, getTeacherLevelsArray } from "./shared";
import multer from "multer";

export function registerAssignmentsRoutes(app: Express) {
  // ==================== ASSIGNMENTS ====================
  app.get("/api/assignments", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { studentId, teacherId } = req.query;
      let result: Assignment[] = [];

      if (currentUser.role === "admin") {
        if (studentId) {
          result = await storage.getAssignmentsByStudent(studentId as string);
        } else if (teacherId) {
          result = await storage.getAssignmentsByTeacher(teacherId as string);
        } else {
          result = await storage.getAssignments();
        }
      } else if (currentUser.role === "student") {
        result = await storage.getAssignmentsByStudent(currentUser.id);
      } else if (currentUser.role === "teacher") {
        if (studentId) {
          const student = await storage.getUser(studentId as string);
          if (student && canTeacherAccessStudent(currentUser, student)) {
            result = await storage.getAssignmentsByStudent(studentId as string);
          } else {
            return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الطالب" });
          }
        } else if (currentUser.mosqueId) {
          const mosqueAssignments = await storage.getAssignmentsByMosque(currentUser.mosqueId);
          const teacherLevels = getTeacherLevelsArray(currentUser);
          const mosqueStudents = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student");
          const levelStudentIds = new Set(mosqueStudents.filter(s => !s.pendingApproval && teacherLevels.includes(s.level || 1)).map(s => s.id));
          result = mosqueAssignments.filter(a => levelStudentIds.has(a.studentId));
        } else {
          result = await storage.getAssignmentsByTeacher(currentUser.id);
        }
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        if (studentId) {
          const student = await storage.getUser(studentId as string);
          if (student && student.mosqueId === currentUser.mosqueId) {
            result = await storage.getAssignmentsByStudent(studentId as string);
          } else {
            return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الطالب" });
          }
        } else if (teacherId) {
          const teacher = await storage.getUser(teacherId as string);
          if (teacher && teacher.mosqueId === currentUser.mosqueId) {
            result = await storage.getAssignmentsByTeacher(teacherId as string);
          } else {
            return res.status(403).json({ message: "غير مصرح بالوصول لبيانات هذا الأستاذ" });
          }
        } else {
          result = await storage.getAssignmentsByMosque(currentUser.mosqueId);
        }
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
    }
  });

  app.post("/api/assignments", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء واجبات" });
      }

      const contentCheck = filterTextFields(req.body, ["notes"]);
      if (contentCheck.blocked) {
        return res.status(400).json({ message: contentCheck.reason });
      }

      const { studentId, surahName, fromVerse, toVerse, type, scheduledDate, status, notes } = req.body;
      if (!studentId || !surahName || fromVerse === undefined || toVerse === undefined || !scheduledDate) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const typeCheck = validateEnum(type || "new", "type", ["new", "review", "test", "memorization", "revision", "حفظ", "مراجعة"]);
      if (!typeCheck.valid) return res.status(400).json({ message: typeCheck.error });
      const statusCheck = validateEnum(status || "pending", "status", ["pending", "done", "missed", "incomplete"]);
      if (!statusCheck.valid) return res.status(400).json({ message: statusCheck.error });
      const dateCheck = validateDate(scheduledDate, "scheduledDate");
      if (!dateCheck.valid) return res.status(400).json({ message: dateCheck.error });
      const notesCheck = validateFields(req.body, ["notes", "surahName"]);
      if (!notesCheck.valid) return res.status(400).json({ message: notesCheck.error });

      const fromVerseNum = Number(fromVerse);
      const toVerseNum = Number(toVerse);
      if (!Number.isInteger(fromVerseNum) || !Number.isInteger(toVerseNum) || fromVerseNum < 1 || toVerseNum < 1 || toVerseNum < fromVerseNum) {
        return res.status(400).json({ message: "أرقام الآيات غير صحيحة" });
      }

      const student = await storage.getUser(studentId);
      if (!student || student.role !== "student") {
        return res.status(400).json({ message: "الطالب غير موجود" });
      }

      if (currentUser.role === "teacher" && !canTeacherAccessStudent(currentUser, student)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء واجبات لهذا الطالب - مستوى الطالب لا يتطابق مع مستوياتك" });
      }
      if (currentUser.role === "supervisor" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بإنشاء واجبات لطالب من جامع آخر" });
      }

      const data = {
        studentId,
        teacherId: currentUser.id,
        mosqueId: currentUser.role === "admin" ? (req.body.mosqueId || currentUser.mosqueId) : currentUser.mosqueId,
        surahName,
        fromVerse: fromVerseNum,
        toVerse: toVerseNum,
        type: type || "new",
        scheduledDate: new Date(scheduledDate),
        status: status || "pending",
        notes,
      };
      const assignment = await storage.createAssignment(data);
      await storage.createNotification({
        userId: req.body.studentId,
        mosqueId: currentUser.mosqueId,
        title: "واجب جديد",
        message: `تم تعيين واجب جديد: ${req.body.surahName} (${req.body.fromVerse}-${req.body.toVerse})`,
        type: "info",
        isRead: false,
      });
      const studentForLog = await storage.getUser(req.body.studentId);
      await logActivity(currentUser, `إنشاء واجب: ${req.body.surahName}`, "assignments", `للطالب ${studentForLog?.name || req.body.studentId}`);
      res.status(201).json(assignment);
    } catch (err: any) {
      console.error(err); res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  app.patch("/api/assignments/:id/seen", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });
      const currentUser = req.user!;
      if (currentUser.role === "student" && assignment.studentId !== currentUser.id) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "teacher") {
        const student = await storage.getUser(assignment.studentId);
        if (!student || !canTeacherAccessStudent(currentUser, student)) {
          return res.status(403).json({ message: "غير مصرح" });
        }
      }
      if (currentUser.role === "supervisor" && assignment.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const updated = await storage.updateAssignment(req.params.id, { 
        seenByStudent: true, 
        seenAt: new Date() 
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.patch("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
    const currentUser = req.user!;
    if (currentUser.role === "student") {
      return res.status(403).json({ message: "غير مصرح بتعديل الواجبات" });
    }

    const assignment = await storage.getAssignment(req.params.id);
    if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });

    if (currentUser.role === "teacher") {
      const student = await storage.getUser(assignment.studentId);
      if (!student || !canTeacherAccessStudent(currentUser, student)) {
        return res.status(403).json({ message: "غير مصرح بتعديل هذا الواجب" });
      }
    }
    if (currentUser.role === "supervisor" && assignment.mosqueId !== currentUser.mosqueId) {
      return res.status(403).json({ message: "غير مصرح بتعديل هذا الواجب" });
    }

    const updateData: any = {};
    if (req.body.surahName !== undefined) updateData.surahName = req.body.surahName;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.seenByStudent !== undefined) updateData.seenByStudent = req.body.seenByStudent;
    if (req.body.seenAt !== undefined) updateData.seenAt = new Date(req.body.seenAt);
    if (req.body.scheduledDate !== undefined) updateData.scheduledDate = new Date(req.body.scheduledDate);
    if (req.body.fromVerse !== undefined) {
      const v = Number(req.body.fromVerse);
      if (!Number.isInteger(v) || v < 1) return res.status(400).json({ message: "رقم الآية غير صحيح" });
      updateData.fromVerse = v;
    }
    if (req.body.toVerse !== undefined) {
      const v = Number(req.body.toVerse);
      if (!Number.isInteger(v) || v < 1) return res.status(400).json({ message: "رقم الآية غير صحيح" });
      updateData.toVerse = v;
    }
    if (req.body.grade !== undefined) {
      const g = Number(req.body.grade);
      if (!Number.isInteger(g) || g < 0 || g > 100) return res.status(400).json({ message: "الدرجة يجب أن تكون بين 0 و 100" });
      updateData.grade = g;
    }
    if (req.body.status === "done" && assignment.hasAudio) {
      updateData.audioGradedAt = new Date();
    }
    const updated = await storage.updateAssignment(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "الواجب غير موجود" });
    // نقاط تلقائية عند إتمام الواجب
    if (req.body.status === "done" && assignment.status !== "done") {
      try {
        const verses = assignment.toVerse - assignment.fromVerse + 1;
        const autoPoints = Math.min(Math.max(verses, 3), 30);
        await storage.createPoint({
          userId: assignment.studentId, mosqueId: assignment.mosqueId,
          amount: autoPoints, category: "assignment",
          reason: `إتمام: ${assignment.surahName} (${assignment.fromVerse}-${assignment.toVerse}) — ${verses} آية`,
        });
        await storage.createNotification({
          userId: assignment.studentId, mosqueId: assignment.mosqueId,
          title: "أحسنت! واجب مكتمل",
          message: `تم منحك ${autoPoints} نقطة لإتمام واجب ${assignment.surahName}`,
          type: "success",
        });
      } catch (e) { console.error("خطأ في منح نقاط الإتمام:", e); }
    }
    if (req.body.grade !== undefined) {
      const gradeStudent = await storage.getUser(assignment.studentId);
      await logActivity(req.user!, `تقييم واجب بدرجة ${req.body.grade}`, "assignments", `واجب ${assignment.surahName} للطالب ${gradeStudent?.name || assignment.studentId}`);
    }
    if (req.body.grade !== undefined && assignment.grade === null) {
      const g = Number(req.body.grade);
      try {
        const autoPoints = g >= 90 ? 10 : g >= 75 ? 7 : g >= 60 ? 5 : 0;
        if (autoPoints > 0) {
          await storage.createPoint({
            userId: assignment.studentId,
            mosqueId: assignment.mosqueId,
            amount: autoPoints,
            category: "assignment",
            reason: `نقاط تلقائية - درجة ${g} في ${assignment.surahName || "واجب"}`,
          });
        }
        if (g < 60 && assignment.surahName) {
          await storage.createAssignment({
            studentId: assignment.studentId,
            teacherId: currentUser.id,
            mosqueId: assignment.mosqueId,
            surahName: assignment.surahName,
            fromVerse: assignment.fromVerse,
            toVerse: assignment.toVerse,
            type: "review",
            status: "pending",
            scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            notes: `مراجعة تلقائية - الدرجة السابقة: ${g}`,
          });
          await storage.createNotification({
            userId: assignment.studentId,
            mosqueId: assignment.mosqueId,
            title: "واجب مراجعة جديد",
            message: `تم إنشاء واجب مراجعة تلقائي لسورة ${assignment.surahName} (الآيات ${assignment.fromVerse}-${assignment.toVerse})`,
            type: "warning",
          });
        }
      } catch (e) { console.error("خطأ في منح نقاط التقييم:", e); }
    }
    res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تحديث الواجب" });
    }
  });

  const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("audio/")) cb(null, true);
      else cb(new Error("يُسمح فقط بملفات الصوت"));
    },
  });

  app.post("/api/assignments/:id/audio", requireAuth, audioUpload.single("audio"), async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "student") {
        return res.status(403).json({ message: "فقط الطالب يمكنه رفع التسميع الصوتي" });
      }
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "الواجب غير موجود" });
      }
      if (assignment.studentId !== currentUser.id) {
        return res.status(403).json({ message: "غير مصرح برفع تسجيل لهذا الواجب" });
      }
      if (assignment.status === "done") {
        return res.status(400).json({ message: "لا يمكن رفع تسجيل لواجب مكتمل" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم إرسال ملف صوتي" });
      }
      const audioBase64 = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype || "audio/webm";
      if (assignment.hasAudio) {
        await db.delete(assignmentAudio).where(eq(assignmentAudio.assignmentId, req.params.id));
      }
      await db.insert(assignmentAudio).values({
        assignmentId: req.params.id,
        audioData: audioBase64,
        mimeType: mimeType,
      });
      const updated = await storage.updateAssignment(req.params.id, {
        hasAudio: true,
        audioFileName: `db_audio_${Date.now()}`,
        audioUploadedAt: new Date(),
        audioGradedAt: null,
      });
      await storage.createNotification({
        userId: assignment.teacherId,
        mosqueId: assignment.mosqueId,
        title: "تسميع صوتي جديد",
        message: `قام الطالب ${currentUser.name} برفع تسميع صوتي لسورة ${assignment.surahName} (${assignment.fromVerse}-${assignment.toVerse})`,
        type: "info",
      });
      const audioStudent = await storage.getUser(assignment.studentId);
      await logActivity(currentUser, "رفع تسميع صوتي", "assignments", `واجب ${assignment.surahName} للطالب ${audioStudent?.name || assignment.studentId}`);
      res.json({ message: "تم رفع التسجيل بنجاح", assignment: updated });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في رفع التسجيل" });
    }
  });

  app.get("/api/assignments/:id/audio", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });
      if (!assignment.hasAudio) {
        return res.status(404).json({ message: "لا يوجد تسجيل صوتي لهذا الواجب" });
      }
      const currentUser = req.user!;
      const isOwner = assignment.studentId === currentUser.id;
      const isTeacher = currentUser.role === "teacher" && assignment.teacherId === currentUser.id;
      const isSupervisor = currentUser.role === "supervisor" && assignment.mosqueId === currentUser.mosqueId;
      const isAdmin = currentUser.role === "admin";
      if (!isOwner && !isTeacher && !isSupervisor && !isAdmin) {
        return res.status(403).json({ message: "غير مصرح بالاستماع لهذا التسجيل" });
      }
      const [audioRecord] = await db.select().from(assignmentAudio).where(eq(assignmentAudio.assignmentId, req.params.id));
      if (!audioRecord) {
        await storage.updateAssignment(req.params.id, { hasAudio: false, audioFileName: null });
        return res.status(404).json({ message: "التسجيل الصوتي غير موجود" });
      }
      const audioBuffer = Buffer.from(audioRecord.audioData, "base64");
      const contentType = audioRecord.mimeType || "audio/webm";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", audioBuffer.length);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "no-cache");
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : audioBuffer.length - 1;
        const chunkSize = end - start + 1;
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${audioBuffer.length}`);
        res.setHeader("Content-Length", chunkSize);
        res.end(audioBuffer.subarray(start, end + 1));
      } else {
        res.end(audioBuffer);
      }
    } catch {
      res.status(500).json({ message: "حدث خطأ في تحميل التسجيل" });
    }
  });

  app.delete("/api/assignments/:id/audio", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });
      const isOwner = assignment.studentId === currentUser.id;
      const isTeacher = currentUser.role === "teacher" && assignment.teacherId === currentUser.id;
      const isAdmin = currentUser.role === "admin";
      if (!isOwner && !isTeacher && !isAdmin) {
        return res.status(403).json({ message: "غير مصرح بحذف هذا التسجيل" });
      }
      await db.delete(assignmentAudio).where(eq(assignmentAudio.assignmentId, req.params.id));
      await storage.updateAssignment(req.params.id, {
        hasAudio: false,
        audioFileName: null,
        audioUploadedAt: null,
        audioGradedAt: null,
      });
      const delAudioStudent = await storage.getUser(assignment.studentId);
      await logActivity(currentUser, "حذف تسميع صوتي", "assignments", `واجب ${assignment.surahName} للطالب ${delAudioStudent?.name || assignment.studentId}`);
      res.json({ message: "تم حذف التسجيل بنجاح" });
    } catch {
      res.status(500).json({ message: "حدث خطأ في حذف التسجيل" });
    }
  });

  setInterval(async () => {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const gradedAssignments = await db
        .select({ id: assignments.id })
        .from(assignments)
        .where(
          and(
            eq(assignments.hasAudio, true),
            dsql`${assignments.audioGradedAt} IS NOT NULL AND ${assignments.audioGradedAt} < ${fiveMinAgo.toISOString()}`
          )
        );
      for (const a of gradedAssignments) {
        try {
          await db.delete(assignmentAudio).where(eq(assignmentAudio.assignmentId, a.id));
          await db
            .update(assignments)
            .set({ hasAudio: false, audioFileName: null })
            .where(eq(assignments.id, a.id));
        } catch (cleanErr) {
          console.error(`خطأ في تنظيف صوتي ${a.id}:`, cleanErr);
        }
      }
    } catch (err) {
      console.error("خطأ في تنظيف الملفات الصوتية:", err);
    }
  }, 60 * 1000);

  app.delete("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "غير مصرح بحذف الواجبات" });
      }

      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) return res.status(404).json({ message: "الواجب غير موجود" });

      if (currentUser.role === "teacher") {
        const student = await storage.getUser(assignment.studentId);
        if (!student || !canTeacherAccessStudent(currentUser, student)) {
          return res.status(403).json({ message: "غير مصرح بحذف هذا الواجب" });
        }
      }
      if (currentUser.role === "supervisor" && assignment.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بحذف هذا الواجب" });
      }

      await storage.deleteAssignment(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف الواجب" });
    }
  });

}
