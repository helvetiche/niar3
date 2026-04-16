import type { ScheduleDeadlineType, TaskCompletion } from "@/types/schedule";

/** Local calendar day key (YYYY-MM-DD) from an ISO timestamp, using the viewer's timezone. */
export const completionLocalDayKey = (completedAtIso: string): string => {
  const d = new Date(completedAtIso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Completions whose `completedAt` falls in the given local calendar month (month is 0–11). */
export const completionsInLocalMonth = (
  completions: TaskCompletion[],
  year: number,
  monthIndex: number
): TaskCompletion[] => {
  return completions.filter((c) => {
    const d = new Date(c.completedAt);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });
};

/**
 * Groups completions by local calendar day; each day's list is sorted by completion time ascending.
 */
export const groupCompletionsByLocalDaySorted = (
  completions: TaskCompletion[]
): Array<{ dayKey: string; items: TaskCompletion[] }> => {
  const map = new Map<string, TaskCompletion[]>();
  for (const c of completions) {
    const key = completionLocalDayKey(c.completedAt);
    const list = map.get(key) ?? [];
    list.push(c);
    map.set(key, list);
  }
  const entries = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [, items] of entries) {
    items.sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
  }
  return entries.map(([dayKey, items]) => ({ dayKey, items }));
};

/** Separator unlikely to appear in schedule IDs or ISO timestamps. */
const PERIOD_KEY_SEP = "\u001e";

export const completionPeriodKey = (
  scheduleId: string,
  periodStart: string,
  periodEnd: string
): string =>
  `${scheduleId}${PERIOD_KEY_SEP}${periodStart}${PERIOD_KEY_SEP}${periodEnd}`;

/**
 * O(m) build, O(1) lookup — replaces per-schedule completions.find (O(n×m)).
 */
export const buildCompletionLookup = (
  completions: TaskCompletion[]
): Map<string, TaskCompletion> => {
  const map = new Map<string, TaskCompletion>();
  for (const c of completions) {
    map.set(completionPeriodKey(c.scheduleId, c.periodStart, c.periodEnd), c);
  }
  return map;
};

/** Single pass over schedules instead of four separate filters. */
export const groupActiveTasksByDeadlineType = <
  T extends { id: string; status: string; deadline: { type: ScheduleDeadlineType } },
>(
  tasks: T[]
): Array<{ type: string; label: string; tasks: T[] }> => {
  const daily: T[] = [];
  const weekly: T[] = [];
  const monthly: T[] = [];
  const other: T[] = [];

  for (const t of tasks) {
    const kind = t.deadline.type;
    if (kind === "daily") {
      daily.push(t);
    } else if (kind === "weekly") {
      weekly.push(t);
    } else if (kind === "monthly") {
      monthly.push(t);
    } else {
      other.push(t);
    }
  }

  return [
    { type: "daily", label: "Daily Tasks", tasks: daily },
    { type: "weekly", label: "Weekly Tasks", tasks: weekly },
    { type: "monthly", label: "Monthly Tasks", tasks: monthly },
    { type: "other", label: "Other Tasks", tasks: other },
  ].filter((g) => g.tasks.length > 0);
};
