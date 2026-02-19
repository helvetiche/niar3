import { NextResponse } from "next/server";
import { safeContentDispositionFilename } from "@/lib/file-utils";

/**
 * Centralized security headers for all responses.
 * Apply to every response to ensure consistent security posture.
 */

export const SECURITY_RESPONSE_HEADERS: Record<string, string> = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  // Prevent MIME-type sniffing
  "X-Content-Type-Options": "nosniff",
  // Control referrer information
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Restrict browser features
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  // DNS prefetch control
  "X-DNS-Prefetch-Control": "on",
  // XSS filter (legacy, but harmless)
  "X-XSS-Protection": "0",
  // HSTS - enforce HTTPS (2 years). Enable in production only.
  ...(process.env.NODE_ENV === "production" && {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  }),
  // Prevent cross-origin isolation issues
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
} as Record<string, string>;

/**
 * Apply security headers to a Response or NextResponse.
 * Use in proxy.ts and when building API responses.
 */
export function applySecurityHeaders<T extends Response>(
  response: T,
  additionalHeaders?: Record<string, string>,
): T {
  Object.entries(SECURITY_RESPONSE_HEADERS).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });
  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  return response;
}

/**
 * Build a binary file response with security headers and safe Content-Disposition.
 * Prevents header injection via filename.
 */
export function secureFileResponse(
  buffer: Uint8Array | Buffer,
  options: {
    contentType: string;
    filename: string;
    extraHeaders?: Record<string, string>;
  },
): Response {
  const safeFilename = safeContentDispositionFilename(
    options.filename,
    "download",
  );
  const response = new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": options.contentType,
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      ...options.extraHeaders,
    },
  });
  return applySecurityHeaders(response);
}

/**
 * Build a JSON response with security headers applied.
 * Use in API Route Handlers instead of raw NextResponse.json().
 */
export function secureJsonResponse(
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  const { status, headers: extra } = init ?? {};
  const response = NextResponse.json(data, status ? { status } : undefined);
  applySecurityHeaders(response, extra);
  return response;
}

/**
 * Default headers for outgoing server-to-server requests.
 * Use when calling external APIs from Route Handlers or Server Actions.
 */
export const SECURITY_REQUEST_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "niatools-server/1.0",
};

/**
 * Merge security request headers into fetch init.
 * Ensures outgoing requests from the server have consistent headers.
 */
export function withSecurityRequestHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  Object.entries(SECURITY_REQUEST_HEADERS).forEach(([key, value]) => {
    if (!headers.has(key)) headers.set(key, value);
  });
  return { ...init, headers };
}
