import XlsxPopulate from "xlsx-populate";
import { logger } from "@/lib/logger";
import { EXCEL_SHEETS, EXCEL_CELLS } from "@/constants/excel-sheets";
import { getCellValue, getNumericCellValue } from "@/lib/excel/cell-utils";

export interface NuclearLandProfileData {
  lotNo: string;
  ownerLastName: string;
  ownerFirstName: string;
  tillerLastName: string;
  tillerFirstName: string;
  principal: number;
  penalty: number;
  oldAccount: number;
  rowNumber: number;
  fileName: string;
}

interface ConsolidationResult {
  buffer: Buffer;
  processedCount: number;
  errors: string[];
  warnings: string[];
}

interface LandProfileFile {
  buffer: Buffer;
  fileName: string;
}

// Template column mapping
const TEMPLATE_COLUMNS = {
  LOT_NO: "B",
  OWNER_LAST_NAME: "C",
  OWNER_FIRST_NAME: "D",
  TILLER_LAST_NAME: "F",
  TILLER_FIRST_NAME: "G",
  AREA: "I", // Left blank intentionally
  PRINCIPAL: "J",
  PENALTY: "K",
  OLD_ACCOUNT: "L",
} as const;

const TEMPLATE_ROW_OFFSET = 2;

/**
 * Extract row number from filename (format: "123 LOT-CODE Name.xlsx")
 */
function extractRowNumber(fileName: string): number {
  const match = fileName.match(/^(\d+)\s/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Get required sheets from workbook
 */
function getRequiredSheets(workbook: XlsxPopulate.Workbook) {
  const accDetailsSheet = workbook.sheet(EXCEL_SHEETS.ACC_DETAILS);
  if (!accDetailsSheet) {
    throw new Error(`Sheet "${EXCEL_SHEETS.ACC_DETAILS}" not found`);
  }

  const soaSheet = workbook.sheet(EXCEL_SHEETS.SOA);
  if (!soaSheet) {
    throw new Error(`Sheet "${EXCEL_SHEETS.SOA}" not found`);
  }

  return { accDetailsSheet, soaSheet };
}

/**
 * Extract account details from sheet
 */
function extractAccountDetails(sheet: XlsxPopulate.Sheet) {
  return {
    lotNo: getCellValue(sheet, EXCEL_CELLS.ACC_DETAILS.LOT_CODE),
    ownerFirstName: getCellValue(sheet, EXCEL_CELLS.ACC_DETAILS.OWNER_FIRST_NAME),
    ownerLastName: getCellValue(sheet, EXCEL_CELLS.ACC_DETAILS.OWNER_LAST_NAME),
    tillerFirstName: getCellValue(sheet, EXCEL_CELLS.ACC_DETAILS.TILLER_FIRST_NAME),
    tillerLastName: getCellValue(sheet, EXCEL_CELLS.ACC_DETAILS.TILLER_LAST_NAME),
  };
}

/**
 * Extract financial data from SOA sheet
 */
function extractFinancialData(sheet: XlsxPopulate.Sheet) {
  return {
    principal: getNumericCellValue(sheet, EXCEL_CELLS.SOA.PRINCIPAL),
    penalty: getNumericCellValue(sheet, EXCEL_CELLS.SOA.PENALTY),
    oldAccount: getNumericCellValue(sheet, EXCEL_CELLS.SOA.OLD_ACCOUNT),
  };
}

/**
 * Extract land profile data including financial values from cached formulas
 */
export async function extractNuclearData(
  fileBuffer: Buffer,
  fileName: string,
): Promise<NuclearLandProfileData | null> {
  try {
    const rowNumber = extractRowNumber(fileName);
    if (!rowNumber) {
      throw new Error(`Cannot extract row number from filename: ${fileName}`);
    }

    const workbook = await XlsxPopulate.fromDataAsync(fileBuffer);
    const { accDetailsSheet, soaSheet } = getRequiredSheets(workbook);

    const accountDetails = extractAccountDetails(accDetailsSheet);
    const financialData = extractFinancialData(soaSheet);

    return {
      ...accountDetails,
      ...financialData,
      rowNumber,
      fileName,
    };
  } catch (error) {
    logger.error(`Error extracting from ${fileName}:`, error);
    return null;
  }
}

/**
 * Write land profile data to template row
 */
function writeDataToTemplate(
  sheet: XlsxPopulate.Sheet,
  data: NuclearLandProfileData,
): void {
  const row = data.rowNumber + TEMPLATE_ROW_OFFSET;

  sheet.cell(`${TEMPLATE_COLUMNS.LOT_NO}${row}`).value(data.lotNo);
  sheet.cell(`${TEMPLATE_COLUMNS.OWNER_LAST_NAME}${row}`).value(data.ownerLastName);
  sheet.cell(`${TEMPLATE_COLUMNS.OWNER_FIRST_NAME}${row}`).value(data.ownerFirstName);
  sheet.cell(`${TEMPLATE_COLUMNS.TILLER_LAST_NAME}${row}`).value(data.tillerLastName);
  sheet.cell(`${TEMPLATE_COLUMNS.TILLER_FIRST_NAME}${row}`).value(data.tillerFirstName);
  sheet.cell(`${TEMPLATE_COLUMNS.PRINCIPAL}${row}`).value(data.principal);
  sheet.cell(`${TEMPLATE_COLUMNS.PENALTY}${row}`).value(data.penalty);
  sheet.cell(`${TEMPLATE_COLUMNS.OLD_ACCOUNT}${row}`).value(data.oldAccount);
  // Column I (AREA) is intentionally left blank for manual entry
}

/**
 * Process a single land profile file
 */
async function processLandProfileFile(
  file: LandProfileFile,
  sheet: XlsxPopulate.Sheet,
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await extractNuclearData(file.buffer, file.fileName);

    if (!data) {
      return {
        success: false,
        error: `Failed to extract data from ${file.fileName}`,
      };
    }

    writeDataToTemplate(sheet, data);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Error processing ${file.fileName}: ${errorMsg}`,
    };
  }
}

/**
 * Convert workbook to buffer
 */
async function workbookToBuffer(
  workbook: XlsxPopulate.Workbook,
): Promise<Buffer> {
  const output = await workbook.outputAsync();
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

/**
 * NUCLEAR CONSOLIDATION: Just copy what exists, leave rest blank
 */
export async function consolidateNuclear(
  templateBuffer: Buffer,
  landProfileFiles: LandProfileFile[],
): Promise<ConsolidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let processedCount = 0;

  const workbook = await XlsxPopulate.fromDataAsync(templateBuffer);
  const sheet = workbook.sheet(0);

  for (const file of landProfileFiles) {
    const result = await processLandProfileFile(file, sheet);

    if (result.success) {
      processedCount++;
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  if (processedCount > 0) {
    warnings.push(
      "Column I (Area) is left blank. You can fill this manually by opening the consolidated file.",
    );
  }

  const buffer = await workbookToBuffer(workbook);

  return { buffer, processedCount, errors, warnings };
}
