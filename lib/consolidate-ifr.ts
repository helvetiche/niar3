import * as XLSX from 'xlsx';
import XlsxPopulate from 'xlsx-populate';
import { lookupIrrigationRate } from './irrigation-rate-table';

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
 */
export async function extractIFRData(
  fileBuffer: Buffer,
  fileName: string
): Promise<IFRLotData | null> {
  try {
    const rowNumber = parseInt(fileName.match(/^(\d+)\s/)?.[1] || '0', 10);
    if (!rowNumber) {
      throw new Error(`Cannot extract row number from filename: ${fileName}`);
    }

    // Read with XLSX for data extraction
    const workbook = XLSX.read(fileBuffer, {
      type: 'buffer',
      cellFormula: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    if (!sheet) {
      throw new Error(`No sheet found in ${fileName}`);
    }

    // Column mapping
    const COL_LOT_CODE = 'C';
    const COL_CROP_SEASON = 'D';
    const COL_CROP_YEAR = 'E';
    const COL_PLANTED_AREA = 'H';
    const COL_OWNER_LAST = 'M';
    const COL_OWNER_FIRST = 'N';
    const COL_TILLER_LAST = 'O';
    const COL_TILLER_FIRST = 'P';
    const COL_OLD_ACCOUNT = 'Q';

    // Get lot code and names from first data row
    const lotCode = sheet[`${COL_LOT_CODE}2`]?.v;
    const ownerLastName = sheet[`${COL_OWNER_LAST}2`]?.v || '';
    const ownerFirstName = sheet[`${COL_OWNER_FIRST}2`]?.v || '';
    const tillerLastName = sheet[`${COL_TILLER_LAST}2`]?.v || '';
    const tillerFirstName = sheet[`${COL_TILLER_FIRST}2`]?.v || '';
    const oldAccount = parseFloat(String(sheet[`${COL_OLD_ACCOUNT}2`]?.v || 0));

    if (!lotCode) {
      throw new Error(`No lot code found in ${fileName}`);
    }

    // Calculate principal and penalty from all crop seasons
    let totalPrincipal = 0;
    let totalPenalty = 0;
    let totalArea = 0;
    let numberOfSeasons = 0;
    const seenSeasons = new Set<string>();

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let row = 2; row <= range.e.r; row++) {
      const cropSeason = sheet[`${COL_CROP_SEASON}${row}`]?.v;
      const cropYear = sheet[`${COL_CROP_YEAR}${row}`]?.v;
      const area = sheet[`${COL_PLANTED_AREA}${row}`]?.v;

      if (!cropSeason || !cropYear || !area) continue;

      // Skip years before 1976 (old accounts are prior to July 1, 1975)
      const yearNum = parseInt(String(cropYear));
      if (yearNum < 1976) continue;

      // Build crop season code
      const yearCode = yearNum >= 2000 ? String(yearNum) : String(yearNum).slice(-2);
      const seasonCode = String(cropSeason).toUpperCase() === 'DRY' ? 'D' : 'W';
      const cropSeasonCode = `${yearCode}-${seasonCode}`;

      // Skip duplicates
      if (seenSeasons.has(cropSeasonCode)) continue;
      seenSeasons.add(cropSeasonCode);

      // Lookup rate and penalty
      const rateData = lookupIrrigationRate(cropSeasonCode);
      if (!rateData) continue;

      // Calculate
      const areaNum = parseFloat(String(area));
      const principal = areaNum * rateData.rate;
      const penalty = principal * (rateData.penaltyMonths / 100);

      totalPrincipal += principal;
      totalPenalty += penalty;
      totalArea += areaNum;
      numberOfSeasons++;
    }

    const total = totalPrincipal + totalPenalty + oldAccount;

    return {
      lotCode: String(lotCode),
      ownerLastName: String(ownerLastName),
      ownerFirstName: String(ownerFirstName),
      tillerLastName: String(tillerLastName),
      tillerFirstName: String(tillerFirstName),
      area: parseFloat(totalArea.toFixed(4)),
      principal: parseFloat(totalPrincipal.toFixed(2)),
      penalty: parseFloat(totalPenalty.toFixed(2)),
      oldAccount: parseFloat(oldAccount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      rowNumber,
      fileName,
      numberOfSeasons,
    };
  } catch (error) {
    console.error(`Error extracting from ${fileName}:`, error);
    return null;
  }
}

/**
 * Consolidate multiple IFR files into a template
 */
export async function consolidateIFR(
  templateBuffer: Buffer,
  ifrFiles: { buffer: Buffer; fileName: string }[]
): Promise<{ buffer: Buffer; processedCount: number; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let processedCount = 0;

  try {
    const workbook = await XlsxPopulate.fromDataAsync(templateBuffer);
    const sheet = workbook.sheet(0);

    for (const file of ifrFiles) {
      try {
        const data = await extractIFRData(file.buffer, file.fileName);

        if (!data) {
          errors.push(`Failed to extract data from ${file.fileName}`);
          continue;
        }

        const templateRow = data.rowNumber + 2;

        // Write all extracted data
        sheet.cell(`B${templateRow}`).value(data.lotCode);
        sheet.cell(`C${templateRow}`).value(data.ownerLastName);
        sheet.cell(`D${templateRow}`).value(data.ownerFirstName);
        sheet.cell(`F${templateRow}`).value(data.tillerLastName);
        sheet.cell(`G${templateRow}`).value(data.tillerFirstName);
        sheet.cell(`I${templateRow}`).value(data.area);
        sheet.cell(`J${templateRow}`).value(data.principal);
        sheet.cell(`K${templateRow}`).value(data.penalty);
        sheet.cell(`L${templateRow}`).value(data.oldAccount);

        processedCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error processing ${file.fileName}: ${errorMsg}`);
      }
    }

    if (processedCount > 0) {
      warnings.push(`Successfully consolidated ${processedCount} IFR files with calculated Principal and Penalty values.`);
    }

    const output = await workbook.outputAsync();
    const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);

    return { buffer, processedCount, errors, warnings };
  } catch (error) {
    throw error;
  }
}
