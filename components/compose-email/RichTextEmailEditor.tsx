"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import {
  TextBIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  TextAlignJustifyIcon,
  MinusIcon,
  TextHOneIcon,
  TextHTwoIcon,
  TextHThreeIcon,
  PaletteIcon,
  SparkleIcon,
  CircleNotchIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";

export type RichTextEmailEditorHandle = {
  getHtml: () => string;
  setHtml: (html: string) => void;
};

type RichTextEmailEditorProps = {
  className?: string;
};

type AiAction = "rewrite" | "shorten" | "expand" | "tone";

const AI_ACTIONS: { id: AiAction; label: string }[] = [
  { id: "rewrite", label: "Rewrite" },
  { id: "shorten", label: "Shorten" },
  { id: "expand", label: "Expand" },
  { id: "tone", label: "Tone" },
];

const TONES = ["professional", "friendly", "formal", "concise"] as const;

const TEXT_COLORS = ["#0f172a", "#0f766e", "#1d4ed8", "#b45309", "#991b1b"];

const ToolbarButton = ({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={pressed}
    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-slate-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900/25 ${
      pressed
        ? "border-emerald-800/50 bg-emerald-100 text-emerald-950"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
    }`}
  >
    {children}
  </button>
);

const RichTextEmailEditor = forwardRef<
  RichTextEmailEditorHandle,
  RichTextEmailEditorProps
>(({ className = "" }, ref) => {
  const [showColorRow, setShowColorRow] = useState(false);
  const [aiAction, setAiAction] = useState<AiAction>("rewrite");
  const [tone, setTone] = useState<(typeof TONES)[number]>("professional");
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [customInstructionsOpen, setCustomInstructionsOpen] = useState(true);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        blockquote: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Placeholder.configure({
        placeholder: "Write your message…",
      }),
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "max-w-none min-h-[min(22rem,45vh)] bg-white px-2 py-2 text-[14px] leading-relaxed text-slate-800 shadow-none outline-none ring-0 focus:outline-none [&_.is-editor-empty:first-child::before]:text-slate-400 [&_li]:font-light [&_p]:my-0 [&_p]:font-light [&_p+p]:mt-2 [&_strong]:font-medium [&_b]:font-medium [&_h1]:my-2 [&_h1]:text-xl [&_h1]:font-medium [&_h2]:my-2 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:my-2 [&_h3]:text-base [&_h3]:font-medium [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4",
      },
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      getHtml: () => editor?.getHTML() ?? "",
      setHtml: (html: string) => {
        editor?.commands.setContent(html, { emitUpdate: false });
      },
    }),
    [editor]
  );

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const handleToolbarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const toolbar = event.currentTarget;
    const buttons = Array.from(
      toolbar.querySelectorAll<HTMLButtonElement>('button[type="button"]')
    ).filter((b) => !b.disabled);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === "ArrowLeft"
        ? buttons[Math.max(0, index - 1)]
        : buttons[Math.min(buttons.length - 1, index + 1)];
    next?.focus();
  };

  const handleAiAssist = async () => {
    const htmlBody = editor?.getHTML() ?? "";
    const stripped = htmlBody.replace(/<[^>]+>/g, "").trim();
    if (!stripped) {
      toast.error("Write something in the message first.");
      return;
    }

    setIsAiRunning(true);
    try {
      const response = await fetch("/api/v1/compose-email/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          htmlBody,
          action: aiAction,
          ...(aiAction === "tone" ? { tone } : {}),
          ...(customInstructions.trim()
            ? { customInstructions: customInstructions.trim() }
            : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        html?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update the text.");
      }
      if (data.html) {
        editor?.commands.setContent(data.html, { emitUpdate: false });
        toast.success("Message updated.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not update the text.";
      toast.error(msg);
    } finally {
      setIsAiRunning(false);
    }
  };

  if (!editor) {
    return (
      <div
        className={`min-h-[32rem] rounded-lg border border-slate-300 bg-white ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white ${className}`}
    >
      <div
        role="toolbar"
        aria-label="Formatting and writing help"
        className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-slate-200/90 bg-slate-100/95 px-2 py-2"
        onKeyDown={handleToolbarKeyDown}
      >
        <ToolbarButton
          label="Bold"
          pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <TextBIcon size={18} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <TextItalicIcon size={18} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          pressed={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <TextUnderlineIcon size={18} weight="bold" />
        </ToolbarButton>
        <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-300" aria-hidden />
        <ToolbarButton
          label="Heading 1"
          pressed={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <TextHOneIcon size={18} weight="duotone" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          pressed={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <TextHTwoIcon size={18} weight="duotone" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          pressed={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <TextHThreeIcon size={18} weight="duotone" />
        </ToolbarButton>
        <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-300" aria-hidden />
        <ToolbarButton
          label="Bullet list"
          pressed={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListBulletsIcon size={18} weight="duotone" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          pressed={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListNumbersIcon size={18} weight="duotone" />
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <MinusIcon size={18} weight="duotone" />
        </ToolbarButton>
        <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-300" aria-hidden />
        <ToolbarButton
          label="Align left"
          pressed={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <TextAlignLeftIcon size={18} weight="duotone" />
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          pressed={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <TextAlignCenterIcon size={18} weight="duotone" />
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          pressed={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <TextAlignRightIcon size={18} weight="duotone" />
        </ToolbarButton>
        <ToolbarButton
          label="Justify"
          pressed={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <TextAlignJustifyIcon size={18} weight="duotone" />
        </ToolbarButton>
        <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-300" aria-hidden />
        <ToolbarButton
          label="Text color options"
          pressed={showColorRow}
          onClick={() => setShowColorRow((v) => !v)}
        >
          <PaletteIcon size={18} weight="duotone" />
        </ToolbarButton>

        <span
          className="mx-0.5 hidden h-6 w-px shrink-0 bg-slate-300 sm:block"
          aria-hidden
        />
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2 sm:ml-auto sm:w-auto sm:border-t-0 sm:pt-0">
          <label className="sr-only" htmlFor="compose-ai-action">
            Writing help
          </label>
          <select
            id="compose-ai-action"
            value={aiAction}
            onChange={(e) => setAiAction(e.target.value as AiAction)}
            className="h-9 max-w-[140px] shrink rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900/20 sm:text-sm"
          >
            {AI_ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          {aiAction === "tone" && (
            <>
              <label className="sr-only" htmlFor="compose-ai-tone">
                Tone
              </label>
              <select
                id="compose-ai-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value as (typeof TONES)[number])}
                className="h-9 max-w-[130px] shrink rounded-md border border-slate-300 bg-white px-2 text-xs font-medium capitalize text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900/20 sm:text-sm"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={isAiRunning}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-emerald-900/35 bg-emerald-950 px-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900/40 sm:px-3 sm:text-sm"
          >
            {isAiRunning ? (
              <CircleNotchIcon className="animate-spin" size={16} weight="bold" />
            ) : (
              <SparkleIcon size={16} weight="duotone" />
            )}
            Apply
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-100 px-2 py-2">
        <button
          type="button"
          onClick={() => setCustomInstructionsOpen((open) => !open)}
          aria-expanded={customInstructionsOpen}
          aria-controls="compose-ai-custom-panel"
          id="compose-ai-custom-toggle"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900/20"
        >
          <span>Additional instructions for the assistant (optional)</span>
          <CaretDownIcon
            size={14}
            weight="bold"
            className={
              customInstructionsOpen ? "rotate-180 transition-transform" : "transition-transform"
            }
            aria-hidden
          />
        </button>
        {customInstructionsOpen ? (
          <div className="mt-2 space-y-1" id="compose-ai-custom-panel" role="region" aria-labelledby="compose-ai-custom-toggle">
            <label htmlFor="compose-ai-custom-instructions" className="sr-only">
              Custom instructions for writing help
            </label>
            <textarea
              id="compose-ai-custom-instructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              maxLength={4000}
              rows={3}
              placeholder="Examples: mention the irrigation meeting; use Philippine English; keep to three short paragraphs; emphasize the deadline."
              className="w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-emerald-800/40 focus:outline-none focus:ring-2 focus:ring-emerald-900/15 sm:text-sm"
              aria-describedby="compose-ai-custom-hint"
            />
            <p id="compose-ai-custom-hint" className="text-[11px] leading-snug text-slate-500">
              Combined with the action you pick above. Only this compose session—nothing is
              saved. Up to 4,000 characters.
            </p>
          </div>
        ) : null}
      </div>

      {showColorRow && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-600">Color</span>
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Set text color ${c}`}
              className="h-7 w-7 rounded-full border border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900/25"
              style={{ backgroundColor: c }}
              onClick={() => editor.chain().focus().setColor(c).run()}
            />
          ))}
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900/20"
            onClick={() => editor.chain().focus().unsetColor().run()}
          >
            Reset color
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="min-h-0 flex-1 overflow-y-auto bg-white"
      />
    </div>
  );
});

RichTextEmailEditor.displayName = "RichTextEmailEditor";

export default RichTextEmailEditor;
