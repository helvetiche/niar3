import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";

type AuthResult = { user: { uid: string } } | null;

type AuditAction = string;

interface AuditContext {
  action: AuditAction;
  route: string;
  method: string;
  request: Request;
}

/**
 * Wrapper for API route handlers that automatically logs audit trail entries
 */
export async function withAuditLogging<T>(
  context: AuditContext,
  auth: AuthResult | null,
  handler: () => Promise<T>,
): Promise<T> {
  const uid = auth?.user?.uid;

  try {
    const result = await handler();
    
    // Log success
    await logAuditTrailEntry({
      uid,
      action: context.action,
      status: "success",
      route: context.route,
      method: context.method,
      request: context.request,
      httpStatus: 200,
    });

    return result;
  } catch (error) {
    // Log error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    
    await logAuditTrailEntry({
      uid,
      action: context.action,
      status: "error",
      route: context.route,
      method: context.method,
      request: context.request,
      httpStatus: 500,
      errorMessage,
    });

    throw error;
  }
}

/**
 * Log a rejection (rate limit, validation, etc.)
 */
export async function logRejection(
  context: AuditContext,
  uid: string | undefined,
  httpStatus: number,
  details: Record<string, unknown>,
): Promise<void> {
  await logAuditTrailEntry({
    uid,
    action: context.action,
    status: "rejected",
    route: context.route,
    method: context.method,
    request: context.request,
    httpStatus,
    details,
  });
}

/**
 * Create audit context from request
 */
export function createAuditContext(
  request: Request,
  action: AuditAction,
): AuditContext {
  const url = new URL(request.url);
  return {
    action,
    route: url.pathname,
    method: request.method,
    request,
  };
}
