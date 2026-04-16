import { describe, it, expect } from "vitest";
import {
  parseComposeEmailAttachments,
  sanitizeComposeAttachmentFilename,
} from "@/lib/compose-email-attachments";
import { COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES } from "@/lib/compose-email-attachment-limits";

describe("sanitizeComposeAttachmentFilename", () => {
  it("strips path segments", () => {
    expect(sanitizeComposeAttachmentFilename("C:\\fake\\report.pdf")).toBe("report.pdf");
    expect(sanitizeComposeAttachmentFilename("/tmp/docs/sheet.xlsx")).toBe("sheet.xlsx");
  });

  it("returns a fallback for empty input", () => {
    expect(sanitizeComposeAttachmentFilename("")).toBe("attachment");
    expect(sanitizeComposeAttachmentFilename("///")).toBe("attachment");
  });
});

describe("parseComposeEmailAttachments", () => {
  it("decodes valid base64", () => {
    const buf = Buffer.from("hello");
    const items = [{ filename: "note.txt", contentBase64: buf.toString("base64") }];
    const out = parseComposeEmailAttachments(items);
    expect(out).toHaveLength(1);
    expect(out[0].filename).toBe("note.txt");
    expect(out[0].content.toString("utf8")).toBe("hello");
  });

  it("rejects when total size exceeds limit", () => {
    const chunk = Buffer.alloc(Math.floor(COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES / 2) + 1);
    const b64 = chunk.toString("base64");
    const items = [
      { filename: "a.bin", contentBase64: b64 },
      { filename: "b.bin", contentBase64: b64 },
    ];
    expect(() => parseComposeEmailAttachments(items)).toThrow(/exceed/i);
  });
});
