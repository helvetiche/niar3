import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "./get-session";
import { hasPermission } from "./has-permission";
import { applySecurityHeaders } from "@/lib/security-headers";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { logPermissionCheck } from "@/lib/monitoring/audit-logger";
import type { AuthUser } from "@/types/auth";
import type { Permission } from "@/constants/permissions";

export type WithAuthOptions = {
  permission?: Permission;
  action?: string;
};

/**
 * For API Route Handlers. Require auth and optionally permission.
 * Returns 401/403 with security headers if not authorized.
 * Logs unauthorized/forbidden attempts to audit trail and monitoring.
 */
export async function withAuth(
  request: Request,
  options?: Permission | WithAuthOptions,
): Promise<{ user: AuthUser } | NextResponse> {
  const permission =
    typeof options === "string" ? options : options?.permission;
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
        action,
        status: "rejected",
        route,
        method,
        request,
        httpStatus: 403,
        details: { reason: "forbidden", requiredPermission: permission },
      });

      logPermissionCheck({
        action,
        userId: result.user.uid,
        userEmail: result.user.email || undefined,
        userRole: (result.user.customClaims?.role as string) || "user",
        status: "rejected",
        route,
        method,
        httpStatus: 403,
        details: { requiredPermission: permission },
      });
    }
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Forbidden", requiredPermission: permission },
        { status: 403 },
      ),
    );
  }

  return { user: result.user };
}
