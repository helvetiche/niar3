"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NotePencilIcon } from "@phosphor-icons/react";

interface AddNoteTooltipProps {
  children: React.ReactElement;
  onClick: () => void;
  "aria-label": string;
}

/**
 * Add-note button with a portal-rendered tooltip so it escapes overflow:hidden parents.
 */
export function AddNoteTooltip({
  children,
  onClick,
  "aria-label": ariaLabel,
}: AddNoteTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isHovered || !triggerRef.current || !tooltipRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const el = tooltipRef.current;
    el.style.position = "fixed";
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.bottom + 4}px`;
    el.style.transform = "translateX(-50%)";
  }, [isHovered]);

  const tooltip = isHovered && (
    <div
      ref={tooltipRef}
      className="pointer-events-none z-[99999] w-56 rounded-lg border border-emerald-300/30 bg-emerald-900 px-3 py-2.5 shadow-lg"
    >
      <div className="flex items-start gap-2.5">
        <NotePencilIcon
          size={18}
          weight="duotone"
          className="mt-0.5 shrink-0 text-white"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-white">Add note or reminder</p>
          <p className="text-justify text-xs leading-relaxed text-white/95">
            Click to store tasks, events, or anything you need to remember for
            this day.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={triggerRef}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        className="rounded-md p-1 text-zinc-400 transition hover:bg-white/60 hover:text-zinc-700"
        aria-label={ariaLabel}
      >
        {children}
      </button>
      {isHovered &&
        typeof document !== "undefined" &&
        createPortal(tooltip, document.body)}
    </div>
  );
}
