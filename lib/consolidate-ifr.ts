import * as XLSX from "xlsx";
import XlsxPopulate from "xlsx-populate";
import { logger } from "@/lib/logger";
import {
  roundHalfUp,
  shouldSkipSeason,
  buildCropSeasonCode,
  calculateSeasonCharges,
  extractRowData,
  type LotGroup,
} from "./consolidate-ifr-helpers";

export interface IFRLotData {
  lotCode: string;
  ownerLastName: string;
  ownerFirstName: string;
  tillerLastName: string;
  tillerFirstName: string;
  area: number;
  principal: number;
  penalty: number;
  oldAccount: number;
  total: number;
  rowNumber: number;
  fileName: string;
  numberOfSeasons: number;
}

/**
 * Extract and calculate data from a single IFR file
 * Returns an array of lot data (one IFR can have multiple lots)
 */
export async function extractIFRData(
  fileBuffer: Buffer,
  fileName: string,
): Promise<IFRLotData[]> {
  try {
    // Read with XLSX for data extraction
    const workbook = XLSX.read(fileBuffer, {
      type: "buffer",
      cellFormula: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    if (!sheet) {
      throw new Error(`No sheet found in ${fileName}`);
    }

    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

    const lotGroups = new Map<string, LotGroup>();

    for (let row = 2; row <= range.e.r; row++) {
      const rowData = extractRowData(sheet, row);

      if (!rowData.lotCode) continue;

      const lotKey = String(rowData.lotCode);

      if (!lotGroups.has(lotKey)) {
        lotGroups.set(lotKey, {
          lotCode: lotKey,
          ownerLastName: rowData.ownerLastName,
          ownerFirstName: rowData.ownerFirstName,
          tillerLastName: rowData.tillerLastName,
          tillerFirstName: rowData.tillerFirstName,
          oldAccount: rowData.oldAccount,
          latestArea: 0,
          latestYear: 0,
          totalPrincipal: 0,
          totalPenalty: 0,
          numberOfSeasons: 0,
          seenSeasons: new Set(),
        });
      }

      const group = lotGroups.get(lotKey)!;

      if (rowData.cropYear && rowData.area) {
        if (rowData.cropYear > group.latestYear) {
          group.latestYear = rowData.cropYear;
          group.latestArea = rowData.area;
        }
      }

      if (!rowData.cropSeason || !rowData.cropYear || !rowData.area) continue;

      if (shouldSkipSeason(rowData.cropYear, rowData.cropSeason)) continue;

      const cropSeasonCode = buildCropSeasonCode(rowData.cropYear, rowData.cropSeason);

      if (group.seenSeasons.has(cropSeasonCode)) continue;
      group.seenSeasons.add(cropSeasonCode);

      const charges = calculateSeasonCharges(rowData.area, cropSeasonCode);
      if (!charges) continue;

      group.totalPrincipal += charges.principal;
      group.totalPenalty += charges.penalty;
      group.numberOfSeasons++;
    }

    // Convert to array of results
    const results: IFRLotData[] = [];
    for (const group of lotGroups.values()) {
      const principal = roundHalfUp(group.totalPrincipal, 2);
      const penalty = roundHalfUp(group.totalPenalty, 2);
      const oldAccount = roundHalfUp(group.oldAccount, 2);
      const total = roundHalfUp(principal + penalty + oldAccount, 2);

      results.push({
        lotCode: group.lotCode,
        ownerLastName: group.ownerLastName,
        ownerFirstName: group.ownerFirstName,
        tillerLastName: group.tillerLastName,
        tillerFirstName: group.tillerFirstName,
        area: roundHalfUp(group.latestArea, 4),
        principal,
        penalty,
        oldAccount,
        total,
        rowNumber: 0, // Will be assigned during consolidation
        fileName,
        numberOfSeasons: group.numberOfSeasons,
      });
    }

    return results;
  } catch (error) {
    logger.error(`Error extracting from ${fileName}:`, error);
    return [];
  }
}

/**
 * Consolidate multiple IFR files into a template
 */
export async function consolidateIFR(
  templateBuffer: Buffer,
  ifrFiles: { buffer: Buffer; fileName: string }[],
): Promise<{
  buffer: Buffer;
  processedCount: number;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let processedCount = 0;

  try {
    const workbook = await XlsxPopulate.fromDataAsync(templateBuffer);
    const sheet = workbook.sheet(0);

    let currentRow = 3; // Start from row 3 (row 1 is header, row 2 is first data)

    for (const file of ifrFiles) {
      try {
        const lotsData = await extractIFRData(file.buffer, file.fileName);

        if (lotsData.length === 0) {
          errors.push(`No data extracted from ${file.fileName}`);
          continue;
        }

        // Write each lot to a separate row
        for (const data of lotsData) {
          sheet.cell(`B${currentRow}`).value(data.lotCode);
          sheet.cell(`C${currentRow}`).value(data.ownerLastName);
          sheet.cell(`D${currentRow}`).value(data.ownerFirstName);
          sheet.cell(`F${currentRow}`).value(data.tillerLastName);
          sheet.cell(`G${currentRow}`).value(data.tillerFirstName);
          sheet.cell(`I${currentRow}`).value(data.area);
          sheet.cell(`J${currentRow}`).value(data.principal);
          sheet.cell(`K${currentRow}`).value(data.penalty);
          sheet.cell(`L${currentRow}`).value(data.oldAccount);
          sheet.cell(`M${currentRow}`).value(data.total);

          currentRow++;
          processedCount++;
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Error processing ${file.fileName}: ${errorMsg}`);
      }
    }

    if (processedCount > 0) {
      warnings.push(
        `Successfully consolidated ${processedCount} IFR files with calculated Principal and Penalty values.`,
      );
    }

    const output = await workbook.outputAsync();
    const buffer = Buffer.isBuffer(output)
      ? output
      : Buffer.from(output as ArrayBuffer);

    return { buffer, processedCount, errors, warnings };
  } catch (error) {
    throw error;
  }
}
