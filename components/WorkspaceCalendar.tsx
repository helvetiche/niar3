"use client";

import { useState } from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  ListChecksIcon,
  NotePencilIcon,
  PlusIcon,
  XIcon,
  CalendarCheckIcon,
} from "@phosphor-icons/react";
import { useWorkspaceUser } from "@/contexts/WorkspaceContext";
import { MasonryModal } from "@/components/MasonryModal";
import { AddNoteTooltip } from "@/components/AddNoteTooltip";
import { NotePopover } from "@/components/NotePopover";
import { ScheduleOnlyToggleButton } from "@/components/ScheduleOnlyToggleButton";
import { ScheduleOnlyView } from "@/components/ScheduleOnlyView";
import { NOTE_COLORS, getNoteBg } from "@/lib/note-colors";
import { useWorkspaceCalendar } from "@/hooks/useWorkspaceCalendar";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type WorkspaceCalendarProps = {
  /** `drawer` = embedded in the task sidebar panel (scrollable, no outer card chrome). */
  variant?: "page" | "drawer";
};

export function WorkspaceCalendar({ variant = "page" }: WorkspaceCalendarProps) {
  const isDrawer = variant === "drawer";
  const user = useWorkspaceUser();
  const {
    year,
    month,
    today,
    scheduleOnly,
    setScheduleOnly,
    getNotesFor,
    addNote,
    removeNote,
    prevMonth,
    nextMonth,
    goToToday,
    getDaysUntil,
    getProgress,
    monthNotesByBucket,
    totalSchedules,
    scheduleOnlyItems,
    calendarDates,
  } = useWorkspaceCalendar(user.uid);

  const [addModalDate, setAddModalDate] = useState<{
    year: number;
    month: number;
    day: number;
  } | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState("emerald");

  const openAddModal = (year: number, month: number, day: number) => {
    setAddModalDate({ year, month, day });
    setNewNoteText("");
    setSelectedColor("emerald");
  };

  const handleAddNote = () => {
    if (!addModalDate) return;
    addNote(
      addModalDate.year,
      addModalDate.month,
      addModalDate.day,
      newNoteText,
      selectedColor,
      () => {
        setAddModalDate(null);
        setNewNoteText("");
      },
    );
  };

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === month &&
    today.getFullYear() === year;

  const MAX_VISIBLE_NOTES = 3;

  const sectionClass = isDrawer
    ? "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-emerald-900"
    : "flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6";

  const scrollInnerClass = isDrawer
    ? "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-4 pt-2 sm:px-4"
    : "contents";

  const cellMinH = isDrawer ? "min-h-[68px]" : "min-h-[80px]";

  return (
    <section className={sectionClass}>
      <div className={scrollInnerClass}>
      <header className={isDrawer ? "mb-4" : "mb-6"}>
        <h2
          className={`flex items-center gap-2 font-medium text-white ${
            isDrawer ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
          }`}
        >
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <NotePencilIcon
              size={isDrawer ? 18 : 20}
              className="text-white"
            />
          </span>
          Calendar & Notes
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <NotePencilIcon size={12} className="text-white" />
            Color-coded Notes
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <ListChecksIcon size={12} className="text-white" />
            {totalSchedules} Schedule{totalSchedules === 1 ? "" : "s"}
          </span>
        </div>
        <p
          className={
            isDrawer
              ? "mt-2 text-xs text-white/80"
              : "mt-2 max-w-3xl text-sm text-white/85"
          }
        >
          {isDrawer
            ? "Same calendar as the workspace—notes, deadlines, and schedule-only view."
            : "Track important dates, deadlines, and reminders with color-coded notes."}
        </p>
      </header>

      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 rounded-lg border border-white/40 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-2 text-white transition hover:bg-white/10"
              aria-label="Previous month"
            >
              <CaretLeftIcon size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-2 text-white transition hover:bg-white/10"
              aria-label="Next month"
            >
              <CaretRightIcon size={18} weight="bold" />
            </button>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-white">
            {MONTHS[month]} {year}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-white/40 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Today
          </button>
        </div>
      </div>
      {scheduleOnly ? (
        <ScheduleOnlyView
          monthName={MONTHS[month]}
          year={year}
          items={scheduleOnlyItems}
        />
      ) : (
        <div
          className={`grid grid-cols-7 grid-rows-[auto_repeat(6,1fr)] gap-px text-center ${
            isDrawer
              ? "min-h-[26rem] sm:min-h-[32rem]"
              : "min-h-0 flex-1"
          }`}
        >
          {DAYS.map((d) => (
            <div
              key={d}
              className="flex items-center justify-center py-2 text-xs font-medium uppercase tracking-wider text-white/70"
            >
              {d}
            </div>
          ))}
          {calendarDates.map(({ day: d, isCurrentMonth }, i) => {
            const cellNotes = isCurrentMonth ? getNotesFor(year, month, d) : [];
            const visibleNotes = cellNotes.slice(0, MAX_VISIBLE_NOTES);
            const overflowCount = cellNotes.length - MAX_VISIBLE_NOTES;

            return (
              <div
                key={`${isCurrentMonth ? "cur" : "other"}-${d}-${i}`}
                className={`relative flex ${cellMinH} flex-col overflow-hidden rounded-md p-2 text-sm ${
                  !isCurrentMonth
                    ? "border border-emerald-700/30 bg-emerald-950/30 text-white/40"
                    : isToday(d)
                      ? "border-2 border-white bg-white/20"
                      : "border border-emerald-700 bg-emerald-950/50 text-white hover:border-white/40 hover:bg-emerald-800/50"
                }`}
              >
                <div className="flex justify-end">
                  {isToday(d) ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-semibold text-emerald-900">
                      {d}
                    </span>
                  ) : (
                    <span className={!isCurrentMonth ? "text-white/40" : "text-white"}>
                      {d}
                    </span>
                  )}
                </div>
                {isCurrentMonth && (
                  <>
                    <div className="absolute left-2 top-2 z-10">
                      <AddNoteTooltip
                        onClick={() => openAddModal(year, month, d)}
                        aria-label={`Add note for ${MONTHS[month]} ${d}`}
                      >
                        <PlusIcon size={14} weight="bold" />
                      </AddNoteTooltip>
                    </div>
                    <div className="mt-1 flex min-h-0 min-w-0 flex-1 flex-col justify-end gap-1 overflow-hidden pt-6">
                      {visibleNotes.map((item, idx) => (
                        <NotePopover
                          key={idx}
                          note={item}
                          onRemove={() => removeNote(year, month, d, idx)}
                        >
                          <div
                            className={`min-w-0 cursor-pointer rounded px-2 py-0.5 text-left text-xs font-medium text-white transition-opacity hover:opacity-90 ${getNoteBg(item.color)} ${item.isSchedule ? "flex items-center gap-1" : ""}`}
                          >
                            {item.isSchedule && (
                              <CalendarCheckIcon size={12} weight="bold" className="shrink-0" />
                            )}
                            <span className="truncate">
                              {item.text}
                            </span>
                          </div>
                        </NotePopover>
                      ))}
                      {overflowCount > 0 && (
                        <div className="text-xs font-medium text-white/70">
                          +{overflowCount} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex shrink-0 flex-col gap-3 rounded-lg border border-emerald-700 bg-emerald-950/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecksIcon
              size={18}
              weight="duotone"
              className="text-white"
            />
            <h4 className="text-sm font-semibold text-white">
              Schedule &amp; reminders — {MONTHS[month]} {year}
            </h4>
          </div>
          <ScheduleOnlyToggleButton
            scheduleOnly={scheduleOnly}
            onToggle={() => setScheduleOnly((v) => !v)}
          />
        </div>
        {totalSchedules === 0 ? (
          <p className="py-2 text-xs text-white/70">
            No notes or reminders yet. Click the + on any date to add one.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["nearest", "normal", "farthest"] as const).map((bucket) => {
              const entries = monthNotesByBucket[bucket];
              const label =
                bucket === "nearest"
                  ? "Nearest"
                  : bucket === "normal"
                    ? "Normal"
                    : "Farthest";
              return (
                <div
                  key={bucket}
                  className="flex flex-col rounded-lg border border-emerald-700 bg-emerald-900/50 p-3"
                >
                  <p
                    className={`mb-2 text-xs font-semibold uppercase tracking-wider ${
                      bucket === "nearest"
                        ? "text-white"
                        : "text-white/70"
                    }`}
                  >
                    {label}
                  </p>
                  <div className="max-h-36 space-y-3 overflow-y-auto">
                    {entries.length === 0 ? (
                      <p className="py-2 text-xs text-white/50">—</p>
                    ) : (
                      <>
                        {entries.flatMap(({ day, items }) =>
                          items.map((item, i) => {
                            const progress = getProgress(day);
                            const daysUntil = getDaysUntil(day);
                            const progressLabel =
                              daysUntil < 0
                                ? "Overdue"
                                : daysUntil === 0
                                  ? "Today"
                                  : daysUntil === 1
                                    ? "Tomorrow"
                                    : daysUntil <= 31
                                      ? `${daysUntil} days`
                                      : `${Math.round(daysUntil / 30)} mo`;
                            return (
                              <div
                                key={`${day}-${i}`}
                                className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-medium text-white/70">
                                    {MONTHS[month]} {day}
                                  </p>
                                  <span
                                    className={`text-[10px] font-medium ${
                                      daysUntil <= 0
                                        ? "text-amber-400"
                                        : daysUntil <= 3
                                          ? "text-emerald-400"
                                          : "text-white/50"
                                    }`}
                                  >
                                    {progressLabel}
                                  </span>
                                </div>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-800">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      progress <= 0
                                        ? "bg-amber-500"
                                        : progress < 50
                                          ? "bg-amber-400"
                                          : progress < 80
                                            ? "bg-emerald-500"
                                            : "bg-emerald-400"
                                    }`}
                                    style={{
                                      width: `${progress <= 0 ? 5 : Math.min(100, progress)}%`,
                                    }}
                                  />
                                </div>
                                <p className="mt-1.5 flex items-center gap-2 text-sm text-white">
                                  {item.isSchedule ? (
                                    <CalendarCheckIcon size={14} weight="bold" className="shrink-0 text-white" />
                                  ) : (
                                    <span
                                      className={`h-2 w-2 shrink-0 rounded-full ${getNoteBg(item.color)}`}
                                      aria-hidden
                                    />
                                  )}
                                  {item.text}
                                </p>
                              </div>
                            );
                          }),
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </div>

      {addModalDate && (
        <MasonryModal
          isOpen={!!addModalDate}
          onClose={() => setAddModalDate(null)}
        >
          {(close) => (
            <div className="rounded-2xl border border-white/40 bg-emerald-900 p-6 shadow-xl">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/40 bg-white/10 text-white">
                  <NotePencilIcon size={22} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white">
                    Add note — {MONTHS[addModalDate.month]} {addModalDate.day},{" "}
                    {addModalDate.year}
                  </h3>
                  <p className="mt-0.5 text-sm text-white/70">
                    Add a note or reminder for this date. Choose a color to
                    categorize it.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="absolute right-4 top-4 rounded p-1 text-white/70 hover:bg-white/20 hover:text-white"
                aria-label="Close"
              >
                <XIcon size={18} weight="bold" />
              </button>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Note or reminder..."
                rows={3}
                className="w-full resize-none rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                autoFocus
              />
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-white/70">Color</p>
                <div
                  className="columns-2 gap-2 sm:columns-3 lg:columns-4"
                  style={{ columnFill: "balance" } as React.CSSProperties}
                >
                  {NOTE_COLORS.map(({ id, pickerBg, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedColor(id)}
                      className={`mb-2 flex w-full items-center justify-center rounded-lg border-2 p-2.5 transition break-inside-avoid ${
                        selectedColor === id
                          ? "border-white bg-white/30"
                          : "border-white/40 bg-white/5 hover:border-white/60 hover:bg-white/10"
                      }`}
                      aria-label={`Select ${id} color`}
                      aria-pressed={selectedColor === id}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${pickerBg} text-white`}
                      >
                        <Icon size={18} weight="duotone" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-white/40 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim()}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </MasonryModal>
      )}
    </section>
  );
}
