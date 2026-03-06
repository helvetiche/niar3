"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  CaretLeftIcon,
  CaretRightIcon,
  ListChecksIcon,
  NotePencilIcon,
  PlusIcon,
  XIcon,
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

export function WorkspaceCalendar() {
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

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border-2 border-dashed border-zinc-300 bg-white p-6 shadow-sm">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 rounded-lg border-2 border-dashed border-zinc-300 p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Previous month"
            >
              <CaretLeftIcon size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Next month"
            >
              <CaretRightIcon size={18} weight="bold" />
            </button>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-800">
            {MONTHS[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {totalSchedules} schedule{totalSchedules === 1 ? "" : "s"} this
            month
          </span>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
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
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,1fr)] gap-px text-center">
          {DAYS.map((d) => (
            <div
              key={d}
              className="flex items-center justify-center py-2 text-xs font-medium uppercase tracking-wider text-zinc-500"
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
                className={`relative flex min-h-[80px] flex-col overflow-hidden rounded-md p-2 text-sm ${
                  !isCurrentMonth
                    ? "border border-dashed border-zinc-100 bg-zinc-50/50 text-red-400"
                    : isToday(d)
                      ? "border-2 border-dashed border-emerald-600 bg-emerald-50"
                      : "border border-dashed border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div className="flex justify-end">
                  {isToday(d) ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                      {d}
                    </span>
                  ) : (
                    <span className={!isCurrentMonth ? "text-red-400/80" : ""}>
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
                            className={`min-w-0 cursor-pointer truncate rounded px-2 py-0.5 text-left text-xs font-medium text-white transition-opacity hover:opacity-90 ${getNoteBg(item.color)}`}
                          >
                            {item.text.length > 12
                              ? `${item.text.slice(0, 10)}…`
                              : item.text}
                          </div>
                        </NotePopover>
                      ))}
                      {overflowCount > 0 && (
                        <div className="text-xs font-medium text-zinc-500">
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

      <div className="mt-4 flex shrink-0 flex-col gap-3 rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecksIcon
              size={18}
              weight="duotone"
              className="text-zinc-600"
            />
            <h3 className="text-sm font-semibold text-zinc-800">
              Schedule &amp; reminders — {MONTHS[month]} {year}
            </h3>
          </div>
          <ScheduleOnlyToggleButton
            scheduleOnly={scheduleOnly}
            onToggle={() => setScheduleOnly((v) => !v)}
          />
        </div>
        {totalSchedules === 0 ? (
          <p className="py-2 text-xs text-zinc-500">
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
                  className="flex flex-col rounded-lg border border-dashed border-zinc-200 bg-white p-3"
                >
                  <p
                    className={`mb-2 text-xs font-semibold uppercase tracking-wider ${
                      bucket === "nearest"
                        ? "text-emerald-700"
                        : "text-zinc-500"
                    }`}
                  >
                    {label}
                  </p>
                  <div className="max-h-36 space-y-3 overflow-y-auto">
                    {entries.length === 0 ? (
                      <p className="py-2 text-xs text-zinc-400">—</p>
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
                                className="rounded-lg border border-dashed border-zinc-100 bg-zinc-50/50 px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-medium text-zinc-500">
                                    {MONTHS[month]} {day}
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
                                    {progressLabel}
                                  </span>
                                </div>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
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
                                <p className="mt-1.5 flex items-center gap-2 text-sm text-zinc-800">
                                  <span
                                    className={`h-2 w-2 shrink-0 rounded-full ${getNoteBg(item.color)}`}
                                    aria-hidden
                                  />
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

      {addModalDate && (
        <MasonryModal
          isOpen={!!addModalDate}
          onClose={() => setAddModalDate(null)}
        >
          {(close) => (
            <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-white">
                  <NotePencilIcon size={22} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-zinc-800">
                    Add note — {MONTHS[addModalDate.month]} {addModalDate.day},{" "}
                    {addModalDate.year}
                  </h3>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Add a note or reminder for this date. Choose a color to
                    categorize it.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="absolute right-4 top-4 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close"
              >
                <XIcon size={18} weight="bold" />
              </button>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Note or reminder..."
                rows={3}
                className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-zinc-500">Color</p>
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
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
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
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </MasonryModal>
      )}
    </div>
  );
}
