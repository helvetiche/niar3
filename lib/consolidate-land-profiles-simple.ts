import XlsxPopulate from 'xlsx-populate';
import * as XLSX from 'xlsx';

export interface SimpleLandProfileData {
  lotNo: string;
  ownerLastName: string;
  ownerFirstName: string;
  tillerLastName: string;
  tillerFirstName: string;
  oldAccount: string;
  area: string;
  principal: string;
  penalty: string;
  rowNumber: number;
  fileName: string;
}

/**
 * Extract ONLY the data that actually exists (no formulas)
 */
export async function extractSimpleLandProfileData(
  fileBuffer: Buffer,
  fileName: string
): Promise<SimpleLandProfileData | null> {
  try {
    console.log(`\nExtracting from: ${fileName}`);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    console.log(`  Sheets found: ${workbook.SheetNames.join(', ')}`);
    
    const rowNumber = parseInt(fileName.match(/^(\d+)\s/)?.[1] || '0', 10);
    if (!rowNumber) {
      throw new Error(`Cannot extract row number from filename: ${fileName}`);
    }
    
    console.log(`  Row number: ${rowNumber}`);
    
    const accDetailsSheet = workbook.Sheets['00 ACC DETAILS 01'];
    if (!accDetailsSheet) {
      console.error(`  ERROR: Sheet "00 ACC DETAILS 01" not found`);
      throw new Error(`Sheet "00 ACC DETAILS 01" not found`);
    }
    
    const soaSheet = workbook.Sheets['01 SOA 01'];
    if (!soaSheet) {
      console.error(`  ERROR: Sheet "01 SOA 01" not found`);
      throw new Error(`Sheet "01 SOA 01" not found`);
    }
    
    const getCell = (sheet: XLSX.WorkSheet, addr: string) => {
      const cell = sheet[addr];
      if (!cell) {
        console.log(`    Cell ${addr}: NOT FOUND`);
        return '';
      }
      
      console.log(`    Cell ${addr}: type=${cell.t}, v=${cell.v}, w=${cell.w}, f=${cell.f}`);
      
      // If cell has a calculated value, use it
      if (cell.v !== undefined) {
        return String(cell.w || cell.v || '').trim();
      }
      
      // If cell has a formula but no value, we need to calculate it
      if (cell.f) {
        console.log(`      → Formula detected: ${cell.f}`);
        
        // Try to calculate simple SUM formulas
        const sumMatch = cell.f.match(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/i);
        if (sumMatch) {
          const [, startCol, startRow, endCol, endRow] = sumMatch;
          console.log(`      → SUM formula: ${startCol}${startRow}:${endCol}${endRow}`);
          if (startCol === endCol) {
            // Sum a single column
            let sum = 0;
            const colIndex = XLSX.utils.decode_col(startCol);
            for (let r = parseInt(startRow) - 1; r < parseInt(endRow); r++) {
              const cellAddr = XLSX.utils.encode_cell({ r, c: colIndex });
              const cellValue = sheet[cellAddr];
              if (cellValue && typeof cellValue.v === 'number') {
                sum += cellValue.v;
              }
            }
            console.log(`      → Calculated SUM: ${sum}`);
            return String(sum);
          }
        }
        
        // Try to calculate LOOKUP formula (gets last non-empty value in range)
        const lookupMatch = cell.f.match(/LOOKUP\([^,]+,[^,]+,([A-Z]+)(\d+):([A-Z]+)(\d+)\)/i);
        if (lookupMatch) {
          const [, startCol, startRow, endCol, endRow] = lookupMatch;
          console.log(`      → LOOKUP formula: ${startCol}${startRow}:${endCol}${endRow}`);
          if (startCol === endCol) {
            // Find last non-empty value in column
            const colIndex = XLSX.utils.decode_col(startCol);
            let lastValue = '';
            for (let r = parseInt(startRow) - 1; r < parseInt(endRow); r++) {
              const cellAddr = XLSX.utils.encode_cell({ r, c: colIndex });
              const cellValue = sheet[cellAddr];
              if (cellValue && cellValue.v !== undefined && cellValue.v !== '') {
                lastValue = String(cellValue.v);
              }
            }
            console.log(`      → Calculated LOOKUP: ${lastValue}`);
            return lastValue;
          }
        }
        
        console.log(`      → Cannot calculate this formula`);
        return ''; // Can't calculate this formula
      }
      
      return '';
    };
    
    // Extract from exact cell addresses confirmed by user
    // These cells contain formulas in the template, so we need to calculate them manually
    
    console.log(`  Scanning SOA sheet for data...`);
    console.log(`  Sheet range: ${soaSheet['!ref']}`);
    
    // Let's scan the entire sheet to see what data exists
    const range = XLSX.utils.decode_range(soaSheet['!ref'] || 'A1');
    console.log(`  Scanning rows ${range.s.r + 1} to ${range.e.r + 1}, columns ${XLSX.utils.encode_col(range.s.c)} to ${XLSX.utils.encode_col(range.e.c)}`);
    
    // Sample some cells to see what's there
    for (let r = 16; r <= Math.min(35, range.e.r); r++) {
      let rowHasData = false;
      let rowData = `  Row ${r + 1}: `;
      for (let c = 0; c <= Math.min(6, range.e.c); c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        const cell = soaSheet[cellAddr];
        if (cell && cell.v !== undefined && cell.v !== '') {
          rowHasData = true;
          rowData += `${XLSX.utils.encode_col(c)}=${cell.v} `;
        }
      }
      if (rowHasData) {
        console.log(rowData);
      }
    }
    
    // G13 contains LOOKUP formula to get last area value
    // The area values are in column A starting from row 30
    let area = '';
    for (let r = range.e.r; r >= 29; r--) { // Start from bottom, row 30 is index 29
      const cellAddr = XLSX.utils.encode_cell({ r, c: 0 }); // Column A
      const cell = soaSheet[cellAddr];
      if (cell && cell.v !== undefined && cell.v !== '' && typeof cell.v === 'number') {
        area = String(cell.v);
        console.log(`  Found area at ${cellAddr}: ${area}`);
        break;
      }
    }
    
    // D100 and F100 contain SUM formulas
    // Principal is in column D, Penalty is in column F, starting from row 17
    let principal = 0;
    let penalty = 0;
    for (let r = 16; r < 100; r++) { // Row 17 is index 16
      const principalCell = soaSheet[XLSX.utils.encode_cell({ r, c: 3 })]; // Column D
      const penaltyCell = soaSheet[XLSX.utils.encode_cell({ r, c: 5 })]; // Column F
      
      if (principalCell && typeof principalCell.v === 'number') {
        principal += principalCell.v;
      }
      if (penaltyCell && typeof penaltyCell.v === 'number') {
        penalty += penaltyCell.v;
      }
    }
    
    console.log(`  Area: ${area}`);
    console.log(`  Principal (sum): ${principal}`);
    console.log(`  Penalty (sum): ${penalty}`);
    
    console.log(`  Reading account details...`);
    const data = {
      lotNo: getCell(accDetailsSheet, 'C3'),
      ownerFirstName: getCell(accDetailsSheet, 'C7'),
      ownerLastName: getCell(accDetailsSheet, 'C9'),
      tillerFirstName: getCell(accDetailsSheet, 'C11'),
      tillerLastName: getCell(accDetailsSheet, 'C13'),
      oldAccount: getCell(soaSheet, 'G101'),
      area: String(area),
      principal: String(principal),
      penalty: String(penalty),
      rowNumber,
      fileName,
    };
    
    console.log(`  ✓ Successfully extracted data`);
    return data;
  } catch (error) {
    console.error(`  ✗ Error extracting data from ${fileName}:`, error);
    return null;
  }
}

/**
 * Consolidate land profiles - SIMPLE VERSION
 * Only extracts data that exists, leaves area/principal/penalty blank
 */
export async function consolidateSimple(
  templateBuffer: Buffer,
  landProfileFiles: { buffer: Buffer; fileName: string }[]
): Promise<{ buffer: Buffer; processedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let processedCount = 0;
  
  try {
    const workbook = await XlsxPopulate.fromDataAsync(templateBuffer);
    const sheet = workbook.sheet(0);
    
    for (const file of landProfileFiles) {
      try {
        const data = await extractSimpleLandProfileData(file.buffer, file.fileName);
        
        if (!data) {
          errors.push(`Failed to extract data from ${file.fileName}`);
          continue;
        }
        
        const templateRow = data.rowNumber + 2;
        
        // Write all extracted data
        sheet.cell(`B${templateRow}`).value(data.lotNo);
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
    
    const output = await workbook.outputAsync();
    const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
    
    return { buffer, processedCount, errors };
  } catch (error) {
    throw error;
  }
}
