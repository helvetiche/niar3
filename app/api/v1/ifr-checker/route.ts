import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { extractIFRData } from "@/lib/consolidate-ifr";
import { logger } from "@/lib/logger";

interface Issue {
  lotCode: string;
  issueType:
    | "missing_in_consolidated"
    | "missing_in_ifr"
    | "principal_mismatch"
    | "penalty_mismatch"
    | "area_mismatch"
    | "old_account_mismatch"
    | "total_mismatch";
  field: string;
  ifrValue: string | number;
  consolidatedValue: string | number;
  difference?: number;
  severity: "error" | "warning";
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const ifrFiles = formData.getAll("ifrFiles") as File[];
    const consolidatedFile = formData.get("consolidatedFile") as File;

    if (!ifrFiles || ifrFiles.length === 0) {
      return NextResponse.json(
        { error: "No IFR files provided" },
        { status: 400 },
      );
    }

    if (!consolidatedFile) {
      return NextResponse.json(
        { error: "No consolidated file provided" },
        { status: 400 },
      );
    }

    const issues: Issue[] = [];

    // Process all IFR files and build expected data
    const expectedData = new Map<string, Record<string, unknown>>();

    for (const ifrFile of ifrFiles) {
      const buffer = Buffer.from(await ifrFile.arrayBuffer());
      const lotsData = await extractIFRData(buffer, ifrFile.name);

      for (const lot of lotsData) {
        expectedData.set(lot.lotCode, {
          ...lot,
          sourceFile: ifrFile.name,
        });
      }
    }

    // Read consolidated file
    const consolidatedBuffer = Buffer.from(
      await consolidatedFile.arrayBuffer(),
    );
    const consolidatedWorkbook = XLSX.read(consolidatedBuffer, {
      type: "buffer",
    });
    const consolidatedSheet =
      consolidatedWorkbook.Sheets[consolidatedWorkbook.SheetNames[0]];
    const consolidatedRange = XLSX.utils.decode_range(
      consolidatedSheet["!ref"] || "A1",
    );

    const consolidatedData = new Map<
      string,
      {
        lotCode: string;
        principal: number;
        penalty: number;
        oldAccount: number;
        total: number;
        area: number;
        row: number;
      }
    >();

    // Parse consolidated file (starting from row 3)
    for (let row = 3; row <= consolidatedRange.e.r; row++) {
      const lotCode = consolidatedSheet[`B${row}`]?.v;
      if (!lotCode) continue;

      const principal = consolidatedSheet[`J${row}`]?.v || 0;
      const penalty = consolidatedSheet[`K${row}`]?.v || 0;
      const oldAccount = consolidatedSheet[`L${row}`]?.v || 0;
      const total = consolidatedSheet[`M${row}`]?.v || 0;
      const area = consolidatedSheet[`I${row}`]?.v || 0;

      consolidatedData.set(String(lotCode), {
        lotCode: String(lotCode),
        principal: Number(principal),
        penalty: Number(penalty),
        oldAccount: Number(oldAccount),
        total: Number(total),
        area: Number(area),
        row,
      });
    }

    // Check for lots in IFR but missing in consolidated
    for (const [lotCode, expected] of expectedData) {
      if (!consolidatedData.has(lotCode)) {
        issues.push({
          lotCode,
          issueType: "missing_in_consolidated",
          field: "Lot Code",
          ifrValue: lotCode,
          consolidatedValue: "N/A",
          severity: "error",
          reason: `Lot ${lotCode} exists in IFR file "${expected.sourceFile}" but is missing from consolidated file`,
        });
      }
    }

    // Check for lots in consolidated but missing in IFR
    for (const [lotCode] of consolidatedData) {
      if (!expectedData.has(lotCode)) {
        issues.push({
          lotCode,
          issueType: "missing_in_ifr",
          field: "Lot Code",
          ifrValue: "N/A",
          consolidatedValue: lotCode,
          severity: "warning",
          reason: `Lot ${lotCode} exists in consolidated file but not found in any IFR file`,
        });
      }
    }

    // Compare values for matching lots
    const tolerance = 0.02; // Allow small rounding differences

