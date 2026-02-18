import XlsxPopulate from "xlsx-populate";

export type LipaIrrigator = {
  name: string;
  totalPlantedArea: number;
};

export type LipaDivision = {
  divisionName: string;
  irrigators: LipaIrrigator[];
  total: number;
};

export type LipaReportData = {
  title: string;
  season: string;
  divisions: LipaDivision[];
};

const sanitizeFileName = (value: string): string =>
  value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, " ").trim();

const normalizeOutputName = (value: string): string => {
  const safeBase = sanitizeFileName(value || "LIPA Summary Report");
  if (!safeBase) return "LIPA Summary Report.xlsx";
  return safeBase.toLowerCase().endsWith(".xlsx") ? safeBase : `${safeBase}.xlsx`;
};

export const generateLipaReportWorkbook = async ({
  report,
  outputFileName,
}: {
  report: LipaReportData;
  outputFileName?: string;
}): Promise<{ buffer: Buffer; outputName: string }> => {
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);

  const setCellValue = (address: string, value: string | number) => {
    sheet.cell(address).value(value);
  };
  const setNumericCell = (address: string, value: number) => {
    sheet.cell(address).value(value);
    sheet.cell(address).style("numberFormat", '#,##0.00;-#,##0.00;"-"');
  };

  setCellValue("A1", report.title);
  setCellValue("A2", report.season);

  setCellValue("A4", "NO.");
  setCellValue("B4", "IRRIGATORS ASSOCIATION");
  setCellValue("C4", "TOTAL PLANTED AREA");

  let row = 5;
  let grandTotal = 0;

  for (const division of report.divisions) {
    const safeDivisionName = division.divisionName.trim() || "UNNAMED DIVISION";
    setCellValue(`A${String(row)}`, safeDivisionName);
    row += 1;

    division.irrigators.forEach((irrigator, index) => {
      setCellValue(`A${String(row)}`, index + 1);
      setCellValue(`B${String(row)}`, irrigator.name);
      setNumericCell(`C${String(row)}`, irrigator.totalPlantedArea);
      row += 1;
    });

    setCellValue(`A${String(row)}`, "TOTAL");
    setNumericCell(`C${String(row)}`, division.total);
    grandTotal += division.total;
    row += 2;
  }

  setCellValue(`A${String(row)}`, "GRAND TOTAL");
  setNumericCell(`C${String(row)}`, grandTotal);

  const output = await workbook.outputAsync();
  const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
  return {
    buffer,
    outputName: normalizeOutputName(outputFileName || "LIPA Summary Report"),
  };
};
