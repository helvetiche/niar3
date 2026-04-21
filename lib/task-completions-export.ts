import ExcelJS from "exceljs";
import type { TaskCompletion } from "@/types/schedule";

type MonthBucket = {
  year: number;
  monthIndex: number;
  items: TaskCompletion[];
};

type DayBucket = {
  dayKey: string;
  dayDate: Date;
  items: TaskCompletion[];
};

const applyCellBorder = (
  cell: ExcelJS.Cell,
  color: string,
  style: ExcelJS.BorderStyle = "thin"
): void => {
  cell.border = {
    top: { style, color: { argb: color } },
    left: { style, color: { argb: color } },
    bottom: { style, color: { argb: color } },
    right: { style, color: { argb: color } },
  };
};

const MONTH_NAMES = [
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
] as const;

const formatMonthKey = (year: number, monthIndex: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

const groupCompletionsByMonth = (
  completions: TaskCompletion[],
  year: number
): MonthBucket[] => {
  const monthMap = new Map<string, TaskCompletion[]>();

  for (const completion of completions) {
    const completedAtDate = new Date(completion.completedAt);
    if (completedAtDate.getFullYear() !== year) {
      continue;
    }
    const monthIndex = completedAtDate.getMonth();
    const monthKey = formatMonthKey(year, monthIndex);
    const existing = monthMap.get(monthKey) ?? [];
    existing.push(completion);
    monthMap.set(monthKey, existing);
  }

  return [...monthMap.entries()]
    .map(([monthKey, items]) => {
      const [, month] = monthKey.split("-").map(Number);
      const monthIndex = (month ?? 1) - 1;
      const sortedItems = [...items].sort(
        (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      );
      return { year, monthIndex, items: sortedItems };
    })
    .sort((a, b) => a.monthIndex - b.monthIndex);
};

const ensureUniqueSheetName = (
  workbook: ExcelJS.Workbook,
  preferredName: string
): string => {
  const maxSheetLength = 31;
  const baseName = preferredName.slice(0, maxSheetLength);
  if (!workbook.getWorksheet(baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (suffix < 100) {
    const suffixLabel = ` (${suffix})`;
    const maxBaseLength = maxSheetLength - suffixLabel.length;
    const candidate = `${baseName.slice(0, maxBaseLength)}${suffixLabel}`;
    if (!workbook.getWorksheet(candidate)) {
      return candidate;
    }
    suffix += 1;
  }

  return `${Date.now()}`.slice(0, maxSheetLength);
};

const styleSheet = (
  worksheet: ExcelJS.Worksheet,
  monthBucket: MonthBucket,
  fullName: string
): void => {
  worksheet.columns = [
    { header: "#", key: "index", width: 6 },
    { header: "Accomplishment", key: "task", width: 44 },
    { header: "Time", key: "time", width: 12 },
    { header: "Completed By", key: "completedBy", width: 30 },
    { header: "Status", key: "status", width: 14 },
  ];

  const dayMap = new Map<string, TaskCompletion[]>();
  for (const completion of monthBucket.items) {
    const completedDate = new Date(completion.completedAt);
    const y = completedDate.getFullYear();
    const m = String(completedDate.getMonth() + 1).padStart(2, "0");
    const d = String(completedDate.getDate()).padStart(2, "0");
    const dayKey = `${y}-${m}-${d}`;
    const existing = dayMap.get(dayKey) ?? [];
    existing.push(completion);
    dayMap.set(dayKey, existing);
  }

  const dayBuckets: DayBucket[] = [...dayMap.entries()]
    .map(([dayKey, items]) => {
      const [yearStr, monthStr, dayStr] = dayKey.split("-").map(Number);
      const dayDate = new Date(yearStr ?? 2000, (monthStr ?? 1) - 1, dayStr ?? 1);
      const sortedItems = [...items].sort(
        (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      );
      return { dayKey, dayDate, items: sortedItems };
    })
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

  let rowPointer = 1;
  for (const dayBucket of dayBuckets) {
    const sectionStartRow = rowPointer;
    const sectionTitle = `${dayBucket.dayDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })} Accomplishments`;

    worksheet.mergeCells(`A${rowPointer}:E${rowPointer}`);
    const titleCell = worksheet.getCell(`A${rowPointer}`);
    titleCell.value = sectionTitle;
    titleCell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0B4F3E" },
    };
    titleCell.alignment = { horizontal: "left", vertical: "middle" };
    applyCellBorder(titleCell, "FF064E3B", "medium");
    worksheet.getRow(rowPointer).height = 26;
    rowPointer += 1;

    const headerRow = worksheet.getRow(rowPointer);
    headerRow.values = ["#", "Accomplishment", "Time", "Completed By", "Status"];
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F766E" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      applyCellBorder(cell, "FF064E3B", "medium");
    });
    rowPointer += 1;

    dayBucket.items.forEach((completion, index) => {
      const completedAtDate = new Date(completion.completedAt);
      const completedBy =
        completion.completedByName ||
        completion.personAssigned ||
        completion.completedBy ||
        fullName;

      const row = worksheet.getRow(rowPointer);
      row.values = [
        index + 1,
        completion.scheduleTitle || "Untitled schedule",
        completedAtDate,
        completedBy,
        "Completed",
      ];
      row.height = 22;

      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
      };
      row.getCell(3).numFmt = "hh:mm AM/PM";
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).font = { color: { argb: "FF065F46" }, bold: true };

      row.eachCell((cell) => {
        applyCellBorder(cell, "FF64748B", "thin");
        if (index % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }
      });

      rowPointer += 1;
    });

    const sectionEndRow = rowPointer - 1;
    for (let outerCol = 1; outerCol <= 5; outerCol += 1) {
      applyCellBorder(
        worksheet.getCell(sectionStartRow, outerCol),
        "FF065F46",
        "medium"
      );
      applyCellBorder(worksheet.getCell(sectionEndRow, outerCol), "FF065F46", "medium");
    }
    for (let outerRow = sectionStartRow; outerRow <= sectionEndRow; outerRow += 1) {
      applyCellBorder(worksheet.getCell(outerRow, 1), "FF065F46", "medium");
      applyCellBorder(worksheet.getCell(outerRow, 5), "FF065F46", "medium");
    }

    rowPointer += 1;
  }
};

const buildWorkbookWithNoData = (workbook: ExcelJS.Workbook, year: number): void => {
  const sheet = workbook.addWorksheet("No Data");
  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = `No accomplishments found for ${year}`;
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF334155" },
  };
  sheet.getRow(1).height = 28;
  sheet.getCell("A3").value =
    "Mark tasks as complete in Task Manager, then export again.";
  sheet.getCell("A3").font = { color: { argb: "FF334155" } };
};

export const generateMonthlyCompletionsWorkbook = async (
  completions: TaskCompletion[],
  year: number,
  fullName: string
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NIA Tools";
  workbook.lastModifiedBy = fullName || "NIA Tools User";
  workbook.created = new Date();
  workbook.modified = new Date();

  const monthBuckets = groupCompletionsByMonth(completions, year);
  if (monthBuckets.length === 0) {
    buildWorkbookWithNoData(workbook, year);
  } else {
    for (const monthBucket of monthBuckets) {
      const sheetName = ensureUniqueSheetName(
        workbook,
        `${MONTH_NAMES[monthBucket.monthIndex]} ${monthBucket.year}`
      );
      const worksheet = workbook.addWorksheet(sheetName);
      styleSheet(worksheet, monthBucket, fullName);
    }
  }

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
};
