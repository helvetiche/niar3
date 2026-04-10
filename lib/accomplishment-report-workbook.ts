import XlsxPopulate from "xlsx-populate";
import type {
  AccomplishmentReportPeriod,
  AccomplishmentReportPeriodFilter,
} from "./accomplishment-report-period";
import {
  getStartDay,
  getEndDay,
  formatPeriodLabel,
  getTaskForDay,
  getSheetNameForPeriod,
} from "./accomplishment-report-helpers";

export type { AccomplishmentReportPeriod, AccomplishmentReportPeriodFilter };

export type AccomplishmentReportWorkbookInput = {
  templateBuffer: Buffer;
  fullName: string;
  designation: string;
  period: AccomplishmentReportPeriod;
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
  period: AccomplishmentReportPeriod,
  customTasks?: string[]
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
    const row2 = rowBase + 1;
    const dayRef = `A${rowBase}`;
    const taskRef1 = `B${rowBase}`;
    const taskRef2 = `B${row2}`;

    sheet.cell(dayRef).value(dayNum);

    const task = getTaskForDay(
      period.year,
      period.month,
      dayNum,
      designation,
      customTasks
    );
    if (task.type === "double") {
      sheet.cell(taskRef1).value(`${task.line1}\n${task.line2}`);
    } else {
      sheet.cell(taskRef1).value(task.value);
      if (designation === "WRFOB") {
        sheet.cell(taskRef2).value("");
      }
    }
  }
};

export const generateSingleAccomplishmentReportBuffer = async (
  input: AccomplishmentReportWorkbookInput
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

export const getAllAccomplishmentReportPeriods = (
  year: number
): AccomplishmentReportPeriod[] => {
  const periods: AccomplishmentReportPeriod[] = [];
  for (let month = 1; month <= 12; month += 1) {
    periods.push({ year, month, half: 1 });
    periods.push({ year, month, half: 2 });
  }
  return periods;
};

export const getFilteredAccomplishmentReportPeriods = (
  year: number,
  filter: AccomplishmentReportPeriodFilter
): AccomplishmentReportPeriod[] => {
  const all = getAllAccomplishmentReportPeriods(year);
  const monthSet = new Set(filter.months);
  return all.filter((p) => {
    if (!monthSet.has(p.month)) return false;
    if (p.half === 1 && !filter.includeFirstHalf) return false;
    if (p.half === 2 && !filter.includeSecondHalf) return false;
    return true;
  });
};

/**
 * Merged accomplishment report workbook: one sheet per selected quincena period.
 * Uses xlsx-populate to preserve template styling.
 */
export const generateMergedAccomplishmentReportWorkbook = async (
  templateBuffer: Buffer,
  fullName: string,
  designation: string,
  year: number,
  filter?: AccomplishmentReportPeriodFilter,
  customTasks?: string[]
): Promise<Buffer> => {
  const workbook = await XlsxPopulate.fromDataAsync(templateBuffer);
  let templateSheet: ReturnType<typeof workbook.sheet>;
  try {
    templateSheet = workbook.sheet("TEMPLATE");
  } catch {
    templateSheet = workbook.sheet(0);
  }

  const periods = filter
    ? getFilteredAccomplishmentReportPeriods(year, filter)
    : getAllAccomplishmentReportPeriods(year);

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
