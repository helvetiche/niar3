import { describe, expect, it } from "vitest";
import {
  DEFAULT_GEMINI_SERVICE_TIER,
  estimateGemini25FlashLiteCostUsd,
} from "@/lib/ai-usage-pricing";
import { buildUsageMetricsFromGeminiUsage } from "@/lib/ai-usage";

describe("AI usage pricing", () => {
  it("estimates Gemini 2.5 Flash Lite cost with standard pricing", () => {
    const estimated = estimateGemini25FlashLiteCostUsd({
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      tier: DEFAULT_GEMINI_SERVICE_TIER,
    });

    expect(estimated).toBe(0.5);
  });

  it("returns zero when token counts are invalid", () => {
    const estimated = estimateGemini25FlashLiteCostUsd({
      inputTokens: Number.NaN,
      outputTokens: Number.POSITIVE_INFINITY,
    });

    expect(estimated).toBe(0);
  });
});

describe("buildUsageMetricsFromGeminiUsage", () => {
  it("maps usage metadata and computes totals", () => {
    const metrics = buildUsageMetricsFromGeminiUsage({
      promptTokenCount: 1500,
      candidatesTokenCount: 500,
      totalTokenCount: 2000,
    });

    expect(metrics.inputTokens).toBe(1500);
    expect(metrics.outputTokens).toBe(500);
    expect(metrics.totalTokens).toBe(2000);
    expect(metrics.estimatedCostUsd).toBe(0.00035);
  });

  it("falls back total tokens when totalTokenCount is missing", () => {
    const metrics = buildUsageMetricsFromGeminiUsage({
      promptTokenCount: 200,
      candidatesTokenCount: 100,
    });

    expect(metrics.totalTokens).toBe(300);
  });
});
