"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  CircleNotchIcon,
  PaperPlaneTiltIcon,
  PaperclipIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { ScheduleWidgetChrome } from "@/components/widget-sidebar/ScheduleWidgetChrome";
import { AccountRecipientEmailInput } from "@/components/compose-email/AccountRecipientEmailInput";
import {
  COMPOSE_EMAIL_MAX_ATTACHMENTS,
  COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES,
} from "@/lib/compose-email-attachment-limits";
import { formatComposeEmailAttachmentSizeLabel } from "@/lib/compose-email-client-attachments";

const MESSAGE_MAX_LEN = 50_000;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const plainTextToComposeHtml = (plain: string): string => {
  const trimmed = plain.trim();
  if (!trimmed) return "<p></p>";
  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const inner = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p>${inner}</p>`;
    })
    .join("");
};

export const QuickSendMessageSidebarWidget = ({
  onRemove,
}: {
  onRemove?: () => void;
}) => {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const attachmentBytesTotal = useMemo(
    () => attachments.reduce((sum, f) => sum + f.size, 0),
    [attachments]
  );

  const handleAddAttachmentsClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    event.target.value = "";
    if (!list?.length) return;

    const incoming = Array.from(list);
    const next = [...attachments, ...incoming];
    if (next.length > COMPOSE_EMAIL_MAX_ATTACHMENTS) {
      toast.error(`You can attach at most ${COMPOSE_EMAIL_MAX_ATTACHMENTS} files.`);
      return;
    }
    const nextTotal = next.reduce((sum, f) => sum + f.size, 0);
    if (nextTotal > COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES) {
      toast.error(
        `Attachments cannot exceed ${formatComposeEmailAttachmentSizeLabel(COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES)} in total.`
      );
      return;
    }
    setAttachments(next);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const bodyText = message.trim();
    if (!bodyText) {
      toast.error("Add a message before sending.");
      return;
    }
    if (!to.trim()) {
      toast.error("Recipient (To) is required.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }

    const attachmentTotal = attachments.reduce((sum, f) => sum + f.size, 0);
    if (attachments.length > COMPOSE_EMAIL_MAX_ATTACHMENTS) {
      toast.error(`You can attach at most ${COMPOSE_EMAIL_MAX_ATTACHMENTS} files.`);
      return;
    }
    if (attachmentTotal > COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES) {
      toast.error(
        `Attachments cannot exceed ${formatComposeEmailAttachmentSizeLabel(COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES)} in total.`
      );
      return;
    }

    const htmlBody = plainTextToComposeHtml(message);

    setIsSending(true);
    try {
      let response: Response;
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append("to", to.trim());
        formData.append("subject", subject.trim());
        formData.append("htmlBody", htmlBody);
        for (const file of attachments) {
          formData.append("attachments", file, file.name);
        }
        response = await fetch("/api/v1/compose-email/send", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
      } else {
        response = await fetch("/api/v1/compose-email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            to: to.trim(),
            subject: subject.trim(),
            htmlBody,
          }),
        });
      }
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Send failed");
      }
      toast.success("Email sent.");
      setMessage("");
      setAttachments([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ScheduleWidgetChrome
      title="Quick message"
      titleIcon={
        <PaperPlaneTiltIcon
          className="h-3.5 w-3.5 shrink-0"
          weight="duotone"
          aria-hidden
        />
      }
      titleClassName="text-xs"
      onRemove={onRemove}
    >
      <p className="mb-3 text-[11px] leading-snug text-emerald-200/75">
        Compose send, plain body: blank line = paragraph, files optional. Super-admins:
        To hints from accounts.
      </p>
      <form className="flex flex-col gap-2.5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor={`${formId}-to`}
            className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65"
          >
            To
          </label>
          <AccountRecipientEmailInput
            id={`${formId}-to`}
            value={to}
            onChange={setTo}
            required
            placeholder="name@example.com"
            aria-label="Recipient email addresses"
            className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 px-2.5 py-2 text-xs font-light text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            hintClassName="mt-1 text-[10px] font-light leading-snug text-emerald-200/55"
          />
        </div>
        <div>
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label
                htmlFor={`${formId}-subject`}
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65"
              >
                Subject
              </label>
              <input
                id={`${formId}-subject`}
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={998}
                autoComplete="off"
                className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 px-2.5 py-2 text-xs font-light text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder="Subject"
                aria-label="Email subject"
              />
            </div>
            <div className="flex shrink-0 flex-col">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65">
                Files
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose files to attach"
                onChange={handleAttachmentInputChange}
              />
              <button
                type="button"
                onClick={handleAddAttachmentsClick}
                disabled={attachments.length >= COMPOSE_EMAIL_MAX_ATTACHMENTS}
                className="inline-flex h-[2.125rem] min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-600 bg-emerald-950/40 px-2.5 text-[11px] font-light text-emerald-100/90 transition hover:border-emerald-500 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                aria-label="Add file attachments"
              >
                <PaperclipIcon
                  className="h-4 w-4 shrink-0"
                  weight="duotone"
                  aria-hidden
                />
                Add files
              </button>
            </div>
          </div>
          <p className="mt-1 text-[9px] font-light text-emerald-200/55">
            Max {COMPOSE_EMAIL_MAX_ATTACHMENTS} files ·{" "}
            {formatComposeEmailAttachmentSizeLabel(
              COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES
            )}{" "}
            total
          </p>
          {attachments.length > 0 ? (
            <ul
              className="mb-2 max-h-24 space-y-1 overflow-y-auto rounded-lg border border-emerald-700/60 bg-emerald-950/50 p-1.5"
              aria-label="Files to attach"
            >
              {attachments.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center gap-1.5 text-[11px] font-light text-white"
                >
                  <span className="min-w-0 flex-1 truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span className="shrink-0 text-emerald-200/70">
                    {formatComposeEmailAttachmentSizeLabel(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="inline-flex shrink-0 rounded p-1 text-emerald-200 transition hover:bg-emerald-800/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                    aria-label={`Remove ${file.name}`}
                  >
                    <TrashSimpleIcon
                      className="h-3.5 w-3.5"
                      weight="bold"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {attachmentBytesTotal > 0 ? (
            <p className="mb-2 text-[9px] font-light text-emerald-200/55">
              Selected: {formatComposeEmailAttachmentSizeLabel(attachmentBytesTotal)} of{" "}
              {formatComposeEmailAttachmentSizeLabel(
                COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES
              )}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`${formId}-message`}
            className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65"
          >
            Message
          </label>
          <textarea
            id={`${formId}-message`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            maxLength={MESSAGE_MAX_LEN}
            rows={6}
            className="min-h-[6.5rem] w-full resize-y rounded-lg border border-emerald-700 bg-emerald-950/50 px-2.5 py-2 text-xs font-light leading-relaxed text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            placeholder="Write your message…"
            aria-label="Email message body"
          />
        </div>
        <button
          type="submit"
          disabled={isSending}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
        >
          {isSending ? (
            <CircleNotchIcon
              className="h-4 w-4 animate-spin"
              weight="bold"
              aria-hidden
            />
          ) : (
            <PaperPlaneTiltIcon
              className="h-4 w-4 shrink-0"
              weight="bold"
              aria-hidden
            />
          )}
          {isSending ? "Sending…" : "Send"}
        </button>
      </form>
    </ScheduleWidgetChrome>
  );
};
