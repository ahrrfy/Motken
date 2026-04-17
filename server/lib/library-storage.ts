/**
 * طبقة تخزين موحَّدة لملفات المكتبة.
 * - أولاً: يحاول MinIO (إذا كان مُعدّاً)
 * - ثانياً: يعود إلى نظام الملفات المحلي تلقائياً (بلا إعدادات إضافية)
 *
 * تنسيق الـ key المُعاد:
 *   minio:books/{mosqueId}/{ts}-{rand}.pdf   ← MinIO
 *   disk:books/{mosqueId}/{ts}-{rand}.pdf    ← القرص المحلي
 *   books/{mosqueId}/{ts}-{rand}.pdf         ← قديم (بلا prefix) — يُقرأ بالتحقق الذكي
 *
 * هذا يجعل الرفع يعمل دائماً حتى بدون إعداد MinIO.
 */

import { promises as fs, createReadStream, existsSync } from "fs";
import path from "path";
import { logger } from "./logger";
import {
  uploadLibraryFile as minioUpload,
  getLibraryFileStream as minioGetStream,
  deleteLibraryFile as minioDelete,
  isMinioAvailable,
} from "./minio";

const DISK_ROOT = path.resolve(
  process.env.LIBRARY_STORAGE_DIR || "./uploads/library",
);

const MINIO_PREFIX = "minio:";
const DISK_PREFIX = "disk:";

// ─── Helpers ────────────────────────────────────────────────────────────────

function sanitizeKey(key: string): string {
  // تحويل الـ backslash للـ forward slash + منع محاولات الخروج من المجلد
  return key.replace(/\\/g, "/").replace(/\.\.[\\/]/g, "");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// ─── Disk storage ───────────────────────────────────────────────────────────

async function uploadToDisk(key: string, buffer: Buffer): Promise<string | null> {
  try {
    const safe = sanitizeKey(key);
    const full = path.join(DISK_ROOT, safe);
    await ensureDir(path.dirname(full));
    await fs.writeFile(full, buffer);
    logger.info({ key: safe, size: buffer.length, dir: DISK_ROOT }, "library.disk.uploaded");
    return safe;
  } catch (err: unknown) {
    logger.error({ err, key, dir: DISK_ROOT }, "library.disk.upload_failed");
    return null;
  }
}

function diskStream(key: string): NodeJS.ReadableStream | null {
  try {
    const safe = sanitizeKey(key);
    const full = path.join(DISK_ROOT, safe);
    if (!existsSync(full)) return null;
    return createReadStream(full);
  } catch (err: unknown) {
    logger.error({ err, key }, "library.disk.stream_failed");
    return null;
  }
}

async function deleteFromDisk(key: string): Promise<boolean> {
  try {
    const safe = sanitizeKey(key);
    const full = path.join(DISK_ROOT, safe);
    if (!existsSync(full)) return true; // already gone
    await fs.unlink(full);
    return true;
  } catch (err: unknown) {
    logger.error({ err, key }, "library.disk.delete_failed");
    return false;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * يرفع الملف إلى MinIO (إن توفّر) أو إلى القرص المحلي.
 * يُرجع key مع prefix يوضح مكان التخزين، أو null عند الفشل.
 */
export async function uploadLibraryFile(
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string | null> {
  // جرّب MinIO أولاً
  if (isMinioAvailable()) {
    const saved = await minioUpload(key, buffer, mimeType);
    if (saved) return `${MINIO_PREFIX}${saved}`;
    logger.warn({ key }, "library.minio.upload_failed_falling_back_to_disk");
  }

  // fallback للقرص
  const diskSaved = await uploadToDisk(key, buffer);
  if (diskSaved) return `${DISK_PREFIX}${diskSaved}`;
  return null;
}

/**
 * يُرجع stream من المصدر الصحيح بناءً على الـ prefix.
 * يتعامل مع المفاتيح القديمة (بلا prefix) بالمحاولة في الاثنين.
 */
export async function getLibraryFileStream(
  keyWithPrefix: string,
): Promise<NodeJS.ReadableStream | null> {
  if (!keyWithPrefix) return null;

  // MinIO
  if (keyWithPrefix.startsWith(MINIO_PREFIX)) {
    return minioGetStream(keyWithPrefix.slice(MINIO_PREFIX.length));
  }
  // Disk
  if (keyWithPrefix.startsWith(DISK_PREFIX)) {
    return diskStream(keyWithPrefix.slice(DISK_PREFIX.length));
  }

  // مفتاح قديم بلا prefix — جرّب MinIO ثم القرص
  if (isMinioAvailable()) {
    const s = await minioGetStream(keyWithPrefix);
    if (s) return s;
  }
  return diskStream(keyWithPrefix);
}

/**
 * حذف من المصدر الصحيح.
 * يعود true إذا حُذف بنجاح أو لم يكن موجوداً أصلاً.
 */
export async function deleteLibraryFile(keyWithPrefix: string): Promise<boolean> {
  if (!keyWithPrefix) return true;

  if (keyWithPrefix.startsWith(MINIO_PREFIX)) {
    return minioDelete(keyWithPrefix.slice(MINIO_PREFIX.length));
  }
  if (keyWithPrefix.startsWith(DISK_PREFIX)) {
    return deleteFromDisk(keyWithPrefix.slice(DISK_PREFIX.length));
  }

  // مفتاح قديم — حاول في الاثنين
  if (isMinioAvailable()) {
    await minioDelete(keyWithPrefix).catch(() => false);
  }
  await deleteFromDisk(keyWithPrefix).catch(() => false);
  return true;
}

/**
 * يصف آلية التخزين الحالية — يُستخدم لتشخيص مشاكل الرفع.
 */
export function describeLibraryStorage(): {
  primary: "minio" | "disk";
  diskPath: string;
  minioAvailable: boolean;
} {
  return {
    primary: isMinioAvailable() ? "minio" : "disk",
    diskPath: DISK_ROOT,
    minioAvailable: isMinioAvailable(),
  };
}
