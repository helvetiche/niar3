"use client";

import ExcelJS from "exceljs";
import type { InventoryItem } from "@/lib/db/inventory-types";

export type ExcelExportOptions = {
  items: InventoryItem[];
  years: number[];
  month?: string;
};

export async function exportInventoryToExcel({
  items,
  years,
  month = "MARCH",
}: ExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Create a worksheet for each year
  years.forEach((year) => {
    const worksheet = workbook.addWorksheet(`${year}`);

    // Title
    const title = `STOCK AS OF ${month} 09, ${year}`;
    worksheet.mergeCells("A1:P1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = { name: "Calibri", size: 14, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.border = {
      top: { style: "medium" },
      left: { style: "medium" },
      bottom: { style: "medium" },
      right: { style: "medium" },
    };

    // Main header row (row 2)
    const mainHeaderRow = worksheet.addRow([
      "",
      "",
      "",
      "",
      "1ST QUARTER",
      "",
      "",
      "2ND QUARTER",
      "",
      "",
      "3RD QUARTER",
      "",
      "",
      "4TH QUARTER",
      "",
      "",
    ]);

    // Sub-header row (row 3)
    const subHeaderRow = worksheet.addRow([
      "STOCK NO.",
      "ITEMS NAME",
      "PCS",
      "UNIT",
      "REQUEST",
      "RECEIVED",
      "BALANCE",
      "REQUEST",
      "RECEIVED",
      "BALANCE",
      "REQUEST",
      "RECEIVED",
      "BALANCE",
      "REQUEST",
      "RECEIVED",
      "BALANCE",
    ]);

    // Merge cells for quarter headers only
    worksheet.mergeCells("E2:G2");
    worksheet.mergeCells("H2:J2");
    worksheet.mergeCells("K2:M2");
    worksheet.mergeCells("N2:P2");

    // Style header rows
    [mainHeaderRow, subHeaderRow].forEach((row) => {
      row.eachCell((cell) => {
        cell.font = { name: "Calibri", size: 10, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9D9D9" },
        };
        cell.border = {
          top: { style: "medium" },
          left: { style: "medium" },
          bottom: { style: "medium" },
          right: { style: "medium" },
        };
      });
    });

    // Add data rows
    items.forEach((item, index) => {
      const yearlyData = item.yearlyData?.[year] || {};
      const q1 = yearlyData.q1 || { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 };
      const q2 = yearlyData.q2 || { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 };
      const q3 = yearlyData.q3 || { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 };
      const q4 = yearlyData.q4 || { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 };

      // Calculate totals and balances for each quarter
      const q1Total = (q1.baseQuantity || 0) + (q1.requestedQuantity ?? 0);
      const q1Remaining = q1Total - (q1.receivedQuantity ?? 0);
      const q1Balance = q1Remaining > 0 ? q1Remaining : 0;

      const q2RequestedWithRollover = (q2.baseQuantity || 0) + (q2.requestedQuantity ?? 0) + (q1Remaining > 0 ? q1Remaining : 0);
      const q2ReceivedWithRollover = (q2.receivedQuantity ?? 0) + (q1Remaining < 0 ? Math.abs(q1Remaining) : 0);
      const q2Remaining = q2RequestedWithRollover - q2ReceivedWithRollover;
      const q2Balance = q2Remaining > 0 ? q2Remaining : 0;

      const q3RequestedWithRollover = (q3.baseQuantity || 0) + (q3.requestedQuantity ?? 0) + (q2Remaining > 0 ? q2Remaining : 0);
      const q3ReceivedWithRollover = (q3.receivedQuantity ?? 0) + (q2Remaining < 0 ? Math.abs(q2Remaining) : 0);
      const q3Remaining = q3RequestedWithRollover - q3ReceivedWithRollover;
      const q3Balance = q3Remaining > 0 ? q3Remaining : 0;

      const q4RequestedWithRollover = (q4.baseQuantity || 0) + (q4.requestedQuantity ?? 0) + (q3Remaining > 0 ? q3Remaining : 0);
      const q4ReceivedWithRollover = (q4.receivedQuantity ?? 0) + (q3Remaining < 0 ? Math.abs(q3Remaining) : 0);
      const q4Remaining = q4RequestedWithRollover - q4ReceivedWithRollover;
      const q4Balance = q4Remaining > 0 ? q4Remaining : 0;

      const dataRow = worksheet.addRow([
        index + 1,
        item.name,
        item.stockAmount,
        item.unit,
        q1Total,
        q1.receivedQuantity ?? 0,
        q1Balance,
        q2RequestedWithRollover,
        q2ReceivedWithRollover,
        q2Balance,
        q3RequestedWithRollover,
        q3ReceivedWithRollover,
        q3Balance,
        q4RequestedWithRollover,
        q4ReceivedWithRollover,
        q4Balance,
      ]);

      // Style data row
      dataRow.eachCell((cell, colNumber) => {
        if (colNumber <= 4) {
          cell.font = { name: "Calibri", bold: true };
        } else {
          cell.font = { name: "Calibri" };
        }

        if (colNumber === 2) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }

        if ([5, 8, 11, 14].includes(colNumber)) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE8F5E9" },
          };
        } else if ([6, 9, 12, 15].includes(colNumber)) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFE0B2" },
          };
        } else if ([7, 10, 13, 16].includes(colNumber)) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEBEE" },
          };
        }

        cell.border = {
          top: { style: "medium" },
          left: { style: "medium" },
          bottom: { style: "medium" },
          right: { style: "medium" },
        };
      });
    });

    // Set column widths
    worksheet.columns = [
      { width: 8 },
      { width: 30 },
      { width: 8 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
    ];
  });

  // Generate filename
  const filename = `Inventory_${years.join("-")}_${month}.xlsx`;

  // Write file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
