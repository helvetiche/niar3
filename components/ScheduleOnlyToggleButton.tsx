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
          ? "border-white bg-white/30 text-white hover:bg-white/40"
          : "border-white/40 bg-white/5 text-white hover:bg-white/10"
      }`}
      aria-pressed={scheduleOnly}
      aria-label="Toggle schedule-only view"
      title={scheduleOnly ? "Back to calendar view" : "Switch to schedule-only view"}
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
