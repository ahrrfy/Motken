import { describe, it, expect } from "vitest";
import {
  validateStringField,
  validateFields,
  validateAge,
  validateBoolean,
  validateEnum,
} from "@shared/security-utils";

describe("validateStringField", () => {
  it("should accept valid string within limits", () => {
    expect(validateStringField("أحمد", "name").valid).toBe(true);
  });

  it("should accept null/undefined (optional)", () => {
    expect(validateStringField(null, "name").valid).toBe(true);
    expect(validateStringField(undefined, "name").valid).toBe(true);
  });

  it("should reject non-string values", () => {
    const result = validateStringField(123, "name");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("نصاً");
  });

  it("should reject strings exceeding max length", () => {
    const longName = "a".repeat(201);
    const result = validateStringField(longName, "name");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("200");
  });

  it("should use field-specific max lengths", () => {
    // phone max = 30
    expect(validateStringField("0".repeat(30), "phone").valid).toBe(true);
    expect(validateStringField("0".repeat(31), "phone").valid).toBe(false);

    // username max = 50
    expect(validateStringField("a".repeat(50), "username").valid).toBe(true);
    expect(validateStringField("a".repeat(51), "username").valid).toBe(false);
  });

  it("should default to 500 for unknown fields", () => {
    expect(validateStringField("a".repeat(500), "unknownField").valid).toBe(true);
    expect(validateStringField("a".repeat(501), "unknownField").valid).toBe(false);
  });
});

describe("validateFields", () => {
  it("should validate multiple fields", () => {
    const body = { name: "أحمد", phone: "0770123456" };
    expect(validateFields(body, ["name", "phone"]).valid).toBe(true);
  });

  it("should fail on first invalid field", () => {
    const body = { name: "a".repeat(300), phone: "ok" };
    const result = validateFields(body, ["name", "phone"]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("name");
  });
});

describe("validateAge", () => {
  it("should accept valid ages", () => {
    expect(validateAge(5).valid).toBe(true);
    expect(validateAge(25).valid).toBe(true);
    expect(validateAge(120).valid).toBe(true);
  });

  it("should accept null/undefined", () => {
    expect(validateAge(null).valid).toBe(true);
    expect(validateAge(undefined).valid).toBe(true);
  });

  it("should reject age below 3", () => {
    expect(validateAge(2).valid).toBe(false);
    expect(validateAge(0).valid).toBe(false);
    expect(validateAge(-1).valid).toBe(false);
  });

  it("should reject age above 120", () => {
    expect(validateAge(121).valid).toBe(false);
  });

  it("should reject non-integer ages", () => {
    expect(validateAge(5.5).valid).toBe(false);
    expect(validateAge("abc").valid).toBe(false);
  });
});

describe("validateBoolean", () => {
  it("should accept boolean values", () => {
    expect(validateBoolean(true, "isActive").valid).toBe(true);
    expect(validateBoolean(false, "isActive").valid).toBe(true);
  });

  it("should accept null/undefined", () => {
    expect(validateBoolean(null, "isActive").valid).toBe(true);
  });

  it("should reject non-boolean", () => {
    expect(validateBoolean("true", "isActive").valid).toBe(false);
    expect(validateBoolean(1, "isActive").valid).toBe(false);
  });
});

describe("validateEnum", () => {
  const roles = ["admin", "teacher", "student", "supervisor", "parent"];

  it("should accept valid enum values", () => {
    expect(validateEnum("admin", "role", roles).valid).toBe(true);
    expect(validateEnum("student", "role", roles).valid).toBe(true);
  });

  it("should reject invalid enum values", () => {
    expect(validateEnum("hacker", "role", roles).valid).toBe(false);
  });

  it("should accept null/undefined", () => {
    expect(validateEnum(null, "role", roles).valid).toBe(true);
  });
});
