import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5002),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  REDIS_URL: z.string().optional(),
  HTTPS_ENABLED: z.string().default("false"),
  DATABASE_SSL: z.string().default("false"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues.map(i => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`[ENV] Invalid environment variables:\n${errors}`);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
