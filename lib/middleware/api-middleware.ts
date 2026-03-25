import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { verifyCsrfToken } from "@/lib/csrf";
import { createErrorResponse } from "@/lib/error-handler";
import { applySecurityHeaders } from "@/lib/security-headers";

interface ApiHandlerOptions {
  requireAuth?: boolean;
  requireCsrf?: boolean;
}

/**
 * Unified API middleware that handles auth, CSRF, and security headers
 * Use this wrapper for all API routes
 */
export async function withApiMiddleware(
  request: Request,
  handler: (request: Request) => Promise<Response>,
  options: ApiHandlerOptions = { requireAuth: true, requireCsrf: true },
): Promise<Response> {
  try {
    // Apply CSRF protection for state-changing operations
    if (
      options.requireCsrf &&
      request.method !== "GET" &&
      request.method !== "HEAD"
    ) {
      const isValidCsrf = await verifyCsrfToken(request);
      if (!isValidCsrf) {
        const { error, statusCode } = createErrorResponse(
          "CSRF_TOKEN_INVALID",
          "Invalid or missing CSRF token",
          403,
        );
        return applySecurityHeaders(
          NextResponse.json(error, { status: statusCode }),
        );
      }
    }

    // Apply authentication if required
    if (options.requireAuth) {
      const auth = await withAuth(request, { action: "api.request" });
      if (auth instanceof NextResponse) {
        return auth;
      }
    }

    // Execute handler
    const response = await handler(request);

    // Apply security headers to response
    return applySecurityHeaders(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
       
      console.error("[API Middleware] Error:", error);
    }
    const { error: errorResponse, statusCode } = createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred",
      500,
    );
    return applySecurityHeaders(
      NextResponse.json(errorResponse, { status: statusCode }),
    );
  }
}
