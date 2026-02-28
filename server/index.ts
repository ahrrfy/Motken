import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { createIndexes } from "./db";

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
      connectSrc: ["'self'", "https://api.alquran.cloud", "https://wa.me"],
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

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const publicPaths = ["/api/register-mosque", "/api/auth/login"];
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
  max: 120,
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
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800, immutable");
  } else if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
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

app.get("/_health", async (_req, res) => {
  try {
    const { pool } = await import("./db");
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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

app.use(
  express.json({
    limit: '500kb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '500kb' }));

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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
