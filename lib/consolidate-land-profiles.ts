import XlsxPopulate from 'xlsx-populate';
import * as XLSX from 'xlsx';
import { HyperFormula } from 'hyperformula';

export interface LandProfileData {
  lotNo: string;
  ownerLastName: string;
  ownerFirstName: string;
  tillerLastName: string;
  tillerFirstName: string;
  area: string;
  principal: string;
  penalty: string;
  oldAccount: string;
  rowNumber: number;
  fileName: string;
}

export interface ConsolidationResult {
  success: boolean;
  processedCount: number;
  errors: string[];
  data: LandProfileData[];
}

/**
 * Extract the row number from the filename
 * Example: "01 2512-C-10B PUNZALAN, TIBURCIO.xlsx" -> 1
 */
export function extractRowNumberFromFilename(filename: string): number | null {
  const match = filename.match(/^(\d+)\s/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Get cell value from XLSX workbook, handling merged cells
 */
function getXLSXCellValue(worksheet: XLSX.WorkSheet, cellAddress: string): string {
  let cell = worksheet[cellAddress];
  
  // If cell not found, check if it's part of a merged cell
  if (!cell && worksheet['!merges']) {
    const decoded = XLSX.utils.decode_cell(cellAddress);
    
    for (const merge of worksheet['!merges']) {
      if (
        decoded.r >= merge.s.r &&
        decoded.r <= merge.e.r &&
        decoded.c >= merge.s.c &&
        decoded.c <= merge.e.c
      ) {
        // This cell is part of a merge - get the top-left cell of the merge
        const mergeStart = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
        cell = worksheet[mergeStart];
        console.log(`  ${cellAddress}: Part of merged cell, using ${mergeStart}`);
        break;
      }
    }
  }
  
  if (!cell) {
    console.log(`  ${cellAddress}: Cell not found (not merged either)`);
    return '';
  }
  
  console.log(`  ${cellAddress}: type=${cell.t}, v=${cell.v}, w=${cell.w}, f=${cell.f}`);
  
  // Get the calculated value (w property) or the raw value (v property)
  const value = cell.w !== undefined ? cell.w : cell.v;
  
  if (value === null || value === undefined) return '';
  
  // Handle numeric values
  if (typeof value === 'number') {
    return value.toString();
  }
  
  return String(value).trim();
}

/**
 * Calculate formulas in an Excel file and return a new buffer with static values
 */
async function calculateFormulas(fileBuffer: Buffer): Promise<Buffer> {
  try {
    console.log('Starting formula calculation...');
    
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    
    // Add all sheets to HyperFormula
    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      const sheetData: any[][] = [];
      for (let R = range.s.r; R <= range.e.r; R++) {
        const row: any[] = [];
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          
          if (!cell) {
            row.push(null);
          } else if (cell.f) {
            row.push(`=${cell.f}`);
          } else {
            row.push(cell.v);
          }
        }
        sheetData.push(row);
      }
      
      hf.addSheet(sheetName);
      hf.setSheetContent(sheetIndex, sheetData);
    });
    
    // Replace formulas with calculated values
    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.f) {
            try {
              const calculatedValue = hf.getCellValue({ sheet: sheetIndex, col: C, row: R });
              
              if (calculatedValue !== null && calculatedValue !== undefined && typeof calculatedValue !== 'object') {
                delete cell.f;
                cell.v = calculatedValue;
                
                if (typeof calculatedValue === 'number') {
                  cell.t = 'n';
                  cell.w = calculatedValue.toString();
                } else if (typeof calculatedValue === 'string') {
                  cell.t = 's';
                  cell.w = calculatedValue;
                }
              }
            } catch (cellError) {
              console.warn(`Could not calculate ${cellAddress}`);
            }
          }
        }
      }
    });
    
    const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(newBuffer);
  } catch (error) {
    console.error('Error calculating formulas:', error);
    return fileBuffer;
  }
}

/**
 * Find the "Sub-total" row and extract values from it
 */
