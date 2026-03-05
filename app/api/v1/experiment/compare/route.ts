import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const humanFile = formData.get('humanFile') as File;
    const systemFile = formData.get('systemFile') as File;

    if (!humanFile || !systemFile) {
      return NextResponse.json({ error: 'Both files are required' }, { status: 400 });
    }

    const humanBuffer = Buffer.from(await humanFile.arrayBuffer());
    const systemBuffer = Buffer.from(await systemFile.arrayBuffer());

    const humanWorkbook = XLSX.read(humanBuffer, { type: 'buffer' });
    const systemWorkbook = XLSX.read(systemBuffer, { type: 'buffer' });

    const humanSheet = humanWorkbook.Sheets[humanWorkbook.SheetNames[0]];
    const systemSheet = systemWorkbook.Sheets[systemWorkbook.SheetNames[0]];

    const results: any = {
      humanFile: humanFile.name,
      systemFile: systemFile.name,
      differentLots: [] as string[],
      onlyInHuman: [] as string[],
      onlyInSystem: [] as string[],
      summary: {
        totalDifferences: 0,
        matchingLots: 0,
        differentLots: 0,
        onlyInHumanCount: 0,
        onlyInSystemCount: 0,
      },
      details: [] as any[], // Full details for those who want it
    };

    // Build lot code maps for both files
    const humanLots = new Map<string, number>(); // lot code -> row number
    const systemLots = new Map<string, number>();

    const humanRange = XLSX.utils.decode_range(humanSheet['!ref'] || 'A1');
    const systemRange = XLSX.utils.decode_range(systemSheet['!ref'] || 'A1');

    // Scan human file for lot codes
    for (let row = 3; row <= humanRange.e.r; row++) {
      const lotCode = humanSheet[`B${row}`]?.v;
      if (lotCode) {
        humanLots.set(String(lotCode), row);
      }
    }

    // Scan system file for lot codes
    for (let row = 3; row <= systemRange.e.r; row++) {
      const lotCode = systemSheet[`B${row}`]?.v;
      if (lotCode) {
        systemLots.set(String(lotCode), row);
      }
    }

    // Find lot codes only in human file
    for (const [lotCode, row] of humanLots) {
      if (!systemLots.has(lotCode)) {
        results.onlyInHuman.push(lotCode);
        results.summary.onlyInHumanCount++;
      }
    }

    // Find lot codes only in system file
    for (const [lotCode, row] of systemLots) {
      if (!humanLots.has(lotCode)) {
        results.onlyInSystem.push(lotCode);
        results.summary.onlyInSystemCount++;
      }
    }

    // Compare lot codes that exist in BOTH files
    const columnsToCompare = ['C', 'D', 'F', 'G', 'I', 'J', 'K', 'L'];
    const columnNames: Record<string, string> = {
      C: 'Owner Last Name',
      D: 'Owner First Name',
      F: 'Tiller Last Name',
      G: 'Tiller First Name',
      I: 'Area',
      J: 'Principal',
      K: 'Penalty',
      L: 'Old Account',
    };

    for (const [lotCode, humanRow] of humanLots) {
      const systemRow = systemLots.get(lotCode);
      if (!systemRow) continue; // Skip if not in both files

      const rowDifferences: any[] = [];

      for (const col of columnsToCompare) {
        const humanCell = humanSheet[`${col}${humanRow}`];
        const systemCell = systemSheet[`${col}${systemRow}`];

        const humanValue = humanCell?.v;
        const systemValue = systemCell?.v;

        // Compare values (handle numbers with tolerance for floating point)
        let isDifferent = false;
        if (typeof humanValue === 'number' && typeof systemValue === 'number') {
          // Allow 0.01 difference for floating point comparison
          isDifferent = Math.abs(humanValue - systemValue) > 0.01;
        } else {
          isDifferent = humanValue !== systemValue;
        }

        if (isDifferent) {
          rowDifferences.push({
            column: col,
            columnName: columnNames[col],
            humanCell: `${col}${humanRow}`,
            systemCell: `${col}${systemRow}`,
            humanValue: humanValue ?? 'empty',
            systemValue: systemValue ?? 'empty',
            difference: typeof humanValue === 'number' && typeof systemValue === 'number'
              ? (systemValue - humanValue).toFixed(2)
              : 'N/A',
          });
        }
      }

      if (rowDifferences.length > 0) {
        results.differentLots.push(lotCode);
        results.details.push({
          lotCode,
          humanRow,
          systemRow,
          differences: rowDifferences,
        });
        results.summary.differentLots++;
        results.summary.totalDifferences += rowDifferences.length;
      } else {
        results.summary.matchingLots++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Comparison error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
