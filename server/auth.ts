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

export function setupAuth(app: Express) {
  const PgStore = connectPg(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "huffaz-session-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      pool,
      createTableIfMissing: true,
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
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
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const existing = await storage.getUserByUsername(req.body.username);
      if (existing) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...safeUser } = user;
        return res.status(201).json(safeUser);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: SelectUser | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "فشل تسجيل الدخول" });
      req.login(user, async (err) => {
        if (err) return next(err);
        const { password, ...safeUser } = user;
        let mosqueName = null;
        if (user.mosqueId) {
          const mosque = await storage.getMosque(user.mosqueId);
          mosqueName = mosque?.name || null;
        }
        return res.json({ ...safeUser, mosqueName });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "تم تسجيل الخروج بنجاح" });
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

export { hashPassword };
