import { PDFDocument } from "pdf-lib";
import ExcelJS from "exceljs";

type MergeFileInput = {
  fileName: string;
  buffer: Buffer;
};

type PageOrderItem = {
  fileIndex: number;
  pageIndex: number;
};

type MergePdfBuffersOptions = {
  inputFiles: MergeFileInput[];
  pageOrder?: PageOrderItem[];
  fileName?: string;
};

type MergeExcelBuffersOptions = {
  inputFiles: MergeFileInput[];
  fileName?: string;
  excelPageNames?: string[];
};
type ExcelLoadBuffer = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

const sanitizeOutputName = (value: string, fallback: string): string => {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
};

const withExtension = (name: string, extension: ".pdf" | ".xlsx"): string =>
  name.toLowerCase().endsWith(extension) ? name : `${name}${extension}`;

const createUniqueSheetName = (
  desiredName: string,
  takenNames: Set<string>,
): string => {
  const safeBase =
    desiredName
      .replace(/[:\\/?*\[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Sheet";

  const maxLength = 31;
  const base = safeBase.slice(0, maxLength);

  if (!takenNames.has(base)) {
    takenNames.add(base);
    return base;
  }

  let index = 2;
  while (index < 10000) {
    const suffix = ` (${String(index)})`;
    const prefixLength = Math.max(1, maxLength - suffix.length);
    const candidate = `${base.slice(0, prefixLength)}${suffix}`;
    if (!takenNames.has(candidate)) {
      takenNames.add(candidate);
      return candidate;
    }
    index += 1;
  }

  throw new Error("Could not generate a unique worksheet name.");
};

export const mergePdfBuffers = async ({
  inputFiles,
  pageOrder,
  fileName,
}: MergePdfBuffersOptions): Promise<{
  buffer: Buffer;
  outputName: string;
  mergedPageCount: number;
}> => {
  if (inputFiles.length < 2) {
    throw new Error("Please upload at least two PDF files.");
  }

  const sourceDocs = await Promise.all(
    inputFiles.map(async (item) => PDFDocument.load(item.buffer)),
  );
  const sourcePageCounts = sourceDocs.map((doc) => doc.getPageCount());
  const totalPages = sourcePageCounts.reduce((sum, count) => sum + count, 0);

  if (totalPages === 0) {
    throw new Error("Uploaded PDF files do not contain any pages.");
  }

  const defaultOrder: PageOrderItem[] = [];
  for (let fileIndex = 0; fileIndex < sourceDocs.length; fileIndex += 1) {
    const pageCount = sourcePageCounts[fileIndex];
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      defaultOrder.push({ fileIndex, pageIndex });
    }
  }

  const finalOrder = pageOrder?.length ? pageOrder : defaultOrder;

  if (finalOrder.length !== totalPages) {
    throw new Error("Page order does not match the uploaded PDF page count.");
  }

  for (const entry of finalOrder) {
    if (
      entry.fileIndex < 0 ||
      entry.fileIndex >= sourceDocs.length ||
      entry.pageIndex < 0 ||
      entry.pageIndex >= sourcePageCounts[entry.fileIndex]
    ) {
      throw new Error("Page order contains an invalid file or page index.");
    }
  }

  const uniqueKeys = new Set(
    finalOrder.map((entry) => `${String(entry.fileIndex)}:${String(entry.pageIndex)}`),
  );
  if (uniqueKeys.size !== totalPages) {
    throw new Error("Page order must include each uploaded PDF page exactly once.");
  }

  const merged = await PDFDocument.create();
  for (const entry of finalOrder) {
    const [page] = await merged.copyPages(sourceDocs[entry.fileIndex], [
      entry.pageIndex,
    ]);
    merged.addPage(page);
  }

  const mergedBytes = await merged.save();
  const outputBaseName = sanitizeOutputName(
    fileName ?? "Merged PDF Document",
    "Merged PDF Document",
  );

  return {
    buffer: Buffer.from(mergedBytes),
    outputName: withExtension(outputBaseName, ".pdf"),
    mergedPageCount: totalPages,
  };
};

export const mergeExcelBuffers = async ({
  inputFiles,
  fileName,
  excelPageNames,
}: MergeExcelBuffersOptions): Promise<{
  buffer: Buffer;
  outputName: string;
  mergedSheetCount: number;
}> => {
  if (inputFiles.length < 2) {
    throw new Error("Please upload at least two Excel files.");
  }

  const mergedWorkbook = new ExcelJS.Workbook();
  const usedSheetNames = new Set<string>();
  let mergedSheetCount = 0;

  const cloneValue = <T,>(value: T): T => {
    if (value === null || value === undefined) return value;
    if (value instanceof Date) return new Date(value.getTime()) as T;
    if (typeof value === "object") {
      return structuredClone(value);
    }
    return value;
  };

  const cloneValueOrUndefined = <T,>(value: T): T => {
    if (!value) return value;
    return structuredClone(value);
  };

  const cloneJsonValue = <T,>(value: T): T => {
    if (value === undefined || value === null) return value;
    return JSON.parse(JSON.stringify(value)) as T;
  };

  const pruneEmpty = (value: unknown): unknown => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) {
      const next = value.map((item) => pruneEmpty(item));
      return next;
    }
    if (typeof value !== "object") return value;

    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, pruneEmpty(val)] as const)
      .filter(([, val]) => val !== undefined);
    if (entries.length === 0) return undefined;
    return Object.fromEntries(entries);
  };

  const copyWorksheet = (
    sourceSheet: ExcelJS.Worksheet,
    targetSheet: ExcelJS.Worksheet,
  ): void => {
    targetSheet.state = sourceSheet.state;
    targetSheet.properties =
      cloneValueOrUndefined(sourceSheet.properties) ?? targetSheet.properties;
    targetSheet.pageSetup =
      cloneValueOrUndefined(sourceSheet.pageSetup) ?? targetSheet.pageSetup;
    targetSheet.headerFooter =
      cloneValueOrUndefined(sourceSheet.headerFooter) ?? targetSheet.headerFooter;
    targetSheet.views = cloneValueOrUndefined(sourceSheet.views) ?? [];
    targetSheet.autoFilter = cloneValueOrUndefined(sourceSheet.autoFilter) as
      | ExcelJS.AutoFilter
      | undefined;

    sourceSheet.columns.forEach((column, index) => {
      const targetColumn = targetSheet.getColumn(index + 1);
      if (column.width !== undefined) targetColumn.width = column.width;
      if (column.hidden !== undefined) targetColumn.hidden = column.hidden;
      if (column.outlineLevel !== undefined) targetColumn.outlineLevel = column.outlineLevel;
    });

    sourceSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const targetRow = targetSheet.getRow(rowNumber);
      if (row.height !== undefined) targetRow.height = row.height;
      if (row.hidden !== undefined) targetRow.hidden = row.hidden;
      if (row.outlineLevel !== undefined) targetRow.outlineLevel = row.outlineLevel;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const targetCell = targetRow.getCell(colNumber);
        targetCell.value = cloneValue(cell.value);
        if (cell.numFmt) {
          targetCell.numFmt = cell.numFmt;
        }
        const font = pruneEmpty(cloneJsonValue(cell.font));
        if (font) {
          targetCell.font = font as ExcelJS.Font;
        }
        const alignment = pruneEmpty(cloneJsonValue(cell.alignment));
        if (alignment) {
          targetCell.alignment = alignment as ExcelJS.Alignment;
        }
        const fill = pruneEmpty(cloneJsonValue(cell.fill));
        if (fill && typeof fill === "object" && "type" in (fill as Record<string, unknown>)) {
          targetCell.fill = fill as ExcelJS.Fill;
        }
        const border = pruneEmpty(cloneJsonValue(cell.border));
        if (border && typeof border === "object") {
          targetCell.border = border as ExcelJS.Borders;
        }
        const protection = pruneEmpty(cloneJsonValue(cell.protection));
        if (protection && typeof protection === "object") {
          targetCell.protection = protection as Partial<ExcelJS.Protection>;
        }
      });

      targetRow.commit();
    });

    const merges = sourceSheet.model.merges ?? [];
    merges.forEach((range) => {
      targetSheet.mergeCells(range);
    });
  };

  for (let fileIndex = 0; fileIndex < inputFiles.length; fileIndex += 1) {
    const file = inputFiles[fileIndex];
    const workbook = new ExcelJS.Workbook();
    const bufferForLoad = file.buffer as unknown as ExcelLoadBuffer;
    await workbook.xlsx.load(bufferForLoad);
    const customPageName = excelPageNames?.[fileIndex]?.trim() ?? "";

    for (let sheetIndex = 0; sheetIndex < workbook.worksheets.length; sheetIndex += 1) {
      const sourceSheet = workbook.worksheets[sheetIndex];
      const desiredSheetName = customPageName
        ? workbook.worksheets.length === 1
          ? customPageName
          : `${customPageName} ${String(sheetIndex + 1)}`
        : sourceSheet.name;
      const uniqueSheetName = createUniqueSheetName(desiredSheetName, usedSheetNames);
      const targetSheet = mergedWorkbook.addWorksheet(uniqueSheetName);
      copyWorksheet(sourceSheet, targetSheet);
      mergedSheetCount += 1;
    }
  }

  if (mergedSheetCount === 0) {
    throw new Error("Uploaded Excel files do not contain readable worksheets.");
  }

  const outputBaseName = sanitizeOutputName(
    fileName ?? "Merged Excel Workbook",
    "Merged Excel Workbook",
  );
  const output = await mergedWorkbook.xlsx.writeBuffer();
  const outputBuffer = Buffer.isBuffer(output)
    ? output
    : Buffer.from(output as ArrayBuffer);

  return {
    buffer: outputBuffer,
    outputName: withExtension(outputBaseName, ".xlsx"),
    mergedSheetCount,
  };
};
