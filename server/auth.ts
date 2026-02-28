import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { sessionTracker } from "./session-tracker";

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

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = randomBytes(32).toString("hex");
}

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  const keys = Array.from(loginAttempts.keys());
  for (const key of keys) {
    const entry = loginAttempts.get(key);
    if (entry && now - entry.lastAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return true;
  if (now - entry.lastAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return true;
  }
  return entry.count < LOGIN_MAX_ATTEMPTS;
}

function recordLoginAttempt(key: string, success: boolean): void {
  if (success) {
    loginAttempts.delete(key);
    return;
  }
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.lastAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
  } else {
    entry.count++;
    entry.lastAttempt = now;
  }
}

export function setupAuth(app: Express) {
  const PgStore = connectPg(session);

  const isProduction = process.env.NODE_ENV === "production";

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
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
      secure: isProduction,
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

    if (!checkLoginRateLimit(rateLimitKey)) {
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
        recordLoginAttempt(rateLimitKey, false);
        const entry = loginAttempts.get(rateLimitKey);
        if (entry && entry.count >= 3) {
          console.warn(`Security: ${entry.count} failed login attempts for "${username}" from IP ${clientIp}`);
        }
        return res.status(401).json({ message: info?.message || "فشل تسجيل الدخول" });
      }
      recordLoginAttempt(rateLimitKey, true);
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return next(regenerateErr);
        req.login(user, async (err) => {
          if (err) return next(err);
          sessionTracker.updateSession(req.sessionID, user, req);
          const { password, ...safeUser } = user;
          let mosqueName = null;
          if (user.mosqueId) {
            const mosque = await storage.getMosque(user.mosqueId);
            mosqueName = mosque?.name || null;
          }
          return res.json({ ...safeUser, mosqueName });
        });
      });
    })(req, res, next);
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
    const { password, ...safeUser } = req.user!;
    let mosqueName = null;
    if (req.user!.mosqueId) {
      const mosque = await storage.getMosque(req.user!.mosqueId);
      mosqueName = mosque?.name || null;
    }
    res.json({ ...safeUser, mosqueName });
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
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
