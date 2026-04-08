import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";
import {
  fetchCalendarNotes,
  saveCalendarNotesForDate,
} from "@/lib/api/calendar-notes";
import type { Schedule } from "@/types/schedule";
import { calculateNextDeadline } from "@/lib/deadline-calculator";

export type NoteItem = { text: string; color: string; isSchedule?: boolean; scheduleId?: string };

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

type TrayBucket = "nearest" | "normal" | "farthest";

const scheduleFetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch schedules");
  return response.json();
};

export const useWorkspaceCalendar = (uid: string) => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [notes, setNotes] = useState<Record<string, NoteItem[]>>({});
  const [scheduleOnly, setScheduleOnly] = useState(false);

  // Fetch all schedules (no pagination for calendar view)
  const { data: schedulesData } = useSWR<{ schedules: Schedule[] }>(
    "/api/v1/schedules?page=1&limit=1000",
    scheduleFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

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
    const userNotes = notes[key] ?? [];
    
    // Add schedule deadlines for this date
    const scheduleNotes: NoteItem[] = [];
    if (schedulesData?.schedules) {
      const targetDate = new Date(year, month, day);
      
      schedulesData.schedules.forEach((schedule) => {
        if (schedule.status !== "active") return;
        
        // Check if this schedule has a deadline on this specific date
        if (scheduleMatchesDate(schedule, targetDate)) {
          scheduleNotes.push({
            text: schedule.title,
            color: "schedule", // Use special schedule color
            isSchedule: true,
            scheduleId: schedule.id,
          });
        }
      });
    }
    
    return [...userNotes, ...scheduleNotes];
  };

  // Helper function to check if a schedule has a deadline on a specific date
  const scheduleMatchesDate = (schedule: Schedule, targetDate: Date): boolean => {
    const { deadline } = schedule;
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();
    const targetDayOfWeek = targetDate.getDay();

    switch (deadline.type) {
      case "daily": {
        // Daily schedules occur every day
        return true;
      }

      case "weekly": {
        // Weekly schedules occur on specific day of week
        const scheduleDayOfWeek = deadline.dayOfWeek ?? 0;
        return targetDayOfWeek === scheduleDayOfWeek;
      }

      case "monthly": {
        // Monthly schedules occur on specific day of month
        const scheduleDayOfMonth = deadline.dayOfMonth ?? 1;
        return targetDay === scheduleDayOfMonth;
      }

      case "monthly-specific": {
        // Yearly schedules occur on specific month and day
        const scheduleMonth = (deadline.month ?? 1) - 1; // 0-indexed
        const scheduleDay = deadline.day ?? 1;
        return targetMonth === scheduleMonth && targetDay === scheduleDay;
      }

      case "interval": {
        // Interval schedules occur every N days from creation date
        const intervalDays = deadline.days ?? 1;
        const createdAt = new Date(schedule.createdAt);
        const daysSinceCreation = Math.floor(
          (targetDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceCreation >= 0 && daysSinceCreation % intervalDays === 0;
      }

      case "hourly": {
        // Hourly schedules occur every day (multiple times per day)
        return true;
      }

      case "per-minute": {
        // Per-minute schedules occur every day (multiple times per day)
        return true;
      }

      case "custom": {
        // Custom schedules - calculate next deadline and check if it matches
        const nextDeadline = calculateNextDeadline(deadline, targetDate);
        return (
          nextDeadline.getFullYear() === targetYear &&
          nextDeadline.getMonth() === targetMonth &&
          nextDeadline.getDate() === targetDay
        );
      }

      default:
        return false;
    }
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
    const allItems = getNotesFor(year, month, day);
    const itemToRemove = allItems[index];
    
    // Prevent removing schedule notes
    if (itemToRemove?.isSchedule) {
      toast.error("Cannot remove schedule deadlines from calendar");
      return;
    }
    
    // Only remove user notes
    const userNotes = notes[key] ?? [];
    const items = userNotes.filter((_, i) => i !== index);
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
