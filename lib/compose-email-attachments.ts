import {
  COMPOSE_EMAIL_MAX_ATTACHMENTS,
  COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES,
} from "@/lib/compose-email-attachment-limits";

export type ComposeEmailAttachmentInput = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

export type ParsedComposeAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

/** Raw decoded bytes before filename sanitization and MIME checks (JSON or multipart). */
export type ComposeAttachmentBufferInput = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

const MIME_TYPE_PATTERN = /^[\w!#$&^.+~-]+\/[\w!#$&^.+~-]+$/;

const isSafeMimeType = (value: string | undefined): value is string => {
  if (!value?.trim()) return false;
  const t = value.trim().toLowerCase();
  if (t.length > 120) return false;
  return MIME_TYPE_PATTERN.test(t);
};

/**
 * Strips path segments and unsafe characters; yields a non-empty filename for SMTP.
 */
export const sanitizeComposeAttachmentFilename = (raw: string): string => {
  const base = raw
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.trim()
    .replace(/[\x00-\x1f\x7f]/g, "");
  if (!base) return "attachment";
  const cleaned = base.replace(/[^a-zA-Z0-9._\- ()[\]]+/g, "_").slice(0, 200);
  return cleaned.length > 0 ? cleaned : "attachment";
};

const decodeBase64ToBuffer = (contentBase64: string): Buffer => {
  const trimmed = contentBase64.trim();
  if (!trimmed) {
    throw new Error("An attachment is empty.");
  }
  const buf = Buffer.from(trimmed, "base64");
  if (buf.length === 0 && trimmed.length > 0) {
    throw new Error("An attachment could not be decoded (invalid Base64).");
  }
  return buf;
};

/**
 * Validates decoded attachment bytes (shared by JSON Base64 and multipart file uploads).
 */
export const finalizeComposeAttachmentBuffers = (
  parts: ComposeAttachmentBufferInput[]
): ParsedComposeAttachment[] => {
  if (!parts.length) return [];
  if (parts.length > COMPOSE_EMAIL_MAX_ATTACHMENTS) {
    throw new Error(`Too many attachments (max ${COMPOSE_EMAIL_MAX_ATTACHMENTS}).`);
  }

  let total = 0;
  const out: ParsedComposeAttachment[] = [];

  for (const item of parts) {
    const filename = sanitizeComposeAttachmentFilename(item.filename);
    total += item.content.length;
    if (total > COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new Error(
        `Attachments exceed the ${Math.floor(COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024))} MB total limit.`
      );
    }
    const contentType = isSafeMimeType(item.contentType)
      ? item.contentType.trim()
      : undefined;
    out.push({ filename, content: item.content, contentType });
  }

  return out;
};

/**
 * Validates and decodes attachment payloads from the compose-email API (JSON body).
 */
export const parseComposeEmailAttachments = (
  items: ComposeEmailAttachmentInput[] | undefined
): ParsedComposeAttachment[] => {
  if (!items?.length) return [];
  if (items.length > COMPOSE_EMAIL_MAX_ATTACHMENTS) {
    throw new Error(`Too many attachments (max ${COMPOSE_EMAIL_MAX_ATTACHMENTS}).`);
  }

  const buffers: ComposeAttachmentBufferInput[] = items.map((item) => ({
    filename: item.filename,
    content: decodeBase64ToBuffer(item.contentBase64),
    contentType: item.contentType,
  }));

  return finalizeComposeAttachmentBuffers(buffers);
};

export const formatAttachmentListForPlainText = (
  attachments: ParsedComposeAttachment[]
): string => {
  if (attachments.length === 0) return "";
  const lines = attachments.map((a) => {
    const kb =
      a.content.length >= 1024
        ? `${(a.content.length / 1024).toFixed(1)} KB`
        : `${a.content.length} B`;
    return `- ${a.filename} (${kb})`;
  });
  return ["", "Attachments:", ...lines].join("\n");
};
