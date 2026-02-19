import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security-headers";
import {
  apiRateLimit,
  heavyOperationRateLimit,
  getClientIdentifier,
  isRateLimitEnabled,
} from "./index";

function createRateLimitResponse(reset: number): NextResponse {
  return applySecurityHeaders(
    NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      },
    ),
  );
}

/**
 * Use in API Route Handlers to enforce general rate limiting.
 * Returns 429 response if rate limit exceeded; otherwise null.
 *
 * @example
 * export async function GET(request: Request) {
 *   const rateLimitResponse = await withApiRateLimit(request)
 *   if (rateLimitResponse) return rateLimitResponse
 *   // ... handle request
 * }
 */
export async function withApiRateLimit(
  request: Request,
): Promise<NextResponse | null> {
  if (!isRateLimitEnabled() || !apiRateLimit) {
    return null;
  }
  const identifier = getClientIdentifier(request);
  const { success, reset } = await apiRateLimit.limit(identifier);
  if (!success) return createRateLimitResponse(reset);
  return null;
}

/**
 * Use for heavy operations (merge-files, consolidate-ifr, generate-profiles, lipa-summary).
 * Stricter limit: 5 requests per minute per IP.
 */
export async function withHeavyOperationRateLimit(
  request: Request,
): Promise<NextResponse | null> {
  if (!isRateLimitEnabled() || !heavyOperationRateLimit) {
    return null;
  }
  const identifier = getClientIdentifier(request);
  const { success, reset } = await heavyOperationRateLimit.limit(identifier);
  if (!success) return createRateLimitResponse(reset);
  return null;
}
