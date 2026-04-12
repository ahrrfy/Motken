import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  users,
  assignments,
  type User,
} from "@shared/schema";
import { sendError } from "../error-handler";
import { toSafeUsers } from "../services/user-service";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";
import { cachedQuery, TTL } from "../cache";

export function registerStatsRoutes(app: Express) {
  // ==================== STATS ====================
  app.get("/api/stats", requireAuth, async (req, res) => {
    const currentUser = req.user!;

    if (currentUser.role === "student") {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const filterMosqueId = req.query.mosqueId as string | undefined;
    const filterTeacherId = req.query.teacherId as string | undefined;

    if (currentUser.role === "admin") {
      const mosqueFilter = filterMosqueId || null;
      const teacherFilter = filterTeacherId || null;
      const cacheKey = `stats:admin:${mosqueFilter}:${teacherFilter}`;

      const aggregated = await cachedQuery(cacheKey, TTL.SHORT, async () => {
        const result = await pool.query(
          `SELECT
            COUNT(DISTINCT CASE WHEN u.role='student' THEN u.id END)::int AS total_students,
            COUNT(DISTINCT CASE WHEN u.role='teacher' THEN u.id END)::int AS total_teachers,
            COUNT(DISTINCT CASE WHEN u.role='supervisor' THEN u.id END)::int AS total_supervisors,
            COUNT(DISTINCT CASE WHEN u.role='student' AND u.is_active THEN u.id END)::int AS active_students,
            COUNT(DISTINCT CASE WHEN u.role='student' AND NOT u.is_active THEN u.id END)::int AS inactive_students,
            COUNT(DISTINCT CASE WHEN u.role='student' AND u.is_special_needs THEN u.id END)::int AS special_needs_students,
            COUNT(DISTINCT CASE WHEN u.role='student' AND u.is_orphan THEN u.id END)::int AS orphan_students
          FROM users u
          WHERE ($1::text IS NULL OR u.mosque_id = $1)
            AND ($2::text IS NULL OR u.teacher_id = $2 OR u.id = $2)`,
          [mosqueFilter, teacherFilter]
        );
        const assignResult = await pool.query(
          `SELECT
            COUNT(*)::int AS total,
            COUNT(CASE WHEN status='done' THEN 1 END)::int AS completed,
            COUNT(CASE WHEN status='pending' THEN 1 END)::int AS pending
          FROM assignments
          WHERE ($1::text IS NULL OR mosque_id = $1)
            AND ($2::text IS NULL OR teacher_id = $2)`,
          [mosqueFilter, teacherFilter]
        );
        const mosqueCount = await pool.query(`SELECT COUNT(*)::int AS total FROM mosques`);
        return { users: result.rows[0], assignments: assignResult.rows[0], mosques: mosqueCount.rows[0].total };
      });

      // User list still needed for the response — but now stats are cached SQL aggregation
      let usersList: User[];
      if (filterMosqueId) {
        usersList = await storage.getUsersByMosque(filterMosqueId);
      } else {
        usersList = await storage.getUsers();
      }
      if (filterTeacherId) {
        usersList = usersList.filter(u => u.teacherId === filterTeacherId || u.id === filterTeacherId);
      }
      let assignmentsList = filterMosqueId
        ? await storage.getAssignmentsByMosque(filterMosqueId)
        : await storage.getAssignments();
      if (filterTeacherId) {
        assignmentsList = assignmentsList.filter(a => a.teacherId === filterTeacherId);
      }

      return res.json({
        totalStudents: aggregated.users.total_students,
        totalTeachers: aggregated.users.total_teachers,
        totalSupervisors: aggregated.users.total_supervisors,
        totalMosques: aggregated.mosques,
        totalAssignments: aggregated.assignments.total,
        completedAssignments: aggregated.assignments.completed,
        pendingAssignments: aggregated.assignments.pending,
        activeStudents: aggregated.users.active_students,
        inactiveStudents: aggregated.users.inactive_students,
        specialNeedsStudents: aggregated.users.special_needs_students,
        orphanStudents: aggregated.users.orphan_students,
        users: toSafeUsers(usersList),
        assignments: assignmentsList,
      });
    }

    if (currentUser.role === "teacher") {
      const myStudents = (await storage.getUsersByTeacher(currentUser.id)).filter(s => !s.pendingApproval);
      const myAssignments = await storage.getAssignmentsByTeacher(currentUser.id);
      return res.json({
        totalStudents: myStudents.length,
        totalAssignments: myAssignments.length,
        completedAssignments: myAssignments.filter(a => a.status === "done").length,
        pendingAssignments: myAssignments.filter(a => a.status === "pending").length,
        activeStudents: myStudents.filter(s => s.isActive).length,
        inactiveStudents: myStudents.filter(s => !s.isActive).length,
        specialNeedsStudents: myStudents.filter(s => s.isSpecialNeeds).length,
        orphanStudents: myStudents.filter(s => s.isOrphan).length,
        users: toSafeUsers(myStudents).map(({ address, telegramId, educationLevel, parentPhone, ...u }) => u),
        assignments: myAssignments,
      });
    }

    if (currentUser.role === "supervisor") {
      const perms = (currentUser as any).supervisorPermissions || {};
      if (perms.canViewAllMosques === true) {
        const usersList = await storage.getUsers();
        const assignmentsList = await storage.getAssignments();
        const mosquesList = await storage.getMosques();
        const studentsList = usersList.filter(u => u.role === "student");
        return res.json({
          totalStudents: studentsList.length,
          totalTeachers: usersList.filter(u => u.role === "teacher").length,
          totalSupervisors: usersList.filter(u => u.role === "supervisor").length,
          totalMosques: mosquesList.length,
          totalAssignments: assignmentsList.length,
          completedAssignments: assignmentsList.filter(a => a.status === "done").length,
          pendingAssignments: assignmentsList.filter(a => a.status === "pending").length,
          activeStudents: studentsList.filter(s => s.isActive).length,
          inactiveStudents: studentsList.filter(s => !s.isActive).length,
          specialNeedsStudents: studentsList.filter(s => s.isSpecialNeeds).length,
          orphanStudents: studentsList.filter(s => s.isOrphan).length,
          users: toSafeUsers(usersList),
          assignments: assignmentsList,
        });
      }
    }

    if (currentUser.role === "supervisor" && currentUser.mosqueId) {
      let mosqueUsers = await storage.getUsersByMosque(currentUser.mosqueId);
      let assignmentsList = await storage.getAssignmentsByMosque(currentUser.mosqueId);

      if (filterTeacherId) {
        mosqueUsers = mosqueUsers.filter(u => u.teacherId === filterTeacherId || u.id === filterTeacherId);
        assignmentsList = assignmentsList.filter(a => a.teacherId === filterTeacherId);
      }

      const mosqueStudents = mosqueUsers.filter(u => u.role === "student");
      return res.json({
        totalTeachers: mosqueUsers.filter(u => u.role === "teacher").length,
        totalStudents: mosqueStudents.length,
        totalAssignments: assignmentsList.length,
        completedAssignments: assignmentsList.filter(a => a.status === "done").length,
        pendingAssignments: assignmentsList.filter(a => a.status === "pending").length,
        activeStudents: mosqueStudents.filter(s => s.isActive).length,
        inactiveStudents: mosqueStudents.filter(s => !s.isActive).length,
        specialNeedsStudents: mosqueStudents.filter(s => s.isSpecialNeeds).length,
        orphanStudents: mosqueStudents.filter(s => s.isOrphan).length,
        users: toSafeUsers(mosqueUsers),
        assignments: assignmentsList,
      });
    }

    res.json({});
  });

  // ==================== GROWTH STATS ====================
  app.get("/api/stats/growth", requireAuth, async (req, res) => {
    const currentUser = req.user!;
    if (currentUser.role !== "admin") {
      return res.status(403).json({ message: "غير مصرح" });
    }
    try {
      const userGrowth = await db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `);
      const assignmentActivity = await db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'done')::int AS completed
        FROM assignments
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `);
      res.json({
        userGrowth: userGrowth.rows,
        assignmentActivity: assignmentActivity.rows,
      });
    } catch (err: unknown) {
      sendError(res, err, "جلب إحصائيات النمو");
    }
  });

}
