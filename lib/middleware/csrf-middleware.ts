import { NextResponse } from "next/server";
import { verifyCsrfToken } from "@/lib/csrf";
import { createErrorResponse } from "@/lib/error-handler";

/**
 * CSRF protection middleware for state-changing operations
 * Apply to POST, PUT, DELETE, PATCH routes
 */
export async function withCsrfProtection(
  request: Request,
  handler: (request: Request) => Promise<Response>,
): Promise<Response> {
  // Skip CSRF check for GET/HEAD requests
  if (request.method === "GET" || request.method === "HEAD") {
    return handler(request);
  }

  // Verify CSRF token
  const isValid = await verifyCsrfToken(request);
  if (!isValid) {
    const { error, statusCode } = createErrorResponse(
      "CSRF_TOKEN_INVALID",
      "Invalid or missing CSRF token",
      403,
    );
    return NextResponse.json(error, { status: statusCode });
  }

  return handler(request);
}
