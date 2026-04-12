import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateNotification = vi.fn().mockResolvedValue({ id: "n1" });
const mockGetUsersByMosqueAndRole = vi.fn().mockResolvedValue([
  { id: "u1" }, { id: "u2" }, { id: "u3" },
]);

vi.mock("../../storage", () => ({
  storage: {
    createNotification: (...args: unknown[]) => mockCreateNotification(...args),
    getUsersByMosqueAndRole: (...args: unknown[]) => mockGetUsersByMosqueAndRole(...args),
  },
}));

const { notifyUser, notifyMosqueRole, notifyUsers } = await import("../../services/notification-service");

describe("notifyUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should create a single notification", async () => {
    await notifyUser("u1", "عنوان", "رسالة", "info", "m1");
    expect(mockCreateNotification).toHaveBeenCalledOnce();
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: "u1",
      mosqueId: "m1",
      title: "عنوان",
      message: "رسالة",
      type: "info",
      isRead: false,
    });
  });

  it("should default type to info", async () => {
    await notifyUser("u1", "test", "msg");
    expect(mockCreateNotification.mock.calls[0][0].type).toBe("info");
  });
});

describe("notifyMosqueRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should send to all users of given role in mosque", async () => {
    await notifyMosqueRole("m1", "student", "إعلان", "محتوى");
    expect(mockGetUsersByMosqueAndRole).toHaveBeenCalledWith("m1", "student");
    expect(mockCreateNotification).toHaveBeenCalledTimes(3);
  });
});

describe("notifyUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should send to all specified user IDs", async () => {
    await notifyUsers(["u1", "u2"], "عنوان", "رسالة");
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
  });

  it("should handle empty array", async () => {
    await notifyUsers([], "عنوان", "رسالة");
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
