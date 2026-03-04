import ExcelJS from 'exceljs';

export interface LandProfileData {
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
 * Extract data from land profile using ExcelJS
 * ExcelJS can read calculated formula values if the file was saved by Excel
 */
export async function extractLandProfileData(
  fileBuffer: Buffer,
  fileName: string
): Promise<LandProfileData | null> {
  try {
    console.log(`\nExtracting from: ${fileName}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const rowNumber = parseInt(fileName.match(/^(\d+)\s/)?.[1] || '0', 10);
    if (!rowNumber) {
      throw new Error(`Cannot extract row number from filename: ${fileName}`);
    }
    
    console.log(`  Row number: ${rowNumber}`);
    
    const accDetailsSheet = workbook.getWorksheet('00 ACC DETAILS 01');
    if (!accDetailsSheet) {
      console.error(`  ERROR: Sheet "00 ACC DETAILS 01" not found`);
      throw new Error(`Sheet "00 ACC DETAILS 01" not found`);
    }
    
    const soaSheet = workbook.getWorksheet('01 SOA 01');
    if (!soaSheet) {
      console.error(`  ERROR: Sheet "01 SOA 01" not found`);
      throw new Error(`Sheet "01 SOA 01" not found`);
    }
    
    const getCellValue = (sheet: ExcelJS.Worksheet, addr: string): string => {
      const cell = sheet.getCell(addr);
      if (!cell || cell.value === null || cell.value === undefined) {
        return '';
      }
      
      // ExcelJS returns the calculated value for formula cells
      if (cell.type === ExcelJS.ValueType.Formula) {
        // Use the result property which contains the calculated value
        return String(cell.result || '').trim();
      }
      
      return String(cell.value).trim();
    };
    
    // Extract from exact cell addresses
    const area = getCellValue(soaSheet, 'G13');
    const principal = getCellValue(soaSheet, 'D100');
    const penalty = getCellValue(soaSheet, 'F100');
    
    console.log(`  Area (G13): ${area}`);
    console.log(`  Principal (D100): ${principal}`);
    console.log(`  Penalty (F100): ${penalty}`);
    
    const data: LandProfileData = {
      lotNo: getCellValue(accDetailsSheet, 'C3'),
      ownerFirstName: getCellValue(accDetailsSheet, 'C7'),
      ownerLastName: getCellValue(accDetailsSheet, 'C9'),
      tillerFirstName: getCellValue(accDetailsSheet, 'C11'),
      tillerLastName: getCellValue(accDetailsSheet, 'C13'),
      oldAccount: getCellValue(soaSheet, 'G101'),
      area,
      principal,
      penalty,
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
 * Consolidate land profiles using ExcelJS
 */
export async function consolidateWithExcelJS(
  templateBuffer: Buffer,
  landProfileFiles: { buffer: Buffer; fileName: string }[]
): Promise<{ buffer: Buffer; processedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let processedCount = 0;
  
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);
    const sheet = workbook.getWorksheet(1);
    
    if (!sheet) {
      throw new Error('Template must have at least one worksheet');
    }
    
    for (const file of landProfileFiles) {
      try {
        const data = await extractLandProfileData(file.buffer, file.fileName);
        
        if (!data) {
          errors.push(`Failed to extract data from ${file.fileName}`);
          continue;
        }
        
        const templateRow = data.rowNumber + 2;
        
        // Write all extracted data
        sheet.getCell(`B${templateRow}`).value = data.lotNo;
        sheet.getCell(`C${templateRow}`).value = data.ownerLastName;
        sheet.getCell(`D${templateRow}`).value = data.ownerFirstName;
        sheet.getCell(`F${templateRow}`).value = data.tillerLastName;
        sheet.getCell(`G${templateRow}`).value = data.tillerFirstName;
        sheet.getCell(`I${templateRow}`).value = data.area;
        sheet.getCell(`J${templateRow}`).value = data.principal;
        sheet.getCell(`K${templateRow}`).value = data.penalty;
        sheet.getCell(`L${templateRow}`).value = data.oldAccount;
        
        processedCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error processing ${file.fileName}: ${errorMsg}`);
      }
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), processedCount, errors };
  } catch (error) {
    throw error;
  }
}
