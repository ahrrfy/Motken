import type { Express } from "express";
import { requireAuth, requireRole } from "../auth";
import { storage } from "../storage";
import {
  courses,
  certificates,
} from "@shared/schema";
import { logActivity } from "./shared";
import { sendError } from "../error-handler";

export function registerCoursesRoutes(app: Express) {
  // ==================== COURSES & CERTIFICATES ====================
  app.get("/api/certificates/verify/:certNumber", async (req, res) => {
    try {
      const cert = await storage.getCertificateByNumber(req.params.certNumber);
      if (!cert) return res.status(404).json({ valid: false, message: "الشهادة غير موجودة" });

      const course = cert.courseId ? await storage.getCourse(cert.courseId) : null;
      const student = await storage.getUser(cert.studentId);
      const issuer = await storage.getUser(cert.issuedBy);

      res.json({
        valid: true,
        certificateNumber: cert.certificateNumber,
        courseName: course?.title || "",
        studentName: student?.name || "",
        issuerName: issuer?.name || "",
        issuedAt: cert.issuedAt,
        graduationGrade: cert.graduationGrade,
        notes: cert.notes,
      });
    } catch (err: any) {
      sendError(res, err, "التحقق من الشهادة");
    }
  });

  app.get("/api/courses/stats", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let courseList: any[] = [];

      if (currentUser.role === "admin") {
        courseList = await storage.getCourses();
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        courseList = await storage.getCoursesByMosque(currentUser.mosqueId);
      } else if (currentUser.role === "teacher") {
        courseList = await storage.getCoursesByCreator(currentUser.id);
      }

      let totalStudents = 0;
      let totalGraduated = 0;
      let totalCertificates = 0;

      for (const course of courseList) {
        const students = await storage.getCourseStudents(course.id);
        const certs = await storage.getCertificatesByCourse(course.id);
        totalStudents += students.length;
        totalGraduated += students.filter(s => s.graduated).length;
        totalCertificates += certs.length;
      }

      res.json({
        totalCourses: courseList.length,
        activeCourses: courseList.filter(c => c.status === "active").length,
        completedCourses: courseList.filter(c => c.status === "completed").length,
        cancelledCourses: courseList.filter(c => c.status === "cancelled").length,
        totalStudents,
        totalGraduated,
        totalCertificates,
        graduationRate: totalStudents > 0 ? Math.round((totalGraduated / totalStudents) * 100) : 0,
      });
    } catch (err: any) {
      sendError(res, err, "جلب إحصائيات الدورات");
    }
  });

  app.get("/api/courses", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let courseList: any[] = [];

      if (currentUser.role === "admin") {
        courseList = await storage.getCourses();
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        courseList = await storage.getCoursesByMosque(currentUser.mosqueId);
      } else if (currentUser.role === "teacher") {
        courseList = await storage.getCoursesByCreator(currentUser.id);
      } else if (currentUser.role === "student") {
        const courseStudentEntries = await storage.getCoursesByStudent(currentUser.id);
        for (const cs of courseStudentEntries) {
          const course = await storage.getCourse(cs.courseId);
          if (course) courseList.push(course);
        }
      }

      const enriched = [];
      for (const course of courseList) {
        const students = await storage.getCourseStudents(course.id);
        const teachers = await storage.getCourseTeachers(course.id);
        const certs = await storage.getCertificatesByCourse(course.id);
        enriched.push({ ...course, students, teachers, certificates: certs });
      }

      res.json(enriched);
    } catch (err: any) {
      sendError(res, err, "جلب الدورات");
    }
  });

  app.post("/api/courses", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { title, description, startDate, endDate, targetType, studentIds, teacherIds, category, maxStudents, notes } = req.body;

      const course = await storage.createCourse({
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        targetType: targetType || "specific",
        createdBy: currentUser.id,
        mosqueId: currentUser.mosqueId,
        category: category || "memorization",
        maxStudents: maxStudents || null,
        notes: notes || null,
      });

      if (studentIds && Array.isArray(studentIds)) {
        for (const sid of studentIds) {
          await storage.createCourseStudent({ courseId: course.id, studentId: sid });
        }
      }

      const allTeacherIds = Array.from(new Set<string>([...(teacherIds || []), currentUser.id]));
      for (const tid of allTeacherIds) {
        await storage.createCourseTeacher({ courseId: course.id, teacherId: tid });
      }

      await logActivity(currentUser, `إنشاء دورة: ${title}`, "courses");
      res.status(201).json(course);
    } catch (err: any) {
      sendError(res, err, "إنشاء دورة");
    }
  });

  app.patch("/api/courses/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "غير مصرح بتعديل الدورات" });
      }
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      if (currentUser.role !== "admin") {
        const isOwner = course.createdBy === currentUser.id;
        const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
        if (!isOwner && !isSameMosqueSupervisor) {
          return res.status(403).json({ message: "غير مصرح بتعديل هذه الدورة" });
        }
      }

      const updateData: any = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.startDate !== undefined) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate !== undefined) updateData.endDate = new Date(req.body.endDate);
      if (req.body.status !== undefined) updateData.status = req.body.status;

      const updated = await storage.updateCourse(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "الدورة غير موجودة" });
      res.json(updated);
    } catch (err: any) {
      sendError(res, err, "تعديل دورة");
    }
  });

  app.delete("/api/courses/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "غير مصرح بحذف الدورات" });
      }
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      if (currentUser.role !== "admin") {
        const isOwner = course.createdBy === currentUser.id;
        const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
        if (!isOwner && !isSameMosqueSupervisor) {
          return res.status(403).json({ message: "غير مصرح بحذف هذه الدورة" });
        }
      }

      await storage.deleteCourse(req.params.id);
      await logActivity(currentUser, `حذف دورة: ${course.title}`, "courses");
      res.json({ message: "تم حذف الدورة بنجاح" });
    } catch (err: any) {
      sendError(res, err, "حذف دورة");
    }
  });

  app.post("/api/courses/:id/students", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const isOwner = course.createdBy === currentUser.id;
      const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
      if (!isOwner && !isSameMosqueSupervisor) {
        return res.status(403).json({ message: "غير مصرح بتعديل هذه الدورة" });
      }

      const { studentIds } = req.body;
      if (!studentIds || !Array.isArray(studentIds)) {
        return res.status(400).json({ message: "يرجى تحديد الطلاب" });
      }

      const existing = await storage.getCourseStudents(req.params.id);
      const existingIds = new Set(existing.map(e => e.studentId));

      const created = [];
      for (const sid of studentIds) {
        if (!existingIds.has(sid)) {
          const entry = await storage.createCourseStudent({ courseId: req.params.id, studentId: sid });
          created.push(entry);
          await storage.createNotification({
            userId: sid,
            mosqueId: req.user!.mosqueId || null,
            title: "تم تسجيلك في دورة جديدة",
            message: `تم تسجيلك في الدورة: ${course.title}`,
            type: "info",
            isRead: false,
          });
        }
      }

      res.status(201).json(created);
    } catch (err: any) {
      sendError(res, err, "إضافة طلاب للدورة");
    }
  });

  app.post("/api/courses/:id/graduate", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const isOwner = course.createdBy === currentUser.id;
      const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
      if (!isOwner && !isSameMosqueSupervisor) {
        return res.status(403).json({ message: "غير مصرح بتخريج طلاب هذه الدورة" });
      }

      const { studentIds, graduationGrade } = req.body;
      if (!studentIds || !Array.isArray(studentIds)) {
        return res.status(400).json({ message: "يرجى تحديد الطلاب" });
      }

      const courseStudentsList = await storage.getCourseStudents(req.params.id);
      const createdCertificates = [];

      for (const sid of studentIds) {
        const csEntry = courseStudentsList.find(cs => cs.studentId === sid);
        if (csEntry) {
          await storage.updateCourseStudent(csEntry.id, { graduated: true, graduatedAt: new Date(), graduationGrade: graduationGrade || null });
          const cert = await storage.createCertificate({
            courseId: req.params.id,
            studentId: sid,
            issuedBy: currentUser.id,
            mosqueId: currentUser.mosqueId,
            certificateNumber: `MTQ-CERT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            graduationGrade: graduationGrade || null,
          });
          createdCertificates.push(cert);

          const studentUser = await storage.getUser(sid);
          await storage.createNotification({
            userId: sid,
            mosqueId: currentUser.mosqueId || null,
            title: "تهانينا! تم تخريجك",
            message: `تم تخريجك من الدورة: ${course.title}${graduationGrade ? ` بتقدير ${graduationGrade === "excellent" ? "ممتاز" : graduationGrade === "very_good" ? "جيد جداً" : graduationGrade === "good" ? "جيد" : "مقبول"}` : ""}`,
            type: "success",
            isRead: false,
          });

          try {
            const pointsEnabled = await storage.isFeatureEnabled("points_rewards");
            if (pointsEnabled) {
              await storage.createPoint({
                userId: sid,
                mosqueId: currentUser.mosqueId,
                amount: graduationGrade === "excellent" ? 50 : graduationGrade === "very_good" ? 40 : graduationGrade === "good" ? 30 : 20,
                reason: `تخريج من دورة: ${course.title}`,
                category: "graduation",
              });
            }
          } catch {}
        }
      }

      const updatedStudents = await storage.getCourseStudents(req.params.id);
      const allGraduated = updatedStudents.length > 0 && updatedStudents.every(s => s.graduated);
      if (allGraduated) {
        await storage.updateCourse(req.params.id, { status: "completed" });
      }

      await logActivity(currentUser, `تخريج ${studentIds.length} طالب من دورة: ${course.title}`, "courses");
      res.json({ message: "تم تخريج الطلاب ومنح الشهادات بنجاح", certificates: createdCertificates });
    } catch (err: any) {
      sendError(res, err, "تخريج طلاب الدورة");
    }
  });

  app.get("/api/certificates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let certs: any[] = [];

      if (currentUser.role === "admin") {
        const allCourses = await storage.getCourses();
        for (const course of allCourses) {
          const courseCerts = await storage.getCertificatesByCourse(course.id);
          certs.push(...courseCerts);
        }
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        certs = await storage.getCertificatesByMosque(currentUser.mosqueId);
      } else if (currentUser.role === "teacher") {
        const teacherCourses = await storage.getCoursesByCreator(currentUser.id);
        for (const course of teacherCourses) {
          const courseCerts = await storage.getCertificatesByCourse(course.id);
          certs.push(...courseCerts);
        }
      } else if (currentUser.role === "student") {
        certs = await storage.getCertificatesByStudent(currentUser.id);
      }

      res.json(certs);
    } catch (err: any) {
      sendError(res, err, "جلب الشهادات");
    }
  });

  app.get("/api/certificates/all", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      let certs: any[] = [];

      if (currentUser.role === "admin") {
        const allCourses = await storage.getCourses();
        for (const course of allCourses) {
          const courseCerts = await storage.getCertificatesByCourse(course.id);
          certs.push(...courseCerts);
        }
        const mosqueCerts = currentUser.mosqueId ? await storage.getCertificatesByMosque(currentUser.mosqueId) : [];
        for (const mc of mosqueCerts) {
          if (!certs.find((c: any) => c.id === mc.id)) certs.push(mc);
        }
      } else if (currentUser.role === "supervisor" && currentUser.mosqueId) {
        certs = await storage.getCertificatesByMosque(currentUser.mosqueId);
      } else if (currentUser.role === "teacher") {
        const teacherCourses = await storage.getCoursesByCreator(currentUser.id);
        for (const course of teacherCourses) {
          const courseCerts = await storage.getCertificatesByCourse(course.id);
          certs.push(...courseCerts);
        }
      } else if (currentUser.role === "student") {
        certs = await storage.getCertificatesByStudent(currentUser.id);
      }

      const userIds = new Set<string>();
      const courseIds = new Set<string>();
      const mosqueIds = new Set<string>();
      const graduateIds = new Set<string>();
      for (const cert of certs) {
        if (cert.studentId) userIds.add(cert.studentId);
        if (cert.issuedBy) userIds.add(cert.issuedBy);
        if (cert.courseId) courseIds.add(cert.courseId);
        if (cert.mosqueId) mosqueIds.add(cert.mosqueId);
        if (cert.graduateId) graduateIds.add(cert.graduateId);
      }
      const usersMap = new Map<string, any>();
      for (const uid of userIds) {
        try { const u = await storage.getUser(uid); if (u) usersMap.set(uid, u); } catch {}
      }
      const coursesMap = new Map<string, any>();
      for (const cid of courseIds) {
        try { const c = await storage.getCourse(cid); if (c) coursesMap.set(cid, c); } catch {}
      }
      const mosquesMap = new Map<string, any>();
      for (const mid of mosqueIds) {
        try { const m = await storage.getMosque(mid); if (m) mosquesMap.set(mid, m); } catch {}
      }
      const graduatesMap = new Map<string, any>();
      for (const gid of graduateIds) {
        try { const g = await storage.getGraduate(gid); if (g) graduatesMap.set(gid, g); } catch {}
      }
      const enriched = certs.map((cert: any) => {
        const student = usersMap.get(cert.studentId);
        const issuer = usersMap.get(cert.issuedBy);
        const course = coursesMap.get(cert.courseId);
        const mosque = mosquesMap.get(cert.mosqueId);
        const graduateData = graduatesMap.get(cert.graduateId);
        return {
          ...cert,
          studentName: student?.name || "",
          issuerName: issuer?.name || "",
          courseName: course?.title || "",
          mosqueName: mosque?.name || "",
          totalJuz: graduateData?.totalJuz || undefined,
          recitationStyle: graduateData?.recitationStyle || undefined,
          ijazahTeacher: graduateData?.ijazahTeacher || undefined,
        };
      });

      res.json(enriched);
    } catch (err: any) {
      sendError(res, err, "جلب جميع الشهادات");
    }
  });

  app.delete("/api/courses/:id/students/:studentId", requireRole("teacher", "supervisor"), async (req, res) => {
    try {
      const currentUser = req.user!;
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const isOwner = course.createdBy === currentUser.id;
      const isSameMosqueSupervisor = currentUser.role === "supervisor" && course.mosqueId === currentUser.mosqueId;
      if (!isOwner && !isSameMosqueSupervisor) {
        return res.status(403).json({ message: "غير مصرح بتعديل هذه الدورة" });
      }

      const students = await storage.getCourseStudents(req.params.id);
      const entry = students.find(s => s.studentId === req.params.studentId);
      if (!entry) return res.status(404).json({ message: "الطالب غير مسجل في هذه الدورة" });

      await storage.deleteCourseStudent(entry.id);
      res.json({ message: "تم إزالة الطالب من الدورة" });
    } catch (err: any) {
      sendError(res, err, "إزالة طالب من الدورة");
    }
  });

  app.post("/api/courses/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const original = await storage.getCourse(req.params.id);
      if (!original) return res.status(404).json({ message: "الدورة غير موجودة" });

      const newCourse = await storage.createCourse({
        title: `${original.title} (نسخة)`,
        description: original.description,
        startDate: new Date(),
        endDate: null,
        targetType: original.targetType,
        createdBy: currentUser.id,
        mosqueId: currentUser.mosqueId,
        category: original.category,
        maxStudents: original.maxStudents,
        notes: original.notes,
      });

      const originalTeachers = await storage.getCourseTeachers(req.params.id);
      for (const t of originalTeachers) {
        await storage.createCourseTeacher({ courseId: newCourse.id, teacherId: t.teacherId });
      }

      await logActivity(currentUser, `نسخ دورة: ${original.title}`, "courses");
      res.status(201).json(newCourse);
    } catch (err: any) {
      sendError(res, err, "نسخ دورة");
    }
  });

  app.post("/api/courses/:id/ungraduate", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const { studentId } = req.body;
      if (!studentId) return res.status(400).json({ message: "يرجى تحديد الطالب" });

      const students = await storage.getCourseStudents(req.params.id);
      const entry = students.find(s => s.studentId === studentId);
      if (!entry) return res.status(404).json({ message: "الطالب غير مسجل" });

      await storage.updateCourseStudent(entry.id, { graduated: false, graduatedAt: null, graduationGrade: null });

      const certs = await storage.getCertificatesByCourse(req.params.id);
      const cert = certs.find(c => c.studentId === studentId);
      if (cert) await storage.deleteCertificate(cert.id);

      if (course.status === "completed") {
        await storage.updateCourse(req.params.id, { status: "active" });
      }

      await logActivity(currentUser, `إلغاء تخريج طالب من دورة: ${course.title}`, "courses");
      res.json({ message: "تم إلغاء التخريج بنجاح" });
    } catch (err: any) {
      sendError(res, err, "إلغاء تخريج طالب");
    }
  });

  // ==================== EXTERNAL PARTICIPANTS ====================

  // GET external participants for a course
  app.get("/api/courses/:id/external-participants", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { pool } = await import("../db");
      const result = await pool.query(
        `SELECT * FROM external_participants WHERE course_id = $1 ORDER BY created_at DESC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err: any) {
      sendError(res, err, "جلب المشاركين الخارجيين");
    }
  });

  // POST add external participant
  app.post("/api/courses/:id/external-participants", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const { name, phone, age, notes } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "الاسم مطلوب" });

      const { pool } = await import("../db");
      const result = await pool.query(
        `INSERT INTO external_participants (course_id, mosque_id, name, phone, age, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.params.id, user.mosqueId || null, name.trim(), phone || null, age || null, notes || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      sendError(res, err, "إضافة مشارك خارجي");
    }
  });

  // DELETE external participant
  app.delete("/api/courses/:id/external-participants/:participantId", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { pool } = await import("../db");
      const result = await pool.query(
        `DELETE FROM external_participants WHERE id = $1 AND course_id = $2 RETURNING id`,
        [req.params.participantId, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "غير موجود" });
      res.json({ success: true });
    } catch (err: any) {
      sendError(res, err, "حذف مشارك خارجي");
    }
  });

  // POST graduate external participant
  app.post("/api/courses/:id/external-participants/:participantId/graduate", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "الدورة غير موجودة" });

      const { graduationGrade } = req.body;
      const certNumber = `MTQ-EXT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const { pool } = await import("../db");
      const result = await pool.query(
        `UPDATE external_participants
         SET graduated = true, graduated_at = NOW(), graduation_grade = $1, certificate_number = $2
         WHERE id = $3 AND course_id = $4 RETURNING *`,
        [graduationGrade || null, certNumber, req.params.participantId, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "غير موجود" });

      await logActivity(user, `تخريج مشارك خارجي من دورة: ${course.title}`, "courses");
      res.json(result.rows[0]);
    } catch (err: any) {
      sendError(res, err, "تخريج مشارك خارجي");
    }
  });

  // POST ungraduate external participant
  app.post("/api/courses/:id/external-participants/:participantId/ungraduate", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { pool } = await import("../db");
      const result = await pool.query(
        `UPDATE external_participants
         SET graduated = false, graduated_at = NULL, graduation_grade = NULL, certificate_number = NULL
         WHERE id = $1 AND course_id = $2 RETURNING *`,
        [req.params.participantId, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "غير موجود" });
      res.json(result.rows[0]);
    } catch (err: any) {
      sendError(res, err, "إلغاء تخريج مشارك خارجي");
    }
  });

  // GET archive of all external participants for mosque
  app.get("/api/external-participants", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { pool } = await import("../db");
      const result = await pool.query(
        `SELECT ep.*, c.title AS course_title, c.category AS course_category, c.status AS course_status
         FROM external_participants ep
         JOIN courses c ON c.id = ep.course_id
         WHERE ep.mosque_id = $1
         ORDER BY ep.created_at DESC`,
        [user.mosqueId]
      );
      res.json(result.rows);
    } catch (err: any) {
      sendError(res, err, "جلب أرشيف المشاركين الخارجيين");
    }
  });

  // POST bulk import external participants from Excel
  app.post("/api/external-participants/bulk-import", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      // Accept both {participants:[{name,phone,...}]} and {rows:[{الاسم,الجوال,...}]}
      let items: any[] = req.body.participants || req.body.rows || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "لا توجد بيانات للاستيراد" });
      }
      // Normalize Arabic-keyed rows to English
      const participants = items.map(r => ({
        name: r.name || r["الاسم"] || "",
        phone: r.phone || r["الجوال"] || r["الهاتف"] || "",
        age: r.age || r["العمر"] || "",
        courseTitle: r.courseTitle || r["اسم الدورة"] || "",
        notes: r.notes || r["ملاحظات"] || "",
      }));
      const { pool } = await import("../db");
      let success = 0;
      let failed = 0;
      for (const p of participants) {
        try {
          if (!p.name?.trim()) { failed++; continue; }
          let courseId: string | null = null;
          if (p.courseTitle?.trim()) {
            const cr = await pool.query(
              `SELECT id FROM courses WHERE mosque_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`,
              [user.mosqueId, p.courseTitle.trim()]
            );
            if (cr.rows.length > 0) courseId = cr.rows[0].id;
          }
          if (!courseId) { failed++; continue; }
          await pool.query(
            `INSERT INTO external_participants (id, course_id, mosque_id, name, phone, age, notes, graduated, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false, NOW())`,
            [courseId, user.mosqueId, p.name.trim(), p.phone?.trim() || null, p.age ? parseInt(p.age) : null, p.notes?.trim() || null]
          );
          success++;
        } catch { failed++; }
      }
      res.json({ success, failed, total: participants.length });
    } catch (err: any) { sendError(res, err, "استيراد المشاركين الخارجيين"); }
  });

  // GET lookup external participants by phone (for auto-fill)
  app.get("/api/external-participants/lookup", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { phone } = req.query;
      if (!phone) return res.json([]);

      const { pool } = await import("../db");
      const result = await pool.query(
        `SELECT DISTINCT ON (phone) name, phone, age
         FROM external_participants
         WHERE mosque_id = $1 AND phone ILIKE $2
         ORDER BY phone, created_at DESC
         LIMIT 5`,
        [user.mosqueId, `%${phone}%`]
      );
      res.json(result.rows);
    } catch (err: any) {
      sendError(res, err, "البحث عن مشارك");
    }
  });

}
