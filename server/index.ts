import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { createIndexes, pool } from "./db";
import { startSelfHealing, stopSelfHealing, getDetailedHealthReport, startAbsenceAlerts } from "./self-healing";
import { setupWebSocket } from "./websocket";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.alquran.cloud", "https://wa.me", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
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
  frameguard: { action: "deny" },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
}));

app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
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
app.use("/api/", deepPayloadGuard);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const publicPaths = ["/api/register-mosque", "/api/auth/login", "/api/auth/register-parent"];
  if (publicPaths.some(p => req.path === p)) return next();

  const origin = req.get("origin") || req.get("referer");
  if (!origin) {
    return res.status(403).json({ message: "طلب غير مصرح" });
  }

  try {
    const originUrl = new URL(origin);
    const host = req.get("host") || "";

    if (originUrl.host !== host) {
      console.warn(`CSRF blocked: origin=${originUrl.host} host=${host} path=${req.path} ip=${req.ip}`);
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
app.use("/api/auth/register-parent", authLimiter);

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
  next();
});

app.use((req, res, next) => {
  const blocked = /^\/(\.env|\.git|\.DS_Store|\.htaccess|wp-admin|wp-login|phpinfo|adminer|phpmyadmin)/i;
  if (blocked.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

const BUILD_VERSION = Date.now().toString();

app.get("/api/version", (_req, res) => {
  res.json({ version: BUILD_VERSION, timestamp: new Date().toISOString() });
});

app.get("/_health", async (_req, res) => {
  try {
    const report = await getDetailedHealthReport();
    if (report.status === "healthy") {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: Math.round(report.uptime),
        autoRecoveries: report.autoRecoveries,
      });
    } else {
      res.status(503).json({ status: "degraded", message: "خدمة متدهورة" });
    }
  } catch (err: any) {
    console.error("Health check failed:", err);
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
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

process.on("unhandledRejection", (reason: any) => {
  console.error("[Process] Unhandled Promise Rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err: Error) => {
  console.error("[Process] Uncaught Exception:", err.message);
  console.error(err.stack);
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log(`${signal} received. Starting graceful shutdown...`);

  stopSelfHealing();

  httpServer.close(() => {
    log("HTTP server closed");
  });

  try {
    await pool.end();
    log("Database pool closed");
  } catch (err: any) {
    console.error("Error closing database pool:", err.message);
  }

  setTimeout(() => {
    log("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

(async () => {
  await createIndexes();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    console.error("Internal Server Error:", err);

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

  setupWebSocket(httpServer, app);

  const port = parseInt(process.env.PORT || "5000", 10);
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
