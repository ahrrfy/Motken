import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  schedules,
} from "@shared/schema";
import { filterTextFields } from "@shared/content-filter";
import { logActivity } from "./shared";
import { sendError } from "../error-handler";

export function registerSchedulesRoutes(app: Express) {
  // ==================== SCHEDULES ====================
  app.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { mosqueId, teacherId } = req.query;
      if (mosqueId) {
        if (currentUser.role !== "admin" && mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لجداول جامع آخر" });
        }
        const scheds = await storage.getSchedulesByMosque(mosqueId as string);
        return res.json(scheds);
      }
      if (teacherId) {
        if (currentUser.role !== "admin" && currentUser.role !== "supervisor") {
          if (currentUser.id !== teacherId) {
            return res.status(403).json({ message: "غير مصرح بالوصول لجداول معلم آخر" });
          }
        }
        const scheds = await storage.getSchedulesByTeacher(teacherId as string);
        return res.json(scheds);
      }
      if (currentUser.role === "teacher") {
        const scheds = await storage.getSchedulesByTeacher(currentUser.id);
        return res.json(scheds);
      }
      if (currentUser.mosqueId) {
        const scheds = await storage.getSchedulesByMosque(currentUser.mosqueId);
        return res.json(scheds);
      }
      res.json([]);
    } catch (err: any) {
      sendError(res, err, "جلب الجداول");
    }
  });

  app.post("/api/schedules", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء جدول" });
      }
      const schedTextCheck = filterTextFields(req.body, ["title", "location"]);
      if (schedTextCheck.blocked) {
        return res.status(400).json({ message: schedTextCheck.reason });
      }
      const { teacherId, title, dayOfWeek, startTime, endTime, location } = req.body;
      if (!title || dayOfWeek === undefined || !startTime || !endTime) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب تعبئتها" });
      }
      const schedule = await storage.createSchedule({
        mosqueId: currentUser.mosqueId,
        teacherId: teacherId || currentUser.id,
        title,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        location,
      });
      await logActivity(currentUser, `إنشاء جدول: ${title}`, "schedules");
      res.status(201).json(schedule);
    } catch (err: any) {
      sendError(res, err, "إنشاء جدول");
    }
  });

  app.patch("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتعديل الجدول" });
      }
      const existingSchedule = await storage.getSchedule(req.params.id);
      if (!existingSchedule) return res.status(404).json({ message: "الجدول غير موجود" });
      if (currentUser.role !== "admin" && existingSchedule.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتعديل جدول جامع آخر" });
      }
      const updateData: any = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.dayOfWeek !== undefined) updateData.dayOfWeek = Number(req.body.dayOfWeek);
      if (req.body.startTime !== undefined) updateData.startTime = req.body.startTime;
      if (req.body.endTime !== undefined) updateData.endTime = req.body.endTime;
      if (req.body.location !== undefined) updateData.location = req.body.location;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      const updated = await storage.updateSchedule(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "الجدول غير موجود" });
      await logActivity(currentUser, "تعديل جدول", "schedules");
      res.json(updated);
    } catch (err: any) {
      sendError(res, err, "تعديل الجدول");
    }
  });

  app.delete("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بحذف الجدول" });
      }
      const schedToDelete = await storage.getSchedule(req.params.id);
      if (!schedToDelete) return res.status(404).json({ message: "الجدول غير موجود" });
      if (currentUser.role !== "admin" && schedToDelete.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بحذف جدول جامع آخر" });
      }
      await storage.deleteSchedule(req.params.id);
      await logActivity(currentUser, "حذف جدول", "schedules");
      res.json({ message: "تم حذف الجدول" });
    } catch (err: any) {
      sendError(res, err, "حذف الجدول");
    }
  });

}
