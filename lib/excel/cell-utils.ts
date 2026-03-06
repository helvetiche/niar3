import type XlsxPopulate from "xlsx-populate";

/**
 * Safely get cell value from Excel sheet
 * Returns empty string for "N" values or errors
 */
export function getCellValue(
  sheet: XlsxPopulate.Sheet,
  address: string,
): string {
  try {
    const val = sheet.cell(address).value();
    const strVal = val ? String(val).trim() : "";
    // Remove "N" values that indicate empty data
    return strVal === "N" ? "" : strVal;
  } catch {
    return "";
  }
}

/**
 * Safely get numeric value from Excel cell
 * Returns 0 for invalid or missing values
 */
export function getNumericCellValue(
  sheet: XlsxPopulate.Sheet,
  address: string,
): number {
  try {
    const val = sheet.cell(address).value();
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Set cell value with proper type conversion
 * Converts "N" to empty string, handles numbers
 */
export function setCellValue(
  sheet: XlsxPopulate.Sheet,
  address: string,
  value: string | number,
): void {
  const excelValue = toExcelValue(value);
  sheet.cell(address).value(excelValue);
}

/**
 * Convert value to Excel-compatible format
 */
export function toExcelValue(value: string | number): string | number {
  if (typeof value === "string" && value.trim().toUpperCase() === "N") {
    return "";
  }
  if (typeof value === "number") return value;

  const asString = String(value).trim();
  if (!asString) return "";

  const parsed = Number(asString.replace(/,/g, ""));
  if (!Number.isNaN(parsed)) return parsed;
  return asString;
}

/**
 * Round number to specified decimal places (Excel ROUND behavior)
 */
export function roundHalfUp(num: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier + Number.EPSILON) / multiplier;
}

/**
 * Check if a name value is valid (not empty or "N")
 */
export function isValidName(value: string): boolean {
  return Boolean(
    value && value.trim() !== "" && value.trim().toUpperCase() !== "N",
  );
}

/**
 * Sanitize filename part (remove invalid characters)
 */
export function sanitizeFilePart(value: string): string {
  return value.replace(/[/\\:*?"<>|]/g, "-").trim();
}

/**
 * Format queue number with leading zeros
 */
export function formatQueueNumber(value: number, length: number = 2): string {
  return String(value).padStart(length, "0");
}
