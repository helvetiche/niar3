import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import {
  applySecurityHeaders,
  secureJsonResponse,
  SECURITY_RESPONSE_HEADERS,
} from "@/lib/security-headers";

describe("Security Headers", () => {
  it("should apply all security headers to response", () => {
    const response = new NextResponse("test");
    const securedResponse = applySecurityHeaders(response);

    expect(securedResponse.headers.get("X-Frame-Options")).toBe("DENY");
    expect(securedResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(securedResponse.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
  });

  it("should include CSP header", () => {
    const response = new NextResponse("test");
    const securedResponse = applySecurityHeaders(response);

    const csp = securedResponse.headers.get("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("should apply additional headers", () => {
    const response = new NextResponse("test");
    const securedResponse = applySecurityHeaders(response, {
      "X-Custom-Header": "custom-value",
    });

    expect(securedResponse.headers.get("X-Custom-Header")).toBe("custom-value");
  });

  it("should create secure JSON response", () => {
    const data = { message: "test" };
    const response = secureJsonResponse(data, { status: 200 });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Content-Type")).toContain("application/json");
  });

  it("should include HSTS in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const hsts = SECURITY_RESPONSE_HEADERS["Strict-Transport-Security"];
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");

    process.env.NODE_ENV = originalEnv;
  });
});
