import type { Express } from "express";
import { requireAuth } from "../auth";
import { hashPassword } from "../auth";
import { storage } from "../storage";
import { logActivity } from "./shared";
import crypto from "crypto";

function generateParentUsername(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `parent_${digits.slice(-10)}`;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function cleanDigits(s: string): string {
  return (s || "").replace(/[^\d]/g, "");
}

export function registerParentsRoutes(app: Express) {

  app.post("/api/parents/generate", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء حسابات أولياء الأمور" });
      }

      const mosqueId = currentUser.role === "admin" ? (req.body.mosqueId || currentUser.mosqueId) : currentUser.mosqueId;

      let allStudents: any[] = [];
      let allMosqueUsers: any[] = [];

      if (mosqueId) {
        allStudents = await storage.getUsersByMosqueAndRole(mosqueId, "student");
        allMosqueUsers = (await storage.getUsersByMosque(mosqueId)).filter(u => u.role === "teacher" && u.teacherId);
      } else if (currentUser.role === "admin") {
        const mosques = await storage.getMosques();
        for (const m of mosques) {
          const ms = await storage.getUsersByMosqueAndRole(m.id, "student");
          allStudents.push(...ms);
          const mt = (await storage.getUsersByMosque(m.id)).filter(u => u.role === "teacher" && u.teacherId);
          allMosqueUsers.push(...mt);
        }
      } else {
        return res.status(400).json({ message: "يجب تحديد المسجد" });
      }

      const teacherStudents = allMosqueUsers;

      const studentsWithParentPhone = [...allStudents, ...teacherStudents].filter(s => s.parentPhone && cleanDigits(s.parentPhone).length >= 10);

      if (studentsWithParentPhone.length === 0) {
        return res.json({
          message: `لا يوجد طلاب لديهم أرقام هواتف أولياء أمور مسجلة. يرجى إضافة رقم هاتف ولي الأمر في بيانات الطالب أولاً. (إجمالي الطلاب: ${allStudents.length})`,
          created: [],
          totalCreated: 0,
          totalSkipped: 0,
          totalStudentsWithoutPhone: allStudents.length - studentsWithParentPhone.length,
        });
      }

      const phoneGroups: Record<string, typeof studentsWithParentPhone> = {};
      for (const s of studentsWithParentPhone) {
        const cleanPhone = cleanDigits(s.parentPhone!);
        if (!phoneGroups[cleanPhone]) phoneGroups[cleanPhone] = [];
        phoneGroups[cleanPhone].push(s);
      }

      let existingParentPhones: Set<string>;
      if (mosqueId) {
        const existingParents = await storage.getUsersByMosqueAndRole(mosqueId, "parent" as any);
        existingParentPhones = new Set(existingParents.map(p => cleanDigits(p.phone || "")));
      } else {
        const allUsers = await storage.getUsers();
        existingParentPhones = new Set(allUsers.filter(u => u.role === "parent").map(p => cleanDigits(p.phone || "")));
      }

      const created: { parentName: string; username: string; password: string; phone: string; childrenNames: string[] }[] = [];
      let skipped = 0;

      for (const [phone, children] of Object.entries(phoneGroups)) {
        if (existingParentPhones.has(phone)) {
          skipped++;
          continue;
        }

        const existingUser = await storage.getUserByUsername(generateParentUsername(children[0].parentPhone!));
        if (existingUser) {
          skipped++;
          continue;
        }

        const firstChild = children[0];
        const childMosqueId = mosqueId || firstChild.mosqueId;
        const parentName = `ولي أمر ${firstChild.name}`;
        const username = generateParentUsername(firstChild.parentPhone!);
        const rawPassword = generatePassword();
        const hashedPw = await hashPassword(rawPassword);

        const parentUser = await storage.createUser({
          username,
          password: hashedPw,
          name: parentName,
          role: "parent" as any,
          mosqueId: childMosqueId,
          phone: firstChild.parentPhone,
          isActive: true,
          pendingApproval: false,
          isChild: false,
          isSpecialNeeds: false,
          isOrphan: false,
          studyMode: "in-person",
          acceptedPrivacyPolicy: true,
          privacyPolicyAcceptedAt: new Date(),
        });

        for (const child of children) {
          const linkMosqueId = mosqueId || child.mosqueId;
          const existingLinks = linkMosqueId ? await storage.getFamilyLinksByMosque(linkMosqueId) : [];
          const alreadyLinked = existingLinks.some(l => l.studentId === child.id && cleanDigits(l.parentPhone) === phone);
          if (!alreadyLinked && linkMosqueId) {
            await storage.createFamilyLink({
              parentPhone: firstChild.parentPhone!,
              studentId: child.id,
              mosqueId: linkMosqueId,
              relationship: "parent",
            });
          }
        }

        created.push({
          parentName,
          username,
          password: rawPassword,
          phone: firstChild.parentPhone!,
          childrenNames: children.map(c => c.name),
        });
      }

      await logActivity(currentUser, `إنشاء ${created.length} حساب ولي أمر`, "parents");

      res.json({
        message: `تم إنشاء ${created.length} حساب ولي أمر${skipped > 0 ? ` (تم تخطي ${skipped} أرقام موجودة مسبقاً)` : ""}`,
        created,
        totalCreated: created.length,
        totalSkipped: skipped,
      });
    } catch (err: any) {
      console.error("Error generating parent accounts:", err);
      res.status(500).json({ message: "حدث خطأ في إنشاء حسابات أولياء الأمور" });
    }
  });

  app.post("/api/parents/generate-single", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const { studentId } = req.body;
      if (!studentId) return res.status(400).json({ message: "معرف الطالب مطلوب" });

      const student = await storage.getUser(studentId);
      if (!student) return res.status(404).json({ message: "الطالب غير موجود" });
      if (!student.parentPhone || cleanDigits(student.parentPhone).length < 10) {
        return res.status(400).json({ message: "رقم هاتف ولي الأمر غير مسجل لهذا الطالب" });
      }

      if (currentUser.role !== "admin" && student.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const mosqueId = student.mosqueId;
      const cleanPhone = cleanDigits(student.parentPhone);

      const existingParents = mosqueId ? await storage.getUsersByMosqueAndRole(mosqueId, "parent" as any) : [];
      const existing = existingParents.find(p => cleanDigits(p.phone || "") === cleanPhone);
      if (existing) {
        const links = await storage.getFamilyLinksByParentPhone(student.parentPhone!);
        const alreadyLinked = links.some(l => l.studentId === student.id);
        if (!alreadyLinked && mosqueId) {
          await storage.createFamilyLink({
            parentPhone: student.parentPhone!,
            studentId: student.id,
            mosqueId,
            relationship: "parent",
          });
        }
        return res.json({
          message: "حساب ولي الأمر موجود مسبقاً - تم ربط الطالب",
          existing: true,
          parentName: existing.name,
          username: existing.username,
        });
      }

      const username = generateParentUsername(student.parentPhone!);
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.json({
          message: "حساب ولي الأمر موجود مسبقاً",
          existing: true,
          parentName: existingUsername.name,
          username: existingUsername.username,
        });
      }

      const rawPassword = generatePassword();
      const hashedPw = await hashPassword(rawPassword);
      const parentName = `ولي أمر ${student.name}`;

      const parentUser = await storage.createUser({
        username,
        password: hashedPw,
        name: parentName,
        role: "parent" as any,
        mosqueId,
        phone: student.parentPhone,
        isActive: true,
        pendingApproval: false,
        isChild: false,
        isSpecialNeeds: false,
        isOrphan: false,
        studyMode: "in-person",
        acceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: new Date(),
      });

      if (mosqueId) {
        await storage.createFamilyLink({
          parentPhone: student.parentPhone!,
          studentId: student.id,
          mosqueId,
          relationship: "parent",
        });
      }

      const allStudents = mosqueId ? await storage.getUsersByMosqueAndRole(mosqueId, "student") : [];
      const siblings = allStudents.filter(s => s.id !== student.id && cleanDigits(s.parentPhone || "") === cleanPhone);
      for (const sib of siblings) {
        const sibLinks = await storage.getFamilyLinksByParentPhone(student.parentPhone!);
        if (!sibLinks.some(l => l.studentId === sib.id) && mosqueId) {
          await storage.createFamilyLink({
            parentPhone: student.parentPhone!,
            studentId: sib.id,
            mosqueId,
            relationship: "parent",
          });
        }
      }

      await logActivity(currentUser, `إنشاء حساب ولي أمر: ${parentName}`, "parents");

      res.json({
        message: "تم إنشاء حساب ولي الأمر بنجاح",
        existing: false,
        parentName,
        username,
        password: rawPassword,
        childrenNames: [student.name, ...siblings.map(s => s.name)],
      });
    } catch (err: any) {
      console.error("Error generating single parent account:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/parents", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const mosqueId = currentUser.role === "admin" ? (req.query.mosqueId as string || currentUser.mosqueId) : currentUser.mosqueId;
      if (!mosqueId) {
        if (currentUser.role === "admin") {
          const allUsers = await storage.getUsers();
          const parents = allUsers.filter(u => u.role === "parent");
          const result = await enrichParents(parents);
          return res.json(result);
        }
        return res.json([]);
      }

      const parents = await storage.getUsersByMosqueAndRole(mosqueId, "parent" as any);
      const result = await enrichParents(parents);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/parents/my-children", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "parent") {
        return res.status(403).json({ message: "غير مصرح" });
      }

      const cleanPhone = cleanDigits(currentUser.phone || "");
      if (!cleanPhone) return res.json([]);

      const childrenMap = new Map<string, { child: any; relationship: string }>();

      const allLinks = currentUser.mosqueId
        ? await storage.getFamilyLinksByMosque(currentUser.mosqueId)
        : [];
      for (const link of allLinks) {
        if (cleanDigits(link.parentPhone) === cleanPhone && !childrenMap.has(link.studentId)) {
          const child = await storage.getUser(link.studentId);
          if (child) childrenMap.set(link.studentId, { child, relationship: link.relationship || "parent" });
        }
      }

      const allStudents = currentUser.mosqueId
        ? await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student")
        : [];
      const teacherStudents = currentUser.mosqueId
        ? (await storage.getUsersByMosque(currentUser.mosqueId)).filter(u => u.role === "teacher" && u.teacherId)
        : [];

      for (const student of [...allStudents, ...teacherStudents]) {
        if (cleanDigits(student.parentPhone || "") === cleanPhone && !childrenMap.has(student.id)) {
          childrenMap.set(student.id, { child: student, relationship: "parent" });
        }
      }

      const children = await Promise.all(
        Array.from(childrenMap.values()).map(async ({ child, relationship }) => {
          const [studentAssignments, studentAttendance, studentPoints] = await Promise.all([
            storage.getAssignmentsByStudent(child.id),
            storage.getAttendanceByStudent(child.id),
            storage.getPointsByUser(child.id),
          ]);
          return buildChildData(child, studentAssignments, studentAttendance, studentPoints, relationship);
        })
      );

      res.json(children);
    } catch (err: any) {
      console.error("Error fetching parent children:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.delete("/api/parents/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const parent = await storage.getUser(req.params.id);
      if (!parent || parent.role !== "parent") {
        return res.status(404).json({ message: "حساب ولي الأمر غير موجود" });
      }
      if (currentUser.role !== "admin" && parent.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const parentPhone = cleanDigits(parent.phone || "");
      if (parentPhone && parent.mosqueId) {
        const mosqueLinks = await storage.getFamilyLinksByMosque(parent.mosqueId);
        for (const link of mosqueLinks) {
          if (cleanDigits(link.parentPhone) === parentPhone) {
            await storage.deleteFamilyLink(link.id);
          }
        }
      }
      await storage.deleteUser(req.params.id);
      await logActivity(currentUser, `حذف حساب ولي أمر: ${parent.name}`, "parents");
      res.json({ message: "تم حذف حساب ولي الأمر" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.patch("/api/parents/:id/reset-password", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const parent = await storage.getUser(req.params.id);
      if (!parent || parent.role !== "parent") {
        return res.status(404).json({ message: "حساب ولي الأمر غير موجود" });
      }
      if (currentUser.role !== "admin" && parent.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const rawPassword = generatePassword();
      const hashedPw = await hashPassword(rawPassword);
      await storage.updateUser(req.params.id, { password: hashedPw });
      await logActivity(currentUser, `إعادة تعيين كلمة مرور ولي أمر: ${parent.name}`, "parents");
      res.json({ message: "تم إعادة تعيين كلمة المرور", password: rawPassword, username: parent.username });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });
}

async function enrichParents(parents: any[]) {
  return Promise.all(parents.map(async (p) => {
    const cleanPhone = cleanDigits(p.phone || "");
    const childrenMap = new Map<string, { id: string; name: string; level: number | null }>();

    if (p.mosqueId) {
      const mosqueLinks = await storage.getFamilyLinksByMosque(p.mosqueId);
      for (const link of mosqueLinks) {
        if (cleanDigits(link.parentPhone) === cleanPhone && !childrenMap.has(link.studentId)) {
          const child = await storage.getUser(link.studentId);
          if (child) childrenMap.set(link.studentId, { id: child.id, name: child.name, level: child.level });
        }
      }
      const allStudents = await storage.getUsersByMosqueAndRole(p.mosqueId, "student");
      for (const student of allStudents) {
        if (cleanDigits(student.parentPhone || "") === cleanPhone && !childrenMap.has(student.id)) {
          childrenMap.set(student.id, { id: student.id, name: student.name, level: student.level });
        }
      }
    }

    const { password, ...safe } = p;
    return { ...safe, children: Array.from(childrenMap.values()) };
  }));
}

function buildChildData(child: any, assignments: any[], attendance: any[], pts: any[], relationship?: string) {
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((a: any) => a.status === "done").length;
  const recentAssignments = assignments
    .sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
    .slice(0, 5)
    .map((a: any) => ({
      id: a.id, surahName: a.surahName, fromVerse: a.fromVerse, toVerse: a.toVerse,
      status: a.status, grade: a.grade, scheduledDate: a.scheduledDate,
    }));

  const totalAttendance = attendance.length;
  const presentCount = attendance.filter((a: any) => a.status === "present").length;
  const absentCount = attendance.filter((a: any) => a.status === "absent").length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const totalPoints = pts.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  return {
    id: child.id,
    name: child.name,
    level: child.level,
    gender: child.gender,
    studyMode: child.studyMode,
    isActive: child.isActive,
    relationship: relationship || "parent",
    stats: {
      totalAssignments, completedAssignments,
      completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
      totalAttendance, presentCount, absentCount, attendanceRate,
      totalPoints,
    },
    recentAssignments,
  };
}
