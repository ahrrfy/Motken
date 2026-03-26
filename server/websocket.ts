import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";

// Store active connections: userId -> Set of WebSocket connections
const userConnections = new Map<string, Set<WebSocket>>();
// Store mosque memberships for broadcast
const mosqueUsers = new Map<string, Set<string>>();

export function setupWebSocket(httpServer: Server, sessionParser: any) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    // Parse session from cookie to get userId
    sessionParser(req, {} as any, () => {
      const session = (req as any).session;
      if (!session?.passport?.user) {
        ws.close(4001, "Unauthorized");
        return;
      }

      const userId = String(session.passport.user);
      const mosqueId = session.mosqueId || "";

      // Register connection
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId)!.add(ws);

      // Track mosque membership
      if (mosqueId) {
        if (!mosqueUsers.has(mosqueId)) {
          mosqueUsers.set(mosqueId, new Set());
        }
        mosqueUsers.get(mosqueId)!.add(userId);
      }

      // Heartbeat
      (ws as any).isAlive = true;
      ws.on("pong", () => { (ws as any).isAlive = true; });

      ws.on("close", () => {
        const conns = userConnections.get(userId);
        if (conns) {
          conns.delete(ws);
          if (conns.size === 0) {
            userConnections.delete(userId);
            // Remove from mosque tracking
            if (mosqueId && mosqueUsers.has(mosqueId)) {
              mosqueUsers.get(mosqueId)!.delete(userId);
            }
          }
        }
      });

      ws.on("error", () => ws.close());
    });
  });

  // Heartbeat interval — detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if ((ws as any).isAlive === false) return ws.terminate();
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(heartbeatInterval));

  console.log("[WebSocket] Server initialized on /ws");
  return wss;
}

/** Send a message to a specific user (all their open tabs/devices) */
export function broadcastToUser(userId: string, payload: object) {
  const conns = userConnections.get(userId);
  if (!conns) return;
  const data = JSON.stringify(payload);
  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

/** Send a message to all users in a mosque */
export function broadcastToMosque(mosqueId: string, payload: object) {
  const users = mosqueUsers.get(mosqueId);
  if (!users) return;
  for (const userId of users) {
    broadcastToUser(userId, payload);
  }
}

/** Get count of online users */
export function getOnlineUserCount(): number {
  return userConnections.size;
}

/** Check if a specific user is online */
export function isUserOnline(userId: string): boolean {
  return userConnections.has(userId);
}
