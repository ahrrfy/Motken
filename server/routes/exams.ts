import type { Express } from "express";
import { requireAuth, requireRole } from "../auth";
import { storage } from "../storage";
import {
  exams,
} from "@shared/schema";
import { validateFields, validateDate } from "@shared/security-utils";
import { logActivity, canTeacherAccessStudent, getTeacherLevelsArray, calculateStudentLevel, LEVEL_NAMES } from "./shared";
import { sendError } from "../error-handler";

export function registerExamsRoutes(app: Express) {
  // ==================== EXAMS ====================
  app.get("/api/exams", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "teacher" && currentUser.mosqueId) {
        return res.json(await storage.getExamsByMosque(currentUser.mosqueId));
      } else if (currentUser.role === "teacher") {
        return res.json(await storage.getExamsByTeacher(currentUser.id));
      }
      if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        return res.json(await storage.getExamsByMosque(currentUser.mosqueId));
      }
      if (currentUser.role === "admin") {
        const mosqueId = req.query.mosqueId as string;
        if (mosqueId) return res.json(await storage.getExamsByMosque(mosqueId));
        return res.json([]);
      }
      if (currentUser.role === "student") {
        const examStudentList = await storage.getExamsByStudent(currentUser.id);
        const examIds = examStudentList.map(es => es.examId);
        const examsList = [];
        for (const eid of examIds) {
          const e = await storage.getExam(eid);
          if (e) examsList.push(e);
        }
        return res.json(examsList);
      }
      res.json([]);
    } catch (err: any) {
      sendError(res, err, "جلب الامتحانات");
    }
  });

  app.get("/api/exams/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const exam = await storage.getExam(req.params.id);
      if (!exam) return res.status(404).json({ message: "الامتحان غير موجود" });

      if (currentUser.role === "student") {
        const examStudentList = await storage.getExamsByStudent(currentUser.id);
        const isEnrolled = examStudentList.some(es => es.examId === req.params.id);
        if (!isEnrolled) {
          return res.status(403).json({ message: "غير مصرح بالوصول لهذا الامتحان" });
        }
      } else if (currentUser.role === "teacher") {
        if (exam.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لهذا الامتحان" });
        }
      } else if (currentUser.role === "supervisor") {
        if (exam.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لهذا الامتحان" });
        }
      }

      const students = await storage.getExamStudents(req.params.id);
      res.json({ ...exam, students });
    } catch (err: any) {
      sendError(res, err, "جلب الامتحانات");
    }
  });

  app.post("/api/exams", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const { title, surahName, fromVerse, toVerse, examDate, examTime, description, isForAll, studentIds } = req.body;

      if (!title || typeof title !== "string" || title.length > 200) {
        return res.status(400).json({ message: "عنوان الامتحان مطلوب ويجب ألا يتجاوز 200 حرف" });
      }
      if (!surahName || !examDate) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const examFieldCheck = validateFields(req.body, ["surahName", "description"]);
      if (!examFieldCheck.valid) return res.status(400).json({ message: examFieldCheck.error });
      const examDateCheck = validateDate(examDate, "examDate");
      if (!examDateCheck.valid) return res.status(400).json({ message: examDateCheck.error });
      const fromVerseNum = Number(fromVerse);
      const toVerseNum = Number(toVerse);
      if (!Number.isInteger(fromVerseNum) || !Number.isInteger(toVerseNum) || fromVerseNum < 1 || toVerseNum < 1) {
        return res.status(400).json({ message: "أرقام الآيات غير صحيحة" });
      }

      const exam = await storage.createExam({
        teacherId: currentUser.id,
        mosqueId: currentUser.mosqueId,
        title,
        surahName,
        fromVerse: fromVerseNum,
        toVerse: toVerseNum,
        examDate: new Date(examDate),
        examTime,
        description,
        isForAll: isForAll !== false,
      });

      let myStudents: any[];
      if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        const mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
        myStudents = mosqueUsers.filter(u => u.role === "student" && !u.pendingApproval);
      } else if (currentUser.mosqueId) {
        const allStudents = await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student");
        myStudents = allStudents.filter(s => canTeacherAccessStudent(currentUser, s) && !s.pendingApproval);
      } else {
        myStudents = (await storage.getUsersByTeacher(currentUser.id)).filter(s => !s.pendingApproval);
      }

      // Gender separation: filter students by teacher's gender
      if (currentUser.gender) {
        myStudents = myStudents.filter(s => !s.gender || s.gender === currentUser.gender);
      }
      const myStudentIds = new Set(myStudents.map(s => s.id));

      let targetStudents: string[] = [];
      if (isForAll !== false) {
        targetStudents = myStudents.map(s => s.id);
      } else if (studentIds && studentIds.length > 0) {
        targetStudents = studentIds.filter((sid: string) => myStudentIds.has(sid));
      }

      for (const sid of targetStudents) {
        await storage.createExamStudent({
          examId: exam.id,
          studentId: sid,
          status: "pending",
        });
        await storage.createNotification({
          userId: sid,
          mosqueId: currentUser.mosqueId,
          title: "امتحان جديد",
          message: `تم تحديد امتحان: ${title} - ${surahName} (${fromVerse}-${toVerse})${examTime ? ` في ${examTime}` : ''}`,
          type: "warning",
          isRead: false,
        });
      }

      await logActivity(currentUser, `إنشاء امتحان: ${title}`, "exams", `${surahName} (${fromVerse}-${toVerse}) - ${targetStudents.length} طالب`);
      res.status(201).json(exam);
    } catch (err: any) {
      sendError(res, err, "إنشاء امتحان");
    }
  });

  app.patch("/api/exams/:examId/students/:studentId", requireRole("teacher", "supervisor"), async (req, res) => {
    const currentUser = req.user!;
    const exam = await storage.getExam(req.params.examId);
    if (!exam) return res.status(404).json({ message: "الامتحان غير موجود" });

    const isOwner = exam.teacherId === currentUser.id;
    const isSameMosqueTeacher = currentUser.role === "teacher" && exam.mosqueId === currentUser.mosqueId;
    const isMosqueSupervisor = currentUser.role === "supervisor" && exam.mosqueId === currentUser.mosqueId;
    if (!isOwner && !isSameMosqueTeacher && !isMosqueSupervisor) {
      return res.status(403).json({ message: "غير مصرح بتعديل درجات هذا الامتحان" });
    }

    const students = await storage.getExamStudents(req.params.examId);
    const entry = students.find(s => s.studentId === req.params.studentId);
    if (!entry) return res.status(404).json({ message: "الطالب غير مسجل في هذا الامتحان" });
    const examUpdateData: any = {};
    if (req.body.grade !== undefined) {
      const g = Number(req.body.grade);
      if (!Number.isInteger(g) || g < 0 || g > 100) return res.status(400).json({ message: "الدرجة يجب أن تكون بين 0 و 100" });
      examUpdateData.grade = g;
    }
    if (req.body.status !== undefined) examUpdateData.status = req.body.status;
    const updated = await storage.updateExamStudent(entry.id, examUpdateData);
    res.json(updated);
  });

  app.delete("/api/exams/:id", requireAuth, async (req, res) => {
    const currentUser = req.user!;
    const exam = await storage.getExam(req.params.id);
    if (!exam) return res.status(404).json({ message: "الامتحان غير موجود" });

    if (currentUser.role === "teacher" && exam.mosqueId !== currentUser.mosqueId) {
      return res.status(403).json({ message: "غير مصرح بحذف هذا الامتحان" });
    }
    if (currentUser.role === "supervisor" && exam.mosqueId !== currentUser.mosqueId) {
      return res.status(403).json({ message: "غير مصرح بحذف هذا الامتحان" });
    }
    if (currentUser.role === "student") {
      return res.status(403).json({ message: "غير مصرح بحذف الامتحانات" });
    }

    await storage.deleteExam(req.params.id);
    res.json({ message: "تم حذف الامتحان بنجاح" });
  });


  // ==================== LEVELS ====================
  app.get("/api/levels/info", requireAuth, async (req, res) => {
    res.json({
      levels: LEVEL_NAMES,
      description: {
        1: "الجزء 30-26 (5 أجزاء)",
        2: "الجزء 25-21 (5 أجزاء)",
        3: "الجزء 20-16 (5 أجزاء)",
        4: "الجزء 15-11 (5 أجزاء)",
        5: "الجزء 10-6 (5 أجزاء)",
        6: "الجزء 5-1 (5 أجزاء)",
        7: "حافظ القرآن كاملاً (30 جزء)",
      },
    });
  });

  app.post("/api/levels/calculate", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { studentId, juzCount } = req.body;
      if (!studentId) return res.status(400).json({ message: "معرف الطالب مطلوب" });
      const student = await storage.getUser(studentId);
      if (!student || student.role !== "student") return res.status(404).json({ message: "الطالب غير موجود" });
      if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتعديل مستوى طالب من جامع آخر" });
      }
      const newLevel = calculateStudentLevel(juzCount || 0);
      const oldLevel = student.level || 1;
      await storage.updateUser(studentId, { level: newLevel });
      if (oldLevel !== newLevel) {
        await storage.createNotification({
          userId: studentId,
          mosqueId: student.mosqueId,
          title: newLevel > oldLevel ? "ترقية مستوى!" : "تعديل مستوى",
          message: `تم ${newLevel > oldLevel ? 'ترقيتك' : 'تعديل مستواك'} من ${LEVEL_NAMES[oldLevel]?.ar} إلى ${LEVEL_NAMES[newLevel]?.ar}`,
          type: newLevel > oldLevel ? "success" : "info",
          isRead: false,
        });
        await logActivity(currentUser, `تعديل مستوى الطالب ${student.name}`, "levels", `من ${LEVEL_NAMES[oldLevel]?.ar} إلى ${LEVEL_NAMES[newLevel]?.ar}`);
      }
      res.json({ studentId, oldLevel, newLevel, levelName: LEVEL_NAMES[newLevel] });
    } catch (err: any) {
      sendError(res, err, "عملية الامتحان");
    }
  });

  app.patch("/api/levels/teacher/:teacherId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "فقط المشرف أو المدير يمكنه تعيين مستويات الأساتذة" });
      }
      const teacher = await storage.getUser(req.params.teacherId);
      if (!teacher || teacher.role !== "teacher") return res.status(404).json({ message: "الأستاذ غير موجود" });
      if (currentUser.role === "supervisor" && teacher.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { levels } = req.body;
      if (!levels || !Array.isArray(levels) || levels.length === 0) {
        return res.status(400).json({ message: "يجب تحديد مستوى واحد على الأقل" });
      }
      const validLevels = levels.filter((l: number) => l >= 1 && l <= 7);
      if (validLevels.length === 0) return res.status(400).json({ message: "المستويات غير صحيحة" });
      const teacherLevels = validLevels.sort().join(",");
      await storage.updateUser(req.params.teacherId, { teacherLevels });
      await logActivity(currentUser, `تعيين مستويات الأستاذ ${teacher.name}`, "levels", `المستويات: ${validLevels.map((l: number) => LEVEL_NAMES[l]?.ar).join(', ')}`);
      res.json({ teacherId: req.params.teacherId, teacherLevels, levelNames: validLevels.map((l: number) => LEVEL_NAMES[l]) });
    } catch (err: any) {
      sendError(res, err, "عملية الامتحان");
    }
  });

  app.patch("/api/levels/student/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const student = await storage.getUser(req.params.studentId);
      if (!student || student.role !== "student") return res.status(404).json({ message: "الطالب غير موجود" });
      if (currentUser.role === "supervisor" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role === "teacher" && !canTeacherAccessStudent(currentUser, student)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { level } = req.body;
      if (!level || level < 1 || level > 7) return res.status(400).json({ message: "المستوى يجب أن يكون بين 1 و 7" });
      const oldLevel = student.level || 1;
      await storage.updateUser(req.params.studentId, { level });
      if (oldLevel !== level) {
        await storage.createNotification({
          userId: req.params.studentId,
          mosqueId: student.mosqueId,
          title: level > oldLevel ? "ترقية مستوى!" : "تعديل مستوى",
          message: `تم ${level > oldLevel ? 'ترقيتك' : 'تعديل مستواك'} من ${LEVEL_NAMES[oldLevel]?.ar} إلى ${LEVEL_NAMES[level]?.ar}`,
          type: level > oldLevel ? "success" : "info",
          isRead: false,
        });
        await logActivity(currentUser, `تعديل مستوى الطالب ${student.name}`, "levels", `من ${LEVEL_NAMES[oldLevel]?.ar} إلى ${LEVEL_NAMES[level]?.ar}`);
      }
      res.json({ studentId: req.params.studentId, oldLevel, newLevel: level, levelName: LEVEL_NAMES[level] });
    } catch (err: any) {
      sendError(res, err, "عملية الامتحان");
    }
  });

  app.get("/api/levels/stats", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const mosqueId = (req.query.mosqueId as string) || currentUser.mosqueId;
      if (!mosqueId) return res.json({ levels: {} });
      if (currentUser.role !== "admin" && currentUser.mosqueId !== mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const students = (await storage.getUsersByMosqueAndRole(mosqueId, "student")).filter(s => !s.pendingApproval);
      const teachers = await storage.getUsersByMosqueAndRole(mosqueId, "teacher");
      const levelStats: Record<number, { students: number; teachers: string[] }> = {};
      for (let i = 1; i <= 6; i++) {
        levelStats[i] = { students: 0, teachers: [] };
      }
      for (const s of students) {
        const lv = s.level || 1;
        if (levelStats[lv]) levelStats[lv].students++;
      }
      for (const t of teachers) {
        const tLevels = getTeacherLevelsArray(t);
        for (const lv of tLevels) {
          if (levelStats[lv]) levelStats[lv].teachers.push(t.name);
        }
      }
      res.json({ levels: levelStats, levelNames: LEVEL_NAMES });
    } catch (err: any) {
      sendError(res, err, "عملية الامتحان");
    }
  });

}
