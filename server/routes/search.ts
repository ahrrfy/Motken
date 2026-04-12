import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { pool } from "../db";
import { sendError } from "../error-handler";
import { cleanDigits, phoneMatchesSearch, isPhoneQuery } from "@shared/phone-utils";

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

      const pattern = `%${query}%`;
      const mosqueFilter = currentUser.mosqueId || null;

      // بحث في الطلاب — SQL ILIKE instead of loading all records
      if (type === "all" || type === "students") {
        const studentQuery = mosqueFilter
          ? await pool.query(
              `SELECT id, name, username FROM users
               WHERE role = 'student' AND mosque_id = $1
                 AND (name ILIKE $2 OR username ILIKE $2 OR REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE $3)
               ORDER BY name LIMIT $4`,
              [mosqueFilter, pattern, `%${cleanDigits(query)}%`, limit]
            )
          : await pool.query(
              `SELECT id, name, username FROM users
               WHERE role = 'student'
                 AND (name ILIKE $1 OR username ILIKE $1 OR REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE $2)
               ORDER BY name LIMIT $3`,
              [pattern, `%${cleanDigits(query)}%`, limit]
            );
        results.students = studentQuery.rows.map((s: any) => ({
          id: s.id, name: s.name, username: s.username, type: "student", url: `/students`,
        }));
      }

      // بحث في المعلمين
      if (type === "all" || type === "teachers") {
        const teacherQuery = mosqueFilter
          ? await pool.query(
              `SELECT id, name, username FROM users
               WHERE role = 'teacher' AND mosque_id = $1 AND (name ILIKE $2 OR username ILIKE $2)
               ORDER BY name LIMIT $3`,
              [mosqueFilter, pattern, limit]
            )
          : await pool.query(
              `SELECT id, name, username FROM users
               WHERE role = 'teacher' AND (name ILIKE $1 OR username ILIKE $1)
               ORDER BY name LIMIT $2`,
              [pattern, limit]
            );
        results.teachers = teacherQuery.rows.map((t: any) => ({
          id: t.id, name: t.name, username: t.username, type: "teacher", url: `/teachers`,
        }));
      }

      // بحث في المساجد
      if ((type === "all" || type === "mosques") && ["admin", "supervisor"].includes(currentUser.role)) {
        const mosqueQuery = await pool.query(
          `SELECT id, name, city, province FROM mosques
           WHERE name ILIKE $1 OR city ILIKE $1 OR province ILIKE $1
           ORDER BY name LIMIT $2`,
          [pattern, limit]
        );
        results.mosques = mosqueQuery.rows.map((m: any) => ({
          id: m.id, name: m.name,
          subtitle: [m.city, m.province].filter(Boolean).join(" - "),
          type: "mosque", url: `/mosques`,
        }));
      }

      // بحث في الواجبات (بالسورة)
      if (type === "all" || type === "assignments") {
        const assignmentQuery = mosqueFilter
          ? await pool.query(
              `SELECT id, surah_name, from_verse, to_verse, status FROM assignments
               WHERE mosque_id = $1 AND surah_name ILIKE $2
               ORDER BY scheduled_date DESC LIMIT $3`,
              [mosqueFilter, pattern, limit]
            )
          : await pool.query(
              `SELECT id, surah_name, from_verse, to_verse, status FROM assignments
               WHERE surah_name ILIKE $1
               ORDER BY scheduled_date DESC LIMIT $2`,
              [pattern, limit]
            );
        results.assignments = assignmentQuery.rows.map((a: any) => ({
          id: a.id,
          name: `${a.surah_name} (${a.from_verse}-${a.to_verse})`,
          subtitle: a.status === "done" ? "مكتمل" : "معلّق",
          type: "assignment", url: `/assignments`,
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
    } catch (err: unknown) {
      sendError(res, err, "البحث الشامل");
    }
  });
}
