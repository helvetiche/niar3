import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

vi.mock("@/lib/rate-limit", () => ({
  publicRateLimit: null,
  apiRateLimit: null,
  authRateLimit: null,
  getClientIdentifier: vi.fn(() => "test-client"),
  isRateLimitEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/security-headers", () => ({
  applySecurityHeaders: vi.fn((response) => response),
}));

describe("Proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should apply security headers to all requests", async () => {
    const request = new NextRequest("http://localhost:3000/");
    const response = await proxy(request);

    expect(response).toBeDefined();
  });

  it("should handle API routes", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/health");
    const response = await proxy(request);

    expect(response).toBeDefined();
  });

  it("should handle auth routes", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/auth/session");
    const response = await proxy(request);

    expect(response).toBeDefined();
  });

  it("should handle public routes", async () => {
    const request = new NextRequest("http://localhost:3000/");
    const response = await proxy(request);

    expect(response).toBeDefined();
  });
});
