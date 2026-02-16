"use client";

import { CalendarBlankIcon, ListBulletsIcon } from "@phosphor-icons/react";

export function ScheduleOnlyToggleButton({
  scheduleOnly,
  onToggle,
}: {
  scheduleOnly: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        scheduleOnly
          ? "border-emerald-400 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
      }`}
      aria-pressed={scheduleOnly}
      aria-label="Toggle schedule-only view"
      title={
        scheduleOnly ? "Back to calendar view" : "Switch to schedule-only view"
      }
    >
      {scheduleOnly ? (
        <CalendarBlankIcon size={14} weight="duotone" />
      ) : (
        <ListBulletsIcon size={14} weight="duotone" />
      )}
      {scheduleOnly ? "Calendar view" : "Schedule only"}
    </button>
  );
}
