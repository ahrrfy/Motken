import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  messageTemplates,
  communicationLogs,
} from "@shared/schema";
import { sendError } from "../error-handler";

export function registerCommunicationRoutes(app: Express) {
  // ==================== MESSAGE TEMPLATES ====================
  app.get("/api/message-templates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const allTemplates = await db.select().from(messageTemplates);
      const filtered = allTemplates.filter(t =>
        !t.mosqueId || t.mosqueId === currentUser.mosqueId || currentUser.role === "admin"
      );
      res.json(filtered);
    } catch (err: any) {
      sendError(res, err, "جلب قوالب الرسائل");
    }
  });

  app.post("/api/message-templates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { category, title, content } = req.body;
      if (!category || !title || !content) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const [template] = await db.insert(messageTemplates).values({
        mosqueId: currentUser.mosqueId,
        category,
        title,
        content,
        createdBy: currentUser.id,
      }).returning();
      res.status(201).json(template);
    } catch (err: any) {
      sendError(res, err, "إنشاء قالب رسالة");
    }
  });

  app.delete("/api/message-templates/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { eq } = await import("drizzle-orm");
      const [template] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, req.params.id));
      if (!template) return res.status(404).json({ message: "القالب غير موجود" });
      if (currentUser.role !== "admin" && template.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بحذف هذا القالب" });
      }
      await db.delete(messageTemplates).where(eq(messageTemplates.id, req.params.id));
      res.json({ message: "تم الحذف" });
    } catch (err: any) {
      sendError(res, err, "حذف قالب الرسالة");
    }
  });


  // ==================== COMMUNICATION LOG ====================
  app.get("/api/communication-log/:studentId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      if (currentUser.role !== "admin") {
        const student = await storage.getUser(req.params.studentId);
        if (!student || student.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لسجل طالب من جامع آخر" });
        }
      }
      const { eq } = await import("drizzle-orm");
      const logs = await db.select().from(communicationLogs).where(eq(communicationLogs.studentId, req.params.studentId));
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(logs);
    } catch (err: any) {
      sendError(res, err, "جلب سجل التواصل");
    }
  });

  app.post("/api/communication-log", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { studentId, method, subject, notes, parentPhone } = req.body;
      if (!studentId || !method || !subject) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      if (currentUser.role !== "admin") {
        const student = await storage.getUser(studentId);
        if (!student || student.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالتواصل مع طالب من جامع آخر" });
        }
      }
      const [log] = await db.insert(communicationLogs).values({
        studentId,
        mosqueId: currentUser.mosqueId,
        contactedBy: currentUser.id,
        method,
        subject,
        notes,
        parentPhone,
      }).returning();
      res.status(201).json(log);
    } catch (err: any) {
      sendError(res, err, "تسجيل تواصل");
    }
  });

}
