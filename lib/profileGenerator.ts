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
 * Format filename for land profile
 * Format: "{queue} {lotCode} {name}.xlsx"
 */
const formatFilename = (
  queue: number,
  lotCode: string,
  landOwnerLast: string,
  landOwnerFirst: string,
  farmerLast: string,
  farmerFirst: string,
): string => {
  const ownerParts = [landOwnerLast, landOwnerFirst].filter(isValidName);
  const farmerParts = [farmerLast, farmerFirst].filter(isValidName);
  const chosenName =
    ownerParts.length > 0 ? ownerParts.join(", ") : farmerParts.join(", ");

  const base =
    `${formatQueueNumber(queue)} ${sanitizeFilePart(lotCode)}`.trim();
  const name = sanitizeFilePart(chosenName);
  return name ? `${base} ${name}.xlsx` : `${base}.xlsx`;
};

type GenerateProfileOptions = {
  division?: string;
  nameOfIA?: string;
  templateBuffer?: Buffer;
};

export const generateProfileBuffer = async (
  lotGroup: LotGroup,
  queueNumber: number,
  options?: GenerateProfileOptions,
): Promise<{ buffer: Buffer; filename: string }> => {
  const workbook = options?.templateBuffer
    ? await XlsxPopulate.fromDataAsync(options.templateBuffer)
    : await XlsxPopulate.fromFileAsync(getTemplatePath());

  const lotCode = lotGroup.lotCode;
  const rows = lotGroup.rows;

  const landOwnerFirst = lotGroup.landOwnerFirst ?? "";
  const landOwnerLast = lotGroup.landOwnerLast ?? "";
  const farmerFirst = rows[0]?.farmerFirst ?? "";
  const farmerLast = rows[0]?.farmerLast ?? "";
  const oldAccount = rows[0]?.oldAccount ?? "";
  const division = options?.division ?? "";
  const nameOfIA = options?.nameOfIA ?? "";

  const accDetailsSheet = workbook.sheet(EXCEL_SHEETS.ACC_DETAILS);
  const soaSheet = workbook.sheet(EXCEL_SHEETS.SOA);

  // Set account details
  setCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.LOT_CODE, lotCode);
  setCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.DIVISION, division);
  accDetailsSheet
    .cell(EXCEL_CELLS.ACC_DETAILS.DIVISION)
    .style("horizontalAlignment", "left");
  setCellValue(accDetailsSheet, EXCEL_CELLS.ACC_DETAILS.NAME_OF_IA, nameOfIA);
  setCellValue(
    accDetailsSheet,
    EXCEL_CELLS.ACC_DETAILS.OWNER_FIRST_NAME,
    landOwnerFirst,
  );
  setCellValue(
    accDetailsSheet,
    EXCEL_CELLS.ACC_DETAILS.OWNER_LAST_NAME,
    landOwnerLast,
  );
  setCellValue(
    accDetailsSheet,
    EXCEL_CELLS.ACC_DETAILS.TILLER_FIRST_NAME,
    farmerFirst,
  );
  setCellValue(
    accDetailsSheet,
    EXCEL_CELLS.ACC_DETAILS.TILLER_LAST_NAME,
    farmerLast,
  );

  // Set crop data (starting at row 30)
  const CROP_DATA_START_ROW = 30;
  for (let i = 0; i < lotGroup.rows.length; i += 1) {
    const row = lotGroup.rows[i];
    const rowNumber = CROP_DATA_START_ROW + i;

    setCellValue(accDetailsSheet, `B${rowNumber}`, row.cropSeason);
    setCellValue(accDetailsSheet, `C${rowNumber}`, row.cropYear);
    setCellValue(accDetailsSheet, `D${rowNumber}`, row.plantedArea);
  }

  // Set old account in SOA sheet
  setCellValue(soaSheet, EXCEL_CELLS.SOA.OLD_ACCOUNT, oldAccount);

  const output = await workbook.outputAsync();
  const buffer = Buffer.isBuffer(output)
    ? output
    : Buffer.from(output as ArrayBuffer);
  const filename = formatFilename(
    queueNumber,
    lotCode,
    landOwnerLast,
    landOwnerFirst,
    farmerLast,
    farmerFirst,
  );

  return { buffer, filename };
};
