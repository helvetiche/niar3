import type { SwrftPeriod } from "./swrftGenerator";

export const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

const WEEKDAY_TASK =
  "SUPERVISED WRFOB, WATER DISTRIBUTION, AREA MONITORING, FIELD INSPECTION ATTEND IA MEETING and OTHER O&M ACTIVITIES";

const WRFO_B_TASK_LINE_1 =
  "FIELD INSPECTION , ASSIST SWRFT IN AREA MONITORING,";
const WRFO_B_TASK_LINE_2 = "REMOVING OF DEBRIS AND OTHER O&M ACTIVITIES";

export const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

export const getStartDay = (period: SwrftPeriod): number =>
  period.half === 1 ? 1 : 16;

export const getEndDay = (period: SwrftPeriod): number => {
  const lastDay = getDaysInMonth(period.year, period.month);
  return period.half === 1 ? 15 : Math.min(lastDay, 31);
};

export const formatPeriodLabel = (period: SwrftPeriod): string => {
  const monthName = MONTH_NAMES[period.month - 1];
  const start = getStartDay(period);
  const end = getEndDay(period);
  return `PERIOD COVERED ${monthName} ${start}-${end}, ${period.year}`;
};

export const getDayOfWeek = (year: number, month: number, day: number): number =>
  new Date(year, month - 1, day).getDay();

export type TaskForDayResult =
  | { type: "single"; value: string }
  | { type: "double"; line1: string; line2: string };

export const getTaskForDay = (
  year: number,
  month: number,
  day: number,
  designation: string,
  customTasks?: string[],
): TaskForDayResult => {
  const dow = getDayOfWeek(year, month, day);
  const weekendLabel = dow === 0 ? "Sunday" : dow === 6 ? "Saturday" : null;

  const weekdayTask =
    customTasks &&
    customTasks.length > 0 &&
    customTasks.some((t) => typeof t === "string" && t.trim())
      ? customTasks
          .filter((t) => typeof t === "string" && t.trim())
          .map((t) => (t as string).trim())
          .join(", ")
      : null;

  if (designation === "WRFOB") {
    if (weekendLabel) {
      return { type: "single", value: weekendLabel };
    }
    if (weekdayTask) {
      return {
        type: "single",
        value: weekdayTask.toUpperCase(),
      };
    }
    return {
      type: "double",
      line1: WRFO_B_TASK_LINE_1,
      line2: WRFO_B_TASK_LINE_2,
    };
  }

  if (weekendLabel) {
    return { type: "single", value: weekendLabel };
  }
  if (weekdayTask) {
    return { type: "single", value: weekdayTask.toUpperCase() };
  }
  return { type: "single", value: WEEKDAY_TASK };
};

export const getSheetNameForPeriod = (period: SwrftPeriod): string => {
  const monthName = MONTH_NAMES[period.month - 1];
  const start = getStartDay(period);
  const end = getEndDay(period);
  return `${monthName} ${start}-${end}, ${period.year}`;
};
