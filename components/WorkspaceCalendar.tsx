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
import {
  fetchCalendarNotes,
  saveCalendarNotesForDate,
} from "@/lib/api/calendar-notes";
import { MasonryModal } from "@/components/MasonryModal";
import { AddNoteTooltip } from "@/components/AddNoteTooltip";
import { NotePopover } from "@/components/NotePopover";
import { ScheduleOnlyToggleButton } from "@/components/ScheduleOnlyToggleButton";
import { ScheduleOnlyView } from "@/components/ScheduleOnlyView";
import { NOTE_COLORS, getNoteBg } from "@/lib/note-colors";

export type NoteItem = { text: string; color: string };

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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
  const [viewDate, setViewDate] = useState(() => new Date());
  const [notes, setNotes] = useState<Record<string, NoteItem[]>>({});
  const [addModalDate, setAddModalDate] = useState<{
    year: number;
    month: number;
    day: number;
  } | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState("emerald");
  const [scheduleOnly, setScheduleOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCalendarNotes()
      .then((data) => {
        if (!cancelled) setNotes(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load notes");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  const getNotesFor = (year: number, month: number, day: number) => {
    const key = dateKey(year, month, day);
    return notes[key] ?? [];
  };

  const addNote = async (
    year: number,
    month: number,
    day: number,
    text: string,
    color: string,
    onSuccess?: () => void,
  ) => {
    const key = dateKey(year, month, day);
    const trimmed = text.trim();
    if (!trimmed) return;
    const items = [...getNotesFor(year, month, day), { text: trimmed, color }];
    const updated = { ...notes, [key]: items };
    setNotes(updated);
    try {
      await saveCalendarNotesForDate(key, items);
      setNewNoteText("");
      if (onSuccess) onSuccess();
      else setAddModalDate(null);
      toast.success("Note saved");
    } catch {
      setNotes(notes);
      toast.error("Failed to save note");
    }
  };

  const openAddModal = (year: number, month: number, day: number) => {
    setAddModalDate({ year, month, day });
    setNewNoteText("");
    setSelectedColor("emerald");
  };

  const removeNote = async (
    year: number,
    month: number,
    day: number,
    index: number,
  ) => {
    const key = dateKey(year, month, day);
    const items = getNotesFor(year, month, day).filter((_, i) => i !== index);
    const updated = { ...notes, [key]: items };
    setNotes(updated);
    try {
      await saveCalendarNotesForDate(key, items);
      toast.success("Note removed");
    } catch {
      setNotes(notes);
      toast.error("Failed to remove note");
    }
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date();

  const prevMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const dates: { day: number; isCurrentMonth: boolean }[] = [];
  const totalCells = 42;
  for (let i = 0; i < totalCells; i++) {
    if (i < startPad) {
      dates.push({
        day: prevMonthLastDay - startPad + 1 + i,
        isCurrentMonth: false,
      });
    } else if (i < startPad + daysInMonth) {
      dates.push({ day: i - startPad + 1, isCurrentMonth: true });
    } else {
      dates.push({
        day: i - startPad - daysInMonth + 1,
        isCurrentMonth: false,
      });
    }
  }

  const todayDay = today.getDate();
  const isViewingCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();

  const getDaysUntil = (day: number) => {
    if (!isViewingCurrentMonth) {
      const noteDate = new Date(year, month, day);
      const diff = Math.ceil(
        (noteDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );
      return diff;
    }
    return day - todayDay;
  };

  const getProgress = (day: number) => {
    const daysUntil = getDaysUntil(day);
    if (daysUntil <= 0) return 0;
    const maxDays = 60;
    return Math.max(0, Math.min(100, Math.round(100 * (daysUntil / maxDays))));
  };

  type TrayBucket = "nearest" | "normal" | "farthest";
  const getBucket = (day: number): TrayBucket => {
    const daysUntil = getDaysUntil(day);
    if (daysUntil <= 3) return "nearest";
    if (daysUntil <= 14) return "normal";
    return "farthest";
  };

  const monthNotesByBucket = (() => {
    const nearest: { day: number; items: NoteItem[] }[] = [];
    const normal: { day: number; items: NoteItem[] }[] = [];
    const farthest: { day: number; items: NoteItem[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const items = getNotesFor(year, month, d);
      if (items.length > 0) {
        const entry = { day: d, items };
        const bucket = getBucket(d);
        if (bucket === "nearest") nearest.push(entry);
        else if (bucket === "normal") normal.push(entry);
        else farthest.push(entry);
      }
    }
    return { nearest, normal, farthest };
  })();

  const totalSchedules =
    monthNotesByBucket.nearest.reduce((s, { items }) => s + items.length, 0) +
    monthNotesByBucket.normal.reduce((s, { items }) => s + items.length, 0) +
    monthNotesByBucket.farthest.reduce((s, { items }) => s + items.length, 0);

  const scheduleOnlyItems = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .flatMap((day) =>
      getNotesFor(year, month, day).map((note, index) => ({
        id: `${day}-${index}`,
        day,
        note,
        daysUntil: getDaysUntil(day),
        progress: getProgress(day),
      })),
    )
    .sort((a, b) => a.daysUntil - b.daysUntil || a.day - b.day);
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
            onClick={() => setViewDate(new Date())}
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
          {dates.map(({ day: d, isCurrentMonth }, i) => {
            const isToday =
              isCurrentMonth &&
              today.getDate() === d &&
              today.getMonth() === month &&
              today.getFullYear() === year;
            const cellNotes = isCurrentMonth ? getNotesFor(year, month, d) : [];
            const visibleNotes = cellNotes.slice(0, MAX_VISIBLE_NOTES);
            const overflowCount = cellNotes.length - MAX_VISIBLE_NOTES;

            return (
              <div
                key={`${isCurrentMonth ? "cur" : "other"}-${d}-${i}`}
                className={`relative flex min-h-[80px] flex-col overflow-hidden rounded-md p-2 text-sm ${
                  !isCurrentMonth
                    ? "border border-dashed border-zinc-100 bg-zinc-50/50 text-red-400"
                    : isToday
                      ? "border-2 border-dashed border-emerald-600 bg-emerald-50"
                      : "border border-dashed border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div className="flex justify-end">
                  {isToday ? (
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
                  onClick={() =>
                    addNote(
                      addModalDate.year,
                      addModalDate.month,
                      addModalDate.day,
                      newNoteText,
                      selectedColor,
                      close,
                    )
                  }
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
