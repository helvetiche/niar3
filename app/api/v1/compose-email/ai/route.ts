import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  runComposeEmailAi,
  type ComposeEmailAiAction,
  type ComposeEmailTone,
} from "@/lib/compose-email-ai";

const bodySchema = z.object({
  htmlBody: z.string().min(1).max(120_000),
  action: z.enum(["rewrite", "shorten", "expand", "tone"]),
  tone: z.enum(["professional", "friendly", "formal", "concise"]).optional(),
  /** Optional free-text instructions combined with the selected action. */
  customInstructions: z.string().max(4_000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { htmlBody, action, tone, customInstructions } = parsed.data;

    const html = await runComposeEmailAi({
      htmlFragment: htmlBody,
      action: action as ComposeEmailAiAction,
      tone: tone as ComposeEmailTone | undefined,
      customInstructions: customInstructions?.trim() || undefined,
    });

    return NextResponse.json({ html });
  } catch (error) {
    console.error("compose-email ai:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
