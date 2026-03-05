import * as XLSX from "xlsx";
import XlsxPopulate from "xlsx-populate";
import { lookupIrrigationRate } from "./irrigation-rate-table";

/**
 * Round a number to specified decimal places using "round half up" method
 * This matches Excel's ROUND function behavior
 */
function roundHalfUp(num: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier + Number.EPSILON) / multiplier;
}

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

    // Column mapping
    const COL_LOT_CODE = "C";
    const COL_CROP_SEASON = "D";
    const COL_CROP_YEAR = "E";
    const COL_PLANTED_AREA = "H";
    const COL_OWNER_LAST = "M";
    const COL_OWNER_FIRST = "N";
    const COL_TILLER_LAST = "O";
    const COL_TILLER_FIRST = "P";
    const COL_OLD_ACCOUNT = "Q";

    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

    // Group data by lot code
    const lotGroups = new Map<
      string,
      {
        lotCode: string;
        ownerLastName: string;
        ownerFirstName: string;
        tillerLastName: string;
        tillerFirstName: string;
        oldAccount: number;
        latestArea: number;
        latestYear: number;
        totalPrincipal: number;
        totalPenalty: number;
        numberOfSeasons: number;
        seenSeasons: Set<string>;
      }
    >();

    for (let row = 2; row <= range.e.r; row++) {
      const lotCode = sheet[`${COL_LOT_CODE}${row}`]?.v;
      const cropSeason = sheet[`${COL_CROP_SEASON}${row}`]?.v;
      const cropYear = sheet[`${COL_CROP_YEAR}${row}`]?.v;
      const area = sheet[`${COL_PLANTED_AREA}${row}`]?.v;
      const ownerLastName = sheet[`${COL_OWNER_LAST}${row}`]?.v || "";
      const ownerFirstName = sheet[`${COL_OWNER_FIRST}${row}`]?.v || "";
      const tillerLastName = sheet[`${COL_TILLER_LAST}${row}`]?.v || "";
      const tillerFirstName = sheet[`${COL_TILLER_FIRST}${row}`]?.v || "";
      const oldAccountValue = parseFloat(
        String(sheet[`${COL_OLD_ACCOUNT}${row}`]?.v || 0),
      );

      if (!lotCode) continue;

      const lotKey = String(lotCode);

      // Initialize lot group if not exists
      if (!lotGroups.has(lotKey)) {
        lotGroups.set(lotKey, {
          lotCode: lotKey,
          ownerLastName: String(ownerLastName),
          ownerFirstName: String(ownerFirstName),
          tillerLastName: String(tillerLastName),
          tillerFirstName: String(tillerFirstName),
          oldAccount: oldAccountValue, // Take old account from first occurrence only
          latestArea: 0,
          latestYear: 0,
          totalPrincipal: 0,
          totalPenalty: 0,
          numberOfSeasons: 0,
          seenSeasons: new Set(),
        });
      }

      const group = lotGroups.get(lotKey)!;

      // Update latest area (use the most recent year's area)
      if (cropYear && area) {
        const yearNum = parseInt(String(cropYear));
        if (yearNum > group.latestYear) {
          group.latestYear = yearNum;
          group.latestArea = parseFloat(String(area));
        }
      }

      // Calculate principal and penalty if we have season data
      if (!cropSeason || !cropYear || !area) continue;

      // Skip years before 1975, and skip 75-D (before July 1, 1975)
      const yearNum = parseInt(String(cropYear));
      if (yearNum < 1975) continue;
      if (yearNum === 1975 && String(cropSeason).toUpperCase() === "DRY")
        continue;

      // Build crop season code
      const yearCode =
        yearNum >= 2000 ? String(yearNum) : String(yearNum).slice(-2);
      const seasonCode = String(cropSeason).toUpperCase() === "DRY" ? "D" : "W";
      const cropSeasonCode = `${yearCode}-${seasonCode}`;

      // Skip duplicates
      if (group.seenSeasons.has(cropSeasonCode)) continue;
      group.seenSeasons.add(cropSeasonCode);

      // Lookup rate and penalty
      const rateData = lookupIrrigationRate(cropSeasonCode);
      if (!rateData) continue;

      // Calculate using the area from THIS SPECIFIC ROW (not latest area)
      const areaNum = parseFloat(String(area));
      const principal = areaNum * rateData.rate;
      const penalty = principal * (rateData.penaltyMonths / 100);

      group.totalPrincipal += principal;
      group.totalPenalty += penalty;
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
    console.error(`Error extracting from ${fileName}:`, error);
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
