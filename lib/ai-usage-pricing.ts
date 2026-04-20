export type AiModelProvider = "google";

export type AiModelName = "gemini-2.5-flash-lite";

export type GeminiServiceTier = "standard" | "priority" | "flexBatch";

type TokenPricing = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

/**
 * Gemini 2.5 Flash Lite pricing table.
 * Last verified from Google Vertex AI pricing page on 2026-04-20.
 */
const GEMINI_2_5_FLASH_LITE_PRICING: Record<GeminiServiceTier, TokenPricing> = {
  standard: {
    inputPerMillionUsd: 0.1,
    outputPerMillionUsd: 0.4,
  },
  priority: {
    inputPerMillionUsd: 0.18,
    outputPerMillionUsd: 0.72,
  },
  flexBatch: {
    inputPerMillionUsd: 0.05,
    outputPerMillionUsd: 0.2,
  },
};

export const DEFAULT_GEMINI_SERVICE_TIER: GeminiServiceTier = "standard";
export const PHP_PER_USD = 59;

const roundUsd = (value: number): number => Number(value.toFixed(6));
const roundPhp = (value: number): number => Number(value.toFixed(6));

export const convertUsdToPhp = (usd: number): number => {
  const safeUsd = Number.isFinite(usd) ? Math.max(0, usd) : 0;
  return roundPhp(safeUsd * PHP_PER_USD);
};

export const estimateGemini25FlashLiteCostUsd = ({
  inputTokens,
  outputTokens,
  tier = DEFAULT_GEMINI_SERVICE_TIER,
}: {
  inputTokens: number;
  outputTokens: number;
  tier?: GeminiServiceTier;
}): number => {
  const safeInput = Number.isFinite(inputTokens) ? Math.max(0, inputTokens) : 0;
  const safeOutput = Number.isFinite(outputTokens) ? Math.max(0, outputTokens) : 0;
  const pricing = GEMINI_2_5_FLASH_LITE_PRICING[tier];

  const estimatedCostUsd =
    (safeInput / 1_000_000) * pricing.inputPerMillionUsd +
    (safeOutput / 1_000_000) * pricing.outputPerMillionUsd;

  return roundUsd(estimatedCostUsd);
};

export const getGemini25FlashLiteTokenPricing = (
  tier: GeminiServiceTier = DEFAULT_GEMINI_SERVICE_TIER
): TokenPricing => GEMINI_2_5_FLASH_LITE_PRICING[tier];
