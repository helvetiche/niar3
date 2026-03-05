import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { HyperFormula } from 'hyperformula';
import XLSX_CALC from 'xlsx-calc';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const method = formData.get('method') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (method === 'exceljs') {
      return await testExcelJS(buffer);
    } else if (method === 'xlsx') {
      return await testXLSX(buffer);
    } else if (method === 'hyperformula') {
      return await testHyperFormula(buffer);
    } else if (method === 'xlsx-calc') {
      return await testXLSXCalc(buffer);
    } else if (method === 'targeted') {
      return await testTargetedCells(buffer);
    } else if (method === 'targeted-calc') {
      return await testTargetedWithCalc(buffer);
    } else if (method === 'inspect-range') {
      return await inspectRange(buffer);
    }

    return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

async function testExcelJS(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const results: any = {
    method: 'ExcelJS',
    sheets: [],
  };

  workbook.eachSheet((worksheet) => {
    const sheetData: any = {
      name: worksheet.name,
      cells: [],
    };

    // Sample first 10 rows, first 10 columns
    for (let row = 1; row <= Math.min(10, worksheet.rowCount); row++) {
      for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
        const cell = worksheet.getCell(row, col);
        
        if (cell.value !== null && cell.value !== undefined) {
          sheetData.cells.push({
            address: cell.address,
            value: cell.value,
            type: cell.type,
            formula: cell.formula || null,
            result: cell.result || null,
            // Check if it's a formula cell
            isFormula: cell.type === ExcelJS.ValueType.Formula,
          });
        }
      }
    }

    results.sheets.push(sheetData);
  });

  return NextResponse.json(results);
}

async function testXLSX(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { 
    type: 'buffer',
    cellFormula: true,
    cellStyles: true,
  });

  const results: any = {
    method: 'XLSX (SheetJS)',
    sheets: [],
  };

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData: any = {
      name: sheetName,
      cells: [],
    };

    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Sample first 10 rows, first 10 columns
    const maxRow = Math.min(range.e.r, 9);
    const maxCol = Math.min(range.e.c, 9);

    for (let row = range.s.r; row <= maxRow; row++) {
      for (let col = range.s.c; col <= maxCol; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];

        if (cell) {
          sheetData.cells.push({
            address: cellAddress,
            value: cell.v,
            type: cell.t,
            formula: cell.f || null,
            // Check if it's a formula cell
            isFormula: !!cell.f,
          });
        }
      }
    }

    results.sheets.push(sheetData);
  });

  return NextResponse.json(results);
}

async function testHyperFormula(buffer: Buffer) {
  try {
    // Read workbook with XLSX
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellFormula: true,
      cellStyles: true,
    });

    // Build HyperFormula sheets data
    const sheetsData: Record<string, any[][]> = {};
    
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Create 2D array for HyperFormula
      const sheetArray: any[][] = [];
      for (let row = range.s.r; row <= range.e.r; row++) {
        const rowData: any[] = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell) {
            // If it has a formula, use the formula; otherwise use the value
            if (cell.f) {
              rowData.push(`=${cell.f}`);
            } else {
              rowData.push(cell.v ?? null);
            }
          } else {
            rowData.push(null);
          }
        }
        sheetArray.push(rowData);
      }
      
      sheetsData[sheetName] = sheetArray;
    });

    // Initialize HyperFormula
    const hfInstance = HyperFormula.buildFromSheets(sheetsData, {
      licenseKey: 'gpl-v3',
    });

    // Extract calculated results
    const results: any = {
      method: 'HyperFormula (Calculated)',
      sheets: [],
    };

    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      const sheetData: any = {
        name: sheetName,
        cells: [],
      };

      // Sample first 10 rows, first 10 columns
      const maxRow = Math.min(range.e.r, 9);
      const maxCol = Math.min(range.e.c, 9);

      for (let row = range.s.r; row <= maxRow; row++) {
        for (let col = range.s.c; col <= maxCol; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];

          if (cell) {
            // Get calculated value from HyperFormula
            const calculatedValue = hfInstance.getCellValue({ sheet: sheetIndex, col, row });
            
            sheetData.cells.push({
              address: cellAddress,
              originalValue: cell.v,
              calculatedValue: calculatedValue,
              formula: cell.f || null,
              isFormula: !!cell.f,
            });
          }
        }
      }

      results.sheets.push(sheetData);
    });

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      method: 'HyperFormula',
      error: String(error),
      message: 'HyperFormula calculation failed. This might be due to unsupported formulas or complex cross-sheet references.',
    });
  }
}


