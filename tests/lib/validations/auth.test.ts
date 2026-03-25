import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("Auth Validations", () => {
  describe("signUpSchema", () => {
    it("should validate correct signup data", () => {
      const data = {
        email: "test@example.com",
        password: "SecurePass123!",
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const data = {
        email: "invalid-email",
        password: "SecurePass123!",
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject weak password", () => {
      const data = {
        email: "test@example.com",
        password: "weak",
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("signInSchema", () => {
    it("should validate correct signin data", () => {
      const data = {
        email: "test@example.com",
        password: "anypassword",
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const data = {
        email: "invalid",
        password: "password",
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("should validate correct email", () => {
      const data = { email: "test@example.com" };

      const result = forgotPasswordSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const data = { email: "invalid" };

      const result = forgotPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("should validate correct reset data", () => {
      const data = {
        oobCode: "valid-code-123",
        newPassword: "NewSecure123!",
      };

      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject empty code", () => {
      const data = {
        oobCode: "",
        newPassword: "NewSecure123!",
      };

      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject weak new password", () => {
      const data = {
        oobCode: "valid-code",
        newPassword: "weak",
      };

      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