function findSubtotalValues(worksheet: XLSX.WorkSheet): { principal: string; penalty: string; area: string } {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Scan through the sheet to find "Sub-total"
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v && String(cell.v).toLowerCase().includes('sub-total')) {
        console.log(`Found Sub-total at row ${R + 1}`);
        
        // Get values from this row
        const principalCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 3 })]; // Column D (index 3)
        const penaltyCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 5 })]; // Column F (index 5)
        
        const principal = principalCell ? (principalCell.w || principalCell.v || '') : '';
        const penalty = penaltyCell ? (penaltyCell.w || penaltyCell.v || '') : '';
        
        console.log(`  Principal (D${R + 1}): ${principal}`);
        console.log(`  Penalty (F${R + 1}): ${penalty}`);
        
        return {
          principal: String(principal).trim(),
          penalty: String(penalty).trim(),
          area: '', // Will find separately
        };
      }
    }
  }
  
  return { principal: '', penalty: '', area: '' };
}

/**
 * Find the Area value (look for "Area" label and get the value next to it)
 */
function findAreaValue(worksheet: XLSX.WorkSheet): string {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Scan for "Area" label
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v && String(cell.v).toLowerCase().includes('area')) {
        console.log(`Found Area label at ${cellAddress}`);
        
        // Try to get value from adjacent cells
        const rightCell = worksheet[XLSX.utils.encode_cell({ r: R, c: C + 1 })];
        const belowCell = worksheet[XLSX.utils.encode_cell({ r: R + 1, c: C })];
        
        if (rightCell && rightCell.v && typeof rightCell.v === 'number') {
          console.log(`  Area value (right): ${rightCell.v}`);
          return String(rightCell.v);
        }
        
        if (belowCell && belowCell.v && typeof belowCell.v === 'number') {
          console.log(`  Area value (below): ${belowCell.v}`);
          return String(belowCell.v);
        }
      }
    }
  }
  
  return '';
}

/**
 * Extract data from a single land profile Excel file
 * Uses XLSX library for reading (better formula support)
 */
export async function extractLandProfileData(
  fileBuffer: Buffer,
  fileName: string
): Promise<LandProfileData | null> {
  try {
    // Read directly without formula calculation
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get the row number from filename
    const rowNumber = extractRowNumberFromFilename(fileName);
    if (rowNumber === null) {
      throw new Error(`Cannot extract row number from filename: ${fileName}`);
    }
    
    console.log(`\n=== Processing ${fileName} ===`);
    console.log(`Row number from filename: ${rowNumber}`);
    
    // DEBUG: List ALL cells in the SOA sheet to see what exists
    console.log('\n=== ALL CELLS IN 01 SOA 01 SHEET ===');
    const soaRange = XLSX.utils.decode_range(soaSheet['!ref'] || 'A1');
    let cellCount = 0;
    for (let R = soaRange.s.r; R <= Math.min(soaRange.e.r, 110); R++) {
      for (let C = soaRange.s.c; C <= soaRange.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = soaSheet[addr];
        if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
          console.log(`  ${addr}: ${cell.v} (type=${cell.t}, formula=${cell.f ? 'YES' : 'NO'})`);
          cellCount++;
          if (cellCount > 50) {
            console.log('  ... (truncated, too many cells)');
            break;
          }
        }
      }
      if (cellCount > 50) break;
    }
    console.log('=== END CELL DUMP ===\n');
    
    // Check if required sheets exist
    const accDetailsSheet = workbook.Sheets['00 ACC DETAILS 01'];
    const soaSheet = workbook.Sheets['01 SOA 01'];
    
    if (!accDetailsSheet) {
      throw new Error(`Sheet "00 ACC DETAILS 01" not found in ${fileName}`);
    }
    
    if (!soaSheet) {
      throw new Error(`Sheet "01 SOA 01" not found in ${fileName}`);
    }
    
    // Extract data from specific cells using XLSX
    const lotNo = getXLSXCellValue(accDetailsSheet, 'C3');
    const ownerFirstName = getXLSXCellValue(accDetailsSheet, 'C7');
    const ownerLastName = getXLSXCellValue(accDetailsSheet, 'C9');
    const tillerFirstName = getXLSXCellValue(accDetailsSheet, 'C11');
    const tillerLastName = getXLSXCellValue(accDetailsSheet, 'C13');
    
    // Find Sub-total row and extract principal/penalty
    const subtotalValues = findSubtotalValues(soaSheet);
    const area = findAreaValue(soaSheet);
    const oldAccount = getXLSXCellValue(soaSheet, 'G101');
    
    console.log(`Area: ${area}`);
    console.log(`Principal: ${subtotalValues.principal}`);
    console.log(`Penalty: ${subtotalValues.penalty}`);
    console.log(`Old Account: ${oldAccount}`);
    
    const data: LandProfileData = {
      lotNo,
      ownerFirstName,
      ownerLastName,
      tillerFirstName,
      tillerLastName,
      area,
      principal: subtotalValues.principal,
      penalty: subtotalValues.penalty,
      oldAccount,
      rowNumber,
      fileName,
    };
    
    console.log('Extracted data:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error(`Error extracting data from ${fileName}:`, error);
    return null;
  }
}

