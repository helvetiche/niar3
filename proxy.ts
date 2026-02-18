import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  publicRateLimit,
  apiRateLimit,
  authRateLimit,
  getClientIdentifier,
  isRateLimitEnabled,
} from "@/lib/rate-limit";
import { applySecurityHeaders } from "@/lib/security-headers";

/**
 * Security-focused proxy for Next.js 16.
 * Runs before requests complete. Use for headers, redirects, and optimistic checks.
 * Full auth/session logic belongs in Server Layout Guards.
 */

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const isAuthRoute =
    pathname.startsWith("/api/v1/auth/") ||
    pathname.match(/^\/(login|register|forgot-password)/);

  // Distributed rate limiting (Upstash Redis)
  if (isRateLimitEnabled()) {
    const identifier = getClientIdentifier(request);
    const limiter = isAuthRoute
      ? authRateLimit
      : isApiRoute
        ? apiRateLimit
        : publicRateLimit;

    if (limiter) {
      const { success, reset } = await limiter.limit(identifier);
      if (!success) {
        const response = new NextResponse(
          JSON.stringify({ error: "Too many requests" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            },
          },
        );
        return applySecurityHeaders(response);
      }
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    // Page routes (exclude static assets)
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
