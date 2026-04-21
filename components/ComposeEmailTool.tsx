"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import {
  PaperPlaneTiltIcon,
  EnvelopeSimpleIcon,
  CircleNotchIcon,
  TextAaIcon,
  ArticleMediumIcon,
  PaperclipIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import type { RichTextEmailEditorHandle } from "@/components/compose-email/RichTextEmailEditor";
import {
  COMPOSE_EMAIL_MAX_ATTACHMENTS,
  COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES,
} from "@/lib/compose-email-attachment-limits";
import { formatComposeEmailAttachmentSizeLabel } from "@/lib/compose-email-client-attachments";
import { QuickSingletonWidgetSidebarPromo } from "@/components/WorkspaceWidgetSidebarPromo";
import { AccountRecipientEmailInput } from "@/components/compose-email/AccountRecipientEmailInput";

const RichTextEmailEditor = dynamic(
  () => import("@/components/compose-email/RichTextEmailEditor"),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[32rem] rounded-lg border border-white/25 bg-white/5"
        aria-busy
        aria-label="Loading editor"
      />
    ),
  }
);

export const ComposeEmailTool = () => {
  const editorRef = useRef<RichTextEmailEditorHandle | null>(null);
  const [subject, setSubject] = useState("");
  const [to, setTo] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [lastAttachmentSelectionMessage, setLastAttachmentSelectionMessage] =
    useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const attachmentBytesTotal = useMemo(
    () => attachments.reduce((sum, f) => sum + f.size, 0),
    [attachments]
  );

  const handleAttachmentInputChange = (event: SyntheticEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const incoming = input.files ? Array.from(input.files) : [];
    input.value = "";

    if (incoming.length === 0) {
      setLastAttachmentSelectionMessage("No files selected.");
      return;
    }
    setAttachmentError(null);
    setLastAttachmentSelectionMessage(
      `${incoming.length} file${incoming.length === 1 ? "" : "s"} selected.`
    );
    const next = [...attachments, ...incoming];
    if (next.length > COMPOSE_EMAIL_MAX_ATTACHMENTS) {
      const message = `You can attach at most ${COMPOSE_EMAIL_MAX_ATTACHMENTS} files.`;
      setAttachmentError(message);
      toast.error(message);
      return;
    }
    const nextTotal = next.reduce((sum, f) => sum + f.size, 0);
    if (nextTotal > COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES) {
      const message = `Attachments cannot exceed ${formatComposeEmailAttachmentSizeLabel(COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES)} in total.`;
      setAttachmentError(message);
      toast.error(message);
      return;
    }
    setAttachments(next);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const htmlBody = editorRef.current?.getHtml() ?? "";
    const stripped = htmlBody.replace(/<[^>]+>/g, "").trim();
    if (!stripped) {
      toast.error("Add a message body before sending.");
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
        messageId?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Send failed");
      }
      toast.success("Email sent.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-3 shadow-xl shadow-emerald-950/30 sm:p-4 md:p-6">
      <div className="mb-4 shrink-0 sm:mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <EnvelopeSimpleIcon size={18} className="text-white" weight="duotone" />
          </span>
          Compose email
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <PaperPlaneTiltIcon size={12} className="text-white" weight="duotone" />
            One-off send
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <TextAaIcon size={12} className="text-white" weight="duotone" />
            Rich text
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <ArticleMediumIcon size={12} className="text-white" weight="duotone" />
            Custom layout
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <PaperclipIcon size={12} className="text-white" weight="duotone" />
            Attachments
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85">
          Enter the subject and recipient, write your message, then send. This flow uses
          the same workspace styling as your other tools—not the automated schedule
          email layout.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-xl border border-white/35 bg-white/10 p-3 sm:p-4 md:gap-5 md:p-6">
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-white/80">
                Subject
              </span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={998}
                autoComplete="off"
                className="w-full min-w-0 rounded-lg border border-white/40 bg-white/5 px-3 py-2.5 text-sm font-light text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="Email subject"
                aria-label="Email subject"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-white/80">
                To
              </span>
              <AccountRecipientEmailInput
                id="compose-email-to"
                value={to}
                onChange={setTo}
                required
                placeholder="name@example.com"
                aria-label="Recipients To"
                className="w-full min-w-0 rounded-lg border border-white/40 bg-white/5 px-3 py-2.5 text-sm font-light text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                hintClassName="mt-1 text-[11px] font-light leading-snug text-white/55"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-white/80">
                Attachments
              </span>
              <span className="text-[11px] font-light text-white/70">
                Up to {COMPOSE_EMAIL_MAX_ATTACHMENTS} files,{" "}
                {formatComposeEmailAttachmentSizeLabel(
                  COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES
                )}{" "}
                total
              </span>
            </div>
            <input
              id="compose-email-attachments-input"
              type="file"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-label="Choose files to attach"
              onChange={handleAttachmentInputChange}
              onInput={handleAttachmentInputChange}
            />
            <label
              htmlFor={
                attachments.length >= COMPOSE_EMAIL_MAX_ATTACHMENTS
                  ? undefined
                  : "compose-email-attachments-input"
              }
              className={`inline-flex w-fit items-center gap-2 rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm font-light text-white transition focus-within:outline-none focus-within:ring-2 focus-within:ring-white/35 ${attachments.length >= COMPOSE_EMAIL_MAX_ATTACHMENTS ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-white/10"}`}
              aria-label="Add file attachments"
            >
              <PaperclipIcon
                size={18}
                weight="duotone"
                className="shrink-0 text-white"
              />
              {attachments.length > 0
                ? `Add files (${attachments.length} selected)`
                : "Add files"}
            </label>
            {attachments.length > 0 ? (
              <ul
                className="divide-y divide-white/15 rounded-lg border border-white/25 bg-white/5"
                aria-label="Files to attach"
              >
                {attachments.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-light text-white"
                  >
                    <span className="min-w-0 flex-1 truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="shrink-0 text-xs text-white/70">
                      {formatComposeEmailAttachmentSizeLabel(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="inline-flex shrink-0 items-center justify-center rounded-md border border-white/30 p-1.5 text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                      aria-label={`Remove ${file.name}`}
                    >
                      <TrashSimpleIcon size={16} weight="bold" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-white/25 bg-white/5 px-3 py-2 text-xs font-light text-white/65">
                No files attached yet. Selected files will appear here before sending.
              </p>
            )}
            {attachmentBytesTotal > 0 ? (
              <p className="text-[11px] font-light text-white/65">
                Selected: {formatComposeEmailAttachmentSizeLabel(attachmentBytesTotal)}{" "}
                of{" "}
                {formatComposeEmailAttachmentSizeLabel(
                  COMPOSE_EMAIL_MAX_TOTAL_ATTACHMENT_BYTES
                )}
              </p>
            ) : null}
            {lastAttachmentSelectionMessage ? (
              <p className="text-[11px] font-light text-white/70">
                {lastAttachmentSelectionMessage}
              </p>
            ) : null}
            {attachmentError ? (
              <p
                className="rounded-lg border border-rose-300/45 bg-rose-900/20 px-3 py-2 text-xs font-light text-rose-100"
                role="alert"
                aria-live="polite"
              >
                {attachmentError}
              </p>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-white/80">
              Message
            </span>
            <RichTextEmailEditor ref={editorRef} className="flex-1" />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 pt-1">
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center gap-2 rounded-lg border border-white bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          >
            {isSending ? (
              <CircleNotchIcon className="animate-spin" size={20} weight="bold" />
            ) : (
              <PaperPlaneTiltIcon size={20} weight="bold" className="text-white" />
            )}
            Send email
          </button>
        </div>
      </form>

      <QuickSingletonWidgetSidebarPromo
        widget="quick-send-message"
        title="Quick message"
        intro="Pin a compact email form in the widget sidebar so you can send short plain-text notes without leaving your current tab."
        description="Uses the same send route as this page: To, Subject, message body, and optional attachments (same limits). Blank lines become paragraphs; single line breaks stay as line breaks. Rich text and AI assist stay here in the full composer."
        addButtonLabel="Add Quick message to widget sidebar"
      />
    </section>
  );
};
