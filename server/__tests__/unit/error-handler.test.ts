import { describe, it, expect } from "vitest";
import { ZodError, z } from "zod";
import { handleApiError } from "../../error-handler";

describe("Error Handler", () => {
  describe("Zod validation errors", () => {
    it("should handle required field error", () => {
      const schema = z.object({ username: z.string() });
      try {
        schema.parse({});
      } catch (err) {
        const result = handleApiError(err);
        expect(result.status).toBe(400);
        expect(result.body.source).toBe("validation");
        expect(result.body.message).toContain("اسم المستخدم");
        expect(result.body.message).toContain("مطلوب");
      }
    });

    it("should handle string too short error", () => {
      const schema = z.object({ name: z.string().min(3) });
      try {
        schema.parse({ name: "ab" });
      } catch (err) {
        const result = handleApiError(err);
        expect(result.status).toBe(400);
        expect(result.body.source).toBe("validation");
        expect(result.body.message).toContain("الاسم");
      }
    });

    it("should handle invalid enum value", () => {
      const schema = z.object({ role: z.enum(["admin", "teacher", "student"]) });
      try {
        schema.parse({ role: "invalid" });
      } catch (err) {
        const result = handleApiError(err);
        expect(result.status).toBe(400);
        expect(result.body.message).toContain("الدور");
        expect(result.body.message).toContain("غير مقبولة");
      }
    });

    it("should include details for multiple errors", () => {
      const schema = z.object({
        name: z.string(),
        phone: z.string(),
      });
      try {
        schema.parse({});
      } catch (err) {
        const result = handleApiError(err);
        expect(result.status).toBe(400);
        expect(result.body.details).toBeDefined();
        expect(result.body.details!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("PostgreSQL database errors", () => {
    it("should handle unique constraint (23505) - username", () => {
      const err = { code: "23505", message: 'duplicate key value violates unique constraint "users_username_unique"' };
      const result = handleApiError(err);
      expect(result.status).toBe(400);
      expect(result.body.source).toBe("database");
      expect(result.body.message).toContain("اسم المستخدم");
      expect(result.body.field).toBe("username");
    });

    it("should handle unique constraint (23505) - phone", () => {
      const err = { code: "23505", message: 'duplicate key value violates unique constraint "users_phone_unique"' };
      const result = handleApiError(err);
      expect(result.status).toBe(400);
      expect(result.body.message).toContain("هاتف");
    });

    it("should handle foreign key violation (23503)", () => {
      const err = { code: "23503", message: 'violates foreign key constraint on "student_id"' };
      const result = handleApiError(err);
      expect(result.status).toBe(400);
      expect(result.body.source).toBe("database");
    });

    it("should handle not-null violation (23502)", () => {
      const err = { code: "23502", message: 'null value in column "name" violates not-null constraint' };
      const result = handleApiError(err);
      expect(result.status).toBe(400);
      expect(result.body.message).toContain("الاسم");
      expect(result.body.message).toContain("مطلوب");
    });

    it("should handle check constraint (23514)", () => {
      const err = { code: "23514", message: "check constraint violated" };
      const result = handleApiError(err);
      expect(result.status).toBe(400);
      expect(result.body.message).toContain("النطاق المسموح");
    });
  });

  describe("HTTP errors", () => {
    it("should handle 400 errors", () => {
      const err = { status: 400, message: "بيانات خاطئة" };
      const result = handleApiError(err);
      expect(result.status).toBe(400);
      expect(result.body.message).toBe("بيانات خاطئة");
      expect(result.body.source).toBe("validation");
    });

    it("should handle 403 errors", () => {
      const err = { status: 403, message: "غير مصرح" };
      const result = handleApiError(err);
      expect(result.status).toBe(403);
      expect(result.body.source).toBe("permission");
    });
  });

  describe("Unknown/Server errors", () => {
    it("should handle unexpected errors as 500", () => {
      const err = new Error("Something broke");
      const result = handleApiError(err);
      expect(result.status).toBe(500);
      expect(result.body.source).toBe("server");
    });

    it("should handle null/undefined errors", () => {
      const result = handleApiError(null);
      expect(result.status).toBe(500);
      expect(result.body.source).toBe("server");
    });
  });
});
