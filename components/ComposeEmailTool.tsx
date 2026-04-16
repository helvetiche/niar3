"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type FormEvent } from "react";
import {
  PaperPlaneTiltIcon,
  EnvelopeSimpleIcon,
  CircleNotchIcon,
  TextAaIcon,
  ArticleMediumIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import type { RichTextEmailEditorHandle } from "@/components/compose-email/RichTextEmailEditor";

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
  const [isSending, setIsSending] = useState(false);

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

    setIsSending(true);
    try {
      const response = await fetch("/api/v1/compose-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          htmlBody,
        }),
      });
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
        </div>
        <p className="mt-2 text-sm text-white/85">
          Enter the subject and recipient, write your message, then send. This flow uses the
          same workspace styling as your other tools—not the automated schedule email layout.
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
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                className="w-full min-w-0 rounded-lg border border-white/40 bg-white/5 px-3 py-2.5 text-sm font-light text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="name@example.com"
                aria-label="Recipients To"
              />
            </label>
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
    </section>
  );
};
