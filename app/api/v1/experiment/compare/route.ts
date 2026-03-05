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

    const humanWorkbook = XLSX.read(humanBuffer, { type: 'buffer', cellFormula: true });
    const systemWorkbook = XLSX.read(systemBuffer, { type: 'buffer', cellFormula: true });

    const humanSheet = humanWorkbook.Sheets[humanWorkbook.SheetNames[0]];
    const systemSheet = systemWorkbook.Sheets[systemWorkbook.SheetNames[0]];

    const results: {
      humanFile: string;
      systemFile: string;
      differentLots: string[];
      onlyInHuman: string[];
      onlyInSystem: string[];
      summary: {
        totalDifferences: number;
        matchingLots: number;
        differentLots: number;
        onlyInHumanCount: number;
        onlyInSystemCount: number;
      };
      details: Array<{
        lotCode: string;
        humanRow: number;
        systemRow: number;
        differences: Array<{
          column: string;
          columnName: string;
          humanCell: string;
          systemCell: string;
          humanValue: string | number;
          systemValue: string | number;
          difference: string;
          isDifferent: boolean;
        }>;
      }>;
    } = {
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
      details: [],
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
    for (const [lotCode] of humanLots) {
      if (!systemLots.has(lotCode)) {
        results.onlyInHuman.push(lotCode);
        results.summary.onlyInHumanCount++;
      }
    }

    // Find lot codes only in system file
    for (const [lotCode] of systemLots) {
      if (!humanLots.has(lotCode)) {
        results.onlyInSystem.push(lotCode);
        results.summary.onlyInSystemCount++;
      }
    }

    // Compare lot codes that exist in BOTH files
    const columnsToCompare = ['C', 'D', 'F', 'G', 'I', 'J', 'K', 'L', 'M'];
    const columnNames: Record<string, string> = {
      C: 'Owner Last Name',
      D: 'Owner First Name',
      F: 'Tiller Last Name',
      G: 'Tiller First Name',
      I: 'Area',
      J: 'Principal',
      K: 'Penalty',
      L: 'Old Account',
      M: 'Total',
    };

    for (const [lotCode, humanRow] of humanLots) {
      const systemRow = systemLots.get(lotCode);
      if (!systemRow) continue; // Skip if not in both files

      const rowDifferences: Array<{
        column: string;
        columnName: string;
        humanCell: string;
        systemCell: string;
        humanValue: string | number;
        systemValue: string | number;
        difference: string;
        isDifferent: boolean;
      }> = [];
      const financialFields = ['J', 'K', 'L', 'M']; // Principal, Penalty, Old Account, Total
      let hasFinancialDifference = false;

      // First pass: check if there are any differences
      const allComparisons: Array<{
        col: string;
        humanValue: string | number | undefined;
        systemValue: string | number | undefined;
        isDifferent: boolean;
      }> = [];

      for (const col of columnsToCompare) {
        const humanCell = humanSheet[`${col}${humanRow}`];
        const systemCell = systemSheet[`${col}${systemRow}`];

        // Get the actual value (handles formulas with cached values)
        let humanValue = humanCell?.v;
        let systemValue = systemCell?.v;

        // For Total column (M), calculate it from J+K+L if missing
        if (col === 'M') {
          // Calculate human total if missing or zero
          if (humanValue === undefined || humanValue === 0 || humanValue === '') {
            const principal = humanSheet[`J${humanRow}`]?.v || 0;
            const penalty = humanSheet[`K${humanRow}`]?.v || 0;
            const oldAccount = humanSheet[`L${humanRow}`]?.v || 0;
            const calculated = Number(principal) + Number(penalty) + Number(oldAccount);
            if (calculated > 0) humanValue = calculated;
          }
          // Calculate system total if missing or zero
          if (systemValue === undefined || systemValue === 0 || systemValue === '') {
            const principal = systemSheet[`J${systemRow}`]?.v || 0;
            const penalty = systemSheet[`K${systemRow}`]?.v || 0;
            const oldAccount = systemSheet[`L${systemRow}`]?.v || 0;
            const calculated = Number(principal) + Number(penalty) + Number(oldAccount);
            if (calculated > 0) systemValue = calculated;
          }
        }

        // Treat "N" as empty (for area and other fields)
        if (humanValue === 'N' || humanValue === 'n') humanValue = undefined;
        if (systemValue === 'N' || systemValue === 'n') systemValue = undefined;

        // Trim strings and treat empty strings as undefined
        if (typeof humanValue === 'string') {
          humanValue = humanValue.trim();
          if (humanValue === '') humanValue = undefined;
        }
        if (typeof systemValue === 'string') {
          systemValue = systemValue.trim();
          if (systemValue === '') systemValue = undefined;
        }

        // Compare values (handle numbers with tolerance for floating point)
        let isDifferent = false;
        
        // Both empty - they match
        if (humanValue === undefined && systemValue === undefined) {
          isDifferent = false;
        }
        // One empty, one not - they differ
        else if (humanValue === undefined || systemValue === undefined) {
          isDifferent = true;
        }
        // Both are numbers - compare with tolerance
        else if (typeof humanValue === 'number' && typeof systemValue === 'number') {
          isDifferent = Math.abs(humanValue - systemValue) > 0.02;
        }
        // Both are strings - compare directly
        else {
          isDifferent = String(humanValue) !== String(systemValue);
        }

        // Track if this is a financial field difference
        if (isDifferent && financialFields.includes(col)) {
          hasFinancialDifference = true;
        }

        allComparisons.push({
          col,
          humanValue,
          systemValue,
          isDifferent,
        });
      }

      // Second pass: add to differences
      for (const comparison of allComparisons) {
        const { col, humanValue, systemValue, isDifferent } = comparison;
        
        // Always include if different, OR if it's a financial field and there's any financial difference
        const shouldInclude = isDifferent || (hasFinancialDifference && financialFields.includes(col));

        if (shouldInclude) {
          rowDifferences.push({
            column: col,
            columnName: columnNames[col],
            humanCell: `${col}${humanRow}`,
            systemCell: `${col}${systemRow}`,
            humanValue: humanValue === undefined ? 'empty' : humanValue,
            systemValue: systemValue === undefined ? 'empty' : systemValue,
            difference: typeof humanValue === 'number' && typeof systemValue === 'number'
              ? (systemValue - humanValue).toFixed(2)
              : 'N/A',
            isDifferent, // Mark whether this specific field differs
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
