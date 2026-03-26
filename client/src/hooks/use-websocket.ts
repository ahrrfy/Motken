import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type WSMessage = {
  type: "notification" | "message" | "attendance" | "assignment" | "points";
  data: any;
};

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        switch (msg.type) {
          case "notification":
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            break;
          case "message":
            queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
            break;
          case "attendance":
            queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
            break;
          case "assignment":
            queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
            break;
          case "points":
            queryClient.invalidateQueries({ queryKey: ["/api/points"] });
            queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // Exponential backoff reconnection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectTimerRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { isConnected };
}
