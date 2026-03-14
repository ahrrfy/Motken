import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  competitions,
} from "@shared/schema";
import { filterTextFields } from "@shared/content-filter";
import { logActivity } from "./shared";

export function registerCompetitionsRoutes(app: Express) {
  // ==================== COMPETITIONS ====================
  app.get("/api/competitions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const mosqueId = req.query.mosqueId as string | undefined;
      if (mosqueId) {
        if (currentUser.role !== "admin" && mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لمسابقات جامع آخر" });
        }
        const comps = await storage.getCompetitionsByMosque(mosqueId);
        return res.json(comps);
      }
      if (currentUser.role === "admin") {
        const comps = await storage.getCompetitions();
        return res.json(comps);
      }
      if (currentUser.mosqueId) {
        const comps = await storage.getCompetitionsByMosque(currentUser.mosqueId);
        return res.json(comps);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب المسابقات" });
    }
  });

  app.get("/api/competitions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const comp = await storage.getCompetition(req.params.id);
      if (!comp) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && comp.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذه المسابقة" });
      }
      const participants = await storage.getCompetitionParticipants(req.params.id);
      res.json({ ...comp, participants });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في جلب المسابقة" });
    }
  });

  app.post("/api/competitions", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإنشاء مسابقة" });
      }
      const compTextCheck = filterTextFields(req.body, ["title", "description"]);
      if (compTextCheck.blocked) {
        return res.status(400).json({ message: compTextCheck.reason });
      }
      const { title, description, surahName, fromVerse, toVerse, competitionDate } = req.body;
      if (!title || !competitionDate) {
        return res.status(400).json({ message: "العنوان وتاريخ المسابقة مطلوبان" });
      }
      const comp = await storage.createCompetition({
        mosqueId: currentUser.mosqueId,
        createdBy: currentUser.id,
        title,
        description,
        surahName,
        fromVerse: fromVerse ? Number(fromVerse) : undefined,
        toVerse: toVerse ? Number(toVerse) : undefined,
        competitionDate: new Date(competitionDate),
      });
      await logActivity(currentUser, `إنشاء مسابقة: ${title}`, "competitions");
      res.status(201).json(comp);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إنشاء المسابقة" });
    }
  });

  app.patch("/api/competitions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتعديل المسابقة" });
      }
      const existingComp = await storage.getCompetition(req.params.id);
      if (!existingComp) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && existingComp.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتعديل مسابقة جامع آخر" });
      }
      const updateData: any = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.surahName !== undefined) updateData.surahName = req.body.surahName;
      if (req.body.fromVerse !== undefined) updateData.fromVerse = Number(req.body.fromVerse);
      if (req.body.toVerse !== undefined) updateData.toVerse = Number(req.body.toVerse);
      if (req.body.competitionDate !== undefined) updateData.competitionDate = new Date(req.body.competitionDate);
      if (req.body.status !== undefined) updateData.status = req.body.status;
      const updated = await storage.updateCompetition(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "المسابقة غير موجودة" });
      await logActivity(currentUser, "تعديل مسابقة", "competitions");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تعديل المسابقة" });
    }
  });

  app.delete("/api/competitions/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بحذف المسابقة" });
      }
      const compToDelete = await storage.getCompetition(req.params.id);
      if (!compToDelete) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && compToDelete.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بحذف مسابقة جامع آخر" });
      }
      await storage.deleteCompetition(req.params.id);
      await logActivity(currentUser, "حذف مسابقة", "competitions");
      res.json({ message: "تم حذف المسابقة" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في حذف المسابقة" });
    }
  });

  app.post("/api/competitions/:id/participants", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "teacher", "supervisor"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإضافة مشاركين" });
      }
      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ message: "معرف الطالب مطلوب" });
      }
      const participant = await storage.createCompetitionParticipant({
        competitionId: req.params.id,
        studentId,
      });
      await logActivity(currentUser, "إضافة مشارك في مسابقة", "competitions");
      res.status(201).json(participant);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إضافة المشارك" });
    }
  });

  app.patch("/api/competitions/:id/participants/:participantId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بتعديل نتائج المشاركين" });
      }
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && competition.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بتعديل مسابقة جامع آخر" });
      }
      const updateData: any = {};
      if (req.body.score !== undefined) updateData.score = Number(req.body.score);
      if (req.body.rank !== undefined) updateData.rank = Number(req.body.rank);
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      const updated = await storage.updateCompetitionParticipant(req.params.participantId, updateData);
      if (!updated) return res.status(404).json({ message: "المشارك غير موجود" });
      await logActivity(currentUser, "تعديل نتيجة مشارك", "competitions");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في تعديل المشارك" });
    }
  });

  app.delete("/api/competitions/:id/participants/:participantId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!["admin", "supervisor", "teacher"].includes(currentUser.role)) {
        return res.status(403).json({ message: "غير مصرح بإزالة المشاركين" });
      }
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) return res.status(404).json({ message: "المسابقة غير موجودة" });
      if (currentUser.role !== "admin" && competition.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذه المسابقة" });
      }
      await storage.deleteCompetitionParticipant(req.params.participantId);
      await logActivity(currentUser, "إزالة مشارك من مسابقة", "competitions");
      res.json({ message: "تم إزالة المشارك" });
    } catch (err: any) {
      res.status(500).json({ message: "حدث خطأ في إزالة المشارك" });
    }
  });

}
