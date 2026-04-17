import type { Express, Request, Response } from "express";
import multer from "multer";
import { randomBytes } from "crypto";
import { requireAuth } from "../auth";
import { pool } from "../db";
import {
  uploadLibraryFile,
  getLibraryFileStream,
  deleteLibraryFile,
} from "../lib/minio";

// اختيار المسجد للعمليات:
// - المستخدم العادي: يستخدم مسجد حسابه
// - المدير: يختار المسجد صراحة عبر ?mosqueId=... أو body.mosqueId
function resolveMosqueId(req: any): string | null {
  const user = req?.user;
  if (user?.mosqueId) return user.mosqueId;
  if (user?.role !== "admin") return null;
  const fromQuery = (req.query?.mosqueId || req.query?.mosque_id) as string | undefined;
  const fromBody = (req.body?.mosqueId || req.body?.mosque_id) as string | undefined;
  const picked = fromQuery || fromBody;
  return picked && typeof picked === "string" ? picked : null;
}

const ALLOWED_LIBRARY_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const ALLOWED_LIBRARY_EXTS = /\.(pdf|docx?|txt)$/i;

const libraryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const mimeOk = ALLOWED_LIBRARY_MIMES.has(file.mimetype);
    const extOk = ALLOWED_LIBRARY_EXTS.test(file.originalname || "");
    if (mimeOk || extOk) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم. الأنواع المسموحة: PDF, DOCX, DOC, TXT"));
    }
  },
});

