import type { Express } from "express";
import { requireAuth, requireRole } from "../auth";
import { db } from "../db";
import { eq, asc, desc, count } from "drizzle-orm";
import {
  mosques, users, assignments, testimonials,
} from "@shared/schema";
import { logActivity } from "./shared";
import { sendError } from "../error-handler";
import { getAppUrl } from "../lib/app-url";

type CredentialsVariant = "simple" | "with-parent" | "parent-linked";

function buildCredentialsMessage(body: any): string {
  const appUrl = getAppUrl();
  const variant: CredentialsVariant = body.variant || "simple";
  const name = String(body.name || "").trim();
  const username = String(body.username || "").trim();
  const password = String(body.password || "").trim();
  const role = String(body.role || "").trim();
  const mosqueName = body.mosqueName ? String(body.mosqueName) : "";
  const parent = body.parent && typeof body.parent === "object" ? body.parent : null;
  const studentNames = Array.isArray(body.studentNames)
    ? body.studentNames.map(String).filter(Boolean)
    : [];

  const roleLabel = role === "admin" ? "مدير"
    : role === "teacher" ? "معلم"
    : role === "supervisor" ? "مشرف"
    : role === "parent" ? "ولي أمر"
    : role === "student" ? "طالب"
    : role;

  if (variant === "with-parent" && parent) {
    return [
      "بسم الله الرحمن الرحيم",
      "",
      "📘 بيانات الطالب:",
      `الاسم: ${name}`,
      `اسم المستخدم: ${username}`,
      `كلمة المرور: ${password}`,
      mosqueName ? `المسجد: ${mosqueName}` : "",
      "",
      "👤 بيانات ولي الأمر:",
      `الاسم: ${parent.name || ""}`,
      `اسم المستخدم: ${parent.username || ""}`,
      `كلمة المرور: ${parent.password || ""}`,
      "",
      `🔗 رابط الدخول: ${appUrl}`,
    ].filter(Boolean).join("\n");
  }

  if (variant === "parent-linked") {
    return [
      `السلام عليكم ورحمة الله وبركاته، ${name}`,
      "",
      "تم إنشاء حساب ولي أمر لك في نظام سِرَاجُ الْقُرْآنِ.",
      "",
      `اسم المستخدم: ${username}`,
      `كلمة المرور: ${password}`,
      studentNames.length ? `الطلاب المرتبطون بحسابك: ${studentNames.join("، ")}` : "",
      "",
      `🔗 رابط الدخول: ${appUrl}`,
    ].filter(Boolean).join("\n");
  }

  // simple
  return [
    "بسم الله الرحمن الرحيم",
    "",
    `السلام عليكم ${name}`,
    "",
    `الدور: ${roleLabel}`,
    `اسم المستخدم: ${username}`,
    `كلمة المرور: ${password}`,
    mosqueName ? `المسجد: ${mosqueName}` : "",
    "",
    `🔗 رابط الدخول للنظام:`,
    appUrl,
  ].filter(Boolean).join("\n");
}

export function registerPublicRoutes(app: Express) {
  // إعدادات عامة لأي متصفح/تطبيق (بلا مصادقة) — ينتج appUrl الرسمي
  app.get("/api/public-config", (_req, res) => {
    res.json({ appUrl: getAppUrl() });
  });

  // توليد رسالة بيانات الدخول من السيرفر — مصدر الحقيقة الوحيد للرابط
  app.post("/api/credentials-message", requireAuth, (req, res) => {
    try {
      const message = buildCredentialsMessage(req.body || {});
      res.json({ message, appUrl: getAppUrl() });
    } catch (err: unknown) {
      sendError(res, err, "توليد رسالة بيانات الدخول");
    }
  });

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
    } catch (err: unknown) {
      sendError(res, err, "جلب آراء المستخدمين");
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
    } catch (err: unknown) {
      sendError(res, err, "إضافة رأي مستخدم");
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
    } catch (err: unknown) {
      sendError(res, err, "تحديث الرأي");
    }
  });

  app.delete("/api/admin/testimonials/:id", requireRole("admin"), async (req, res) => {
    try {
      const [deleted] = await db.delete(testimonials).where(eq(testimonials.id, req.params.id)).returning();
      if (!deleted) return res.status(404).json({ message: "الرأي غير موجود" });
      await logActivity(req.user!, "حذف رأي مستخدم", "testimonials", `${deleted.name}`);
      res.json({ message: "تم الحذف" });
    } catch (err: unknown) {
      sendError(res, err, "حذف الرأي");
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
