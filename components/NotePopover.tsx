"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PushPinIcon, TrashIcon } from "@phosphor-icons/react";
import type { NoteItem } from "@/lib/api/calendar-notes";

const COLOR_CONFIG: Record<string, { accent: string; bg: string }> = {
  red: { accent: "from-red-500 to-red-600", bg: "bg-red-100" },
  orange: { accent: "from-orange-500 to-orange-600", bg: "bg-orange-100" },
  amber: { accent: "from-amber-500 to-amber-600", bg: "bg-amber-100" },
  emerald: { accent: "from-emerald-500 to-emerald-600", bg: "bg-emerald-100" },
  teal: { accent: "from-teal-500 to-teal-600", bg: "bg-teal-100" },
  blue: { accent: "from-blue-500 to-blue-600", bg: "bg-blue-100" },
  violet: { accent: "from-violet-500 to-violet-600", bg: "bg-violet-100" },
  pink: { accent: "from-pink-500 to-pink-600", bg: "bg-pink-100" },
};

interface NotePopoverProps {
  note: NoteItem;
  children: React.ReactElement;
  onRemove: () => void;
}

/**
 * Note pill with a portal-rendered popover on hover, showing full text and a Remove option.
 */
export function NotePopover({ note, children, onRemove }: NotePopoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = COLOR_CONFIG[note.color] ?? COLOR_CONFIG.emerald;

  const show = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const hide = () => {
    hideTimeoutRef.current = setTimeout(() => setIsHovered(false), 150);
  };

  useLayoutEffect(() => {
    if (!isHovered || !triggerRef.current || !popoverRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const el = popoverRef.current;
    el.style.position = "fixed";
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.bottom + 4}px`;
    el.style.minWidth = `${Math.max(rect.width, 200)}px`;
    el.style.transform = "none";
  }, [isHovered]);

  useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    },
    [],
  );

  const popover = isHovered && (
    <div
      ref={popoverRef}
      className="z-[99999] overflow-hidden rounded-xl border-2 border-dashed border-zinc-200 bg-white shadow-xl shadow-emerald-900/5"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className={`flex items-start gap-3 px-4 py-3 ${config.bg}`}>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${config.accent} text-white shadow-sm`}
        >
          <PushPinIcon size={20} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-medium text-zinc-800">{note.text}</p>
          <p className="mt-0.5 text-xs capitalize text-zinc-500">
            {note.color}
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-100 p-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
            setIsHovered(false);
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
        >
          <TrashIcon size={18} weight="duotone" />
          Remove note
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      className="inline-block w-full min-w-0"
    >
      {children}
      {isHovered &&
        typeof document !== "undefined" &&
        createPortal(popover, document.body)}
    </div>
  );
}
