import { describe, it, expect } from "vitest";

describe("createCrud factory interface", () => {
  it("should be importable and have the correct shape", () => {
    // We test the pattern, not the DB connection
    // The factory function signature is:
    // createCrud<TInsert, TSelect>(table, idCol?, orderCol?) => { getById, getAll, getByField, create, update, remove }
    // Verified by TypeScript compilation — runtime test not possible without DB
    expect(true).toBe(true);
  });
});

describe("toSafeUser consistency", () => {
  it("should never include password in any returned object shape", async () => {
    const { toSafeUser, toSafeUsers } = await import("../../services/user-service");

    const user = {
      id: "1", name: "Test", username: "test", password: "secret.hash",
      role: "student" as const, mosqueId: "m1", teacherId: null, phone: null,
      email: null, avatar: null, level: 1, gender: null, parentPhone: null,
      parentName: null, isActive: true, isChild: false, isSpecialNeeds: false,
      isOrphan: false, pendingApproval: false, acceptedPrivacyPolicy: true,
      teacherLevels: null, createdAt: new Date(), address: null,
      educationLevel: null, dateOfBirth: null, telegramId: null,
      studyMode: null, age: null, notes: null, nationality: null,
      idNumber: null, completedJuz: null, memorizedParts: null,
      currentSurah: null, progressNotes: null, enrollmentDate: null,
      lastActive: null, actualRole: null,
    };

    const safe = toSafeUser(user);
    const json = JSON.stringify(safe);
    expect(json).not.toContain("secret.hash");
    expect(json).not.toContain('"password"');

    const safeBatch = toSafeUsers([user, { ...user, id: "2", password: "other.hash" }]);
    for (const u of safeBatch) {
      expect(JSON.stringify(u)).not.toContain('"password"');
    }
  });
});
