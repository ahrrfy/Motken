/**
 * Database migration runner
 * Usage: npx tsx script/migrate.ts
 *
 * Runs drizzle-kit push to sync schema with database.
 * For production, use generated SQL migrations instead.
 */

import "dotenv/config";
import { execSync } from "child_process";

const isProduction = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

console.log(`Running migrations (${isProduction ? "production" : "development"})...`);

try {
  execSync("npx drizzle-kit push", {
    stdio: "inherit",
    env: { ...process.env },
  });
  console.log("Migrations completed successfully!");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
}