    for (const [lotCode, expectedRaw] of expectedData) {
      const expected = expectedRaw as {
        principal: number;
        penalty: number;
        area: number;
        oldAccount: number;
      };
      const consolidated = consolidatedData.get(lotCode);
      if (!consolidated) continue;

      // Check Principal
      const principalDiff = Math.abs(
        expected.principal - consolidated.principal,
      );
      if (principalDiff > tolerance) {
        issues.push({
          lotCode,
          issueType: "principal_mismatch",
          field: "Principal",
          ifrValue: expected.principal.toFixed(2),
          consolidatedValue: consolidated.principal.toFixed(2),
          difference: consolidated.principal - expected.principal,
          severity: principalDiff > 100 ? "error" : "warning",
          reason: `Principal mismatch: Expected ${expected.principal.toFixed(2)} from IFR, found ${consolidated.principal.toFixed(2)} in consolidated (difference: ${(consolidated.principal - expected.principal).toFixed(2)})`,
        });
      }

      // Check Penalty
      const penaltyDiff = Math.abs(expected.penalty - consolidated.penalty);
      if (penaltyDiff > tolerance) {
        issues.push({
          lotCode,
          issueType: "penalty_mismatch",
          field: "Penalty",
          ifrValue: expected.penalty.toFixed(2),
          consolidatedValue: consolidated.penalty.toFixed(2),
          difference: consolidated.penalty - expected.penalty,
          severity: penaltyDiff > 100 ? "error" : "warning",
          reason: `Penalty mismatch: Expected ${expected.penalty.toFixed(2)} from IFR, found ${consolidated.penalty.toFixed(2)} in consolidated (difference: ${(consolidated.penalty - expected.penalty).toFixed(2)})`,
        });
      }

      // Check Area
      const areaDiff = Math.abs(expected.area - consolidated.area);
      if (areaDiff > 0.01) {
        issues.push({
          lotCode,
          issueType: "area_mismatch",
          field: "Area",
          ifrValue: expected.area.toFixed(4),
          consolidatedValue: consolidated.area.toFixed(4),
          difference: consolidated.area - expected.area,
          severity: "warning",
          reason: `Area mismatch: Expected ${expected.area.toFixed(4)} from IFR, found ${consolidated.area.toFixed(4)} in consolidated (difference: ${(consolidated.area - expected.area).toFixed(4)})`,
        });
      }

      // Check Old Account
      const oldAccountDiff = Math.abs(
        expected.oldAccount - consolidated.oldAccount,
      );
      if (oldAccountDiff > tolerance) {
        issues.push({
          lotCode,
          issueType: "old_account_mismatch",
          field: "Old Account",
          ifrValue: expected.oldAccount.toFixed(2),
          consolidatedValue: consolidated.oldAccount.toFixed(2),
          difference: consolidated.oldAccount - expected.oldAccount,
          severity: "warning",
          reason: `Old Account mismatch: Expected ${expected.oldAccount.toFixed(2)} from IFR, found ${consolidated.oldAccount.toFixed(2)} in consolidated (difference: ${(consolidated.oldAccount - expected.oldAccount).toFixed(2)})`,
        });
      }

      // Check Total
      const expectedTotal =
        expected.principal + expected.penalty + expected.oldAccount;
      const totalDiff = Math.abs(expectedTotal - consolidated.total);
      if (totalDiff > tolerance) {
        issues.push({
          lotCode,
          issueType: "total_mismatch",
          field: "Total",
          ifrValue: expectedTotal.toFixed(2),
          consolidatedValue: consolidated.total.toFixed(2),
          difference: consolidated.total - expectedTotal,
          severity: totalDiff > 100 ? "error" : "warning",
          reason: `Total mismatch: Expected ${expectedTotal.toFixed(2)} (Principal + Penalty + Old Account), found ${consolidated.total.toFixed(2)} in consolidated (difference: ${(consolidated.total - expectedTotal).toFixed(2)})`,
        });
      }
    }

    // Sort issues by severity and lot code
    issues.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "error" ? -1 : 1;
      }
      return a.lotCode.localeCompare(b.lotCode);
    });

    const summary = {
      totalLots: expectedData.size,
      consolidatedLots: consolidatedData.size,
      matchingLots:
        expectedData.size -
        issues.filter((i) => i.issueType === "missing_in_consolidated").length,
      totalIssues: issues.length,
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
    };

    return NextResponse.json({
      success: true,
      summary,
      issues,
    });
  } catch (error) {
    logger.error("IFR Checker error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
