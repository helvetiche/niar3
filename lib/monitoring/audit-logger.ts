import "server-only";
import { captureMessage } from "./sentry";

interface AuditLogEntry {
  action: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  status: "success" | "rejected" | "failed";
  route: string;
  method: string;
  httpStatus: number;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Logs permission check results for audit trail and security monitoring.
 * Sends critical permission denials to Sentry for alerting.
 * @param entry - Audit log entry with permission check details
 */
export function logPermissionCheck(entry: Omit<AuditLogEntry, "timestamp">) {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  if (entry.status === "rejected" && entry.httpStatus === 403) {
    captureMessage(
      `Permission denied: ${entry.action} for user ${entry.userEmail || entry.userId}`,
      "warning",
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[AUDIT]", JSON.stringify(logEntry, null, 2));
  }
}

/**
 * Logs authentication failures for security monitoring.
 * @param email - Email that attempted authentication
 * @param reason - Reason for failure
 * @param route - Route where auth failed
 */
export function logAuthFailure(email: string, reason: string, route: string) {
  const logEntry: AuditLogEntry = {
    action: "auth.failed",
    userEmail: email,
    status: "rejected",
    route,
    method: "POST",
    httpStatus: 401,
    details: { reason },
    timestamp: new Date().toISOString(),
  };

  captureMessage(`Authentication failed: ${email} - ${reason}`, "warning");

  if (process.env.NODE_ENV === "development") {
    console.log("[AUTH_FAILURE]", JSON.stringify(logEntry, null, 2));
  }
}
