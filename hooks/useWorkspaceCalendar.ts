import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  fetchCalendarNotes,
  saveCalendarNotesForDate,
} from "@/lib/api/calendar-notes";

export type NoteItem = { text: string; color: string };

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

type TrayBucket = "nearest" | "normal" | "farthest";

export const useWorkspaceCalendar = (uid: string) => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [notes, setNotes] = useState<Record<string, NoteItem[]>>({});
  const [scheduleOnly, setScheduleOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCalendarNotes()
      .then((data) => {
        if (!cancelled) setNotes(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load notes",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

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
      if (onSuccess) onSuccess();
      toast.success("Note saved");
    } catch {
      setNotes(notes);
      toast.error("Failed to save note");
    }
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

  const prevMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  const goToToday = () => setViewDate(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const getDaysUntil = (day: number) => {
    const isViewingCurrentMonth =
      viewDate.getFullYear() === today.getFullYear() &&
      viewDate.getMonth() === today.getMonth();

    if (!isViewingCurrentMonth) {
      const noteDate = new Date(year, month, day);
      const diff = Math.ceil(
        (noteDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );
      return diff;
    }
    return day - today.getDate();
  };

  const getProgress = (day: number) => {
    const daysUntil = getDaysUntil(day);
    if (daysUntil <= 0) return 0;
    const maxDays = 60;
    return Math.max(0, Math.min(100, Math.round(100 * (daysUntil / maxDays))));
  };

  const getBucket = (day: number): TrayBucket => {
    const daysUntil = getDaysUntil(day);
    if (daysUntil <= 3) return "nearest";
    if (daysUntil <= 14) return "normal";
    return "farthest";
  };

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

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

  const calendarDates = (() => {
    const startPad = firstDay.getDay();
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
    return dates;
  })();

  return {
    viewDate,
    year,
    month,
    today,
    notes,
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
  };
};
