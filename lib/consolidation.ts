import XlsxPopulate from "xlsx-populate";
import { extractData } from "@/lib/dataExtractor";
import { parseExcelFile } from "@/lib/excelParser";

export type ConsolidationInputFile = {
  fileName: string;
  buffer: Buffer;
};

export type ConsolidationSkippedDetail = {
  fileName: string;
  fileId?: string;
  reason: string;
};

export type BuildConsolidationArgs = {
  templateBuffer: Buffer;
  inputFiles: ConsolidationInputFile[];
  fileName: string;
  division: string;
  ia: string;
};

export type BuildConsolidationResult = {
  buffer: Buffer;
  outputName: string;
  consolidatedCount: number;
  skippedDetails: ConsolidationSkippedDetail[];
};

const normalizeId = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return "";
  return String(parsed);
};

const sanitizeFilename = (value: string): string =>
  value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();

const parseNumericValue = (value: string | number): number | null => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const setNumericCellWithFormat = (
  sheet: {
    cell: (ref: string) => {
      value: (val?: string | number) => unknown;
      style: (name: string, value: string) => unknown;
    };
  },
  address: string,
  value: string | number,
): void => {
  const parsed = parseNumericValue(value);
  const cell = sheet.cell(address);
  if (parsed === null) {
    cell.value("");
    return;
  }
  cell.value(parsed);
  cell.style("numberFormat", '#,##0.00;-#,##0.00;"-"');
};

const setTextCell = (
  sheet: {
    cell: (ref: string) => {
      value: (val?: string | number) => unknown;
      style: (name: string, value: string) => unknown;
    };
  },
  address: string,
  value: string,
  options?: { alignLeft?: boolean; explicitText?: boolean },
): void => {
  const cell = sheet.cell(address);
  const trimmed = value.trim();
  cell.value(trimmed);
  if (options?.explicitText) {
    cell.style("numberFormat", "@");
  }
  if (options?.alignLeft) {
    cell.style("horizontalAlignment", "left");
  }
};

export async function buildConsolidatedWorkbook(
  args: BuildConsolidationArgs,
): Promise<BuildConsolidationResult> {
  const templateWorkbook = await XlsxPopulate.fromDataAsync(
    args.templateBuffer,
  );
  const targetSheet: ReturnType<typeof templateWorkbook.sheet> | undefined =
    templateWorkbook.sheet(0) ?? templateWorkbook.sheet(1) ?? undefined;
  if (!targetSheet) {
    throw new Error("Template has no readable worksheet");
  }

  const rowByFileId = new Map<string, number>();
  for (let row = 1; row <= 10000; row += 1) {
    const aValue = targetSheet.cell(`A${String(row)}`).value();
    const id = normalizeId(aValue);
    if (id) rowByFileId.set(id, row);
  }

  const divisionValue = args.division.replace(/[^0-9]/g, "") || "0";
  const iaValue = args.ia.trim() || "IA";

  let consolidatedCount = 0;
  const skippedDetails: ConsolidationSkippedDetail[] = [];

  for (const file of args.inputFiles) {
    const parsedSheets = parseExcelFile(file.buffer);
    if (parsedSheets.length === 0) {
      skippedDetails.push({
        fileName: file.fileName,
        reason: "No readable worksheet data found in file.",
      });
      continue;
    }

    const extracted = extractData(parsedSheets, file.fileName);
    if (!extracted.fileId) {
      skippedDetails.push({
        fileName: file.fileName,
        reason: "Cannot extract file ID from filename prefix.",
      });
      continue;
    }

    const targetRow = rowByFileId.get(extracted.fileId);
    if (!targetRow) {
      skippedDetails.push({
        fileName: file.fileName,
        fileId: extracted.fileId,
        reason: `No matching row in template column A for file ID ${extracted.fileId}.`,
      });
      continue;
    }

    const rowLabel = String(targetRow);

    const perFileIA = extracted.accountDetails[0]?.nameOfIA?.trim() || iaValue;
    const perFileDivision =
      extracted.accountDetails[0]?.division?.trim() || divisionValue;

    if (extracted.accountDetails.length > 0) {
      const detail = extracted.accountDetails[0];
      setTextCell(targetSheet, `B${rowLabel}`, detail.lotNo, {
        alignLeft: true,
        explicitText: true,
      });
      setTextCell(targetSheet, `C${rowLabel}`, detail.lotOwner.lastName);
      setTextCell(targetSheet, `D${rowLabel}`, detail.lotOwner.firstName);
      setTextCell(targetSheet, `E${rowLabel}`, "");
      setTextCell(targetSheet, `F${rowLabel}`, detail.farmer.lastName);
      setTextCell(targetSheet, `G${rowLabel}`, detail.farmer.firstName);
    }

    if (extracted.soaDetails.length > 0) {
      const detail = extracted.soaDetails[0];
      setNumericCellWithFormat(targetSheet, `I${rowLabel}`, detail.area);
      setNumericCellWithFormat(targetSheet, `J${rowLabel}`, detail.principal);
      setNumericCellWithFormat(targetSheet, `K${rowLabel}`, detail.penalty);
      setNumericCellWithFormat(targetSheet, `L${rowLabel}`, detail.oldAccount);
      setNumericCellWithFormat(targetSheet, `M${rowLabel}`, detail.total);
    }

    setTextCell(targetSheet, `N${rowLabel}`, perFileIA);
    targetSheet
      .cell(`O${rowLabel}`)
      .value(Number.parseInt(perFileDivision.replace(/[^0-9]/g, ""), 10) || 0);
    consolidatedCount += 1;
  }

  if (consolidatedCount === 0) {
    throw new Error(
      "No files were consolidated. Check filename IDs and template column A matches.",
    );
  }

  const output = await templateWorkbook.outputAsync();
  const outputBuffer = Buffer.isBuffer(output)
    ? output
    : Buffer.from(output as ArrayBuffer);

  const safeFileName =
    sanitizeFilename(args.fileName || "DIVISION X CONSOLIDATED") ||
    "DIVISION X CONSOLIDATED";
  const outputName = safeFileName.endsWith(".xlsx")
    ? safeFileName
    : `${safeFileName}.xlsx`;

  return {
    buffer: outputBuffer,
    outputName,
    consolidatedCount,
    skippedDetails,
  };
}
