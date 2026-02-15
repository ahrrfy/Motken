import { UAParser } from "ua-parser-js";

interface ActiveSession {
  userId: string;
  username: string;
  name: string;
  role: string;
  mosqueId: string | null;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  deviceInfo: string;
  browser: string;
  os: string;
  lastActivity: number;
  loginTime: number;
}

class SessionTracker {
  private sessions = new Map<string, ActiveSession>();
  private readonly TIMEOUT = 5 * 60 * 1000; // 5 minutes inactivity = offline

  updateSession(sessionId: string, user: any, req: any) {
    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || "unknown";
    const ua = req.headers["user-agent"] || "unknown";
    const parser = new UAParser(ua);
    const device = parser.getDevice();
    const browser = parser.getBrowser();
    const os = parser.getOS();
    
    const deviceType = device.type || "desktop";
    const deviceInfo = device.vendor ? `${device.vendor} ${device.model || ""}`.trim() : (deviceType === "desktop" ? "حاسوب" : deviceType);
    const browserStr = browser.name ? `${browser.name} ${browser.version || ""}`.trim() : "غير معروف";
    const osStr = os.name ? `${os.name} ${os.version || ""}`.trim() : "غير معروف";

    const existing = this.sessions.get(sessionId);
    this.sessions.set(sessionId, {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      mosqueId: user.mosqueId || null,
      ipAddress: ip,
      userAgent: ua,
      deviceType,
      deviceInfo,
      browser: browserStr,
      os: osStr,
      lastActivity: Date.now(),
      loginTime: existing?.loginTime || Date.now(),
    });
  }

  removeSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  getActiveSessions(): (ActiveSession & { sessionId: string; isOnline: boolean })[] {
    const now = Date.now();
    const result: (ActiveSession & { sessionId: string; isOnline: boolean })[] = [];
    
    const entries = Array.from(this.sessions.entries());
    for (const [sessionId, session] of entries) {
      if (now - session.lastActivity > 30 * 60 * 1000) {
        this.sessions.delete(sessionId);
        continue;
      }
      result.push({
        ...session,
        sessionId,
        isOnline: now - session.lastActivity < this.TIMEOUT,
      });
    }
    
    return result.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  getSessionsByUserId(userId: string) {
    return this.getActiveSessions().filter(s => s.userId === userId);
  }

  removeSessionsByUserId(userId: string) {
    const entries = Array.from(this.sessions.entries());
    for (const [sessionId, session] of entries) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }
  }

  getOnlineCount(): number {
    const now = Date.now();
    let count = 0;
    const values = Array.from(this.sessions.values());
    for (const session of values) {
      if (now - session.lastActivity < this.TIMEOUT) count++;
    }
    return count;
  }
}

export const sessionTracker = new SessionTracker();
