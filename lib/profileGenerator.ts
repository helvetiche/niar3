import { existsSync } from "node:fs";
import path from "node:path";
import XlsxPopulate from "xlsx-populate";
import type { LotGroup } from "@/lib/mastersListProcessor";
import { EXCEL_SHEETS, EXCEL_CELLS } from "@/constants/excel-sheets";
import {
  formatQueueNumber,
  isValidName,
  sanitizeFilePart,
  setCellValue,
} from "@/lib/excel/cell-utils";

const TEMPLATE_CANDIDATES = [
  path.join(process.cwd(), "data", "template.xlsx"),
  path.join(process.cwd(), "public", "template.xlsx"),
];

const CROP_DATA_START_ROW = 30;

type GenerateProfileOptions = {
  division?: string;
  nameOfIA?: string;
  templateBuffer?: Buffer;
};

interface ProfileData {
  lotCode: string;
  division: string;
  nameOfIA: string;
  landOwnerFirst: string;
  landOwnerLast: string;
  farmerFirst: string;
  farmerLast: string;
  oldAccount: string;
}

/**
 * Get template file path from predefined locations
 */
const getTemplatePath = (): string => {
  for (const candidate of TEMPLATE_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Template not found. Add template.xlsx in data/ or public/, or upload a template file. Tried: ${TEMPLATE_CANDIDATES.join(", ")}`,
  );
};

/**
 * Build full name from name parts
 */
function buildFullName(lastName: string, firstName: string): string {
  const parts = [lastName, firstName].filter(isValidName);
  return parts.join(", ");
}

/**
 * Format filename for land profile
 * Format: "{queue} {lotCode} {name}.xlsx"
 */
function formatFilename(
  queue: number,
  lotCode: string,
  landOwnerLast: string,
  landOwnerFirst: string,
  farmerLast: string,
  farmerFirst: string,
): string {
  const ownerName = buildFullName(landOwnerLast, landOwnerFirst);
  const farmerName = buildFullName(farmerLast, farmerFirst);
  const chosenName = ownerName || farmerName;

  const queuePart = formatQueueNumber(queue);
  const lotPart = sanitizeFilePart(lotCode);
  const namePart = sanitizeFilePart(chosenName);

  const base = `${queuePart} ${lotPart}`.trim();
  return namePart ? `${base} ${namePart}.xlsx` : `${base}.xlsx`;
}

/**
 * Extract profile data from lot group and options
 */
function extractProfileData(
  lotGroup: LotGroup,
  options?: GenerateProfileOptions,
): ProfileData {
  const firstRow = lotGroup.rows[0];

  return {
    lotCode: lotGroup.lotCode,
    division: options?.division ?? "",
    nameOfIA: options?.nameOfIA ?? "",
    landOwnerFirst: lotGroup.landOwnerFirst ?? "",
    landOwnerLast: lotGroup.landOwnerLast ?? "",
    farmerFirst: firstRow?.farmerFirst ?? "",
    farmerLast: firstRow?.farmerLast ?? "",
    oldAccount: firstRow?.oldAccount ?? "",
  };
}

/**
 * Load workbook from template buffer or file
 */
async function loadWorkbook(
  templateBuffer?: Buffer,
): Promise<XlsxPopulate.Workbook> {
  return templateBuffer
    ? await XlsxPopulate.fromDataAsync(templateBuffer)
    : await XlsxPopulate.fromFileAsync(getTemplatePath());
}

/**
 * Populate account details in the workbook
 */
function populateAccountDetails(
  sheet: XlsxPopulate.Sheet,
  data: ProfileData,
): void {
  setCellValue(sheet, EXCEL_CELLS.ACC_DETAILS.LOT_CODE, data.lotCode);
  setCellValue(sheet, EXCEL_CELLS.ACC_DETAILS.DIVISION, data.division);
  sheet
    .cell(EXCEL_CELLS.ACC_DETAILS.DIVISION)
    .style("horizontalAlignment", "left");
  setCellValue(sheet, EXCEL_CELLS.ACC_DETAILS.NAME_OF_IA, data.nameOfIA);
  setCellValue(
    sheet,
    EXCEL_CELLS.ACC_DETAILS.OWNER_FIRST_NAME,
    data.landOwnerFirst,
  );
  setCellValue(
    sheet,
    EXCEL_CELLS.ACC_DETAILS.OWNER_LAST_NAME,
    data.landOwnerLast,
  );
  setCellValue(
    sheet,
    EXCEL_CELLS.ACC_DETAILS.TILLER_FIRST_NAME,
    data.farmerFirst,
  );
  setCellValue(
    sheet,
    EXCEL_CELLS.ACC_DETAILS.TILLER_LAST_NAME,
    data.farmerLast,
  );
}

/**
 * Populate crop data in the workbook
 */
function populateCropData(
  sheet: XlsxPopulate.Sheet,
  lotGroup: LotGroup,
): void {
  for (let i = 0; i < lotGroup.rows.length; i++) {
    const row = lotGroup.rows[i];
    const rowNumber = CROP_DATA_START_ROW + i;

    setCellValue(sheet, `B${rowNumber}`, row.cropSeason);
    setCellValue(sheet, `C${rowNumber}`, row.cropYear);
    setCellValue(sheet, `D${rowNumber}`, row.plantedArea);
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
 * Generate land profile Excel file buffer and filename
 */
export const generateProfileBuffer = async (
  lotGroup: LotGroup,
  queueNumber: number,
  options?: GenerateProfileOptions,
): Promise<{ buffer: Buffer; filename: string }> => {
  const workbook = await loadWorkbook(options?.templateBuffer);
  const profileData = extractProfileData(lotGroup, options);

  const accDetailsSheet = workbook.sheet(EXCEL_SHEETS.ACC_DETAILS);
  const soaSheet = workbook.sheet(EXCEL_SHEETS.SOA);

  populateAccountDetails(accDetailsSheet, profileData);
  populateCropData(accDetailsSheet, lotGroup);
  setCellValue(soaSheet, EXCEL_CELLS.SOA.OLD_ACCOUNT, profileData.oldAccount);

  const buffer = await workbookToBuffer(workbook);
  const filename = formatFilename(
    queueNumber,
    profileData.lotCode,
    profileData.landOwnerLast,
    profileData.landOwnerFirst,
    profileData.farmerLast,
    profileData.farmerFirst,
  );

  return { buffer, filename };
};
