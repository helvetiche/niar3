"use client";

import { useEffect, useState } from "react";
import { CaretLeftIcon, CaretRightIcon, PlusIcon, XIcon } from "@phosphor-icons/react";

const NOTES_KEY = "workspace_calendar_notes";

function loadNotes(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveNotes(notes: Record<string, string[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {}
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WorkspaceCalendar() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [notes, setNotes] = useState<Record<string, string[]>>({});
  const [addModalDate, setAddModalDate] = useState<{ year: number; month: number; day: number } | null>(null);
  const [newNoteText, setNewNoteText] = useState("");

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  const getNotesFor = (year: number, month: number, day: number) => {
    const key = dateKey(year, month, day);
    return notes[key] ?? [];
  };

  const addNote = (year: number, month: number, day: number, text: string) => {
    const key = dateKey(year, month, day);
    const updated = { ...notes, [key]: [...getNotesFor(year, month, day), text.trim()].filter(Boolean) };
    setNotes(updated);
    saveNotes(updated);
    setNewNoteText("");
    setAddModalDate(null);
  };

  const openAddModal = (year: number, month: number, day: number) => {
    setAddModalDate({ year, month, day });
    setNewNoteText("");
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date();

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  const dates: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) dates.push(null);
  for (let d = 1; d <= daysInMonth; d++) dates.push(d);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border-2 border-dashed border-zinc-300 bg-white p-6 shadow-sm">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-800">
          {MONTHS[month]} {year}
        </h2>
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
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,1fr)] gap-px text-center">
        {DAYS.map((d) => (
          <div key={d} className="flex items-center justify-center py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            {d}
          </div>
        ))}
        {dates.map((d, i) => {
          if (d === null) {
            return (
              <div
                key={`empty-${i}`}
                className="rounded-md border border-dashed border-zinc-100 p-2"
              />
            );
          }
          const isToday =
            today.getDate() === d &&
            today.getMonth() === month &&
            today.getFullYear() === year;
          const cellNotes = getNotesFor(year, month, d);
          return (
            <div
              key={d}
              className={`relative flex flex-col overflow-visible rounded-md p-2 text-sm ${
                isToday
                  ? "border-2 border-dashed border-emerald-600 bg-emerald-50 font-semibold text-emerald-700"
                  : "border border-dashed border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <div className="flex justify-end">{d}</div>
              <div className="group absolute bottom-2 left-2">
                <button
                  type="button"
                  onClick={() => openAddModal(year, month, d)}
                  className="rounded-md p-1 text-zinc-400 transition hover:bg-white/60 hover:text-zinc-700"
                  aria-label={`Add note for ${MONTHS[month]} ${d}`}
                >
                  <PlusIcon size={14} weight="bold" />
                </button>
                <div className="pointer-events-none invisible absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-800 px-2 py-1.5 text-xs font-medium text-white shadow-lg group-hover:visible">
                  Add note or reminder for this date
                </div>
              </div>
              {cellNotes.length > 0 && (
                <span className="absolute bottom-2 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-medium text-white">
                  {cellNotes.length}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {addModalDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAddModalDate(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border-2 border-dashed border-zinc-300 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-800">
                Add note — {MONTHS[addModalDate.month]} {addModalDate.day}, {addModalDate.year}
              </h3>
              <button
                type="button"
                onClick={() => setAddModalDate(null)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Note or reminder..."
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddModalDate(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addNote(addModalDate.year, addModalDate.month, addModalDate.day, newNoteText)}
                disabled={!newNoteText.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
