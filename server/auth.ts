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
import * as OTPAuth from "otpauth";
import { sendError } from "./error-handler";

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

      // Check if 2FA is enabled — don't create session yet
      if (user.twoFactorEnabled) {
        return res.json({
          requiresTwoFactor: true,
          userId: user.id,
          message: "يرجى إدخال رمز المصادقة الثنائية",
        });
      }

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

  // ==================== 2FA ENDPOINTS ====================

  // Setup 2FA — generates secret and returns QR code data
  app.post("/api/auth/2fa/setup", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;

      // Generate a new TOTP secret
      const totp = new OTPAuth.TOTP({
        issuer: "Mutqin",
        label: currentUser.username,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });

      const secret = totp.secret.base32;
      const uri = totp.toString();

      // Generate QR code
      const QRCode = await import("qrcode");
      const qrDataUrl = await QRCode.toDataURL(uri);

      // Generate 10 backup codes
      const crypto = await import("crypto");
      const backupCodes = Array.from({ length: 10 }, () =>
        crypto.randomBytes(4).toString("hex").toUpperCase()
      );

      // Hash backup codes before storing
      const hashedBackups = [];
      for (const code of backupCodes) {
        const hashed = await hashPassword(code);
        hashedBackups.push(hashed);
      }

      // Store secret temporarily (not enabled yet until verified)
      await storage.updateUser(currentUser.id, {
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(hashedBackups),
      });

      res.json({
        secret,
        qrCode: qrDataUrl,
        backupCodes, // Show plain codes ONCE to user
        uri,
      });
    } catch (err: any) {
      sendError(res, err, "إعداد المصادقة الثنائية");
    }
  });

  // Verify and enable 2FA
  app.post("/api/auth/2fa/verify-setup", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ message: "رمز التحقق مطلوب", field: "code", source: "validation" });
      }

      if (!currentUser.twoFactorSecret) {
        return res.status(400).json({ message: "يجب إعداد المصادقة الثنائية أولاً" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: "Mutqin",
        label: currentUser.username,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(currentUser.twoFactorSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        return res.status(400).json({ message: "رمز التحقق غير صحيح", field: "code", source: "validation" });
      }

      await storage.updateUser(currentUser.id, { twoFactorEnabled: true });
      res.json({ message: "تم تفعيل المصادقة الثنائية بنجاح" });
    } catch (err: any) {
      sendError(res, err, "تفعيل المصادقة الثنائية");
    }
  });

  // Disable 2FA
  app.post("/api/auth/2fa/disable", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: "كلمة المرور مطلوبة للتعطيل", field: "password", source: "validation" });
      }

      const isValid = await comparePasswords(password, currentUser.password);
      if (!isValid) {
        return res.status(400).json({ message: "كلمة المرور غير صحيحة", field: "password", source: "validation" });
      }

      await storage.updateUser(currentUser.id, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      });

      res.json({ message: "تم تعطيل المصادقة الثنائية" });
    } catch (err: any) {
      sendError(res, err, "تعطيل المصادقة الثنائية");
    }
  });

  // Verify 2FA during login (no auth required — this is a login step)
  app.post("/api/auth/2fa/verify-login", async (req, res) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ message: "معرف المستخدم ورمز التحقق مطلوبان" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "المصادقة الثنائية غير مفعّلة" });
      }

      // Try TOTP first
      const totp = new OTPAuth.TOTP({
        issuer: "Mutqin",
        label: user.username,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta !== null) {
        // TOTP valid — create session
        req.login(user, (err) => {
          if (err) return res.status(500).json({ message: "خطأ في تسجيل الدخول" });
          sessionTracker.updateSession(req.sessionID, user, req);
          res.json(user);
        });
        return;
      }

      // Try backup codes
      if (user.twoFactorBackupCodes) {
        const backupCodes = JSON.parse(user.twoFactorBackupCodes);
        for (let i = 0; i < backupCodes.length; i++) {
          const isMatch = await comparePasswords(code.toUpperCase(), backupCodes[i]);
          if (isMatch) {
            // Remove used backup code
            backupCodes.splice(i, 1);
            await storage.updateUser(user.id, {
              twoFactorBackupCodes: JSON.stringify(backupCodes),
            });
            // Create session
            req.login(user, (err) => {
              if (err) return res.status(500).json({ message: "خطأ في تسجيل الدخول" });
              sessionTracker.updateSession(req.sessionID, user, req);
              res.json({ ...user, backupCodesRemaining: backupCodes.length });
            });
            return;
          }
        }
      }

      res.status(400).json({ message: "رمز التحقق غير صحيح", field: "code", source: "validation" });
    } catch (err: any) {
      sendError(res, err, "التحقق من المصادقة الثنائية");
    }
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
  }
  next();
}

export function requirePrivacyPolicy(req: any, res: any, next: any) {
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
