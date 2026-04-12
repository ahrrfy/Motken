import type { Express } from "express";
import { requireAuth } from "../auth";
import { pool } from "../db";

export function registerLibraryRoutes(app: Express) {

  // GET all sections for the mosque (with branches count and books count)
  app.get("/api/library/sections", requireAuth, async (req: any, res) => {
    try {
      const mosqueId = req.user.mosqueId;
      const result = await pool.query(
        `SELECT ls.*,
                COALESCE(bc.branches_count, 0)::int AS branches_count,
                COALESCE(bk.books_count, 0)::int AS books_count
         FROM library_sections ls
         LEFT JOIN (
           SELECT section_id, COUNT(*)::int AS branches_count
           FROM library_branches WHERE mosque_id = $1
           GROUP BY section_id
         ) bc ON bc.section_id = ls.id
         LEFT JOIN (
           SELECT section_id, COUNT(*)::int AS books_count
           FROM library_books WHERE mosque_id = $1
           GROUP BY section_id
         ) bk ON bk.section_id = ls.id
         WHERE ls.mosque_id = $1
         ORDER BY ls.sort_order ASC, ls.created_at ASC`,
        [mosqueId]
      );
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ message: "خطأ في جلب أقسام المكتبة" });
    }
  });

  // GET branches for a section
  app.get("/api/library/branches/:sectionId", requireAuth, async (req: any, res) => {
    try {
      const mosqueId = req.user.mosqueId;
      const { sectionId } = req.params;
      const result = await pool.query(
        `SELECT lb.*,
                COALESCE(bk.books_count, 0)::int AS books_count
         FROM library_branches lb
         LEFT JOIN (
           SELECT branch_id, COUNT(*)::int AS books_count
           FROM library_books WHERE mosque_id = $1
           GROUP BY branch_id
         ) bk ON bk.branch_id = lb.id
         WHERE lb.section_id = $2 AND lb.mosque_id = $1
         ORDER BY lb.sort_order ASC, lb.created_at ASC`,
        [mosqueId, sectionId]
      );
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ message: "خطأ في جلب أفرع القسم" });
    }
  });

  // GET books with optional filters
  app.get("/api/library/books", requireAuth, async (req: any, res) => {
    try {
      const mosqueId = req.user.mosqueId;
      const { sectionId, branchId, search } = req.query;

      let query = `SELECT * FROM library_books WHERE mosque_id = $1`;
      const params: any[] = [mosqueId];
      let idx = 2;

      if (sectionId) {
        query += ` AND section_id = $${idx++}`;
        params.push(sectionId);
      }
      if (branchId) {
        query += ` AND branch_id = $${idx++}`;
        params.push(branchId);
      }
      if (search) {
        query += ` AND (title ILIKE $${idx} OR author ILIKE $${idx})`;
        params.push(`%${search}%`);
        idx++;
      }

      query += ` ORDER BY featured DESC, created_at DESC`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ message: "خطأ في جلب الكتب" });
    }
  });

  // POST create section (admin/supervisor only)
  app.post("/api/library/sections", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { name, description, icon, sortOrder } = req.body;
      if (!name) {
        return res.status(400).json({ message: "اسم القسم مطلوب" });
      }
      const result = await pool.query(
        `INSERT INTO library_sections (mosque_id, name, description, icon, sort_order, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user.mosqueId, name, description || null, icon || null, sortOrder || 0, user.id]
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في إنشاء القسم" });
    }
  });

  // PUT update section (admin/supervisor only)
  app.put("/api/library/sections/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { id } = req.params;
      const { name, description, icon, sortOrder } = req.body;

      const check = await pool.query(
        `SELECT * FROM library_sections WHERE id = $1 AND mosque_id = $2`,
        [id, user.mosqueId]
      );
      if (check.rows.length === 0) return res.status(404).json({ message: "القسم غير موجود" });

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (name !== undefined)        { fields.push(`name = $${idx++}`);        values.push(name); }
      if (description !== undefined)  { fields.push(`description = $${idx++}`); values.push(description); }
      if (icon !== undefined)         { fields.push(`icon = $${idx++}`);        values.push(icon); }
      if (sortOrder !== undefined)    { fields.push(`sort_order = $${idx++}`);  values.push(sortOrder); }

      if (fields.length === 0) return res.status(400).json({ message: "لا توجد حقول للتحديث" });

      values.push(id);
      const result = await pool.query(
        `UPDATE library_sections SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
      );
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في تحديث القسم" });
    }
  });

  // DELETE section (admin/supervisor only, only if no books)
  app.delete("/api/library/sections/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { id } = req.params;

      const booksCheck = await pool.query(
        `SELECT COUNT(*)::int AS count FROM library_books WHERE section_id = $1 AND mosque_id = $2`,
        [id, user.mosqueId]
      );
      if (booksCheck.rows[0].count > 0) {
        return res.status(400).json({ message: "لا يمكن حذف القسم لأنه يحتوي على كتب" });
      }

      // Delete branches first
      await pool.query(
        `DELETE FROM library_branches WHERE section_id = $1 AND mosque_id = $2`,
        [id, user.mosqueId]
      );

      const result = await pool.query(
        `DELETE FROM library_sections WHERE id = $1 AND mosque_id = $2 RETURNING id`,
        [id, user.mosqueId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "القسم غير موجود" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "خطأ في حذف القسم" });
    }
  });

  // POST create branch (admin/supervisor only)
  app.post("/api/library/branches", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { sectionId, name, description, sortOrder } = req.body;
      if (!sectionId || !name) {
        return res.status(400).json({ message: "القسم واسم الفرع مطلوبان" });
      }
      const result = await pool.query(
        `INSERT INTO library_branches (section_id, mosque_id, name, description, sort_order, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [sectionId, user.mosqueId, name, description || null, sortOrder || 0, user.id]
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في إنشاء الفرع" });
    }
  });

  // PUT update branch (admin/supervisor only)
  app.put("/api/library/branches/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { id } = req.params;
      const { name, description, sortOrder, sectionId } = req.body;

      const check = await pool.query(
        `SELECT * FROM library_branches WHERE id = $1 AND mosque_id = $2`,
        [id, user.mosqueId]
      );
      if (check.rows.length === 0) return res.status(404).json({ message: "الفرع غير موجود" });

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (name !== undefined)        { fields.push(`name = $${idx++}`);        values.push(name); }
      if (description !== undefined)  { fields.push(`description = $${idx++}`); values.push(description); }
      if (sortOrder !== undefined)    { fields.push(`sort_order = $${idx++}`);  values.push(sortOrder); }
      if (sectionId !== undefined)    { fields.push(`section_id = $${idx++}`);  values.push(sectionId); }

      if (fields.length === 0) return res.status(400).json({ message: "لا توجد حقول للتحديث" });

      values.push(id);
      const result = await pool.query(
        `UPDATE library_branches SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
      );
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في تحديث الفرع" });
    }
  });

  // DELETE branch (admin/supervisor only, only if no books)
  app.delete("/api/library/branches/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { id } = req.params;

      const booksCheck = await pool.query(
        `SELECT COUNT(*)::int AS count FROM library_books WHERE branch_id = $1 AND mosque_id = $2`,
        [id, user.mosqueId]
      );
      if (booksCheck.rows[0].count > 0) {
        return res.status(400).json({ message: "لا يمكن حذف الفرع لأنه يحتوي على كتب" });
      }

      const result = await pool.query(
        `DELETE FROM library_branches WHERE id = $1 AND mosque_id = $2 RETURNING id`,
        [id, user.mosqueId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "الفرع غير موجود" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "خطأ في حذف الفرع" });
    }
  });

  // POST create book (admin/supervisor only)
  app.post("/api/library/books", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { sectionId, branchId, title, author, description, pages, url, pdfStorageKey, isPdf, featured, coverImage } = req.body;
      if (!sectionId || !title) {
        return res.status(400).json({ message: "القسم وعنوان الكتاب مطلوبان" });
      }
      const result = await pool.query(
        `INSERT INTO library_books
          (section_id, branch_id, mosque_id, title, author, description, pages, url, pdf_storage_key, is_pdf, featured, cover_image, created_by, added_by_role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          sectionId, branchId || null, user.mosqueId, title, author || null,
          description || null, pages || null, url || null, pdfStorageKey || null,
          isPdf || false, featured || false, coverImage || null, user.id, user.role,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في إضافة الكتاب" });
    }
  });

  // PUT update book (admin/supervisor only)
  app.put("/api/library/books/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { id } = req.params;

      const check = await pool.query(
        `SELECT * FROM library_books WHERE id = $1 AND mosque_id = $2`,
        [id, user.mosqueId]
      );
      if (check.rows.length === 0) return res.status(404).json({ message: "الكتاب غير موجود" });

      const { sectionId, branchId, title, author, description, pages, url, pdfStorageKey, isPdf, featured, coverImage } = req.body;

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (sectionId !== undefined)      { fields.push(`section_id = $${idx++}`);      values.push(sectionId); }
      if (branchId !== undefined)       { fields.push(`branch_id = $${idx++}`);       values.push(branchId || null); }
      if (title !== undefined)          { fields.push(`title = $${idx++}`);           values.push(title); }
      if (author !== undefined)         { fields.push(`author = $${idx++}`);          values.push(author); }
      if (description !== undefined)    { fields.push(`description = $${idx++}`);     values.push(description); }
      if (pages !== undefined)          { fields.push(`pages = $${idx++}`);           values.push(pages); }
      if (url !== undefined)            { fields.push(`url = $${idx++}`);             values.push(url); }
      if (pdfStorageKey !== undefined)  { fields.push(`pdf_storage_key = $${idx++}`); values.push(pdfStorageKey); }
      if (isPdf !== undefined)          { fields.push(`is_pdf = $${idx++}`);          values.push(isPdf); }
      if (featured !== undefined)       { fields.push(`featured = $${idx++}`);        values.push(featured); }
      if (coverImage !== undefined)     { fields.push(`cover_image = $${idx++}`);     values.push(coverImage); }

      if (fields.length === 0) return res.status(400).json({ message: "لا توجد حقول للتحديث" });

      values.push(id);
      const result = await pool.query(
        `UPDATE library_books SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
      );
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في تحديث الكتاب" });
    }
  });

  // DELETE book (admin/supervisor only)
  app.delete("/api/library/books/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const { id } = req.params;
      const result = await pool.query(
        `DELETE FROM library_books WHERE id = $1 AND mosque_id = $2 RETURNING id`,
        [id, user.mosqueId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "الكتاب غير موجود" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "خطأ في حذف الكتاب" });
    }
  });
}
