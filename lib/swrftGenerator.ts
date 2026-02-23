import XlsxPopulate from "xlsx-populate";

const MONTH_NAMES = [
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

export type SwrftPeriod = {
  year: number;
  month: number;
  /** 1 = first half (1-15), 2 = second half (16-end) */
  half: 1 | 2;
};

export type SwrftGeneratorInput = {
  templateBuffer: Buffer;
  fullName: string;
  designation: string;
  period: SwrftPeriod;
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

const getStartDay = (period: SwrftPeriod): number =>
  period.half === 1 ? 1 : 16;

const getEndDay = (period: SwrftPeriod): number => {
  const lastDay = getDaysInMonth(period.year, period.month);
  return period.half === 1 ? 15 : Math.min(lastDay, 31);
};

const formatPeriodLabel = (period: SwrftPeriod): string => {
  const monthName = MONTH_NAMES[period.month - 1];
  const start = getStartDay(period);
  const end = getEndDay(period);
  return `PERIOD COVERED ${monthName} ${start}-${end}, ${period.year}`;
};

const getDayOfWeek = (year: number, month: number, day: number): number =>
  new Date(year, month - 1, day).getDay();

type TaskForDayResult =
  | { type: "single"; value: string }
  | { type: "double"; line1: string; line2: string };

const getTaskForDay = (
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
      return { type: "double", line1: weekendLabel, line2: weekendLabel };
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

interface SheetLike {
  cell: (ref: string) => {
    value: (v: string | number) => unknown;
    style?: (name: string, value: string) => unknown;
  };
}

const populateSheetForPeriod = (
  sheet: SheetLike,
  fullName: string,
  designation: string,
  period: SwrftPeriod,
  customTasks?: string[],
): void => {
  sheet.cell("A6").value(formatPeriodLabel(period));
  const a6Cell = sheet.cell("A6");
  if (a6Cell.style) {
    a6Cell.style("horizontalAlignment", "center");
  }

  sheet.cell("B7").value(fullName);
  sheet.cell("B8").value(designation);

  const startDay = getStartDay(period);
  const endDay = getEndDay(period);
  const dayCount = endDay - startDay + 1;

  for (let i = 0; i < dayCount; i += 1) {
    const dayNum = startDay + i;
    const rowBase = 11 + i * 2;
    const dayRef = `A${rowBase}`;
    const taskRef = `B${rowBase}`;

    sheet.cell(dayRef).value(dayNum);

    const task = getTaskForDay(
      period.year,
      period.month,
      dayNum,
      designation,
      customTasks,
    );
    if (task.type === "double") {
      sheet.cell(taskRef).value(`${task.line1}\n${task.line2}`);
    } else {
      sheet.cell(taskRef).value(task.value);
    }
  }
};

export const generateSingleSwrftBuffer = async (
  input: SwrftGeneratorInput,
): Promise<Buffer> => {
  const workbook = await XlsxPopulate.fromDataAsync(input.templateBuffer);
  let sheet: ReturnType<typeof workbook.sheet>;
  try {
    sheet = workbook.sheet("TEMPLATE");
  } catch {
    sheet = workbook.sheet(0);
  }

  const { fullName, designation, period } = input;
  populateSheetForPeriod(sheet, fullName, designation, period);

  const output = await workbook.outputAsync();
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
};

export const getAllSwrftPeriods = (year: number): SwrftPeriod[] => {
  const periods: SwrftPeriod[] = [];
  for (let month = 1; month <= 12; month += 1) {
    periods.push({ year, month, half: 1 });
    periods.push({ year, month, half: 2 });
  }
  return periods;
};

export type SwrftPeriodFilter = {
  months: number[];
  includeFirstHalf: boolean;
  includeSecondHalf: boolean;
};

export const getFilteredSwrftPeriods = (
  year: number,
  filter: SwrftPeriodFilter,
): SwrftPeriod[] => {
  const all = getAllSwrftPeriods(year);
  const monthSet = new Set(filter.months);
  return all.filter((p) => {
    if (!monthSet.has(p.month)) return false;
    if (p.half === 1 && !filter.includeFirstHalf) return false;
    if (p.half === 2 && !filter.includeSecondHalf) return false;
    return true;
  });
};

export const getSheetNameForPeriod = (period: SwrftPeriod): string => {
  const monthName = MONTH_NAMES[period.month - 1].slice(0, 3);
  const start = getStartDay(period);
  const end = getEndDay(period);
  return `${monthName} ${start}-${end}`;
};

/**
 * Generates a merged SWRFT workbook with selected periods as sheets.
 * Uses xlsx-populate exclusively to preserve template styling (logos, headers,
 * footers, formatting) - ExcelJS merge was stripping these.
 * @param customTasks - Optional list of task labels to use for weekdays instead of default
 */
export const generateMergedSwrftWorkbook = async (
  templateBuffer: Buffer,
  fullName: string,
  designation: string,
  year: number,
  filter?: SwrftPeriodFilter,
  customTasks?: string[],
): Promise<Buffer> => {
  const workbook = await XlsxPopulate.fromDataAsync(templateBuffer);
  let templateSheet: ReturnType<typeof workbook.sheet>;
  try {
    templateSheet = workbook.sheet("TEMPLATE");
  } catch {
    templateSheet = workbook.sheet(0);
  }

  const periods = filter
    ? getFilteredSwrftPeriods(year, filter)
    : getAllSwrftPeriods(year);

  for (let i = 0; i < periods.length; i += 1) {
    const period = periods[i];
    const sheetName = getSheetNameForPeriod(period);

    let sheet: ReturnType<typeof workbook.sheet>;
    if (i === 0) {
      templateSheet.name(sheetName);
      sheet = templateSheet;
    } else {
      sheet = workbook.cloneSheet(templateSheet, sheetName);
    }

    populateSheetForPeriod(sheet, fullName, designation, period, customTasks);
  }

  const output = await workbook.outputAsync();
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
};
