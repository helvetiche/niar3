import { describe, it, expect } from "vitest";
import { getClientIdentifier, isRateLimitEnabled } from "@/lib/rate-limit";

describe("Rate Limiting", () => {
  describe("getClientIdentifier", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const request = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const request = new Request("http://localhost", {
        headers: {
          "x-real-ip": "192.168.1.1",
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe("192.168.1.1");
    });

    it("should return anonymous when no IP headers", () => {
      const request = new Request("http://localhost");
      const identifier = getClientIdentifier(request);
      expect(identifier).toBe("anonymous");
    });

    it("should sanitize malicious input", () => {
      const request = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "192.168.1.1; DROP TABLE users;",
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe("192.168.1.1DROPTABLEusers");
      expect(identifier).not.toContain(";");
    });

    it("should limit identifier length to 64 chars", () => {
      const longIp = "a".repeat(100);
      const request = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": longIp,
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier.length).toBeLessThanOrEqual(64);
    });
  });

  describe("isRateLimitEnabled", () => {
    it("should return false in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const enabled = isRateLimitEnabled();
      expect(enabled).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });
  });
});
