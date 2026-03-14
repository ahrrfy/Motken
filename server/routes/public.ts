import type { Express } from "express";
import { requireRole } from "../auth";
import { db } from "../db";
import { eq, asc, desc, count } from "drizzle-orm";
import {
  mosques, users, assignments, testimonials,
} from "@shared/schema";
import { logActivity } from "./shared";

export function registerPublicRoutes(app: Express) {
  app.get("/api/public-testimonials", async (_req, res) => {
    try {
      const all = await db.select().from(testimonials).where(eq(testimonials.isActive, true)).orderBy(asc(testimonials.sortOrder));
      res.json(all);
    } catch {
      res.json([]);
    }
  });

  app.get("/api/admin/testimonials", requireRole("admin"), async (_req, res) => {
    try {
      const all = await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt));
      res.json(all);
    } catch {
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/admin/testimonials", requireRole("admin"), async (req, res) => {
    try {
      const { name, role, text, rating, isActive, sortOrder } = req.body;
      if (!name || !role || !text) return res.status(400).json({ message: "الاسم والدور والنص مطلوبة" });
      const [created] = await db.insert(testimonials).values({
        name, role, text,
        rating: Math.min(Math.max(Number(rating) || 5, 1), 5),
        isActive: isActive !== false,
        sortOrder: Number(sortOrder) || 0,
      }).returning();
      await logActivity(req.user!, "إضافة رأي مستخدم", "testimonials", `${name}`);
      res.json(created);
    } catch {
      res.status(500).json({ message: "حدث خطأ في إضافة الرأي" });
    }
  });

  app.patch("/api/admin/testimonials/:id", requireRole("admin"), async (req, res) => {
    try {
      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.role !== undefined) updateData.role = req.body.role;
      if (req.body.text !== undefined) updateData.text = req.body.text;
      if (req.body.rating !== undefined) updateData.rating = Math.min(Math.max(Number(req.body.rating), 1), 5);
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      if (req.body.sortOrder !== undefined) updateData.sortOrder = Number(req.body.sortOrder);
      const [updated] = await db.update(testimonials).set(updateData).where(eq(testimonials.id, req.params.id)).returning();
      if (!updated) return res.status(404).json({ message: "الرأي غير موجود" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "حدث خطأ في تحديث الرأي" });
    }
  });

  app.delete("/api/admin/testimonials/:id", requireRole("admin"), async (req, res) => {
    try {
      const [deleted] = await db.delete(testimonials).where(eq(testimonials.id, req.params.id)).returning();
      if (!deleted) return res.status(404).json({ message: "الرأي غير موجود" });
      await logActivity(req.user!, "حذف رأي مستخدم", "testimonials", `${deleted.name}`);
      res.json({ message: "تم الحذف" });
    } catch {
      res.status(500).json({ message: "حدث خطأ في حذف الرأي" });
    }
  });

  app.get("/api/public-stats", async (_req, res) => {
    try {
      const [mosquesCount] = await db.select({ c: count() }).from(mosques);
      const [studentsCount] = await db.select({ c: count() }).from(users).where(eq(users.role, "student"));
      const [teachersCount] = await db.select({ c: count() }).from(users).where(eq(users.role, "teacher"));
      const [assignmentsCount] = await db.select({ c: count() }).from(assignments).where(eq(assignments.status, "done"));
      res.json({
        mosques: mosquesCount?.c || 0,
        students: studentsCount?.c || 0,
        teachers: teachersCount?.c || 0,
        completedAssignments: assignmentsCount?.c || 0,
      });
    } catch {
      res.json({ mosques: 0, students: 0, teachers: 0, completedAssignments: 0 });
    }
  });
}
