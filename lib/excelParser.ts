import * as XLSX from "xlsx";

export interface ParsedSheet {
  data: unknown[][];
  name: string;
  worksheet: XLSX.WorkSheet;
}

export const parseExcelFile = (buffer: Buffer): ParsedSheet[] => {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

    return {
      data: data as unknown[][],
      name: sheetName,
      worksheet,
    };
  });
};

export const getCellByAddress = (
  worksheet: XLSX.WorkSheet,
  address: string,
): string | number | undefined => {
  const cell = worksheet[address];
  if (!cell || cell.v === undefined || cell.v === null) return undefined;
  return typeof cell.v === "number"
    ? cell.v
    : String(cell.v).trim() || undefined;
};
