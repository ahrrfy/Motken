import { env } from "./lib/env"; // Validate environment variables before anything else
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { forceUpgradeMiddleware } from "./routes/app-version";
import { serveStatic } from "./static";
import { createServer } from "http";
import { createIndexes, pool } from "./db";
import { startSelfHealing, stopSelfHealing, getDetailedHealthReport, startAbsenceAlerts, stopAbsenceAlerts } from "./self-healing";
import { setupWebSocket } from "./websocket";
import { logger, requestLogger } from "./lib/logger";
import { disconnectRedis } from "./lib/redis";
import { cache } from "./cache";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

// Helmet with safe fallback for Express 5 CJS compatibility
const helmetMiddleware = helmet({
  contentSecurityPolicy: isProduction ? false : {
    // In production, CSP is set per-request with nonce in static.ts
    // In development, use permissive CSP for Vite HMR
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.alquran.cloud", "https://wa.me", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "ws:", "wss:"],
      frameSrc: ["'self'", "blob:"],
      objectSrc: ["'self'", "blob:"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "sameorigin" },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
});
app.use((req, res, next) => {
  try { helmetMiddleware(req, res, next); }
  catch { next(); }
});

app.disable("x-powered-by");

app.use((_req, res, next) => {
  try {
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  } catch {}
  next();
});

app.use(compression());

// حد أعلى لمسارات النسخ الاحتياطي (ملفات كبيرة)
app.use("/api/system/backup", express.json({ limit: "50mb" }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

function deepPayloadGuard(req: Request, res: Response, next: NextFunction) {
  if (!req.body || typeof req.body !== "object") return next();
  const MAX_STRING_LEN = 5000;
  const MAX_ARRAY_LEN = 200;
  const MAX_DEPTH = 5;
  function check(obj: any, depth: number): string | null {
    if (depth > MAX_DEPTH) return "بيانات معقدة جداً";
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string" && val.length > MAX_STRING_LEN) {
        return `الحقل ${key} كبير جداً (الحد: ${MAX_STRING_LEN} حرف)`;
      }
      if (Array.isArray(val) && val.length > MAX_ARRAY_LEN) {
        return `المصفوفة ${key} تحتوي عناصر أكثر من الحد (${MAX_ARRAY_LEN})`;
      }
      if (val && typeof val === "object") {
        const err = check(val, depth + 1);
        if (err) return err;
      }
    }
    return null;
  }
  const err = check(req.body, 0);
  if (err) return res.status(400).json({ message: err });
  next();
}
// إعفاء مسارات النسخ الاحتياطي من فحص الحجم (ملفات كبيرة)
app.use("/api/", (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/system/backup")) return next();
  deepPayloadGuard(req, res, next);
});

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const publicPaths = ["/api/register-mosque", "/api/auth/login", "/api/ota/latest", "/api/ota/stats"];
  if (publicPaths.some(p => req.path === p)) return next();

  // السماح بطلبات تطبيق سراج القرآن (CapacitorHttp يرسل User-Agent مخصص)
  const ua = req.get("user-agent") || "";
  if (ua.includes("SirajAlQuran-Android")) return next();

  const origin = req.get("origin") || req.get("referer");
  if (!origin) {
    return res.status(403).json({ message: "طلب غير مصرح" });
  }

  try {
    const originUrl = new URL(origin);
    const host = req.get("host") || "";

    if (originUrl.host !== host) {
      logger.warn({ origin: originUrl.host, host, path: req.path, ip: req.ip }, "CSRF blocked");
      return res.status(403).json({ message: "طلب غير مصرح" });
    }
  } catch {
    return res.status(403).json({ message: "طلب غير مصرح" });
  }

  next();
}

app.use("/api/", csrfProtection);

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isProduction ? 120 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "عدد الطلبات كبير جداً. يرجى المحاولة لاحقاً" },
  validate: { xForwardedForHeader: false, default: true },
});
app.use("/api/", apiLimiter);

const publicEndpointLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "عدد الطلبات كبير جداً. يرجى المحاولة لاحقاً" },
  validate: { xForwardedForHeader: false, default: true },
});
app.use("/api/family-dashboard/", publicEndpointLimiter);
app.use("/api/parent-report/", publicEndpointLimiter);
app.use("/api/certificates/verify/", publicEndpointLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "محاولات كثيرة جداً. يرجى الانتظار 15 دقيقة" },
  validate: { xForwardedForHeader: false, default: true },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/register-mosque", authLimiter);
app.use("/api/family/create-parent-account", authLimiter);

