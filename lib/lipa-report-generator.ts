import ExcelJS from "exceljs";

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

const createThinBorder = () => ({
  top: { style: "thin" as const },
  left: { style: "thin" as const },
  bottom: { style: "thin" as const },
  right: { style: "thin" as const },
});

export const generateLipaReportWorkbook = async ({
  report,
  outputFileName,
}: {
  report: LipaReportData;
  outputFileName?: string;
}): Promise<{ buffer: Buffer; outputName: string }> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  worksheet.columns = [{ width: 8 }, { width: 60 }, { width: 24 }];

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
  };

  worksheet.views = [
    {
      showGridLines: false,
      zoomScale: 60,
      zoomScaleNormal: 100,
    },
  ];

  const titleRow = worksheet.addRow([report.title]);
  titleRow.getCell(1).font = { name: "Cambria", size: 12, bold: true };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFCCCCCC" },
  };
  worksheet.mergeCells("A1:C1");

  const seasonRow = worksheet.addRow([report.season]);
  seasonRow.getCell(1).font = { name: "Cambria", size: 12, bold: true };
  seasonRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  seasonRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFCCCCCC" },
  };
  worksheet.mergeCells("A2:C2");

  worksheet.addRow([]);

  const headerRow = worksheet.addRow([
    "NO.",
    "IRRIGATORS ASSOCIATION",
    "TOTAL PLANTED AREA",
  ]);
  headerRow.getCell(1).font = { name: "Cambria", size: 12, bold: true };
  headerRow.getCell(2).font = { name: "Cambria", size: 12, bold: true };
  headerRow.getCell(3).font = { name: "Cambria", size: 12, bold: true };
  headerRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  headerRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
  headerRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
  headerRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3D3D3" },
  };
  headerRow.getCell(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3D3D3" },
  };
  headerRow.getCell(3).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3D3D3" },
  };
  headerRow.getCell(1).border = createThinBorder();
  headerRow.getCell(2).border = createThinBorder();
  headerRow.getCell(3).border = createThinBorder();

  let grandTotal = 0;

  report.divisions.forEach((division) => {
    const cleanName = division.divisionName.replace(/\.pdf$/i, "");
    const divisionRow = worksheet.addRow([cleanName]);
    divisionRow.getCell(1).font = { name: "Cambria", size: 12, bold: true };
    divisionRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFCE4D6" },
    };
    worksheet.mergeCells(`A${divisionRow.number}:C${divisionRow.number}`);

    division.irrigators.forEach((irrigator, index) => {
      const row = worksheet.addRow([
        index + 1,
        irrigator.name,
        irrigator.totalPlantedArea,
      ]);
      row.font = { name: "Cambria", size: 12 };
      row.getCell(1).alignment = { horizontal: "left" };
      row.getCell(3).numFmt = "#,##0.00";
      row.eachCell((cell) => {
        cell.border = createThinBorder();
      });
    });

    const totalRow = worksheet.addRow(["TOTAL", "", division.total]);
    totalRow.font = { name: "Cambria", size: 12, bold: true };
    totalRow.getCell(1).alignment = { horizontal: "left" };
    totalRow.getCell(3).numFmt = "#,##0.00";
    totalRow.getCell(1).border = createThinBorder();
    totalRow.getCell(2).border = createThinBorder();
    totalRow.getCell(3).border = createThinBorder();
    grandTotal += division.total;

    worksheet.addRow([]);
  });

  const grandTotalRow = worksheet.addRow(["GRAND TOTAL", "", grandTotal]);
  worksheet.mergeCells(`A${grandTotalRow.number}:B${grandTotalRow.number}`);
  grandTotalRow.getCell(1).font = { name: "Cambria", size: 12, bold: true };
  grandTotalRow.getCell(3).font = { name: "Cambria", size: 12, bold: true };
  grandTotalRow.getCell(1).alignment = { horizontal: "left" };
  grandTotalRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF92D052" },
  };
  grandTotalRow.getCell(3).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF92D052" },
  };
  grandTotalRow.getCell(3).numFmt = "#,##0.00";
  grandTotalRow.getCell(1).border = createThinBorder();
  grandTotalRow.getCell(2).border = createThinBorder();
  grandTotalRow.getCell(3).border = createThinBorder();

  worksheet.pageSetup.printArea = `A1:C${grandTotalRow.number}`;

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    outputName: normalizeOutputName(outputFileName || "LIPA Summary Report"),
  };
};
