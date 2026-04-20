import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  runComposeEmailAi,
  COMPOSE_EMAIL_AI_MODEL_NAME,
  COMPOSE_EMAIL_AI_SERVICE_TIER,
  type ComposeEmailAiAction,
  type ComposeEmailTone,
} from "@/lib/compose-email-ai";
import { logUsageEntry } from "@/lib/firebase-admin/usage-log";

const bodySchema = z.object({
  htmlBody: z.string().min(1).max(120_000),
  action: z.enum(["rewrite", "shorten", "expand", "tone"]),
  tone: z.enum(["professional", "friendly", "formal", "concise"]).optional(),
  /** Optional free-text instructions combined with the selected action. */
  customInstructions: z.string().max(4_000).optional(),
});

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let userId = "";

  try {
    const user = await requireAuth();
    userId = user.uid;

    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { htmlBody, action, tone, customInstructions } = parsed.data;

    const result = await runComposeEmailAi({
      htmlFragment: htmlBody,
      action: action as ComposeEmailAiAction,
      tone: tone as ComposeEmailTone | undefined,
      customInstructions: customInstructions?.trim() || undefined,
    });

    await logUsageEntry({
      uid: user.uid,
      taskType: "compose-email",
      status: "success",
      provider: "google",
      model: COMPOSE_EMAIL_AI_MODEL_NAME,
      serviceTier: COMPOSE_EMAIL_AI_SERVICE_TIER,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      estimatedCostUsd: result.usage.estimatedCostUsd,
      durationMs: Date.now() - startedAt,
      metadata: { action, hasCustomInstructions: Boolean(customInstructions?.trim()) },
    });

    return NextResponse.json({ html: result.html });
  } catch (error) {
    console.error("compose-email ai:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Unauthorized") ? 401 : 500;

    if (userId) {
      await logUsageEntry({
        uid: userId,
        taskType: "compose-email",
        status: "error",
        provider: "google",
        model: COMPOSE_EMAIL_AI_MODEL_NAME,
        serviceTier: COMPOSE_EMAIL_AI_SERVICE_TIER,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }

    return NextResponse.json({ error: message }, { status });
  }
}
