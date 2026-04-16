import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { sendManualComposedEmail } from "@/lib/email";
import { sanitizeComposeEmailBodyHtml } from "@/lib/email-body-sanitize";
import { composeEmailHtmlToPlainText } from "@/lib/compose-email-plain-text";
import { normalizeAddressList } from "@/lib/compose-email-addresses";
import {
  buildManualComposeEmailDocumentHtml,
  formatSenderDisplayFromEmail,
} from "@/lib/manual-compose-email-html";
import { SCHEDULE_REMINDER_PRODUCT_NAME } from "@/lib/schedule-reminder-email-html";

const bodySchema = z.object({
  to: z.string().min(3).max(2000),
  subject: z.string().min(1).max(998),
  htmlBody: z.string().min(1).max(500_000),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { to, subject, htmlBody } = parsed.data;

    let toNorm: string | undefined;
    try {
      toNorm = normalizeAddressList(to);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid addresses";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!toNorm) {
      return NextResponse.json({ error: "At least one recipient in To is required." }, { status: 400 });
    }

    const safeInner = sanitizeComposeEmailBodyHtml(htmlBody);

    const senderEmail = user.email?.trim() ?? "";
    const senderDisplayName = senderEmail
      ? formatSenderDisplayFromEmail(senderEmail)
      : "NIA Productivity Tools user";
    const sentAtLabel = new Date().toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const fullHtml = buildManualComposeEmailDocumentHtml(safeInner, {
      senderDisplayName,
      senderEmail,
      sentAtLabel,
    });

    const textHeaderLines = [
      senderEmail
        ? `From: ${senderDisplayName} <${senderEmail}>`
        : `From: ${senderDisplayName}`,
      `Sent: ${sentAtLabel}`,
      "",
    ];
    const text = [...textHeaderLines, composeEmailHtmlToPlainText(safeInner)].join("\n");

    const fromDisplayName = senderEmail
      ? `${senderDisplayName} · ${SCHEDULE_REMINDER_PRODUCT_NAME}`
      : SCHEDULE_REMINDER_PRODUCT_NAME;

    const result = await sendManualComposedEmail({
      to: toNorm,
      subject: subject.trim(),
      html: fullHtml,
      text,
      fromDisplayName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to send email" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("compose-email send:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
