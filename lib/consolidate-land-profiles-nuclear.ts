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

/**
 * Extract row number from filename (format: "123 LOT-CODE Name.xlsx")
 */
function extractRowNumber(fileName: string): number {
  const match = fileName.match(/^(\d+)\s/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract land profile data including financial values from cached formulas
 */
export async function extractNuclearData(
  fileBuffer: Buffer,
  fileName: string,
): Promise<NuclearLandProfileData | null> {
  try {
    const workbook = await XlsxPopulate.fromDataAsync(fileBuffer);

    const rowNumber = extractRowNumber(fileName);
    if (!rowNumber) {
      throw new Error(`Cannot extract row number from filename: ${fileName}`);
    }

    const accDetailsSheet = workbook.sheet(EXCEL_SHEETS.ACC_DETAILS);
    if (!accDetailsSheet) {
      throw new Error(`Sheet "${EXCEL_SHEETS.ACC_DETAILS}" not found`);
    }

    const soaSheet = workbook.sheet(EXCEL_SHEETS.SOA);
    if (!soaSheet) {
      throw new Error(`Sheet "${EXCEL_SHEETS.SOA}" not found`);
    }

    return {
      lotNo: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.LOT_CODE),
      ownerFirstName: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.OWNER_FIRST_NAME),
      ownerLastName: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.OWNER_LAST_NAME),
      tillerFirstName: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.TILLER_FIRST_NAME),
      tillerLastName: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.TILLER_LAST_NAME),
      // Financial data from cached formulas in SOA sheet
      principal: getNumericCellValue(soaSheet, EXCEL_CELLS.SOA.PRINCIPAL),
      penalty: getNumericCellValue(soaSheet, EXCEL_CELLS.SOA.PENALTY),
      oldAccount: getNumericCellValue(soaSheet, EXCEL_CELLS.SOA.OLD_ACCOUNT),
      rowNumber,
      fileName,
    };
  } catch (error) {
    logger.error(`Error extracting from ${fileName}:`, error);
    return null;
  }
}

/**
 * NUCLEAR CONSOLIDATION: Just copy what exists, leave rest blank
 */
export async function consolidateNuclear(
  templateBuffer: Buffer,
  landProfileFiles: { buffer: Buffer; fileName: string }[],
): Promise<{
  buffer: Buffer;
  processedCount: number;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let processedCount = 0;

  try {
    const workbook = await XlsxPopulate.fromDataAsync(templateBuffer);
    const sheet = workbook.sheet(0);

    for (const file of landProfileFiles) {
      try {
        const data = await extractNuclearData(file.buffer, file.fileName);

        if (!data) {
          errors.push(`Failed to extract data from ${file.fileName}`);
          continue;
        }

        const templateRow = data.rowNumber + 2;

        // Write extracted data including financial values
        sheet.cell(`B${templateRow}`).value(data.lotNo);
        sheet.cell(`C${templateRow}`).value(data.ownerLastName);
        sheet.cell(`D${templateRow}`).value(data.ownerFirstName);
        sheet.cell(`F${templateRow}`).value(data.tillerLastName);
        sheet.cell(`G${templateRow}`).value(data.tillerFirstName);
        sheet.cell(`J${templateRow}`).value(data.principal);
        sheet.cell(`K${templateRow}`).value(data.penalty);
        sheet.cell(`L${templateRow}`).value(data.oldAccount);

        // Leave I (area) BLANK - user must fill manually

        processedCount++;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Error processing ${file.fileName}: ${errorMsg}`);
      }
    }

    if (processedCount > 0) {
      warnings.push(
        "Column I (Area) is left blank. You can fill this manually by opening the consolidated file.",
      );
    }

    const output = await workbook.outputAsync();
    const buffer = Buffer.isBuffer(output)
      ? output
      : Buffer.from(output as ArrayBuffer);

    return { buffer, processedCount, errors, warnings };
  } catch (error) {
    throw error;
  }
}
