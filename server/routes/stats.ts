import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  users,
  assignments,
  type User,
} from "@shared/schema";

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
      let usersList: User[];
      if (filterMosqueId) {
        usersList = await storage.getUsersByMosque(filterMosqueId);
      } else {
        usersList = await storage.getUsers();
      }
      let assignmentsList = await storage.getAssignments();
      const mosquesList = await storage.getMosques();

      if (filterMosqueId) {
        assignmentsList = assignmentsList.filter(a => a.mosqueId === filterMosqueId);
      }
      if (filterTeacherId) {
        usersList = usersList.filter(u => u.teacherId === filterTeacherId || u.id === filterTeacherId);
        assignmentsList = assignmentsList.filter(a => a.teacherId === filterTeacherId);
      }

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
        users: usersList.map(({ password, ...u }) => u),
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
        users: myStudents.map(({ password, address, telegramId, educationLevel, parentPhone: _pp, ...u }) => u),
        assignments: myAssignments,
      });
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
        users: mosqueUsers.map(({ password, ...u }) => u),
        assignments: assignmentsList,
      });
    }

    res.json({});
  });

}
