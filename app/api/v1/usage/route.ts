import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import type { AiUsageTaskType, AiUsageStatus } from "@/lib/ai-usage";
import type { AiModelName } from "@/lib/ai-usage-pricing";
import { getMockAiUsageEntries } from "@/lib/mockai";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  taskType: z
    .enum(["compose-email", "lipa-summary-scan", "lipa-summary-bulk"] as const)
    .optional(),
  model: z.enum(["gemini-2.5-flash-lite"] as const).optional(),
  status: z.enum(["success", "error"] as const).optional(),
  fromTimestamp: z.coerce.number().int().nonnegative().optional(),
  toTimestamp: z.coerce.number().int().nonnegative().optional(),
});

export async function GET(request: Request) {
  const auth = await withAuth(request, { action: "usage.get" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      limit: url.searchParams.get("limit") ?? undefined,
      taskType: url.searchParams.get("taskType") ?? undefined,
      model: url.searchParams.get("model") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      fromTimestamp: url.searchParams.get("fromTimestamp") ?? undefined,
      toTimestamp: url.searchParams.get("toTimestamp") ?? undefined,
    });

    const entries = getMockAiUsageEntries({
      uid: user.uid,
      email: user.email ?? "",
      query: {
        limit: parsed.limit,
        taskType: parsed.taskType as AiUsageTaskType | undefined,
        model: parsed.model as AiModelName | undefined,
        status: parsed.status as AiUsageStatus | undefined,
        fromTimestamp: parsed.fromTimestamp,
        toTimestamp: parsed.toTimestamp,
      },
    });

    const summary = entries.reduce(
      (acc, item) => {
        acc.totalInputTokens += item.inputTokens;
        acc.totalOutputTokens += item.outputTokens;
        acc.totalTokens += item.totalTokens;
        acc.totalEstimatedCostUsd = Number(
          (acc.totalEstimatedCostUsd + item.estimatedCostUsd).toFixed(6)
        );
        acc.totalEstimatedCostPhp = Number(
          (acc.totalEstimatedCostPhp + (item.estimatedCostPhp ?? 0)).toFixed(6)
        );
        acc.totalCalls += 1;
        acc.countByTask[item.taskType] = (acc.countByTask[item.taskType] ?? 0) + 1;
        return acc;
      },
      {
        totalCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalEstimatedCostUsd: 0,
        totalEstimatedCostPhp: 0,
        countByTask: {} as Record<string, number>,
      }
    );

    return applySecurityHeaders(NextResponse.json({ summary, entries }));
  } catch (error) {
    const isValidationError = error instanceof z.ZodError;
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: isValidationError
            ? "Invalid usage query."
            : "Failed to load usage logs.",
        },
        { status: isValidationError ? 400 : 500 }
      )
    );
  }
}
