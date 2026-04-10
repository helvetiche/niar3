import { describe, it, expect, vi } from "vitest";
import {
  AppError,
  sanitizeErrorForClient,
  createErrorResponse,
  safeAsync,
} from "@/lib/error-handler";

describe("Error Handler", () => {
  describe("AppError", () => {
    it("should create custom error with code and status", () => {
      const error = new AppError("TEST_ERROR", "Test message", 400);

      expect(error.code).toBe("TEST_ERROR");
      expect(error.message).toBe("Test message");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("AppError");
    });

    it("should default to 500 status code", () => {
      const error = new AppError("TEST_ERROR", "Test message");
      expect(error.statusCode).toBe(500);
    });
  });

  describe("sanitizeErrorForClient", () => {
    it("should return AppError message", () => {
      const error = new AppError("TEST_ERROR", "Safe message");
      const sanitized = sanitizeErrorForClient(error);
      expect(sanitized).toBe("Safe message");
    });

    it("should sanitize ENOENT errors", () => {
      const error = new Error("ENOENT: file not found at /secret/path");
      const sanitized = sanitizeErrorForClient(error);
      expect(sanitized).toBe("Resource not found");
    });

    it("should sanitize permission errors", () => {
      const error = new Error("EACCES: permission denied");
      const sanitized = sanitizeErrorForClient(error);
      expect(sanitized).toBe("Permission denied");
    });

    it("should sanitize timeout errors", () => {
      const error = new Error("ETIMEDOUT: connection timeout");
      const sanitized = sanitizeErrorForClient(error);
      expect(sanitized).toBe("Request timed out");
    });

    it("should return generic message for unknown errors", () => {
      const error = new Error("Some internal error");
      const sanitized = sanitizeErrorForClient(error);
      expect(sanitized).toBe("An error occurred");
    });

    it("should handle non-Error objects", () => {
      const sanitized = sanitizeErrorForClient("string error");
      expect(sanitized).toBe("An unexpected error occurred");
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response object", () => {
      const response = createErrorResponse("TEST_ERROR", "Test message", 400);

      expect(response.error.code).toBe("TEST_ERROR");
      expect(response.statusCode).toBe(400);
    });

    it("should sanitize error message", () => {
      const error = new Error("ENOENT: /secret/path");
      const response = createErrorResponse("FILE_ERROR", error.message, 404);

      expect(response.error.message).toBe("Resource not found");
    });
  });

  describe("safeAsync", () => {
    it("should execute async function without throwing", async () => {
      const fn = vi.fn().mockResolvedValue(undefined);

      expect(() => {
        safeAsync(fn, "test context");
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(fn).toHaveBeenCalled();
    });

    it("should catch and log errors", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const fn = vi.fn().mockRejectedValue(new Error("Test error"));

      safeAsync(fn, "test context");

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});
