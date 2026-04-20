import type { AiUsageEntry, AiUsageStatus, AiUsageTaskType } from "@/lib/ai-usage";
import type { AiModelName } from "@/lib/ai-usage-pricing";

type MockUsageQuery = {
  limit?: number;
  taskType?: AiUsageTaskType;
  model?: AiModelName;
  status?: AiUsageStatus;
  fromTimestamp?: number;
  toTimestamp?: number;
};

const TARGET_EMAIL = "helvetiche@gmail.com";
const TARGET_UID = "ZGkChNDcyTfuJlnEkIvNDzz9P2E2";

const now = Date.now();

const MOCK_USAGE_ENTRIES: AiUsageEntry[] = [
  {
    id: "mock-1",
    uid: TARGET_UID,
    taskType: "compose-email",
    status: "success",
    provider: "google",
    model: "gemini-2.5-flash-lite",
    serviceTier: "standard",
    inputTokens: 1240,
    outputTokens: 420,
    totalTokens: 1660,
    estimatedCostUsd: 0.000292,
    estimatedCostPhp: 0.017228,
    durationMs: 1830,
    metadata: {
      action: "rewrite",
      hasCustomInstructions: true,
      email: TARGET_EMAIL,
    },
    createdAt: now - 180000,
    createdAtIso: new Date(now - 180000).toISOString(),
  },
  {
    id: "mock-2",
    uid: TARGET_UID,
    taskType: "lipa-summary-scan",
    status: "success",
    provider: "google",
    model: "gemini-2.5-flash-lite",
    serviceTier: "standard",
    inputTokens: 9850,
    outputTokens: 960,
    totalTokens: 10810,
    estimatedCostUsd: 0.001369,
    estimatedCostPhp: 0.080771,
    durationMs: 4290,
    metadata: {
      fileName: "division-4-lipa.pdf",
      divisionName: "Division 4",
      pageNumber: 1,
      email: TARGET_EMAIL,
    },
    createdAt: now - 120000,
    createdAtIso: new Date(now - 120000).toISOString(),
  },
  {
    id: "mock-3",
    uid: TARGET_UID,
    taskType: "lipa-summary-bulk",
    status: "error",
    provider: "google",
    model: "gemini-2.5-flash-lite",
    serviceTier: "standard",
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    estimatedCostPhp: 0,
    durationMs: 2150,
    errorMessage: "Gemini API quota/rate limit reached. Please retry in about 60 seconds.",
    metadata: {
      fileCount: 3,
      scannedFiles: 1,
      email: TARGET_EMAIL,
    },
    createdAt: now - 60000,
    createdAtIso: new Date(now - 60000).toISOString(),
  },
];

const normalizeLimit = (limit?: number): number => {
  if (!Number.isFinite(limit)) return 100;
  return Math.max(1, Math.min(500, Math.floor(limit ?? 100)));
};

export const getMockAiUsageEntries = (opts: {
  uid?: string | null;
  email?: string | null;
  query?: MockUsageQuery;
}): AiUsageEntry[] => {
  const safeEmail = (opts.email ?? "").trim().toLowerCase();
  const safeUid = (opts.uid ?? "").trim();

  if (safeEmail !== TARGET_EMAIL || safeUid !== TARGET_UID) {
    return [];
  }

  const query = opts.query ?? {};
  const limit = normalizeLimit(query.limit);

  const filtered = MOCK_USAGE_ENTRIES.filter((entry) => {
    if (query.taskType && entry.taskType !== query.taskType) return false;
    if (query.model && entry.model !== query.model) return false;
    if (query.status && entry.status !== query.status) return false;
    if (query.fromTimestamp && entry.createdAt < query.fromTimestamp) return false;
    if (query.toTimestamp && entry.createdAt > query.toTimestamp) return false;
    return true;
  }).sort((a, b) => b.createdAt - a.createdAt);

  return filtered.slice(0, limit);
};
