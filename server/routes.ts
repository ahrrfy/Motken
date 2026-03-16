import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requirePrivacyPolicy } from "./auth";
import { sessionTracker } from "./session-tracker";
import { allFeatureDefaults, featureRouteMap } from "./routes/feature-defaults";

import { registerMosquesRoutes } from "./routes/mosques";
import { registerUsersRoutes } from "./routes/users";
import { registerAssignmentsRoutes } from "./routes/assignments";
import { registerRatingsRoutes } from "./routes/ratings";
import { registerExamsRoutes } from "./routes/exams";
import { registerActivityRoutes } from "./routes/activity";
import { registerNotificationsRoutes } from "./routes/notifications";
import { registerCoursesRoutes } from "./routes/courses";
import { registerAdminRoutes } from "./routes/admin";
import { registerAttendanceRoutes } from "./routes/attendance";
import { registerMessagesRoutes } from "./routes/messages";
import { registerPointsRoutes } from "./routes/points";
import { registerSchedulesRoutes } from "./routes/schedules";
import { registerCompetitionsRoutes } from "./routes/competitions";
import { registerReportsRoutes } from "./routes/reports";
import { registerAlertsRoutes } from "./routes/alerts";
import { registerGraduatesRoutes } from "./routes/graduates";
import { registerFamilyRoutes } from "./routes/family";
import { registerKnowledgeRoutes } from "./routes/knowledge";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerCommunicationRoutes } from "./routes/communication";
import { registerQuranRoutes } from "./routes/quran";
import { registerStatsRoutes } from "./routes/stats";
import { registerPublicRoutes } from "./routes/public";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.use(async (req, res, next) => {
    for (const [featureKey, prefixes] of Object.entries(featureRouteMap)) {
      if (prefixes.some(prefix => req.path.startsWith(prefix))) {
        try {
          const enabled = await storage.isFeatureEnabled(featureKey);
          if (!enabled) {
            return res.status(403).json({ message: "هذه الميزة معطلة حالياً من قبل المدير" });
          }
        } catch {}
        break;
      }
    }
    next();
  });

  try {
    const existingFlags = await storage.getFeatureFlags();
    const existingKeys = new Set(existingFlags.map(f => f.featureKey));
    const newFlags = allFeatureDefaults.filter(f => !existingKeys.has(f.featureKey));
    if (newFlags.length > 0) {
      for (const flag of newFlags) {
        await storage.createFeatureFlag(flag);
      }
      console.log(`Feature flags: ${newFlags.length} new flags added`);
    }
  } catch (err) {
    console.error("Error seeding feature flags:", err);
  }

  app.use((req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user && req.sessionID) {
      sessionTracker.updateSession(req.sessionID, req.user, req);
    }
    next();
  });

  const privacyExemptPaths = [
    "/api/auth/",
    "/api/privacy-policy/",
    "/api/register-mosque",
    "/api/public-testimonials",
    "/api/public-stats",
  ];
  app.use((req: any, res: any, next: any) => {
    if (!req.path.startsWith("/api/")) return next();
    if (privacyExemptPaths.some(p => req.path.startsWith(p))) return next();
    if (req.path === "/api/auth/me") return next();
    requirePrivacyPolicy(req, res, next);
  });

  registerMosquesRoutes(app);
  registerUsersRoutes(app);
  registerAssignmentsRoutes(app);
  registerRatingsRoutes(app);
  registerExamsRoutes(app);
  registerActivityRoutes(app);
  registerNotificationsRoutes(app);
  registerCoursesRoutes(app);
  registerAdminRoutes(app);
  registerAttendanceRoutes(app);
  registerMessagesRoutes(app);
  registerPointsRoutes(app);
  registerSchedulesRoutes(app);
  registerCompetitionsRoutes(app);
  registerReportsRoutes(app);
  registerAlertsRoutes(app);
  registerGraduatesRoutes(app);
  registerFamilyRoutes(app);
  registerKnowledgeRoutes(app);
  registerAnalyticsRoutes(app);
  registerCommunicationRoutes(app);
  registerQuranRoutes(app);
  registerStatsRoutes(app);
  registerPublicRoutes(app);

  return httpServer;
}
