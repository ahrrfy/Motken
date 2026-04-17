import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger to keep test output clean
vi.mock("../../lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock db so importing the routes module doesn't require DATABASE_URL
vi.mock("../../db", () => ({
  pool: { query: vi.fn() },
  db: {},
}));

// Mock auth middleware + storage to avoid further cascading imports
vi.mock("../../auth", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const { resolveMosqueId } = await import("../../routes/library");

describe("resolveMosqueId — tenant isolation for library routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Admin cases ─────────────────────────────────────────────────────────
  it("admin without requested mosqueId → MISSING_MOSQUE_ASSOCIATION", () => {
    const result = resolveMosqueId(
      { id: "admin-1", role: "admin", mosqueId: null },
      undefined,
    );
    expect(result).toEqual({
      ok: false,
      status: 400,
      code: "MISSING_MOSQUE_ASSOCIATION",
      message: expect.stringContaining("يجب اختيار المسجد"),
    });
  });

  it("admin with empty string mosqueId → MISSING_MOSQUE_ASSOCIATION", () => {
    const result = resolveMosqueId(
      { id: "admin-1", role: "admin", mosqueId: null },
      "",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MISSING_MOSQUE_ASSOCIATION");
  });

  it("admin with whitespace-only mosqueId → MISSING_MOSQUE_ASSOCIATION", () => {
    const result = resolveMosqueId(
      { id: "admin-1", role: "admin", mosqueId: null },
      "   ",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MISSING_MOSQUE_ASSOCIATION");
  });

  it("admin with valid mosqueId → resolves to that mosque", () => {
    const result = resolveMosqueId(
      { id: "admin-1", role: "admin", mosqueId: null },
      "mosque-xyz",
    );
    expect(result).toEqual({ ok: true, mosqueId: "mosque-xyz" });
  });

  it("admin can pick any mosqueId even if they have one of their own", () => {
    const result = resolveMosqueId(
      { id: "admin-1", role: "admin", mosqueId: "own-mosque" },
      "other-mosque",
    );
    expect(result).toEqual({ ok: true, mosqueId: "other-mosque" });
  });

  it("admin trims whitespace from requested mosqueId", () => {
    const result = resolveMosqueId(
      { id: "admin-1", role: "admin", mosqueId: null },
      "  mosque-abc  ",
    );
    expect(result).toEqual({ ok: true, mosqueId: "mosque-abc" });
  });

  // ── Non-admin (supervisor/teacher/student) cases ────────────────────────
  it("supervisor with mosqueId and no request → uses own mosque", () => {
    const result = resolveMosqueId(
      { id: "sup-1", role: "supervisor", mosqueId: "m1" },
      undefined,
    );
    expect(result).toEqual({ ok: true, mosqueId: "m1" });
  });

  it("supervisor passing their own mosqueId → uses own mosque", () => {
    const result = resolveMosqueId(
      { id: "sup-1", role: "supervisor", mosqueId: "m1" },
      "m1",
    );
    expect(result).toEqual({ ok: true, mosqueId: "m1" });
  });

  it("supervisor attempting to access another mosque → FORBIDDEN_MOSQUE_ACCESS", () => {
    const result = resolveMosqueId(
      { id: "sup-1", role: "supervisor", mosqueId: "m1" },
      "m2",
    );
    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN_MOSQUE_ACCESS",
      message: expect.stringContaining("غير مصرح"),
    });
  });

  it("teacher without mosqueId → MISSING_MOSQUE_ASSOCIATION", () => {
    const result = resolveMosqueId(
      { id: "teacher-1", role: "teacher", mosqueId: null },
      undefined,
    );
    expect(result).toEqual({
      ok: false,
      status: 400,
      code: "MISSING_MOSQUE_ASSOCIATION",
      message: expect.stringContaining("لا يوجد مسجد مرتبط بحسابك"),
    });
  });

  it("student without mosqueId → MISSING_MOSQUE_ASSOCIATION", () => {
    const result = resolveMosqueId(
      { id: "student-1", role: "student", mosqueId: null },
      undefined,
    );
    expect(result).toEqual({
      ok: false,
      status: 400,
      code: "MISSING_MOSQUE_ASSOCIATION",
      message: expect.stringContaining("لا يوجد مسجد مرتبط بحسابك"),
    });
  });

  it("student with mosqueId passing different mosque → FORBIDDEN_MOSQUE_ACCESS", () => {
    const result = resolveMosqueId(
      { id: "student-1", role: "student", mosqueId: "m1" },
      "m2",
    );
    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN_MOSQUE_ACCESS",
      message: expect.stringContaining("غير مصرح"),
    });
  });

  it("teacher with mosqueId and no request → uses own mosque silently", () => {
    const result = resolveMosqueId(
      { id: "t1", role: "teacher", mosqueId: "m-school" },
      null,
    );
    expect(result).toEqual({ ok: true, mosqueId: "m-school" });
  });

  // ── Logging verification ─────────────────────────────────────────────────
  it("logs warning when admin omits mosqueId", async () => {
    const { logger } = await import("../../lib/logger");
    resolveMosqueId({ id: "admin-1", role: "admin", mosqueId: null }, undefined);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "admin-1", role: "admin" }),
      "library.missing_mosque_for_admin",
    );
  });

  it("logs warning on cross-mosque access attempt", async () => {
    const { logger } = await import("../../lib/logger");
    resolveMosqueId({ id: "sup-1", role: "supervisor", mosqueId: "m1" }, "m2");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "sup-1", userMosque: "m1", requested: "m2" }),
      "library.cross_mosque_denied",
    );
  });

  it("logs warning when non-admin has no mosque", async () => {
    const { logger } = await import("../../lib/logger");
    resolveMosqueId({ id: "u1", role: "teacher", mosqueId: null }, undefined);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", role: "teacher" }),
      "library.user_has_no_mosque",
    );
  });
});
