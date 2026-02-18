import { PDFDocument } from "pdf-lib";
import * as XLSX from "xlsx";

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
};

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

export const mergeExcelBuffers = ({
  inputFiles,
  fileName,
}: MergeExcelBuffersOptions): {
  buffer: Buffer;
  outputName: string;
  mergedSheetCount: number;
} => {
  if (inputFiles.length < 2) {
    throw new Error("Please upload at least two Excel files.");
  }

  const mergedWorkbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();
  let mergedSheetCount = 0;

  for (const file of inputFiles) {
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const workbookSheetNames = workbook.SheetNames ?? [];

    for (const sheetName of workbookSheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const workbookName =
        file.fileName.replace(/\.(xlsx|xls)$/i, "").trim() || "Workbook";
      const desiredSheetName = `${workbookName} - ${sheetName}`;
      const uniqueSheetName = createUniqueSheetName(
        desiredSheetName,
        usedSheetNames,
      );

      XLSX.utils.book_append_sheet(mergedWorkbook, worksheet, uniqueSheetName);
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
  const output = XLSX.write(mergedWorkbook, { bookType: "xlsx", type: "buffer" });

  return {
    buffer: Buffer.from(output),
    outputName: withExtension(outputBaseName, ".xlsx"),
    mergedSheetCount,
  };
};
