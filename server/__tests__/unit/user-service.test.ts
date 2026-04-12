import { describe, it, expect } from "vitest";
import { toSafeUser, toSafeUsers } from "../../services/user-service";

const mockUser = {
  id: "u1",
  name: "أحمد",
  username: "ahmed",
  password: "hashed.salt",
  role: "student" as const,
  mosqueId: "m1",
  teacherId: null,
  phone: "0501234567",
  email: null,
  avatar: null,
  level: 1,
  gender: "male" as const,
  parentPhone: null,
  parentName: null,
  isActive: true,
  isChild: false,
  isSpecialNeeds: false,
  isOrphan: false,
  pendingApproval: false,
  acceptedPrivacyPolicy: true,
  teacherLevels: null,
  createdAt: new Date(),
  address: null,
  educationLevel: null,
  dateOfBirth: null,
  telegramId: null,
  studyMode: null,
  age: null,
  notes: null,
  nationality: null,
  idNumber: null,
  completedJuz: null,
  memorizedParts: null,
  currentSurah: null,
  progressNotes: null,
  enrollmentDate: null,
  lastActive: null,
  actualRole: null,
};

describe("toSafeUser", () => {
  it("should strip password from user object", () => {
    const safe = toSafeUser(mockUser);
    expect(safe).not.toHaveProperty("password");
    expect(safe.id).toBe("u1");
    expect(safe.name).toBe("أحمد");
  });

  it("should not modify the original object", () => {
    const original = { ...mockUser };
    toSafeUser(original);
    expect(original.password).toBe("hashed.salt");
  });
});

describe("toSafeUsers", () => {
  it("should strip password from all users", () => {
    const users = [mockUser, { ...mockUser, id: "u2", name: "محمد" }];
    const safe = toSafeUsers(users);
    expect(safe).toHaveLength(2);
    for (const u of safe) {
      expect(u).not.toHaveProperty("password");
    }
  });

  it("should return empty array for empty input", () => {
    const safe = toSafeUsers([]);
    expect(safe).toEqual([]);
  });
});
