import type { Express } from "express";
import { requireAuth } from "../auth";
import { pool } from "../db";

export function registerExternalAssignmentsRoutes(app: Express) {

  // GET all external assignments for the mosque
  app.get("/api/external-assignments", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = user.mosqueId;
      const result = await pool.query(
        `SELECT ea.*, u.name AS creator_name
         FROM external_assignments ea
         LEFT JOIN users u ON u.id = ea.created_by
         WHERE ea.mosque_id = $1
         ORDER BY ea.assigned_date DESC, ea.created_at DESC`,
        [mosqueId]
      );
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ message: "خطأ في جلب الواجبات الخارجية" });
    }
  });

  // POST create external assignment
  app.post("/api/external-assignments", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { studentId, studentName, bookName, pagesFrom, pagesTo, assignedDate, dueDate, notes } = req.body;
      if (!bookName || !assignedDate) {
        return res.status(400).json({ message: "اسم الكتاب وتاريخ الواجب مطلوبان" });
      }
      const result = await pool.query(
        `INSERT INTO external_assignments
          (mosque_id, created_by, student_id, student_name, book_name, pages_from, pages_to, assigned_date, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          user.mosqueId,
          user.id,
          studentId || null,
          studentName || null,
          bookName,
          pagesFrom || null,
          pagesTo || null,
          assignedDate,
          dueDate || null,
          notes || null,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في إنشاء الواجب الخارجي" });
    }
  });

  // PATCH update (mark complete, edit notes, etc.)
  app.patch("/api/external-assignments/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { id } = req.params;
      const { status, completionDate, notes, bookName, pagesFrom, pagesTo, dueDate } = req.body;

      const check = await pool.query(
        `SELECT * FROM external_assignments WHERE id = $1 AND mosque_id = $2`,
        [id, user.mosqueId]
      );
      if (check.rows.length === 0) return res.status(404).json({ message: "غير موجود" });

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (status !== undefined)         { fields.push(`status = $${idx++}`);           values.push(status); }
      if (completionDate !== undefined) { fields.push(`completion_date = $${idx++}`);  values.push(completionDate || null); }
      if (notes !== undefined)          { fields.push(`notes = $${idx++}`);            values.push(notes); }
      if (bookName !== undefined)       { fields.push(`book_name = $${idx++}`);        values.push(bookName); }
      if (pagesFrom !== undefined)      { fields.push(`pages_from = $${idx++}`);       values.push(pagesFrom || null); }
      if (pagesTo !== undefined)        { fields.push(`pages_to = $${idx++}`);         values.push(pagesTo || null); }
      if (dueDate !== undefined)        { fields.push(`due_date = $${idx++}`);         values.push(dueDate || null); }

      if (fields.length === 0) return res.status(400).json({ message: "لا توجد حقول للتحديث" });

      values.push(id);
      const result = await pool.query(
        `UPDATE external_assignments SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
      );
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في التحديث" });
    }
  });

  // DELETE
  app.delete("/api/external-assignments/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor", "teacher"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { id } = req.params;
      const result = await pool.query(
        `DELETE FROM external_assignments WHERE id = $1 AND mosque_id = $2 RETURNING id`,
        [id, user.mosqueId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "غير موجود" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "خطأ في الحذف" });
    }
  });
}