export function registerLibraryRoutes(app: Express) {

  // GET all sections for the mosque (with branches count and books count)
  app.get("/api/library/sections", requireAuth, async (req, res) => {
    try {
      const mosqueId = await resolveMosqueId(req.user);
      if (!mosqueId) return res.json([]);
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
  app.get("/api/library/branches/:sectionId", requireAuth, async (req, res) => {
    try {
      const mosqueId = await resolveMosqueId(req.user);
      if (!mosqueId) return res.json([]);
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
  app.get("/api/library/books", requireAuth, async (req, res) => {
    try {
      const mosqueId = await resolveMosqueId(req.user);
      if (!mosqueId) return res.json([]);
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
  app.post("/api/library/sections", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) {
        return res.status(400).json({ message: "لا يوجد مسجد مرتبط بحسابك ولا يمكن إنشاء قسم. يرجى إضافة مسجد أولاً." });
      }
      const { name, description, icon, sortOrder } = req.body;
      if (!name) {
        return res.status(400).json({ message: "اسم القسم مطلوب" });
      }
      const result = await pool.query(
        `INSERT INTO library_sections (mosque_id, name, description, icon, sort_order, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [mosqueId, name, description || null, icon || null, sortOrder || 0, user.id]
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في إنشاء القسم" });
    }
  });

  // PUT update section (admin/supervisor only)
  app.put("/api/library/sections/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) return res.status(404).json({ message: "القسم غير موجود" });
      const { id } = req.params;
      const { name, description, icon, sortOrder } = req.body;

      const check = await pool.query(
        `SELECT * FROM library_sections WHERE id = $1 AND mosque_id = $2`,
        [id, mosqueId]
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
  app.delete("/api/library/sections/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) return res.status(404).json({ message: "القسم غير موجود" });
      const { id } = req.params;

      const booksCheck = await pool.query(
        `SELECT COUNT(*)::int AS count FROM library_books WHERE section_id = $1 AND mosque_id = $2`,
        [id, mosqueId]
      );
      if (booksCheck.rows[0].count > 0) {
        return res.status(400).json({ message: "لا يمكن حذف القسم لأنه يحتوي على كتب" });
      }

      // Delete branches first
      await pool.query(
        `DELETE FROM library_branches WHERE section_id = $1 AND mosque_id = $2`,
        [id, mosqueId]
      );

      const result = await pool.query(
        `DELETE FROM library_sections WHERE id = $1 AND mosque_id = $2 RETURNING id`,
        [id, mosqueId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "القسم غير موجود" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "خطأ في حذف القسم" });
    }
  });

  // POST create branch (admin/supervisor only)
  app.post("/api/library/branches", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) {
        return res.status(400).json({ message: "لا يوجد مسجد مرتبط بحسابك" });
      }
      const { sectionId, name, description, sortOrder } = req.body;
      if (!sectionId || !name) {
        return res.status(400).json({ message: "القسم واسم الفرع مطلوبان" });
      }
      const result = await pool.query(
        `INSERT INTO library_branches (section_id, mosque_id, name, description, sort_order, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [sectionId, mosqueId, name, description || null, sortOrder || 0, user.id]
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في إنشاء الفرع" });
    }
  });

  // PUT update branch (admin/supervisor only)
  app.put("/api/library/branches/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) return res.status(404).json({ message: "الفرع غير موجود" });
      const { id } = req.params;
      const { name, description, sortOrder, sectionId } = req.body;

      const check = await pool.query(
        `SELECT * FROM library_branches WHERE id = $1 AND mosque_id = $2`,
        [id, mosqueId]
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
  app.delete("/api/library/branches/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) return res.status(404).json({ message: "الفرع غير موجود" });
      const { id } = req.params;

      const booksCheck = await pool.query(
        `SELECT COUNT(*)::int AS count FROM library_books WHERE branch_id = $1 AND mosque_id = $2`,
        [id, mosqueId]
      );
      if (booksCheck.rows[0].count > 0) {
        return res.status(400).json({ message: "لا يمكن حذف الفرع لأنه يحتوي على كتب" });
      }

      const result = await pool.query(
        `DELETE FROM library_branches WHERE id = $1 AND mosque_id = $2 RETURNING id`,
        [id, mosqueId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "الفرع غير موجود" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "خطأ في حذف الفرع" });
    }
  });

  // POST upload file to MinIO (returns fileKey for book creation)
  app.post(
    "/api/library/books/upload-file",
    requireAuth,
    (req: Request, res: Response, next) => {
      libraryUpload.single("file")(req, res, (err: any) => {
        if (err) {
          const msg = err.code === "LIMIT_FILE_SIZE"
            ? "حجم الملف يتجاوز الحد الأقصى (100 MB)"
            : err.message || "فشل رفع الملف";
          return res.status(400).json({ message: msg });
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        const user = (req as any).user;
        if (!["admin", "supervisor"].includes(user.role)) {
          return res.status(403).json({ message: "غير مصرح" });
        }
        if (!req.file) {
          return res.status(400).json({ message: "لم يُرفق ملف" });
        }
        const mosqueId = await resolveMosqueId(user);
        const originalName = req.file.originalname || "file";
        const ext = (originalName.match(ALLOWED_LIBRARY_EXTS) || ["", ""])[0].toLowerCase() || ".bin";
        const key = `books/${mosqueId || "shared"}/${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
        const saved = await uploadLibraryFile(key, req.file.buffer, req.file.mimetype);
        if (!saved) {
          return res.status(503).json({ message: "خدمة تخزين الملفات غير متاحة. تأكد من إعدادات MinIO." });
        }
        res.json({
          fileKey: saved,
          fileSize: req.file.size,
          fileMime: req.file.mimetype,
          fileName: originalName,
        });
      } catch (err: any) {
        res.status(500).json({ message: err?.message || "فشل رفع الملف" });
      }
    }
  );

  // GET stream file from MinIO
  app.get("/api/library/books/:id/file", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) return res.status(404).json({ message: "الكتاب غير موجود" });
      const { id } = req.params;
      const result = await pool.query(
        `SELECT file_key, file_mime, file_name, title FROM library_books WHERE id = $1 AND mosque_id = $2`,
        [id, mosqueId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "الكتاب غير موجود" });
      }
      const row = result.rows[0];
      if (!row.file_key) {
        return res.status(404).json({ message: "لا يوجد ملف مرفوع لهذا الكتاب" });
      }
      const stream = await getLibraryFileStream(row.file_key);
      if (!stream) {
        return res.status(503).json({ message: "خدمة تخزين الملفات غير متاحة" });
      }
      const safeName = encodeURIComponent(row.file_name || row.title || "file");
      res.setHeader("Content-Type", row.file_mime || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${safeName}`);
      stream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ message: "خطأ في تحميل الملف" });
    }
  });

  // POST create book (admin/supervisor only)
  app.post("/api/library/books", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) {
        return res.status(400).json({ message: "لا يوجد مسجد مرتبط بحسابك" });
      }
      const { sectionId, branchId, title, author, description, pages, url, pdfStorageKey, isPdf, featured, coverImage, fileKey, fileSize, fileMime, fileName } = req.body;
      if (!sectionId || !title) {
        return res.status(400).json({ message: "القسم وعنوان الكتاب مطلوبان" });
      }
      const result = await pool.query(
        `INSERT INTO library_books
          (section_id, branch_id, mosque_id, title, author, description, pages, url, pdf_storage_key, is_pdf, featured, cover_image, file_key, file_size, file_mime, file_name, created_by, added_by_role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          sectionId, branchId || null, mosqueId, title, author || null,
          description || null, pages || null, url || null, pdfStorageKey || null,
          isPdf || false, featured || false, coverImage || null,
          fileKey || null, fileSize || null, fileMime || null, fileName || null,
          user.id, user.role,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "خطأ في إضافة الكتاب" });
    }
  });

  // PUT update book (admin/supervisor only)
  app.put("/api/library/books/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) return res.status(404).json({ message: "الكتاب غير موجود" });
      const { id } = req.params;

      const check = await pool.query(
        `SELECT * FROM library_books WHERE id = $1 AND mosque_id = $2`,
        [id, mosqueId]
      );
      if (check.rows.length === 0) return res.status(404).json({ message: "الكتاب غير موجود" });

      const { sectionId, branchId, title, author, description, pages, url, pdfStorageKey, isPdf, featured, coverImage, fileKey, fileSize, fileMime, fileName } = req.body;

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      // لو تغيّر fileKey (أو حُذف)، احذف القديم من MinIO
      const oldFileKey = check.rows[0].file_key as string | null;
      if (fileKey !== undefined && oldFileKey && oldFileKey !== fileKey) {
        try { await deleteLibraryFile(oldFileKey); } catch {}
      }

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
      if (fileKey !== undefined)        { fields.push(`file_key = $${idx++}`);        values.push(fileKey || null); }
      if (fileSize !== undefined)       { fields.push(`file_size = $${idx++}`);       values.push(fileSize || null); }
      if (fileMime !== undefined)       { fields.push(`file_mime = $${idx++}`);       values.push(fileMime || null); }
      if (fileName !== undefined)       { fields.push(`file_name = $${idx++}`);       values.push(fileName || null); }

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
  app.delete("/api/library/books/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      const mosqueId = await resolveMosqueId(user);
      if (!mosqueId) return res.status(404).json({ message: "الكتاب غير موجود" });
      const { id } = req.params;
      const result = await pool.query(
        `DELETE FROM library_books WHERE id = $1 AND mosque_id = $2 RETURNING id, file_key`,
        [id, mosqueId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "الكتاب غير موجود" });
      const fileKey = result.rows[0].file_key as string | null;
      if (fileKey) {
        try { await deleteLibraryFile(fileKey); } catch {}
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "خطأ في حذف الكتاب" });
    }
  });
}
