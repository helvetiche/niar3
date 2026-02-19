import "server-only";
import { getAdminRealtimeDatabase } from "./realtime-db";
import { logger } from "@/lib/logger";

export type AuditTrailStatus = "success" | "error" | "rejected";

export type AuditTrailEntry = {
  id: string;
  uid: string;
  action: string;
  status: AuditTrailStatus;
  route: string;
  method: string;
  httpStatus?: number;
  errorMessage?: string;
  details?: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
  createdAtIso: string;
};

type LogAuditTrailInput = {
  uid?: string | null;
  action: string;
  status: AuditTrailStatus;
  route: string;
  method: string;
  request?: Request;
  httpStatus?: number;
  errorMessage?: string;
  details?: Record<string, unknown>;
};

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 50;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 3;
const MAX_ERROR_MESSAGE_LENGTH = 200;

/** Safe error message for audit logs. Strips paths, stack traces, tokens. */
const sanitizeErrorMessage = (value: string): string => {
  return value
    .slice(0, MAX_ERROR_MESSAGE_LENGTH)
    .replace(/\/[^\s]+\.[jt]sx?/g, "[redacted]")
    .replace(/at\s+\S+/g, "")
    .replace(/\b[A-Za-z0-9_-]{20,}\b/g, (m) =>
      m.length > 32 ? "[redacted]" : m,
    )
    .replace(/\s{2,}/g, " ")
    .trim();
};

const auditTrailState = {
  isDisabled: false,
  hasReportedDisabled: false,
};

const isAuditTrailConfigurationError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("can't determine firebase database url") ||
    message.includes("realtime database url is missing") ||
    message.includes("firebase admin credentials missing") ||
    message.includes("contains undefined")
  );
};

const truncateString = (value: string): string =>
  value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}...`
    : value;

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") return value.toString();

  if (depth >= MAX_DEPTH) return "[max-depth-reached]";

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      MAX_OBJECT_KEYS,
    );
    const filtered = entries
      .map(([key, item]) => [key, sanitizeValue(item, depth + 1)])
      .filter(([, item]) => item !== undefined) as [string, unknown][];
    return Object.fromEntries(filtered);
  }

  return String(value);
};

/** Firebase Realtime DB rejects undefined. Strip undefined keys before write. */
const omitUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
};

const resolveIpAddress = (request?: Request): string | null => {
  if (!request) return null;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim() ?? "";
    return firstIp ? truncateString(firstIp) : null;
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp ? truncateString(realIp.trim()) : null;
};

export async function logAuditTrailEntry(
  input: LogAuditTrailInput,
): Promise<void> {
  if (auditTrailState.isDisabled) return;

  try {
    const db = getAdminRealtimeDatabase();
    const createdAt = Date.now();
    const safeUid = input.uid?.trim() || "anonymous";
    const route = input.route.trim() || "unknown";
    const method = input.method.trim().toUpperCase() || "UNKNOWN";
    const action = input.action.trim() || "unknown.action";
    const userAgent = input.request?.headers.get("user-agent") ?? null;

    const collectionRef = db.ref(`audit_trails/${safeUid}`);
    const newEntryRef = collectionRef.push();

    const rawPayload: Record<string, unknown> = {
      uid: safeUid,
      action,
      status: input.status,
      route,
      method,
      ipAddress: resolveIpAddress(input.request),
      userAgent: userAgent ? truncateString(userAgent) : null,
      createdAt,
      createdAtIso: new Date(createdAt).toISOString(),
    };
    if (input.httpStatus !== undefined) rawPayload.httpStatus = input.httpStatus;
    if (input.errorMessage?.trim()) {
      rawPayload.errorMessage = sanitizeErrorMessage(
        truncateString(input.errorMessage),
      );
    }
    if (input.details) {
      rawPayload.details = sanitizeValue(input.details) as Record<string, unknown>;
    }

    const payload = omitUndefined(rawPayload);
    await newEntryRef.set(payload);
  } catch (error) {
    if (isAuditTrailConfigurationError(error)) {
      auditTrailState.isDisabled = true;
      if (!auditTrailState.hasReportedDisabled) {
        auditTrailState.hasReportedDisabled = true;
        logger.warn(
          "[audit-trail] Disabled because Firebase Realtime Database is not configured correctly.",
        );
      }
      return;
    }
    logger.error("[audit-trail] Failed to write audit log", error);
  }
}

export async function getAuditTrailEntries(
  uid: string,
  limit = 50,
): Promise<AuditTrailEntry[]> {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(200, Math.floor(limit)))
    : 50;
  const db = getAdminRealtimeDatabase();
  const snapshot = await db
    .ref(`audit_trails/${uid}`)
    .orderByChild("createdAt")
    .limitToLast(safeLimit)
    .get();

  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, Omit<AuditTrailEntry, "id">>;
  return Object.entries(raw)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
