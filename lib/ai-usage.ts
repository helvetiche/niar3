import {
  convertUsdToPhp,
  DEFAULT_GEMINI_SERVICE_TIER,
  estimateGemini25FlashLiteCostUsd,
  type AiModelName,
  type AiModelProvider,
  type GeminiServiceTier,
} from "@/lib/ai-usage-pricing";

export type AiUsageTaskType =
  | "compose-email"
  | "lipa-summary-scan"
  | "lipa-summary-bulk";

export type AiUsageStatus = "success" | "error";

export type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export type AiUsageMetrics = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  estimatedCostPhp?: number;
};

export type AiUsageEntry = {
  id: string;
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
  estimatedCostPhp: number;
  durationMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  createdAtIso: string;
};

export const normalizeTokenCount = (value: unknown): number => {
  if (typeof value !== "number") return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

export const buildUsageMetricsFromGeminiUsage = (
  usage?: GeminiUsageMetadata,
  tier: GeminiServiceTier = DEFAULT_GEMINI_SERVICE_TIER
): AiUsageMetrics => {
  const inputTokens = normalizeTokenCount(usage?.promptTokenCount);
  const outputTokens = normalizeTokenCount(usage?.candidatesTokenCount);
  const totalFromUsage = normalizeTokenCount(usage?.totalTokenCount);
  const totalTokens = totalFromUsage > 0 ? totalFromUsage : inputTokens + outputTokens;
  const estimatedCostUsd = estimateGemini25FlashLiteCostUsd({
    inputTokens,
    outputTokens,
    tier,
  });
  const estimatedCostPhp = convertUsdToPhp(estimatedCostUsd);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd,
    estimatedCostPhp,
  };
};
