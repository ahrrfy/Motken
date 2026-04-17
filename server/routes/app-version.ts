import type { Express, Request, Response, NextFunction } from "express";
import { requireRole } from "../auth";
import { pool } from "../db";
import { getAppUrl } from "../lib/app-url";
import { logger } from "../lib/logger";

const DEFAULT_FORCE_MESSAGE =
  "⚠️ يوجد تحديث مهم وإلزامي لتطبيق سِرَاجُ الْقُرْآنِ. الرجاء تنزيل النسخة الجديدة للمتابعة.";

export function compareVersions(a: string, b: string): number {
  const pa = String(a).split(".").map(n => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

let cachedConfig: any = null;
let cacheExpires = 0;
const CACHE_MS = 30_000;

async function loadConfig(platform = "android") {
  const now = Date.now();
  if (cachedConfig && now < cacheExpires && cachedConfig.platform === platform) {
    return cachedConfig;
  }
  try {
    const result = await pool.query(
      `SELECT platform, latest_version, minimum_version, download_url,
              force_update_message, soft_update_message, blocked_user_agents
       FROM app_versions WHERE platform = $1 LIMIT 1`,
      [platform]
    );
    if (result.rows.length === 0) {
      cachedConfig = {
        platform,
        latestVersion: "1.1.0",
        minimumVersion: "1.1.0",
        downloadUrl: `${getAppUrl()}/download`,
        forceUpdateMessage: DEFAULT_FORCE_MESSAGE,
        softUpdateMessage: null,
        blockedUserAgents: [],
      };
    } else {
      const row = result.rows[0];
      cachedConfig = {
        platform: row.platform,
        latestVersion: row.latest_version,
        minimumVersion: row.minimum_version,
        downloadUrl: row.download_url,
        forceUpdateMessage: row.force_update_message || DEFAULT_FORCE_MESSAGE,
        softUpdateMessage: row.soft_update_message,
        blockedUserAgents: row.blocked_user_agents || [],
      };
    }
    cacheExpires = now + CACHE_MS;
    return cachedConfig;
  } catch (err) {
    logger.error({ err }, "Failed to load app version config");
    return {
      platform,
      latestVersion: "1.1.0",
      minimumVersion: "1.1.0",
      downloadUrl: `${getAppUrl()}/download`,
      forceUpdateMessage: DEFAULT_FORCE_MESSAGE,
      softUpdateMessage: null,
      blockedUserAgents: [],
    };
  }
}

function invalidateCache() {
  cachedConfig = null;
  cacheExpires = 0;
}

export async function seedAppVersionConfig() {
  try {
    const existing = await pool.query(`SELECT id FROM app_versions WHERE platform = $1`, ["android"]);
    if (existing.rows.length > 0) return;
    await pool.query(
      `INSERT INTO app_versions
        (platform, latest_version, minimum_version, download_url,
         force_update_message, soft_update_message, blocked_user_agents)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "android",
        "1.1.0",
        "1.1.0",
        `${getAppUrl()}/download`,
        DEFAULT_FORCE_MESSAGE,
        "يتوفر تحديث جديد لتطبيق سِرَاجُ الْقُرْآنِ",
        [],
      ]
    );
    logger.info("App version config seeded (android 1.1.0)");
  } catch (err) {
    logger.error({ err }, "Failed to seed app version config");
  }
}

// Middleware: block old APK via User-Agent or X-App-Version
export async function forceUpgradeMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api/")) return next();

  // السماح بالـ endpoints الأساسية للترقية حتى لا تدخل في حلقة
  const ALLOW = [
    "/api/app/version-check",
    "/api/app/download",
    "/api/public-config",
    "/api/ota/",
    "/api/_health",
  ];
  if (ALLOW.some(p => req.path.startsWith(p))) return next();

  const ua = req.get("User-Agent") || "";
  const appVersion = req.get("X-App-Version") || "";
  const isNativeApp = ua.includes("SirajAlQuran-Android") || !!appVersion;
  if (!isNativeApp) return next();

  try {
    const config = await loadConfig("android");

    // 1) فحص User-Agent المحظور صراحة (للـ APK القديم)
    const blocked = (config.blockedUserAgents || []).some((b: string) =>
      b && ua.includes(b)
    );
    if (blocked) {
      return res.status(426).json({
        message: config.forceUpdateMessage,
        code: "UPGRADE_REQUIRED",
        downloadUrl: config.downloadUrl,
        minVersion: config.minimumVersion,
      });
    }

    // 2) فحص X-App-Version (للـ APK الجديد)
    if (appVersion && compareVersions(appVersion, config.minimumVersion) < 0) {
      return res.status(426).json({
        message: config.forceUpdateMessage,
        code: "UPGRADE_REQUIRED",
        downloadUrl: config.downloadUrl,
        minVersion: config.minimumVersion,
      });
    }
  } catch (err) {
    logger.error({ err }, "forceUpgradeMiddleware error");
  }

  next();
}

export function registerAppVersionRoutes(app: Express) {
  // عام — للتحقق من الإصدار من الواجهة
  app.get("/api/app/version-check", async (req, res) => {
    try {
      const platform = String(req.query.platform || "android");
      const clientVersion = String(req.query.version || "0.0.0");
      const config = await loadConfig(platform);

      const needsUpdate = compareVersions(clientVersion, config.latestVersion) < 0;
      const forceUpdate = compareVersions(clientVersion, config.minimumVersion) < 0;

      res.json({
        latestVersion: config.latestVersion,
        minimumVersion: config.minimumVersion,
        updateAvailable: needsUpdate,
        forceUpdate,
        downloadUrl: config.downloadUrl,
        message: forceUpdate ? config.forceUpdateMessage : config.softUpdateMessage,
      });
    } catch (err) {
      res.status(500).json({ message: "تعذّر التحقق من الإصدار" });
    }
  });

  // إعادة توجيه لتحميل APK
  app.get("/api/app/download", async (_req, res) => {
    try {
      const config = await loadConfig("android");
      res.redirect(302, config.downloadUrl);
    } catch {
      res.redirect(302, `${getAppUrl()}/download`);
    }
  });

  // ADMIN — قراءة الإعدادات
  app.get("/api/admin/app-version", requireRole("admin"), async (_req, res) => {
    try {
      const config = await loadConfig("android");
      res.json(config);
    } catch {
      res.status(500).json({ message: "فشل جلب الإعدادات" });
    }
  });

  // ADMIN — تحديث الإعدادات
  app.put("/api/admin/app-version", requireRole("admin"), async (req, res) => {
    try {
      const {
        latestVersion,
        minimumVersion,
        downloadUrl,
        forceUpdateMessage,
        softUpdateMessage,
        blockedUserAgents,
      } = req.body || {};

      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;
      if (latestVersion !== undefined)      { fields.push(`latest_version = $${i++}`);        values.push(latestVersion); }
      if (minimumVersion !== undefined)     { fields.push(`minimum_version = $${i++}`);       values.push(minimumVersion); }
      if (downloadUrl !== undefined)        { fields.push(`download_url = $${i++}`);          values.push(downloadUrl); }
      if (forceUpdateMessage !== undefined) { fields.push(`force_update_message = $${i++}`);  values.push(forceUpdateMessage); }
      if (softUpdateMessage !== undefined)  { fields.push(`soft_update_message = $${i++}`);   values.push(softUpdateMessage); }
      if (blockedUserAgents !== undefined)  { fields.push(`blocked_user_agents = $${i++}`);   values.push(blockedUserAgents); }
      if (fields.length === 0) return res.status(400).json({ message: "لا توجد حقول للتحديث" });
      fields.push(`updated_at = NOW()`);

      values.push("android");
      await pool.query(
        `UPDATE app_versions SET ${fields.join(", ")} WHERE platform = $${i}`,
        values
      );
      invalidateCache();
      const updated = await loadConfig("android");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "فشل التحديث" });
    }
  });

  // ADMIN — حظر/إلغاء حظر UA محدد (زر سريع)
  app.post("/api/admin/app-version/block-ua", requireRole("admin"), async (req, res) => {
    try {
      const { userAgent, action } = req.body || {};
      if (!userAgent) return res.status(400).json({ message: "userAgent مطلوب" });
      const config = await loadConfig("android");
      let blocked: string[] = [...(config.blockedUserAgents || [])];
      if (action === "block") {
        if (!blocked.includes(userAgent)) blocked.push(userAgent);
      } else if (action === "unblock") {
        blocked = blocked.filter(b => b !== userAgent);
      } else {
        return res.status(400).json({ message: "action يجب أن يكون block أو unblock" });
      }
      await pool.query(
        `UPDATE app_versions SET blocked_user_agents = $1, updated_at = NOW() WHERE platform = $2`,
        [blocked, "android"]
      );
      invalidateCache();
      res.json({ blockedUserAgents: blocked });
    } catch {
      res.status(500).json({ message: "فشل تحديث الحظر" });
    }
  });
}