/**
 * Set cell value in template, converting to appropriate type
 */
function setTemplateCell(
  sheet: XlsxPopulate.Sheet,
  cellAddress: string,
  value: string
): void {
  try {
    // Try to parse as number if it looks like one
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-') {
      sheet.cell(cellAddress).value('');
      return;
    }
    
    const parsed = Number(trimmed.replace(/,/g, ''));
    if (!Number.isNaN(parsed) && trimmed.match(/^-?\d+(\.\d+)?$/)) {
      sheet.cell(cellAddress).value(parsed);
    } else {
      sheet.cell(cellAddress).value(trimmed);
    }
  } catch (error) {
    console.error(`Error setting cell ${cellAddress}:`, error);
  }
}

/**
 * Consolidate multiple land profiles into a template
 */
export async function consolidateLandProfiles(
  templateBuffer: Buffer,
  landProfileFiles: { buffer: Buffer; fileName: string }[]
): Promise<{ buffer: Buffer; result: ConsolidationResult }> {
  const result: ConsolidationResult = {
    success: true,
    processedCount: 0,
    errors: [],
    data: [],
  };
  
  try {
    // Load template using XlsxPopulate to preserve formatting
    const workbook = await XlsxPopulate.fromDataAsync(templateBuffer);
    const sheet = workbook.sheet(0);
    
    // Process each land profile file
    for (const file of landProfileFiles) {
      try {
        const data = await extractLandProfileData(file.buffer, file.fileName);
        
        if (!data) {
          result.errors.push(`Failed to extract data from ${file.fileName}`);
          continue;
        }
        
        // Calculate the actual row in the template (row number + 2 because rows 1-2 are headers)
        const templateRow = data.rowNumber + 2;
        
        // Write data to template - ONLY populate cells, don't modify structure
        setTemplateCell(sheet, `B${templateRow}`, data.lotNo);
        setTemplateCell(sheet, `C${templateRow}`, data.ownerLastName);
        setTemplateCell(sheet, `D${templateRow}`, data.ownerFirstName);
        setTemplateCell(sheet, `F${templateRow}`, data.tillerLastName);
        setTemplateCell(sheet, `G${templateRow}`, data.tillerFirstName);
        setTemplateCell(sheet, `I${templateRow}`, data.area);
        setTemplateCell(sheet, `J${templateRow}`, data.principal);
        setTemplateCell(sheet, `K${templateRow}`, data.penalty);
        setTemplateCell(sheet, `L${templateRow}`, data.oldAccount);
        
        result.data.push(data);
        result.processedCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error processing ${file.fileName}: ${errorMsg}`);
      }
    }
    
    // Generate buffer from workbook
    const output = await workbook.outputAsync();
    const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
    
    return { buffer, result };
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error ? error.message : 'Unknown error during consolidation'
    );
    throw error;
  }
}
