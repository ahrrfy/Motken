import pino from "pino";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  ...(isProduction
    ? {
        // Production: JSON format for log aggregation
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Development: pretty print
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
});

/**
 * Middleware: adds requestId + logs request/response
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomBytes(8).toString("hex");
  (req as any).requestId = requestId;

  const start = Date.now();

  res.on("finish", () => {
    if (!req.path.startsWith("/api")) return;
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.id,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, "Server error");
    } else if (res.statusCode >= 400) {
      logger.warn(logData, "Client error");
    } else {
      logger.info(logData, "Request completed");
    }
  });

  next();
}

/**
 * Child logger with requestId context
 */
export function getRequestLogger(req: Request) {
  return logger.child({ requestId: (req as any).requestId });
}
