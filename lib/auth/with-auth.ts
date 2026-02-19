import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "./get-session";
import { hasPermission } from "./has-permission";
import { applySecurityHeaders } from "@/lib/security-headers";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import type { AuthUser } from "@/types/auth";
import type { Permission } from "@/constants/permissions";

export type WithAuthOptions = {
  permission?: Permission;
  /** Audit action key for logging (e.g. "profile.get"). When set, logs 401/403. */
  action?: string;
};

/**
 * For API Route Handlers. Require auth and optionally permission.
 * Returns 401/403 with security headers if not authorized.
 * When action is provided, logs unauthorized/forbidden attempts to audit trail.
 *
 * @example
 * export async function GET(request: Request) {
 *   const auth = await withAuth(request, { action: "profile.get" })
 *   if (auth instanceof NextResponse) return auth
 *   const { user } = auth
 *   // ... handle request
 * }
 */
export async function withAuth(
  request: Request,
  options?: Permission | WithAuthOptions,
): Promise<{ user: AuthUser } | NextResponse> {
  const permission = typeof options === "string" ? options : options?.permission;
  const action = typeof options === "object" ? options?.action : undefined;

  const result = await getSession();
  const route = new URL(request.url).pathname;
  const method = request.method;

  if (!result.user) {
    if (action) {
      await logAuditTrailEntry({
        action,
        status: "rejected",
        route,
        method,
        request,
        httpStatus: 401,
        details: { reason: "unauthorized" },
      });
    }
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Unauthorized", code: result.error },
        { status: 401 },
      ),
    );
  }

  if (permission && !hasPermission(result.user, permission)) {
    if (action) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action,
        status: "rejected",
        route,
        method,
        request,
        httpStatus: 403,
        details: { reason: "forbidden", permission },
      });
    }
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Forbidden", message: "Insufficient permissions" },
        { status: 403 },
      ),
    );
  }

  return { user: result.user };
}
