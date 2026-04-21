"use client";

import { fetchWithSessionRefresh, handleApiError } from "@/lib/api/api-client-utils";
import type { AiUsageEntry, AiUsageStatus, AiUsageTaskType } from "@/lib/ai-usage";
import type { AiModelName } from "@/lib/ai-usage-pricing";

export type UsageQuery = {
  limit?: number;
  taskType?: AiUsageTaskType;
  model?: AiModelName;
  status?: AiUsageStatus;
  fromTimestamp?: number;
  toTimestamp?: number;
};

export type UsageSummary = {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  totalEstimatedCostPhp: number;
  countByTask: Record<string, number>;
};

export const getUsageLogs = async (query: UsageQuery = {}) => {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.taskType) params.set("taskType", query.taskType);
  if (query.model) params.set("model", query.model);
  if (query.status) params.set("status", query.status);
  if (query.fromTimestamp !== undefined) {
    params.set("fromTimestamp", String(query.fromTimestamp));
  }
  if (query.toTimestamp !== undefined) {
    params.set("toTimestamp", String(query.toTimestamp));
  }
  const url = `/api/v1/usage${params.size > 0 ? `?${params.toString()}` : ""}`;

  const response = await fetchWithSessionRefresh(() =>
    fetch(url, {
      method: "GET",
      credentials: "include",
    })
  );

  if (!response.ok) {
    await handleApiError(response, "Failed to load usage logs");
  }

  const data = (await response.json()) as {
    summary: UsageSummary;
    entries: AiUsageEntry[];
  };

  return data;
};
