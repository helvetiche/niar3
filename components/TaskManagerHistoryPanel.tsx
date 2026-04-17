"use client";

import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ClockIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import {
  completionsInLocalMonth,
  groupCompletionsByLocalDaySorted,
} from "@/lib/task-manager-utils";
import { getFileNameFromContentDisposition } from "@/lib/api/api-client-utils";
import type { TaskCompletion } from "@/types/schedule";

export type TaskManagerHistoryPanelProps = {
  completions: TaskCompletion[];
  searchQuery: string;
};

const formatDayHeading = (dayKey: string): string => {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const deadlineLabel = (type: string): string => type.replace(/-/g, " ");

export const TaskManagerHistoryPanel = ({
  completions,
  searchQuery,
}: TaskManagerHistoryPanelProps) => {
  const now = new Date();
  const [cursorYear, setCursorYear] = useState(now.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(now.getMonth());
  const [isExporting, setIsExporting] = useState(false);

  const monthLabel = useMemo(
    () =>
      new Date(cursorYear, cursorMonth, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [cursorYear, cursorMonth]
  );

  const handlePrevMonth = () => {
    if (cursorMonth === 0) {
      setCursorYear((y) => y - 1);
      setCursorMonth(11);
      return;
    }
    setCursorMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    if (cursorMonth === 11) {
      setCursorYear((y) => y + 1);
      setCursorMonth(0);
      return;
    }
    setCursorMonth((m) => m + 1);
  };

  const handleJumpToCurrentMonth = () => {
    const n = new Date();
    setCursorYear(n.getFullYear());
    setCursorMonth(n.getMonth());
  };

  const filteredInMonth = useMemo(() => {
    const inMonth = completionsInLocalMonth(completions, cursorYear, cursorMonth);
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return inMonth;
    }
    return inMonth.filter((c) => {
      const title = (c.scheduleTitle || "").toLowerCase();
      const desc = (c.scheduleDescription || "").toLowerCase();
      const person = (c.personAssigned || "").toLowerCase();
      const email = (c.personEmail || "").toLowerCase();
      return (
        title.includes(q) || desc.includes(q) || person.includes(q) || email.includes(q)
      );
    });
  }, [completions, cursorYear, cursorMonth, searchQuery]);

  const timelineDays = useMemo(
    () => groupCompletionsByLocalDaySorted(filteredInMonth),
    [filteredInMonth]
  );

  const isCurrentMonth =
    cursorYear === now.getFullYear() && cursorMonth === now.getMonth();

  const handleExportMonthlyWorkbook = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/completions/export?year=${cursorYear}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to export accomplishments.");
      }

      const blob = await response.blob();
      const fileName = getFileNameFromContentDisposition(
        response.headers.get("Content-Disposition"),
        `accomplishments-${cursorYear}.xlsx`
      );
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("[TaskManagerHistoryPanel] export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-white/70">
          Completion history
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExportMonthlyWorkbook()}
            disabled={isExporting}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
          >
            <DownloadSimpleIcon size={15} />
            {isExporting ? "Exporting..." : `Export ${cursorYear} Excel`}
          </button>
          <div
            className="flex items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-950/60 p-1"
            role="group"
            aria-label="Select month"
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-md p-2 text-white/80 transition hover:bg-emerald-800/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              aria-label="Previous month"
            >
              <CaretLeftIcon size={18} weight="bold" />
            </button>
            <span className="min-w-[9.5rem] px-2 text-center text-sm font-medium text-white">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-md p-2 text-white/80 transition hover:bg-emerald-800/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              aria-label="Next month"
            >
              <CaretRightIcon size={18} weight="bold" />
            </button>
          </div>
          {!isCurrentMonth ? (
            <button
              type="button"
              onClick={handleJumpToCurrentMonth}
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              This month
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-white/60">
        Tasks you checked off are listed by the day they were marked complete (your
        local calendar). Daily, weekly, and monthly schedules all appear when a
        completion was saved.
      </p>

      {timelineDays.length === 0 ? (
        <div className="rounded-lg border border-emerald-700/80 bg-emerald-950/40 py-12 text-center">
          <CalendarBlankIcon size={40} className="mx-auto mb-3 text-white/35" />
          <p className="text-sm text-white/75">
            {searchQuery.trim()
              ? "No matching completions in this month."
              : "No completions recorded for this month."}
          </p>
        </div>
      ) : (
        <ol className="flex flex-col">
          {timelineDays.map(({ dayKey, items }, index) => {
            const isLast = index === timelineDays.length - 1;
            return (
              <li key={dayKey} className="flex min-h-0 gap-3 sm:gap-4">
                <div className="relative flex w-10 shrink-0 flex-col items-center self-stretch sm:w-11">
                  <div
                    className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-emerald-500/45"
                    aria-hidden
                  />
                  <div
                    className="relative z-[1] mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400/85 bg-emerald-950 ring-[3px] ring-emerald-900 sm:h-10 sm:w-10"
                    aria-hidden
                  >
                    <ClockIcon size={20} weight="duotone" className="text-amber-300" />
                  </div>
                </div>
                <div className={`min-w-0 flex-1 pt-0.5 ${isLast ? "" : "pb-8"}`}>
                  <div className="mb-2">
                    <p className="text-sm font-medium text-white">
                      {formatDayHeading(dayKey)}
                    </p>
                    <p className="text-xs text-white/55">
                      {items.length} completion{items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {items.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border border-emerald-700/70 bg-emerald-950/50 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="min-w-0 flex-1 text-sm font-medium text-white">
                            {c.scheduleTitle || "Untitled schedule"}
                          </p>
                          <time
                            dateTime={c.completedAt}
                            className="shrink-0 text-xs tabular-nums text-amber-200/90"
                          >
                            {formatTime(c.completedAt)}
                          </time>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
                          <span className="capitalize">
                            {deadlineLabel(c.deadlineType)}
                          </span>
                          <span aria-hidden>·</span>
                          <span className="truncate">{c.personAssigned}</span>
                        </div>
                        {c.notes ? (
                          <p className="mt-2 border-t border-emerald-800/60 pt-2 text-xs text-white/70">
                            {c.notes}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
