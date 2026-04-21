import "server-only";
import { getAdminRealtimeDatabase } from "./realtime-db";
import { logger } from "@/lib/logger";
import type { AiUsageEntry, AiUsageStatus, AiUsageTaskType } from "@/lib/ai-usage";
import type {
  AiModelName,
  AiModelProvider,
  GeminiServiceTier,
} from "@/lib/ai-usage-pricing";
import { convertUsdToPhp } from "@/lib/ai-usage-pricing";

type LogUsageEntryInput = {
  uid: string;
  taskType: AiUsageTaskType;
  status: AiUsageStatus;
  provider: AiModelProvider;
  model: AiModelName;
  serviceTier: GeminiServiceTier;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  durationMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

type GetUsageEntriesInput = {
  limit?: number;
  taskType?: AiUsageTaskType;
  model?: AiModelName;
  status?: AiUsageStatus;
  fromTimestamp?: number;
  toTimestamp?: number;
};

const usageState = {
  isDisabled: false,
  hasReportedDisabled: false,
};

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 50;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 3;
const MAX_ERROR_MESSAGE_LENGTH = 200;

const truncateString = (value: string): string =>
  value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;

const sanitizeErrorMessage = (value: string): string =>
  value
    .slice(0, MAX_ERROR_MESSAGE_LENGTH)
    .replace(/\/[^\s]+\.[jt]sx?/g, "[redacted]")
    .replace(/at\s+\S+/g, "")
    .replace(/\b[A-Za-z0-9_-]{20,}\b/g, (match) =>
      match.length > 32 ? "[redacted]" : match
    )
    .replace(/\s{2,}/g, " ")
    .trim();

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
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
      MAX_OBJECT_KEYS
    );
    return Object.fromEntries(
      entries
        .map(([key, item]) => [key, sanitizeValue(item, depth + 1)])
        .filter(([, item]) => item !== undefined)
    );
  }

  return String(value);
};

const isConfigurationError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("can't determine firebase database url") ||
    message.includes("realtime database url is missing") ||
    message.includes("firebase admin credentials missing") ||
    message.includes("contains undefined")
  );
};

const omitUndefined = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;

const normalizeLimit = (value?: number): number => {
  if (!Number.isFinite(value)) return 100;
  return Math.max(1, Math.min(500, Math.floor(value ?? 100)));
};

export async function logUsageEntry(input: LogUsageEntryInput): Promise<void> {
  if (usageState.isDisabled) return;

  try {
    const uid = input.uid.trim();
    if (!uid) return;

    const db = getAdminRealtimeDatabase();
    const createdAt = Date.now();
    const collectionRef = db.ref(`usage_logs/${uid}`);
    const newEntryRef = collectionRef.push();

    const rawPayload: Record<string, unknown> = {
      uid,
      taskType: input.taskType,
      status: input.status,
      provider: input.provider,
      model: input.model,
      serviceTier: input.serviceTier,
      inputTokens: Math.max(0, Math.floor(input.inputTokens)),
      outputTokens: Math.max(0, Math.floor(input.outputTokens)),
      totalTokens: Math.max(0, Math.floor(input.totalTokens)),
      estimatedCostUsd: Number(input.estimatedCostUsd.toFixed(6)),
      estimatedCostPhp: convertUsdToPhp(input.estimatedCostUsd),
      createdAt,
      createdAtIso: new Date(createdAt).toISOString(),
    };

    if (input.durationMs !== undefined) {
      rawPayload.durationMs = Math.max(0, Math.floor(input.durationMs));
    }
    if (input.errorMessage?.trim()) {
      rawPayload.errorMessage = sanitizeErrorMessage(input.errorMessage);
    }
    if (input.metadata) {
      rawPayload.metadata = sanitizeValue(input.metadata) as Record<string, unknown>;
    }

    const payload = omitUndefined(rawPayload);
    await newEntryRef.set(payload);
  } catch (error) {
    if (isConfigurationError(error)) {
      usageState.isDisabled = true;
      if (!usageState.hasReportedDisabled) {
        usageState.hasReportedDisabled = true;
        logger.warn(
          "[usage-log] Disabled because Firebase Realtime Database is not configured."
        );
      }
      return;
    }
    logger.error("[usage-log] Failed to write usage log", error);
  }
}

export async function getUsageEntries(
  uid: string,
  filters: GetUsageEntriesInput = {}
): Promise<AiUsageEntry[]> {
  try {
    const safeUid = uid.trim();
    if (!safeUid) return [];

    const db = getAdminRealtimeDatabase();
    const limit = normalizeLimit(filters.limit);

    const snapshot = await db
      .ref(`usage_logs/${safeUid}`)
      .orderByChild("createdAt")
      .limitToLast(limit)
      .get();

    if (!snapshot.exists()) return [];

    const raw = snapshot.val() as Record<string, Omit<AiUsageEntry, "id">>;
    const entries = Object.entries(raw)
      .map(([id, item]) => ({ id, ...item }))
      .filter((item) => {
        if (filters.taskType && item.taskType !== filters.taskType) return false;
        if (filters.model && item.model !== filters.model) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.fromTimestamp && item.createdAt < filters.fromTimestamp)
          return false;
        if (filters.toTimestamp && item.createdAt > filters.toTimestamp) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return entries.slice(0, limit);
  } catch (error) {
    if (isConfigurationError(error)) {
      usageState.isDisabled = true;
      if (!usageState.hasReportedDisabled) {
        usageState.hasReportedDisabled = true;
        logger.warn(
          "[usage-log] Read disabled because Firebase Realtime Database is not configured."
        );
      }
      return [];
    }

    logger.error("[usage-log] Failed to read usage logs", error);
    return [];
  }
}
