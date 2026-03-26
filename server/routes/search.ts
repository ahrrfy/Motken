import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { sendError } from "../error-handler";

export function registerSearchRoutes(app: Express) {
  /**
   * بحث شامل في النظام
   * GET /api/search?q=...&type=all|students|teachers|mosques|assignments
   */
  app.get("/api/search", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const query = (req.query.q as string || "").trim();
      const type = (req.query.type as string) || "all";
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      if (!query || query.length < 2) {
        return res.status(400).json({
          message: "يجب إدخال كلمة بحث (حرفين على الأقل)",
          field: "q",
          source: "validation",
        });
      }

      const results: {
        students: any[];
        teachers: any[];
        mosques: any[];
        assignments: any[];
      } = {
        students: [],
        teachers: [],
        mosques: [],
        assignments: [],
      };

      const searchLower = query.toLowerCase();

      // بحث في الطلاب
      if (type === "all" || type === "students") {
        const allStudents = currentUser.role === "admin"
          ? await storage.getUsersByRole("student")
          : currentUser.mosqueId
            ? await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "student")
            : [];

        results.students = allStudents
          .filter(s =>
            s.name.toLowerCase().includes(searchLower) ||
            s.username.toLowerCase().includes(searchLower) ||
            (s.phone && s.phone.includes(query))
          )
          .slice(0, limit)
          .map(s => ({
            id: s.id,
            name: s.name,
            username: s.username,
            type: "student",
            url: `/students`,
          }));
      }

      // بحث في المعلمين
      if (type === "all" || type === "teachers") {
        const allTeachers = currentUser.role === "admin"
          ? await storage.getUsersByRole("teacher")
          : currentUser.mosqueId
            ? await storage.getUsersByMosqueAndRole(currentUser.mosqueId, "teacher")
            : [];

        results.teachers = allTeachers
          .filter(t =>
            t.name.toLowerCase().includes(searchLower) ||
            t.username.toLowerCase().includes(searchLower)
          )
          .slice(0, limit)
          .map(t => ({
            id: t.id,
            name: t.name,
            username: t.username,
            type: "teacher",
            url: `/teachers`,
          }));
      }

      // بحث في المساجد
      if ((type === "all" || type === "mosques") && ["admin", "supervisor"].includes(currentUser.role)) {
        const allMosques = await storage.getMosques();
        results.mosques = allMosques
          .filter(m =>
            m.name.toLowerCase().includes(searchLower) ||
            (m.city && m.city.toLowerCase().includes(searchLower)) ||
            (m.province && m.province.toLowerCase().includes(searchLower))
          )
          .slice(0, limit)
          .map(m => ({
            id: m.id,
            name: m.name,
            subtitle: [m.city, m.province].filter(Boolean).join(" - "),
            type: "mosque",
            url: `/mosques`,
          }));
      }

      // بحث في الواجبات (بالسورة)
      if (type === "all" || type === "assignments") {
        const allAssignments = currentUser.role === "admin"
          ? await storage.getAssignments()
          : currentUser.mosqueId
            ? await storage.getAssignmentsByMosque(currentUser.mosqueId)
            : [];

        results.assignments = allAssignments
          .filter(a => a.surahName && a.surahName.toLowerCase().includes(searchLower))
          .slice(0, limit)
          .map(a => ({
            id: a.id,
            name: `${a.surahName} (${a.fromVerse}-${a.toVerse})`,
            subtitle: a.status === "done" ? "مكتمل" : "معلّق",
            type: "assignment",
            url: `/assignments`,
          }));
      }

      const totalResults =
        results.students.length +
        results.teachers.length +
        results.mosques.length +
        results.assignments.length;

      res.json({
        query,
        totalResults,
        ...results,
      });
    } catch (err: any) {
      sendError(res, err, "البحث الشامل");
    }
  });
}
