import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock storage to avoid DB dependency
const mockGetUser = vi.fn();
vi.mock("../../storage", () => ({
  storage: {
    getUser: (...args: any[]) => mockGetUser(...args),
  },
}));

// Import AFTER mocking
const { ensureSameMosque, ensureAllSameMosque } = await import("../../lib/mosque-guard");

describe("ensureSameMosque", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return target user when same mosque", async () => {
    const targetUser = { id: "u2", name: "Test", mosqueId: "m1", role: "student" };
    mockGetUser.mockResolvedValue(targetUser);

    const result = await ensureSameMosque(
      { mosqueId: "m1", role: "teacher" },
      "u2"
    );
    expect(result).toEqual(targetUser);
  });

  it("should throw 403 when different mosque", async () => {
    mockGetUser.mockResolvedValue({ id: "u2", mosqueId: "m2", role: "student" });

    await expect(
      ensureSameMosque({ mosqueId: "m1", role: "teacher" }, "u2")
    ).rejects.toMatchObject({ status: 403 });
  });

  it("should throw 404 when user not found", async () => {
    mockGetUser.mockResolvedValue(undefined);

    await expect(
      ensureSameMosque({ mosqueId: "m1", role: "teacher" }, "nonexistent")
    ).rejects.toMatchObject({ status: 404 });
  });

  it("should allow access when currentUser has no mosqueId", async () => {
    mockGetUser.mockResolvedValue({ id: "u2", mosqueId: "m2", role: "student" });

    const result = await ensureSameMosque({ mosqueId: null, role: "admin" }, "u2");
    expect(result.id).toBe("u2");
  });
});

describe("ensureAllSameMosque", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array for empty input", async () => {
    const result = await ensureAllSameMosque({ mosqueId: "m1", role: "admin" }, []);
    expect(result).toEqual([]);
  });

  it("should return all users when all same mosque", async () => {
    mockGetUser
      .mockResolvedValueOnce({ id: "u1", mosqueId: "m1" })
      .mockResolvedValueOnce({ id: "u2", mosqueId: "m1" });

    const result = await ensureAllSameMosque(
      { mosqueId: "m1", role: "teacher" },
      ["u1", "u2"]
    );
    expect(result).toHaveLength(2);
  });

  it("should throw 403 when any user is from different mosque", async () => {
    mockGetUser
      .mockResolvedValueOnce({ id: "u1", mosqueId: "m1" })
      .mockResolvedValueOnce({ id: "u2", mosqueId: "m2" });

    await expect(
      ensureAllSameMosque({ mosqueId: "m1", role: "teacher" }, ["u1", "u2"])
    ).rejects.toMatchObject({ status: 403 });
  });

  it("should skip non-existent users", async () => {
    mockGetUser
      .mockResolvedValueOnce({ id: "u1", mosqueId: "m1" })
      .mockResolvedValueOnce(undefined);

    const result = await ensureAllSameMosque(
      { mosqueId: "m1", role: "teacher" },
      ["u1", "nonexistent"]
    );
    expect(result).toHaveLength(1);
  });
});
