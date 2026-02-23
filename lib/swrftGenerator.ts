import XlsxPopulate from "xlsx-populate";

type SwrftPeriod = "first-half" | "second-half";

type SwrftGenerationOptions = {
  fullName: string;
  reportType: string;
  year: number;
  month: number;
  period: SwrftPeriod;
  templateBuffer: Buffer;
};

const STANDARD_TASK =
  "SUPERVISED WRFOB, WATER DISTRIBUTION, AREA MONITORING, FIELD INSPECTION ATTEND IA MEETING and OTHER O&M ACTIVITIES";

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

const getDayOfWeek = (year: number, month: number, day: number): number => {
  return new Date(year, month - 1, day).getDay();
};

const isWeekend = (year: number, month: number, day: number): boolean => {
  const dayOfWeek = getDayOfWeek(year, month, day);
  return dayOfWeek === 0 || dayOfWeek === 6;
};

const getDayName = (year: number, month: number, day: number): string => {
  const dayOfWeek = getDayOfWeek(year, month, day);
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[dayOfWeek] ?? "SUNDAY";
};

const formatPeriodCovered = (
  year: number,
  month: number,
  period: SwrftPeriod,
): string => {
  const monthNames = [
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
  ];
  const monthName = monthNames[month - 1] ?? "JANUARY";
  const dateRange = period === "first-half" ? "1-15" : `16-${getDaysInMonth(year, month)}`;
  return `PERIOD COVERED ${monthName} ${dateRange}, ${year}`;
};

const sanitizeFilename = (name: string): string => {
  return name.replace(/[/\\:*?"<>|]/g, "-").trim();
};

export const generateSwrftBuffer = async (
  options: SwrftGenerationOptions,
): Promise<{ buffer: Buffer; filename: string }> => {
  const { fullName, reportType, year, month, period, templateBuffer } = options;

  if (!templateBuffer || templateBuffer.length === 0) {
    throw new Error("Template buffer is empty or invalid");
  }

  const workbook = await XlsxPopulate.fromDataAsync(templateBuffer);
  const sheet = workbook.sheet(0);

  if (!sheet) {
    throw new Error("Template must have at least one sheet");
  }

  sheet.cell("A7").value(formatPeriodCovered(year, month, period));
  sheet.cell("B9").value(fullName);
  sheet.cell("B10").value(reportType);

  const startDay = period === "first-half" ? 1 : 16;
  const endDay = period === "first-half" ? 15 : getDaysInMonth(year, month);

  let rowIndex = 0;
  for (let day = startDay; day <= endDay; day += 1) {
    const numberCell = `A${13 + rowIndex * 2}`;
    const taskCell = `B${13 + rowIndex * 2}`;

    sheet.cell(numberCell).value(day - startDay + 1);

    if (isWeekend(year, month, day)) {
      sheet.cell(taskCell).value(getDayName(year, month, day));
    } else {
      sheet.cell(taskCell).value(STANDARD_TASK);
    }

    rowIndex += 1;
  }

  const output = await workbook.outputAsync();
  const buffer = Buffer.isBuffer(output)
    ? output
    : Buffer.from(output as ArrayBuffer);

  const monthNames = [
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
  const monthName = monthNames[month - 1] ?? "January";
  const periodLabel = period === "first-half" ? "1-15" : "16-31";
  const filename = sanitizeFilename(
    `${fullName} - SWRFT - ${monthName} ${periodLabel}, ${year}.xlsx`,
  );

  return { buffer, filename };
};

export const generateYearSwrftBuffers = async (
  fullName: string,
  reportType: string,
  year: number,
  templateBuffer: Buffer,
): Promise<Array<{ buffer: Buffer; filename: string }>> => {
  const results: Array<{ buffer: Buffer; filename: string }> = [];

  for (let month = 1; month <= 12; month += 1) {
    const firstHalf = await generateSwrftBuffer({
      fullName,
      reportType,
      year,
      month,
      period: "first-half",
      templateBuffer,
    });
    results.push(firstHalf);

    const secondHalf = await generateSwrftBuffer({
      fullName,
      reportType,
      year,
      month,
      period: "second-half",
      templateBuffer,
    });
    results.push(secondHalf);
  }

  return results;
};