async function testXLSXCalc(buffer: Buffer) {
  try {
    // Read workbook with XLSX
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellFormula: true,
      cellStyles: true,
    });

    // Try to calculate formulas using xlsx-calc
    try {
      XLSX_CALC(workbook);
    } catch (calcError) {
      // If calculation fails, still return what we can read
      return NextResponse.json({
        method: 'XLSX-CALC',
        error: String(calcError),
        message: 'XLSX-CALC calculation failed. Showing uncalculated values.',
        note: 'This library may not support all Excel functions (e.g., PROPER, TEXT, etc.)',
      });
    }

    const results: any = {
      method: 'XLSX-CALC (Calculated)',
      sheets: [],
    };

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData: any = {
        name: sheetName,
        cells: [],
      };

      // Get range
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Sample first 10 rows, first 10 columns
      const maxRow = Math.min(range.e.r, 9);
      const maxCol = Math.min(range.e.c, 9);

      for (let row = range.s.r; row <= maxRow; row++) {
        for (let col = range.s.c; col <= maxCol; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];

          if (cell) {
            sheetData.cells.push({
              address: cellAddress,
              value: cell.v,
              type: cell.t,
              formula: cell.f || null,
              isFormula: !!cell.f,
            });
          }
        }
      }

      results.sheets.push(sheetData);
    });

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      method: 'XLSX-CALC',
      error: String(error),
      message: 'XLSX-CALC failed completely.',
    });
  }
}


async function testTargetedCells(buffer: Buffer) {
  try {
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellFormula: true,
      cellStyles: true,
    });

    const results: any = {
      method: 'Targeted Cell Test',
      targetCells: [],
    };

    // Check if SOA sheet exists
    const soaSheet = workbook.Sheets['01 SOA 01'];
    if (soaSheet) {
      const targetAddresses = ['D100', 'F100', 'G101'];
      
      targetAddresses.forEach(addr => {
        const cell = soaSheet[addr];
        if (cell) {
          results.targetCells.push({
            sheet: '01 SOA 01',
            address: addr,
            value: cell.v,
            type: cell.t,
            formula: cell.f || null,
            isFormula: !!cell.f,
            hasCachedValue: cell.v !== undefined && cell.v !== null,
          });
        } else {
          results.targetCells.push({
            sheet: '01 SOA 01',
            address: addr,
            value: null,
            note: 'Cell not found or empty',
          });
        }
      });
    } else {
      results.error = 'Sheet "01 SOA 01" not found';
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      method: 'Targeted Cell Test',
      error: String(error),
    });
  }
}


async function testTargetedWithCalc(buffer: Buffer) {
  try {
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellFormula: true,
      cellStyles: true,
    });

    const results: any = {
      method: 'Targeted Cell Test with Calculation',
      beforeCalc: [],
      afterCalc: [],
      calcError: null,
    };

    // Check BEFORE calculation
    const soaSheet = workbook.Sheets['01 SOA 01'];
    if (soaSheet) {
      const targetAddresses = ['D100', 'F100', 'G101'];
      
      targetAddresses.forEach(addr => {
        const cell = soaSheet[addr];
        if (cell) {
          results.beforeCalc.push({
            address: addr,
            value: cell.v,
            formula: cell.f || null,
          });
        }
      });
    }

    // Try to calculate
    try {
      XLSX_CALC(workbook);
      
      // Check AFTER calculation
      const soaSheetAfter = workbook.Sheets['01 SOA 01'];
      if (soaSheetAfter) {
        const targetAddresses = ['D100', 'F100', 'G101'];
        
        targetAddresses.forEach(addr => {
          const cell = soaSheetAfter[addr];
          if (cell) {
            results.afterCalc.push({
              address: addr,
              value: cell.v,
              formula: cell.f || null,
            });
          }
        });
      }
    } catch (calcError) {
      results.calcError = String(calcError);
      results.note = 'Calculation failed, but showing before values';
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      method: 'Targeted Cell Test with Calculation',
      error: String(error),
    });
  }
}


async function inspectRange(buffer: Buffer) {
  try {
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellFormula: true,
      cellStyles: true,
    });

    const results: any = {
      method: 'Inspect D17:D99 and F17:F99',
      columnD: [],
      columnF: [],
    };

    const soaSheet = workbook.Sheets['01 SOA 01'];
    if (!soaSheet) {
      return NextResponse.json({
        method: 'Inspect Range',
        error: 'Sheet "01 SOA 01" not found',
      });
    }

    // Sample first 10 rows from D17:D99 and F17:F99
    for (let row = 17; row <= Math.min(26, 99); row++) {
      const cellD = soaSheet[`D${row}`];
      const cellF = soaSheet[`F${row}`];

      if (cellD) {
        results.columnD.push({
          address: `D${row}`,
          value: cellD.v,
          type: cellD.t,
          formula: cellD.f || null,
          isFormula: !!cellD.f,
          hasCachedValue: cellD.v !== undefined && cellD.v !== null,
        });
      }

      if (cellF) {
        results.columnF.push({
          address: `F${row}`,
          value: cellF.v,
          type: cellF.t,
          formula: cellF.f || null,
          isFormula: !!cellF.f,
          hasCachedValue: cellF.v !== undefined && cellF.v !== null,
        });
      }
    }

    results.note = 'Showing first 10 rows (D17:D26, F17:F26) as sample';

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      method: 'Inspect Range',
      error: String(error),
    });
  }
}
