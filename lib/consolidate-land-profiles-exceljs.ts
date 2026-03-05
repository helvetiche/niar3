import ExcelJS from "exceljs";
import { logger } from "@/lib/logger";
import { EXCEL_SHEETS, EXCEL_CELLS } from "@/constants/excel-sheets";

export interface LandProfileData {
  lotNo: string;
  ownerLastName: string;
  ownerFirstName: string;
  tillerLastName: string;
  tillerFirstName: string;
  oldAccount: string;
  area: string;
  principal: string;
  penalty: string;
  rowNumber: number;
  fileName: string;
}

/**
 * Extract data from land profile using ExcelJS
 * ExcelJS can read calculated formula values if the file was saved by Excel
 */
export async function extractLandProfileData(
  fileBuffer: Buffer,
  fileName: string,
): Promise<LandProfileData | null> {
  try {
    logger.debug(`Extracting from: ${fileName}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

    const rowNumber = parseInt(fileName.match(/^(\d+)\s/)?.[1] || "0", 10);
    if (!rowNumber) {
      throw new Error(`Cannot extract row number from filename: ${fileName}`);
    }

    logger.debug(`Row number: ${rowNumber}`);

    const accDetailsSheet = workbook.getWorksheet(EXCEL_SHEETS.ACC_DETAILS);
    if (!accDetailsSheet) {
      logger.error(`Sheet "${EXCEL_SHEETS.ACC_DETAILS}" not found in ${fileName}`);
      throw new Error(`Sheet "${EXCEL_SHEETS.ACC_DETAILS}" not found`);
    }

    const soaSheet = workbook.getWorksheet(EXCEL_SHEETS.SOA);
    if (!soaSheet) {
      logger.error(`Sheet "${EXCEL_SHEETS.SOA}" not found in ${fileName}`);
      throw new Error(`Sheet "${EXCEL_SHEETS.SOA}" not found`);
    }

    const getCellValue = (sheet: ExcelJS.Worksheet, addr: string): string => {
      const cell = sheet.getCell(addr);
      if (!cell || cell.value === null || cell.value === undefined) {
        return "";
      }

      // ExcelJS returns the calculated value for formula cells
      if (cell.type === ExcelJS.ValueType.Formula) {
        // Use the result property which contains the calculated value
        return String(cell.result || "").trim();
      }

      return String(cell.value).trim();
    };

    // Extract from exact cell addresses
    const area = getCellValue(soaSheet, EXCEL_CELLS.ACC_DETAILS.AREA);
    const principal = getCellValue(soaSheet, EXCEL_CELLS.SOA.PRINCIPAL);
    const penalty = getCellValue(soaSheet, EXCEL_CELLS.SOA.PENALTY);

    logger.debug(`Area: ${area}, Principal: ${principal}, Penalty: ${penalty}`);

    const data: LandProfileData = {
      lotNo: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.LOT_CODE),
      ownerFirstName: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.OWNER_FIRST_NAME),
      ownerLastName: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.OWNER_LAST_NAME),
      tillerFirstName: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.TILLER_FIRST_NAME),
      tillerLastName: getCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.TILLER_LAST_NAME),
      oldAccount: getCellValue(soaSheet, EXCEL_CELLS.SOA.OLD_ACCOUNT),
      area,
      principal,
      penalty,
      rowNumber,
      fileName,
    };

    logger.debug(`Successfully extracted data from ${fileName}`);
    return data;
  } catch (error) {
    logger.error(`Error extracting data from ${fileName}:`, error);
    return null;
  }
}

/**
 * Consolidate land profiles using ExcelJS
 */
export async function consolidateWithExcelJS(
  templateBuffer: Buffer,
  landProfileFiles: { buffer: Buffer; fileName: string }[],
): Promise<{ buffer: Buffer; processedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let processedCount = 0;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet(1);

    if (!sheet) {
      throw new Error("Template must have at least one worksheet");
    }

    for (const file of landProfileFiles) {
      try {
        const data = await extractLandProfileData(file.buffer, file.fileName);

        if (!data) {
          errors.push(`Failed to extract data from ${file.fileName}`);
          continue;
        }

        const templateRow = data.rowNumber + 2;

        // Write all extracted data
        sheet.getCell(`B${templateRow}`).value = data.lotNo;
        sheet.getCell(`C${templateRow}`).value = data.ownerLastName;
        sheet.getCell(`D${templateRow}`).value = data.ownerFirstName;
        sheet.getCell(`F${templateRow}`).value = data.tillerLastName;
        sheet.getCell(`G${templateRow}`).value = data.tillerFirstName;
        sheet.getCell(`I${templateRow}`).value = data.area;
        sheet.getCell(`J${templateRow}`).value = data.principal;
        sheet.getCell(`K${templateRow}`).value = data.penalty;
        sheet.getCell(`L${templateRow}`).value = data.oldAccount;

        processedCount++;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Error processing ${file.fileName}: ${errorMsg}`);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), processedCount, errors };
  } catch (error) {
    throw error;
  }
}
