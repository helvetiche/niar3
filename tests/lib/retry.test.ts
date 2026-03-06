import { describe, it, expect, vi } from "vitest";
import { withRetry } from "@/lib/retry";

describe("withRetry", () => {
  it("should return result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const result = await withRetry(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on retryable errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 10 });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should throw after max attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("ECONNRESET"));

    await expect(
      withRetry(fn, { maxAttempts: 3, delayMs: 10 }),
    ).rejects.toThrow("ECONNRESET");

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should not retry non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Invalid input"));

    await expect(
      withRetry(fn, { maxAttempts: 3, delayMs: 10 }),
    ).rejects.toThrow("Invalid input");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should apply exponential backoff", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValue("success");

    const startTime = Date.now();
    await withRetry(fn, {
      maxAttempts: 3,
      delayMs: 100,
      backoffMultiplier: 2,
    });
    const endTime = Date.now();

    // Should have delayed at least 100ms + 200ms = 300ms
    expect(endTime - startTime).toBeGreaterThanOrEqual(250);
  });

  it("should respect max delay", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValue("success");

    await withRetry(fn, {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 10,
      maxDelayMs: 500,
    });

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should handle custom retryable errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Custom error"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, {
      maxAttempts: 2,
      delayMs: 10,
      retryableErrors: ["custom error"],
    });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
