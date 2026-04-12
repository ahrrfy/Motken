import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { sessionTracker } from "./session-tracker";

import { sendError } from "./error-handler";
import { toSafeUser } from "./services/user-service";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.SESSION_SECRET) {
  console.error("[SECURITY CRITICAL] SESSION_SECRET is NOT set in production! Refusing to start.");
  process.exit(1);
}
const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
  const fallback = require("crypto").randomBytes(64).toString("hex");
  console.warn("[SECURITY] Using generated session secret — sessions will not persist across restarts. Set SESSION_SECRET env var.");
  return fallback;
})();

import { getRedisClient } from "./lib/redis";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60; // 15 minutes

async function checkLoginRateLimit(key: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const val = await redis.get(`login:${key}`);
    if (!val) return true;
    return parseInt(val, 10) < LOGIN_MAX_ATTEMPTS;
  } catch {
    return true; // fail-open: allow login if Redis unavailable
  }
}

async function recordLoginAttempt(key: string, success: boolean): Promise<void> {
  try {
    const redis = await getRedisClient();
    const redisKey = `login:${key}`;
    if (success) {
      await redis.del(redisKey);
      return;
    }
    const current = await redis.get(redisKey);
    const count = current ? parseInt(current, 10) + 1 : 1;
    await redis.set(redisKey, String(count), { EX: LOGIN_WINDOW_SECONDS });
  } catch {
    // fail-open: continue even if Redis unavailable
  }
}

export function setupAuth(app: Express) {
  const PgStore = connectPg(session);

  const isProduction = process.env.NODE_ENV === "production";

  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      pool,
      createTableIfMissing: true,
    }),
    name: "mutqin.sid",
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: isProduction && process.env.HTTPS_ENABLED !== "false",
      sameSite: "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }
        if (!user.isActive) {
          return done(null, false, { message: "هذا الحساب غير مفعّل. يرجى التواصل مع المسؤول" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, null);
      if (!user.isActive) return done(null, null);
      if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) return done(null, null);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const username = req.body.username || "";
    const rateLimitKey = `${clientIp}:${username}`;

    if (!(await checkLoginRateLimit(rateLimitKey))) {
      return res.status(429).json({ message: "تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة لاحقاً" });
    }

    const { storage: storageCheck } = await import("./storage");
    const isBanned = await storageCheck.isBannedIP(clientIp);
    if (isBanned) {
      return res.status(403).json({ message: "تم حظر هذا الجهاز من استخدام النظام. تواصل مع المدير" });
    }

    passport.authenticate("local", async (err: any, user: SelectUser | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        await recordLoginAttempt(rateLimitKey, false);
        return res.status(401).json({ message: info?.message || "فشل تسجيل الدخول" });
      }
      await recordLoginAttempt(rateLimitKey, true);

      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return next(regenerateErr);
        req.login(user, async (err) => {
          if (err) return next(err);
          sessionTracker.updateSession(req.sessionID, user, req);
          let mosqueName = null;
          if (user.mosqueId) {
            const mosque = await storage.getMosque(user.mosqueId);
            mosqueName = mosque?.name || null;
          }
          return res.json({ ...toSafeUser(user), mosqueName });
        });
      });
    })(req, res, next);
  });

  // Preview role - admin only
  app.post("/api/auth/preview-role", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      // Only real admins can preview (check originalRole if already in preview)
      const realRole = (req.session as any).originalRole || currentUser.role;
      if (realRole !== "admin") {
        return res.status(403).json({ message: "غير مصرح — المعاينة متاحة للمدير فقط" });
      }
      const { role } = req.body;
      if (!role || !["student", "teacher", "supervisor"].includes(role)) {
        return res.status(400).json({ message: "دور غير صالح للمعاينة" });
      }
      (req.session as any).previewRole = role;
      (req.session as any).originalRole = realRole;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "خطأ في حفظ الجلسة" });
        res.json({ previewRole: role, message: `تم تفعيل معاينة دور ${role === "student" ? "الطالب" : role === "teacher" ? "المعلم" : "المشرف"}` });
      });
    } catch (err: unknown) {
      sendError(res, err, "تفعيل معاينة الدور");
    }
  });

  app.post("/api/auth/stop-preview", requireAuth, async (req, res) => {
    try {
      const originalRole = (req.session as any).originalRole;
      if (!originalRole) {
        return res.json({ previewRole: null, message: "لا توجد معاينة نشطة" });
      }
      delete (req.session as any).previewRole;
      delete (req.session as any).originalRole;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "خطأ في حفظ الجلسة" });
        res.json({ previewRole: null, message: "تم إيقاف المعاينة" });
      });
    } catch (err: unknown) {
      sendError(res, err, "إيقاف معاينة الدور");
    }
  });

  // Emergency password reset — no auth required (uses secret key)
  app.post("/api/auth/emergency-reset-password", async (req, res) => {
    const { secret, username, newPassword } = req.body;
    if (secret !== process.env.SESSION_SECRET) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (!username || !newPassword) {
      return res.status(400).json({ message: "username و newPassword مطلوبين" });
    }
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: `المستخدم ${username} غير موجود` });
      }
      const hashed = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashed });
      res.json({ message: `تم تغيير كلمة مرور ${username} بنجاح`, role: user.role });
    } catch {
      res.status(500).json({ message: "خطأ في تغيير كلمة المرور" });
    }
  });

  // Emergency rate limit reset — no auth required (uses secret key)
  app.post("/api/auth/reset-rate-limit", async (req, res) => {
    const { secret, username } = req.body;
    if (secret !== process.env.SESSION_SECRET) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    try {
      const redis = await getRedisClient();
      const keys = await redis.keys("login:*");
      if (username) {
        const matchingKeys = keys.filter(k => k.includes(username));
        for (const k of matchingKeys) await redis.del(k);
        return res.json({ message: `تم مسح ${matchingKeys.length} مفتاح rate limit للمستخدم ${username}` });
      }
      for (const k of keys) await redis.del(k);
      res.json({ message: `تم مسح ${keys.length} مفتاح rate limit` });
    } catch {
      res.status(500).json({ message: "خطأ في مسح rate limit" });
    }
  });

  app.post("/api/auth/logout", (req, res, next) => {
    const sid = req.sessionID;
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);
        res.clearCookie("mutqin.sid");
        sessionTracker.removeSession(sid);
        res.json({ message: "تم تسجيل الخروج بنجاح" });
      });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "غير مسجل الدخول" });
    }
    let mosqueName = null;
    if (req.user!.mosqueId) {
      const mosque = await storage.getMosque(req.user!.mosqueId);
      mosqueName = mosque?.name || null;
    }
    const previewRole = (req.session as any).previewRole || null;
    const originalRole = (req.session as any).originalRole || null;
    res.json({ ...toSafeUser(req.user!), mosqueName, previewRole, originalRole });
  });

}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
  }
  next();
}

export function requirePrivacyPolicy(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
  }
  if (req.user!.role === "admin") {
    return next();
  }
  if (!req.user!.acceptedPrivacyPolicy) {
    return res.status(403).json({
      message: "يجب قبول سياسة الخصوصية قبل استخدام النظام",
      code: "PRIVACY_POLICY_REQUIRED",
    });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
    }
    if (!roles.includes(req.user!.role)) {
      return res.status(403).json({ message: "غير مصرح بالوصول" });
    }
    next();
  };
}

export { hashPassword, comparePasswords };
