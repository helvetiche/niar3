"use client";

import type { ReactNode } from "react";
import { TrashIcon } from "@phosphor-icons/react";

export type WidgetChromeVariant = "sidebar" | "glass";

/** Shared shell: sidebar = solid emerald panel; glass = frosted for modal previews. */
export const ScheduleWidgetChrome = ({
  title,
  titleIcon,
  onRemove,
  children,
  variant = "sidebar",
  fillHeight = false,
  titleClassName,
}: {
  title: string;
  titleIcon?: ReactNode;
  onRemove?: () => void;
  children: ReactNode;
  variant?: WidgetChromeVariant;
  fillHeight?: boolean;
  /** Override default `text-sm` title (e.g. compact priority header). */
  titleClassName?: string;
}) => {
  const shell =
    variant === "glass"
      ? "min-w-0 overflow-hidden rounded-lg border border-white/40 bg-white/10 p-4 shadow-sm backdrop-blur-md"
      : "min-w-0 overflow-hidden rounded-lg border border-emerald-700/60 bg-emerald-800/30 p-4";
  const trashMuted = variant === "glass" ? "text-white/35" : "text-emerald-300/40";
  const trashBtn =
    variant === "glass"
      ? "text-white/60 transition-colors hover:text-red-300"
      : "text-emerald-300/70 transition-colors hover:text-red-400";
  const titleIconWrapClass =
    variant === "glass" ? "text-emerald-200/95" : "text-emerald-300/90";

  const fillClass = fillHeight ? "flex min-h-0 flex-1 flex-col" : "";

  return (
    <div className={`${shell} ${fillClass}`.trim()}>
      <div className="mb-3 flex min-w-0 shrink-0 items-center justify-between gap-2">
        <h3
          className={`flex min-w-0 items-center gap-1.5 font-semibold leading-tight text-white ${
            titleClassName ?? "text-sm"
          }`}
        >
          {titleIcon ? (
            <span className={`inline-flex shrink-0 items-center ${titleIconWrapClass}`}>
              {titleIcon}
            </span>
          ) : null}
          <span className="min-w-0 truncate">{title}</span>
        </h3>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className={`shrink-0 ${trashBtn}`}
            aria-label={`Remove ${title} widget`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : (
          <span className={`shrink-0 ${trashMuted}`} aria-hidden>
            <TrashIcon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div
        className={
          fillHeight
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            : "min-w-0 overflow-hidden"
        }
      >
        {children}
      </div>
    </div>
  );
};
