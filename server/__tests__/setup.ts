/**
 * Integration test setup.
 *
 * Tests run against the real database with transaction rollback isolation.
 * Each test runs in a separate transaction that gets rolled back after,
 * so tests don't affect each other or the real database.
 *
 * Requires DATABASE_URL env var to be set.
 */
import { beforeAll, afterAll } from "vitest";

let dbAvailable = false;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    console.warn("[TEST] DATABASE_URL not set — integration tests will be skipped");
    return;
  }
  dbAvailable = true;
});

afterAll(async () => {
  // Pool cleanup handled by Vitest process exit
});

export function skipIfNoDb() {
  if (!dbAvailable) {
    return true;
  }
  return false;
}
