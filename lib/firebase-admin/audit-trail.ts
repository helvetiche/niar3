import "server-only";
import { getAdminRealtimeDatabase } from "./realtime-db";

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
let isAuditTrailDisabled = false;
let hasReportedDisabledAuditTrail = false;

const isAuditTrailConfigurationError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("can't determine firebase database url") ||
    message.includes("realtime database url is missing") ||
    message.includes("firebase admin credentials missing")
  );
};

const truncateString = (value: string): string =>
  value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}...`
    : value;

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") return value.toString();

  if (depth >= MAX_DEPTH) return "[max-depth-reached]";

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      MAX_OBJECT_KEYS,
    );
    return Object.fromEntries(
      entries.map(([key, item]) => [key, sanitizeValue(item, depth + 1)]),
    );
  }

  return String(value);
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
  if (isAuditTrailDisabled) return;

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

    const payload: Omit<AuditTrailEntry, "id"> = {
      uid: safeUid,
      action,
      status: input.status,
      route,
      method,
      httpStatus: input.httpStatus,
      errorMessage: input.errorMessage
        ? truncateString(input.errorMessage)
        : undefined,
      details: input.details
        ? (sanitizeValue(input.details) as Record<string, unknown>)
        : undefined,
      ipAddress: resolveIpAddress(input.request),
      userAgent: userAgent ? truncateString(userAgent) : null,
      createdAt,
      createdAtIso: new Date(createdAt).toISOString(),
    };

    await newEntryRef.set(payload);
  } catch (error) {
    if (isAuditTrailConfigurationError(error)) {
      isAuditTrailDisabled = true;
      if (!hasReportedDisabledAuditTrail) {
        hasReportedDisabledAuditTrail = true;
        console.warn(
          "[audit-trail] Disabled because Firebase Realtime Database is not configured correctly.",
        );
      }
      return;
    }
    console.error("[audit-trail] Failed to write audit log", error);
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
