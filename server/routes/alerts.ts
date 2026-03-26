import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { logActivity, getTeacherLevelsArray } from "./shared";
import { sendError } from "../error-handler";

export function registerAlertsRoutes(app: Express) {
  // ==================== SMART ALERTS ====================
  app.get("/api/smart-alerts", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بعرض التنبيهات" });
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      let students: User[] = [];
      let teachersList: User[] = [];
      let assignmentsList: Assignment[] = [];

      if (currentUser.role === "admin") {
        students = (await storage.getUsersByRole("student")).filter(s => !s.pendingApproval);
        teachersList = await storage.getUsersByRole("teacher");
        assignmentsList = await storage.getAssignments();
      } else if (currentUser.role === "teacher") {
        students = (await storage.getUsersByTeacher(currentUser.id)).filter(s => !s.pendingApproval);
        assignmentsList = await storage.getAssignmentsByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        const mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
        students = mosqueUsers.filter(u => u.role === "student" && !u.pendingApproval);
        teachersList = mosqueUsers.filter(u => u.role === "teacher");
        assignmentsList = await storage.getAssignmentsByMosque(currentUser.mosqueId);
      }

      const studentsWithoutAssignments: any[] = [];
      const lowGrades: any[] = [];

      for (const student of students) {
        if (!student.isActive) continue;
        const studentAssignments = assignmentsList.filter(a => a.studentId === student.id);
        const hasRecent = studentAssignments.some(a => new Date(a.createdAt) > sevenDaysAgo);
        if (!hasRecent) {
          const lastAssignment = studentAssignments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          studentsWithoutAssignments.push({
            id: student.id,
            name: student.name,
            date: lastAssignment ? new Date(lastAssignment.createdAt).toLocaleDateString("ar") : "لا يوجد",
          });
        }
        const lowGradeAssignments = studentAssignments.filter(a => a.grade !== null && a.grade !== undefined && Number(a.grade) < 60);
        for (const a of lowGradeAssignments) {
          lowGrades.push({
            id: `${student.id}-${a.id}`,
            name: student.name,
            grade: a.grade,
            subject: a.surahName || "واجب",
          });
        }
      }

      const inactiveTeachers: any[] = [];
      for (const teacher of teachersList) {
        if (!teacher.isActive) continue;
        const teacherAssignments = assignmentsList.filter(a => a.teacherId === teacher.id);
        const hasRecent = teacherAssignments.some(a => new Date(a.createdAt) > sevenDaysAgo);
        if (!hasRecent) {
          const lastAssignment = teacherAssignments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          inactiveTeachers.push({
            id: teacher.id,
            name: teacher.name,
            date: lastAssignment ? new Date(lastAssignment.createdAt).toLocaleDateString("ar") : "لا يوجد نشاط",
          });
        }
      }

      let examsList: any[] = [];
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        for (const m of allMosques) {
          const me = await storage.getExamsByMosque(m.id);
          examsList.push(...me);
        }
      } else if (currentUser.role === "teacher") {
        examsList = await storage.getExamsByTeacher(currentUser.id);
      } else if (currentUser.mosqueId) {
        examsList = await storage.getExamsByMosque(currentUser.mosqueId);
      }

      const upcomingExams: any[] = [];
      for (const exam of examsList) {
        const examDate = new Date(exam.examDate);
        if (examDate >= new Date() && examDate <= threeDaysFromNow) {
          upcomingExams.push({
            id: exam.id,
            examName: exam.title,
            name: exam.title,
            date: examDate.toLocaleDateString("ar"),
            subject: exam.surahName || "",
          });
        }
      }

      res.json({
        studentsWithoutAssignments,
        inactiveTeachers,
        upcomingExams,
        lowGrades,
      });
    } catch (err: any) {
      sendError(res, err, "تحليل التنبيهات الذكية");
    }
  });


  // ==================== EMERGENCY SUBSTITUTIONS ====================
  app.get("/api/emergency-substitutions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const subs = await storage.getEmergencySubstitutionsByMosque(m.id);
          all.push(...subs);
        }
        return res.json(all);
      }
      if (currentUser.mosqueId) {
        const subs = await storage.getEmergencySubstitutionsByMosque(currentUser.mosqueId);
        return res.json(subs);
      }
      res.json([]);
    } catch (err: any) {
      sendError(res, err, "جلب الإنابات الطارئة");
    }
  });

  app.post("/api/emergency-substitutions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { absentTeacherId, substituteTeacherId, reason, date, notes } = req.body;
      if (!absentTeacherId || !substituteTeacherId || !date) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const mosqueId = currentUser.role === "admin" ? (req.body.mosqueId || currentUser.mosqueId) : currentUser.mosqueId;
      const absentTeacher = await storage.getUser(absentTeacherId);
      const students = absentTeacher ? await storage.getUsersByTeacher(absentTeacherId) : [];
      const sub = await storage.createEmergencySubstitution({
        mosqueId, absentTeacherId, substituteTeacherId, reason, date: new Date(date), notes,
        status: "active", studentsCount: students.length, createdBy: currentUser.id,
      });
      await storage.createNotification({
        userId: substituteTeacherId, mosqueId,
        title: "تكليف بالإنابة", message: `تم تكليفك كمعلم بديل عن ${absentTeacher?.name || "معلم غائب"}`,
        type: "emergency",
      });
      await logActivity(currentUser, "إنشاء إنابة طارئة", "emergency_substitutions");
      res.status(201).json(sub);
    } catch (err: any) {
      sendError(res, err, "إنشاء إنابة طارئة");
    }
  });

  app.patch("/api/emergency-substitutions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const sub = await storage.getEmergencySubstitution(req.params.id);
      if (!sub) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && sub.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const allowedFields: Record<string, boolean> = { status: true, notes: true, endDate: true };
      const safeData: any = {};
      for (const key of Object.keys(req.body)) {
        if (allowedFields[key]) safeData[key] = req.body[key];
      }
      const updated = await storage.updateEmergencySubstitution(req.params.id, safeData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      sendError(res, err, "تحديث الإنابة الطارئة");
    }
  });

  app.delete("/api/emergency-substitutions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const sub = await storage.getEmergencySubstitution(req.params.id);
      if (!sub) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && sub.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteEmergencySubstitution(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      sendError(res, err, "حذف الإنابة الطارئة");
    }
  });

  app.post("/api/emergency-substitutions/auto-assign", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { absentTeacherId, reason, date } = req.body;
      if (!absentTeacherId || !date) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const absentTeacher = await storage.getUser(absentTeacherId);
      if (!absentTeacher || !absentTeacher.mosqueId) {
        return res.status(404).json({ message: "المعلم غير موجود" });
      }
      const absentLevels = getTeacherLevelsArray(absentTeacher);
      const allTeachers = await storage.getUsersByMosqueAndRole(absentTeacher.mosqueId, "teacher");
      const availableTeachers = allTeachers.filter(t => {
        if (t.id === absentTeacherId || !t.isActive) return false;
        const tLevels = getTeacherLevelsArray(t);
        return absentLevels.some(l => tLevels.includes(l));
      });
      if (availableTeachers.length === 0) {
        return res.status(400).json({ message: "لا يوجد معلمون بديلون متاحون بنفس المستويات" });
      }
      const students = await storage.getUsersByTeacher(absentTeacherId);
      const activeStudents = students.filter(s => s.isActive);
      const created: any[] = [];
      for (let i = 0; i < activeStudents.length; i++) {
        const teacher = availableTeachers[i % availableTeachers.length];
        const sub = await storage.createEmergencySubstitution({
          mosqueId: absentTeacher.mosqueId, absentTeacherId, substituteTeacherId: teacher.id,
          reason, date: new Date(date), status: "active", studentsCount: 1,
          notes: `توزيع تلقائي - طالب: ${activeStudents[i].name}`, createdBy: currentUser.id,
        });
        created.push(sub);
      }
      const notifiedTeachers = new Set<string>();
      for (const t of availableTeachers) {
        if (!notifiedTeachers.has(t.id)) {
          notifiedTeachers.add(t.id);
          const assignedCount = created.filter(s => s.substituteTeacherId === t.id).length;
          await storage.createNotification({
            userId: t.id, mosqueId: absentTeacher.mosqueId,
            title: "تكليف إنابة تلقائي",
            message: `تم تكليفك بتدريس ${assignedCount} طالب بدلاً عن ${absentTeacher.name}`,
            type: "emergency",
          });
        }
      }
      await logActivity(currentUser, `توزيع تلقائي لطلاب ${absentTeacher.name}`, "emergency_substitutions");
      res.status(201).json({ created, totalStudents: activeStudents.length, totalTeachers: availableTeachers.length });
    } catch (err: any) {
      sendError(res, err, "التوزيع التلقائي للإنابة");
    }
  });


  // ==================== INCIDENT RECORDS ====================
  app.get("/api/incidents", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      if (currentUser.role === "admin") {
        const allMosques = await storage.getMosques();
        let all: any[] = [];
        for (const m of allMosques) {
          const records = await storage.getIncidentRecordsByMosque(m.id);
          all.push(...records);
        }
        return res.json(all);
      }
      if (currentUser.mosqueId) {
        const records = await storage.getIncidentRecordsByMosque(currentUser.mosqueId);
        return res.json(records);
      }
      res.json([]);
    } catch (err: any) {
      sendError(res, err, "جلب الحوادث");
    }
  });

  app.post("/api/incidents", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const { title, description, severity, actionTaken } = req.body;
      if (!title) {
        return res.status(400).json({ message: "عنوان الحادثة مطلوب" });
      }
      const record = await storage.createIncidentRecord({
        mosqueId: currentUser.mosqueId, reportedBy: currentUser.id,
        title, description: description || "", severity: severity || "medium", status: "open",
        actionTaken: actionTaken || null,
      });
      await logActivity(currentUser, `تسجيل حادثة: ${title}`, "incidents");
      res.status(201).json(record);
    } catch (err: any) {
      sendError(res, err, "تسجيل حادثة");
    }
  });

  app.patch("/api/incidents/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const incident = await storage.getIncidentRecord(req.params.id);
      if (!incident) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && incident.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      const incidentAllowed: Record<string, boolean> = { title: true, description: true, severity: true, status: true, actionTaken: true, resolution: true };
      const safeIncidentData: any = {};
      for (const key of Object.keys(req.body)) {
        if (incidentAllowed[key]) safeIncidentData[key] = req.body[key];
      }
      const updated = await storage.updateIncidentRecord(req.params.id, safeIncidentData);
      if (!updated) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(updated);
    } catch (err: any) {
      sendError(res, err, "تحديث حادثة");
    }
  });

  app.delete("/api/incidents/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      const incident = await storage.getIncidentRecord(req.params.id);
      if (!incident) return res.status(404).json({ message: "السجل غير موجود" });
      if (currentUser.role !== "admin" && incident.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا السجل" });
      }
      await storage.deleteIncidentRecord(req.params.id);
      res.json({ message: "تم الحذف بنجاح" });
    } catch (err: any) {
      sendError(res, err, "حذف حادثة");
    }
  });

}
