"use client";

import type { NoteItem } from "@/lib/api/calendar-notes";
import { getNoteBg } from "@/lib/note-colors";

type ScheduleOnlyItem = {
  id: string;
  day: number;
  note: NoteItem;
  daysUntil: number;
  progress: number;
};

export function ScheduleOnlyView({
  monthName,
  year,
  items,
}: {
  monthName: string;
  year: number;
  items: ScheduleOnlyItem[];
}) {
  const formatDeadline = (daysUntil: number) => {
    if (daysUntil < 0) return "Overdue";
    if (daysUntil === 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    if (daysUntil <= 31) return `${daysUntil} days`;
    return `${Math.round(daysUntil / 30)} mo`;
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        No schedules for this month yet.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4">
      <div className="space-y-3">
        {items.map(({ id, day, note, daysUntil, progress }) => (
          <div
            key={id}
            className="rounded-lg border border-dashed border-zinc-200 bg-white p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-zinc-500">
                {monthName} {day}, {year}
              </p>
              <span
                className={`text-[10px] font-medium ${
                  daysUntil <= 0
                    ? "text-amber-600"
                    : daysUntil <= 3
                      ? "text-emerald-600"
                      : "text-zinc-400"
                }`}
              >
                {formatDeadline(daysUntil)}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress: ${Math.round(progress)}% until deadline`}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  progress <= 0
                    ? "bg-amber-500"
                    : progress < 50
                      ? "bg-amber-400"
                      : progress < 80
                        ? "bg-emerald-500"
                        : "bg-emerald-600"
                }`}
                style={{
                  width: `${progress <= 0 ? 5 : Math.min(100, progress)}%`,
                }}
              />
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-800">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${getNoteBg(note.color)}`}
                aria-hidden
              />
              {note.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