const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "عدد محاولات كبير جداً. يرجى الانتظار" },
  validate: { xForwardedForHeader: false, default: true },
});
app.use((req, res, next) => {
  if (req.path.match(/^\/api\/users\/[^/]+\/(change-password|reset-password)$/)) {
    return sensitiveActionLimiter(req, res, next);
  }
  next();
});

app.use((req, res, next) => {
  try {
    if (req.path === "/sw.js" || req.path === "/manifest.json") {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
    } else if (req.path.match(/\.(js|css)$/) && req.path.includes("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (req.path.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    } else if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    } else if (req.path === "/" || req.path.endsWith(".html") || !req.path.includes(".")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
  } catch {}
  next();
});

app.use((req, res, next) => {
  const blocked = /^\/(\.env|\.git|\.DS_Store|\.htaccess|wp-admin|wp-login|phpinfo|adminer|phpmyadmin)/i;
  if (blocked.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

// Force Update Middleware (Kill Switch) — يحظر APK القديم عبر User-Agent أو X-App-Version
app.use(forceUpgradeMiddleware);

const BUILD_VERSION = Date.now().toString();

app.get("/api/version", (_req, res) => {
  res.json({ version: BUILD_VERSION, timestamp: new Date().toISOString() });
});

app.get("/_health", async (_req, res) => {
  try {
    const report = await getDetailedHealthReport();
    const memUsage = process.memoryUsage();
    if (report.status === "healthy") {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: Math.round(report.uptime),
        autoRecoveries: report.autoRecoveries,
        memory: {
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memUsage.rss / 1024 / 1024),
        },
        version: BUILD_VERSION,
      });
    } else {
      res.status(503).json({ status: "degraded", message: "خدمة متدهورة" });
    }
  } catch (err: any) {
    logger.error({ err: err.message }, "Health check failed");
    res.status(503).json({ status: "error", message: "خدمة غير متاحة" });
  }
});

const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}


export function log(message: string, source = "express") {
  logger.info({ source }, message);
}

// Structured request logging via Pino
app.use(requestLogger);

process.on("unhandledRejection", (reason: any) => {
  logger.error({ err: reason?.message || reason }, "Unhandled Promise Rejection");
});

process.on("uncaughtException", (err: Error) => {
  logger.fatal({ err: err.message, stack: err.stack }, "Uncaught Exception");
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log(`${signal} received. Starting graceful shutdown...`);

  // 1. Stop all background timers
  stopSelfHealing();
  stopAbsenceAlerts();
  const { dbHealthInterval } = await import("./db");
  clearInterval(dbHealthInterval);
  const { audioCleanupInterval, autoArchiveInterval } = await import("./routes/assignments");
  if (audioCleanupInterval) clearInterval(audioCleanupInterval);
  if (autoArchiveInterval) clearInterval(autoArchiveInterval);
  cache.destroy();

  // 2. Close WebSocket server (stops heartbeat via wss "close" event)
  try {
    const wssRef = httpServer.listeners("upgrade").length > 0 ? true : false;
    if (wssRef) log("Closing WebSocket connections...");
  } catch {}

  // 3. Stop accepting new HTTP connections and wait for in-flight to drain
  await new Promise<void>((resolve) => {
    httpServer.close(() => {
      log("HTTP server closed");
      resolve();
    });
  });

  // 4. Close Redis
  try {
    await disconnectRedis();
    log("Redis disconnected");
  } catch {}

  // 5. Close database pool last
  try {
    await pool.end();
    log("Database pool closed");
  } catch (err: any) {
    logger.error({ err: err.message }, "Error closing database pool");
  }

  // 6. Force exit after timeout (safety net)
  setTimeout(() => {
    log("Forced shutdown after timeout");
    process.exit(1);
  }, 15000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

(async () => {
  await createIndexes();
  const { initMinioBucket, initLibraryBucket, initOtaBucket } = await import("./lib/minio");
  await initMinioBucket();
  await initLibraryBucket();
  await initOtaBucket();

  // سجّل مصدر تخزين المكتبة النشِط (MinIO أو القرص المحلي) — مفيد للتشخيص
  const { describeLibraryStorage } = await import("./lib/library-storage");
  const libStorage = describeLibraryStorage();
  logger.info(
    { primary: libStorage.primary, diskPath: libStorage.diskPath, minioAvailable: libStorage.minioAvailable },
    `Library storage: ${libStorage.primary === "minio" ? "MinIO" : `قرص محلي (${libStorage.diskPath})`}`,
  );

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    logger.error({ err: err.message, stack: err.stack, status }, "Internal Server Error");

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message: "حدث خطأ داخلي في الخادم" });
  });

  if (isProduction) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const wss = setupWebSocket(httpServer, app);

  const port = env.PORT;
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
      startSelfHealing();
      startAbsenceAlerts();
    },
  );
})();
