import fs from "node:fs";
import path from "node:path";
import XlsxPopulate from "xlsx-populate";
import type { LotGroup } from "@/lib/mastersListProcessor";

const TEMPLATE_CANDIDATES = [
  path.join(process.cwd(), "data", "template.xlsx"),
  path.join(process.cwd(), "public", "template.xlsx"),
];

const ACC_SHEET = "00 ACC DETAILS 01";
const SOA_SHEET = "01 SOA 01";

const getTemplatePath = (): string => {
  for (const candidate of TEMPLATE_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Template not found. Add template.xlsx in data/ or public/, or upload a template file. Tried: ${TEMPLATE_CANDIDATES.join(", ")}`,
  );
};

const formatQueueNumber = (value: number): string =>
  String(value).padStart(2, "0");

const isValidName = (value: string): boolean =>
  Boolean(value && value.trim() !== "" && value.trim().toUpperCase() !== "N");

const sanitizeFilePart = (value: string): string =>
  value.replace(/[/\\]/g, "-").trim();

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

const toExcelValue = (value: string | number): string | number => {
  if (typeof value === "string" && value.trim().toUpperCase() === "N")
    return "";
  if (typeof value === "number") return value;

  const asString = String(value).trim();
  if (!asString) return "";

  const parsed = Number(asString.replace(/,/g, ""));
  if (!Number.isNaN(parsed)) return parsed;
  return asString;
};

const setCell = (
  workbook: XlsxPopulate.Workbook,
  sheetName: string,
  reference: string,
  value: string | number,
): void => {
  workbook.sheet(sheetName).cell(reference).value(toExcelValue(value));
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

  setCell(workbook, ACC_SHEET, "C3", lotCode);
  setCell(workbook, ACC_SHEET, "C4", division);
  workbook.sheet(ACC_SHEET).cell("C4").style("horizontalAlignment", "left");
  setCell(workbook, ACC_SHEET, "C5", nameOfIA);
  setCell(workbook, ACC_SHEET, "C7", landOwnerFirst);
  setCell(workbook, ACC_SHEET, "C9", landOwnerLast);
  setCell(workbook, ACC_SHEET, "C11", farmerFirst);
  setCell(workbook, ACC_SHEET, "C13", farmerLast);

  let principalTotal = 0;
  let penaltyTotal = 0;

  for (let i = 0; i < lotGroup.rows.length; i += 1) {
    const row = lotGroup.rows[i];
    const rowNumber = 30 + i;

    setCell(workbook, ACC_SHEET, `B${String(rowNumber)}`, row.cropSeason);
    setCell(workbook, ACC_SHEET, `C${String(rowNumber)}`, row.cropYear);
    setCell(workbook, ACC_SHEET, `D${String(rowNumber)}`, row.plantedArea);

    const area = Number(String(row.plantedArea ?? "").replace(/,/g, "")) || 0;
    const cropSeason = String(row.cropSeason ?? "").toUpperCase();
    const rate = cropSeason.endsWith("-D") ? 2550 : 1700;
    const principal = area * rate;
    const penalty = principal * 0.25;

    principalTotal += principal;
    penaltyTotal += penalty;
  }

  const oldAccountNumber =
    Number(String(oldAccount ?? "").replace(/,/g, "")) || 0;
  const total = principalTotal + penaltyTotal + oldAccountNumber;

  setCell(workbook, SOA_SHEET, "D100", principalTotal);
  setCell(workbook, SOA_SHEET, "F100", penaltyTotal);
  setCell(workbook, SOA_SHEET, "G101", oldAccount);
  setCell(workbook, SOA_SHEET, "G102", total);

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
