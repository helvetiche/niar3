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
import { COMPOSE_EMAIL_MAX_ATTACHMENTS } from "@/lib/compose-email-attachment-limits";
import {
  formatAttachmentListForPlainText,
  finalizeComposeAttachmentBuffers,
  parseComposeEmailAttachments,
} from "@/lib/compose-email-attachments";
import type { ParsedComposeAttachment } from "@/lib/compose-email-attachments";
import type { AuthUser } from "@/types/auth";

const attachmentSchema = z.object({
  filename: z.string().min(1).max(300),
  contentBase64: z.string().min(1).max(5_000_000),
  contentType: z.string().max(120).optional(),
});

const bodySchema = z.object({
  to: z.string().min(3).max(2000),
  subject: z.string().min(1).max(998),
  htmlBody: z.string().min(1).max(500_000),
  attachments: z
    .array(attachmentSchema)
    .max(COMPOSE_EMAIL_MAX_ATTACHMENTS)
    .optional(),
});

const MAX_HTML_LEN = 500_000;
const MAX_TO_LEN = 2000;
const MAX_SUB_LEN = 998;

const inferExtensionFromMimeType = (mimeType: string | undefined): string => {
  const t = mimeType?.trim().toLowerCase() ?? "";
  if (!t) return ".bin";
  if (t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return ".xlsx";
  }
  if (t === "application/vnd.ms-excel") {
    return ".xls";
  }
  if (t === "text/csv") {
    return ".csv";
  }
  if (t === "application/pdf") {
    return ".pdf";
  }
  if (t.startsWith("image/")) {
    const subtype = t.split("/")[1] || "img";
    return `.${subtype.replace(/[^a-z0-9.+-]/g, "") || "img"}`;
  }
  return ".bin";
};

const validateComposeFields = (to: string, subject: string, htmlBody: string) => {
  if (to.length < 3 || to.length > MAX_TO_LEN) {
    return "Invalid To field length.";
  }
  if (!subject.trim() || subject.length > MAX_SUB_LEN) {
    return "Invalid subject.";
  }
  const html = htmlBody.trim();
  if (!html || htmlBody.length > MAX_HTML_LEN) {
    return "Invalid message body.";
  }
  return null;
};

const readMultipartCompose = async (
  request: NextRequest
): Promise<{ to: string; subject: string; htmlBody: string; parsedAttachments: ParsedComposeAttachment[] }> => {
  const form = await request.formData();
  const to = String(form.get("to") ?? "").trim();
  const subject = String(form.get("subject") ?? "").trim();
  const htmlBody = String(form.get("htmlBody") ?? "");
  const files = form.getAll("attachments");

  const buffers: { filename: string; content: Buffer; contentType?: string }[] = [];
  for (const entry of files) {
    if (typeof (entry as Blob).arrayBuffer !== "function") continue;
    const blob = entry as Blob;
    const ab = await blob.arrayBuffer();
    const maybeName =
      typeof (entry as { name?: unknown }).name === "string"
        ? (entry as { name: string }).name.trim()
        : "";
    const maybeType =
      typeof (entry as { type?: unknown }).type === "string"
        ? (entry as { type: string }).type.trim()
        : "";
    const inferredExtension = inferExtensionFromMimeType(maybeType || blob.type);
    const name = maybeName.length > 0 ? maybeName : `attachment${inferredExtension}`;
    const type = maybeType.length > 0 ? maybeType : undefined;
    buffers.push({
      filename: name,
      content: Buffer.from(ab),
      contentType: type,
    });
  }

  if (buffers.length > COMPOSE_EMAIL_MAX_ATTACHMENTS) {
    throw new Error(`Too many attachments (max ${COMPOSE_EMAIL_MAX_ATTACHMENTS}).`);
  }

  const parsedAttachments = finalizeComposeAttachmentBuffers(buffers);
  return { to, subject, htmlBody, parsedAttachments };
};

const readJsonCompose = async (
  request: NextRequest
): Promise<{ to: string; subject: string; htmlBody: string; parsedAttachments: ParsedComposeAttachment[] }> => {
  const json = (await request.json()) as unknown;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const err = new Error("JSON_VALIDATION_FAILED") as Error & { zodDetails?: unknown };
    err.zodDetails = parsed.error.flatten();
    throw err;
  }
  const { to, subject, htmlBody, attachments: rawAttachments } = parsed.data;
  let parsedAttachments: ParsedComposeAttachment[];
  try {
    parsedAttachments = parseComposeEmailAttachments(rawAttachments);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid attachments";
    throw new Error(msg);
  }
  return { to, subject, htmlBody, parsedAttachments };
};

const sendComposed = async (
  user: AuthUser,
  to: string,
  subject: string,
  htmlBody: string,
  parsedAttachments: ParsedComposeAttachment[]
) => {
  let toNorm: string | undefined;
  try {
    toNorm = normalizeAddressList(to);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid addresses";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (!toNorm) {
    return NextResponse.json(
      { error: "At least one recipient in To is required." },
      { status: 400 }
    );
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
    attachmentFilenames:
      parsedAttachments.length > 0
        ? parsedAttachments.map((a) => a.filename)
        : undefined,
  });

  const textHeaderLines = [
    senderEmail
      ? `From: ${senderDisplayName} <${senderEmail}>`
      : `From: ${senderDisplayName}`,
    `Sent: ${sentAtLabel}`,
    "",
  ];
  const attachmentNote = formatAttachmentListForPlainText(parsedAttachments);
  const text = [
    ...textHeaderLines,
    composeEmailHtmlToPlainText(safeInner),
    attachmentNote,
  ].join("\n");

  const fromDisplayName = senderEmail
    ? `${senderDisplayName} · ${SCHEDULE_REMINDER_PRODUCT_NAME}`
    : SCHEDULE_REMINDER_PRODUCT_NAME;

  const result = await sendManualComposedEmail({
    to: toNorm,
    subject: subject.trim(),
    html: fullHtml,
    text,
    fromDisplayName,
    attachments:
      parsedAttachments.length > 0
        ? parsedAttachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          }))
        : undefined,
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
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const contentType = request.headers.get("content-type") || "";

    let to: string;
    let subject: string;
    let htmlBody: string;
    let parsedAttachments: ParsedComposeAttachment[];

    if (contentType.includes("multipart/form-data")) {
      try {
        ({ to, subject, htmlBody, parsedAttachments } = await readMultipartCompose(request));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid multipart request";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    } else {
      try {
        ({ to, subject, htmlBody, parsedAttachments } = await readJsonCompose(request));
      } catch (e) {
        const err = e as Error & { zodDetails?: unknown };
        if (err.message === "JSON_VALIDATION_FAILED") {
          return NextResponse.json(
            { error: "Invalid request", details: err.zodDetails },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    const fieldErr = validateComposeFields(to, subject, htmlBody);
    if (fieldErr) {
      return NextResponse.json({ error: fieldErr }, { status: 400 });
    }

    return sendComposed(user, to, subject, htmlBody, parsedAttachments);
  } catch (error) {
    console.error("compose-email send:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
