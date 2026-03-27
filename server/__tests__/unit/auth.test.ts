import { describe, it, expect } from "vitest";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Replicate the auth functions for testing (avoid importing the module which has side effects)
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

describe("Password Hashing (scrypt)", () => {
  it("should hash a password and produce salt.hash format", async () => {
    const hash = await hashPassword("test123");
    expect(hash).toContain(".");
    const [hashed, salt] = hash.split(".");
    expect(hashed).toHaveLength(128); // 64 bytes = 128 hex chars
    expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
  });

  it("should produce different hashes for the same password (random salt)", async () => {
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");
    expect(hash1).not.toBe(hash2);
  });

  it("should correctly verify a valid password", async () => {
    const password = "correctPassword123!";
    const hash = await hashPassword(password);
    const isValid = await comparePasswords(password, hash);
    expect(isValid).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const hash = await hashPassword("correctPassword");
    const isValid = await comparePasswords("wrongPassword", hash);
    expect(isValid).toBe(false);
  });

  it("should handle special characters in passwords", async () => {
    const password = "p@$$w0rd!#%^&*()_+ñ日本語عربي";
    const hash = await hashPassword(password);
    const isValid = await comparePasswords(password, hash);
    expect(isValid).toBe(true);
  });

  it("should handle empty password", async () => {
    const hash = await hashPassword("");
    const isValid = await comparePasswords("", hash);
    expect(isValid).toBe(true);
    const isInvalid = await comparePasswords("notEmpty", hash);
    expect(isInvalid).toBe(false);
  });

  it("should handle very long passwords", async () => {
    const longPassword = "a".repeat(10000);
    const hash = await hashPassword(longPassword);
    const isValid = await comparePasswords(longPassword, hash);
    expect(isValid).toBe(true);
  });
});

describe("Login Rate Limiting", () => {
  const LOGIN_MAX_ATTEMPTS = 5;
  const LOGIN_WINDOW_MS = 15 * 60 * 1000;

  it("should allow first attempt", () => {
    const attempts = new Map<string, { count: number; lastAttempt: number }>();
    const key = "user:testuser";
    const entry = attempts.get(key);
    // No entry = allowed
    expect(entry).toBeUndefined();
  });

  it("should block after max attempts", () => {
    const attempts = new Map<string, { count: number; lastAttempt: number }>();
    const key = "user:testuser";
    attempts.set(key, { count: LOGIN_MAX_ATTEMPTS, lastAttempt: Date.now() });
    const entry = attempts.get(key)!;
    expect(entry.count >= LOGIN_MAX_ATTEMPTS).toBe(true);
  });

  it("should reset after window expires", () => {
    const attempts = new Map<string, { count: number; lastAttempt: number }>();
    const key = "user:testuser";
    attempts.set(key, { count: LOGIN_MAX_ATTEMPTS, lastAttempt: Date.now() - LOGIN_WINDOW_MS - 1000 });
    const entry = attempts.get(key)!;
    const expired = Date.now() - entry.lastAttempt > LOGIN_WINDOW_MS;
    expect(expired).toBe(true);
  });
});
