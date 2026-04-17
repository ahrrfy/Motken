import type { Express, Request, Response } from "express";
import multer from "multer";
import { createHash, randomBytes } from "crypto";
import { requireAuth, requireRole } from "../auth";
import { pool } from "../db";
import {
  uploadOtaBundle,
  getOtaBundleStream,
  deleteOtaBundle,
  isMinioAvailable,
} from "../lib/minio";
import { getAppUrl } from "../lib/app-url";

const otaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(n => parseInt(n, 10) || 0);
  const pb = b.split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export function registerOtaRoutes(app: Express) {
  // Capgo endpoint: check for update
  app.post("/api/ota/latest", async (req: Request, res: Response) => {
    try {
      const { version, platform = "android", device_id, app_id } = req.body || {};
      const current = String(version || "0.0.0");
      const channel = "production";

      const result = await pool.query(
        `SELECT version, file_key, checksum, size, min_native_version
         FROM app_bundles
         WHERE channel = $1 AND is_active = true
         ORDER BY created_at DESC
         LIMIT 1`,
        [channel]
      );
      if (result.rows.length === 0) {
        return res.json({ message: "No update available" });
      }
      const latest = result.rows[0];
      if (compareVersions(latest.version, current) <= 0) {
        return res.json({ message: "up-to-date" });
      }

      // Log stat (best-effort)
      pool.query(
        `INSERT INTO ota_stats (version, action, platform, device_id) VALUES ($1, $2, $3, $4)`,
        [latest.version, "set", platform, device_id || null]
      ).catch(() => {});

      const baseUrl = getAppUrl();
      res.json({
        version: latest.version,
        url: `${baseUrl}/api/ota/download/${encodeURIComponent(latest.version)}`,
        sessionKey: randomBytes(16).toString("hex"),
        checksum: latest.checksum,
      });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "OTA check failed" });
    }
  });

  app.get("/api/ota/channel", async (_req: Request, res: Response) => {
    res.json({ channel: "production" });
  });

  // Stream bundle zip
  app.get("/api/ota/download/:version", async (req: Request, res: Response) => {
    try {
      const { version } = req.params;
      const result = await pool.query(
        `SELECT file_key FROM app_bundles WHERE version = $1 AND is_active = true LIMIT 1`,
        [version]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Bundle not found" });
      }
      const stream = await getOtaBundleStream(result.rows[0].file_key);
      if (!stream) {
        return res.status(503).json({ message: "Storage not available" });
      }
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="bundle-${version}.zip"`);
      stream.pipe(res);
    } catch (err) {
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Stats from Capgo client
  app.post("/api/ota/stats", async (req: Request, res: Response) => {
    try {
      const { version, action, platform, device_id, message } = req.body || {};
      await pool.query(
        `INSERT INTO ota_stats (version, action, platform, device_id, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [version || null, action || null, platform || null, device_id || null, message || null]
      );
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

  // ───────── ADMIN ─────────

  app.get("/api/admin/ota/bundles", requireRole("admin"), async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, version, size, channel, release_notes, is_active, min_native_version, created_at
         FROM app_bundles ORDER BY created_at DESC LIMIT 50`
      );
      res.json(result.rows);
    } catch {
      res.status(500).json({ message: "فشل جلب قائمة التحديثات" });
    }
  });

  app.post(
    "/api/admin/ota/bundles",
    requireRole("admin"),
    (req: Request, res: Response, next) => {
      otaUpload.single("file")(req, res, (err: any) => {
        if (err) {
          const msg = err.code === "LIMIT_FILE_SIZE"
            ? "حجم الحزمة يتجاوز الحد الأقصى (200 MB)"
            : err.message || "فشل رفع الحزمة";
          return res.status(400).json({ message: msg });
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        if (!isMinioAvailable()) {
          return res.status(503).json({ message: "خدمة MinIO غير متاحة" });
        }
        if (!req.file) {
          return res.status(400).json({ message: "ملف الحزمة مطلوب" });
        }
        const { version, releaseNotes, channel, minNativeVersion, activate } = req.body as any;
        if (!version || !/^\d+\.\d+\.\d+$/.test(String(version))) {
          return res.status(400).json({ message: "رقم الإصدار غير صالح (X.Y.Z)" });
        }
        const existing = await pool.query(`SELECT id FROM app_bundles WHERE version = $1`, [version]);
        if (existing.rows.length > 0) {
          return res.status(409).json({ message: "هذا الإصدار موجود مسبقاً" });
        }

        const key = `bundles/${version}-${Date.now()}.zip`;
        const saved = await uploadOtaBundle(key, req.file.buffer);
        if (!saved) {
          return res.status(503).json({ message: "فشل رفع الحزمة إلى MinIO" });
        }
        const checksum = createHash("sha256").update(req.file.buffer).digest("hex");
        const shouldActivate = activate === "true" || activate === true;

        if (shouldActivate) {
          // Deactivate previous
          await pool.query(`UPDATE app_bundles SET is_active = false WHERE channel = $1`, [channel || "production"]);
        }

        const result = await pool.query(
          `INSERT INTO app_bundles (version, file_key, checksum, size, channel, release_notes, is_active, min_native_version, released_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [
            version,
            saved,
            checksum,
            req.file.size,
            channel || "production",
            releaseNotes || null,
            shouldActivate,
            minNativeVersion || null,
            (req as any).user?.id || null,
          ]
        );
        res.status(201).json(result.rows[0]);
      } catch (err: any) {
        res.status(500).json({ message: err?.message || "فشل رفع الحزمة" });
      }
    }
  );

  app.patch("/api/admin/ota/bundles/:id", requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, releaseNotes } = req.body || {};
      const row = await pool.query(`SELECT channel FROM app_bundles WHERE id = $1`, [id]);
      if (row.rows.length === 0) return res.status(404).json({ message: "غير موجود" });

      if (isActive === true) {
        await pool.query(`UPDATE app_bundles SET is_active = false WHERE channel = $1`, [row.rows[0].channel]);
      }
      const updated = await pool.query(
        `UPDATE app_bundles
         SET is_active = COALESCE($1, is_active),
             release_notes = COALESCE($2, release_notes)
         WHERE id = $3 RETURNING *`,
        [isActive ?? null, releaseNotes ?? null, id]
      );
      res.json(updated.rows[0]);
    } catch {
      res.status(500).json({ message: "فشل التحديث" });
    }
  });

  app.delete("/api/admin/ota/bundles/:id", requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const row = await pool.query(`SELECT file_key FROM app_bundles WHERE id = $1`, [id]);
      if (row.rows.length === 0) return res.status(404).json({ message: "غير موجود" });
      try { await deleteOtaBundle(row.rows[0].file_key); } catch {}
      await pool.query(`DELETE FROM app_bundles WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "فشل الحذف" });
    }
  });
}
