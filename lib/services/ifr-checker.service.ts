/**
 * IFR Checker Service
 * Business logic for validating consolidated files against source IFR data
 */

import * as XLSX from "xlsx";
import { extractIFRData } from "@/lib/consolidate-ifr";

export interface Issue {
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

export interface ValidationSummary {
  totalLots: number;
  consolidatedLots: number;
  matchingLots: number;
  totalIssues: number;
  errors: number;
  warnings: number;
}

export interface ValidationResult {
  success: boolean;
  summary: ValidationSummary;
  issues: Issue[];
}

interface LotData {
  lotCode: string;
  principal: number;
  penalty: number;
  oldAccount: number;
  area: number;
}

const TOLERANCE = 0.02; // Allow small rounding differences
const AREA_TOLERANCE = 0.01;

/**
 * Process IFR files and extract expected data
 */
export async function processIFRFiles(
  ifrFiles: File[]
): Promise<Map<string, LotData & { sourceFile: string }>> {
  const expectedData = new Map<string, LotData & { sourceFile: string }>();

  for (const ifrFile of ifrFiles) {
    const buffer = Buffer.from(await ifrFile.arrayBuffer());
    const lotsData = await extractIFRData(buffer, ifrFile.name);

    for (const lot of lotsData) {
      expectedData.set(lot.lotCode, {
        lotCode: lot.lotCode,
        principal: lot.principal,
        penalty: lot.penalty,
        oldAccount: lot.oldAccount,
        area: lot.area,
        sourceFile: ifrFile.name,
      });
    }
  }

  return expectedData;
}

/**
 * Parse consolidated file and extract lot data
 */
export function parseConsolidatedFile(
  buffer: Buffer
): Map<string, LotData & { row: number }> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  const consolidatedData = new Map<string, LotData & { row: number }>();

  // Parse consolidated file (starting from row 3)
  for (let row = 3; row <= range.e.r; row++) {
    const lotCode = sheet[`B${row}`]?.v;
    if (!lotCode) continue;

    const principal = sheet[`J${row}`]?.v || 0;
    const penalty = sheet[`K${row}`]?.v || 0;
    const oldAccount = sheet[`L${row}`]?.v || 0;
    const area = sheet[`I${row}`]?.v || 0;

    consolidatedData.set(String(lotCode), {
      lotCode: String(lotCode),
      principal: Number(principal),
      penalty: Number(penalty),
      oldAccount: Number(oldAccount),
      area: Number(area),
      row,
    });
  }

  return consolidatedData;
}

/**
 * Check for lots missing in consolidated file
 */
export function findMissingInConsolidated(
  expectedData: Map<string, LotData & { sourceFile: string }>,
  consolidatedData: Map<string, LotData & { row: number }>
): Issue[] {
  const issues: Issue[] = [];

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

  return issues;
}

/**
 * Check for lots missing in IFR files
 */
export function findMissingInIFR(
  expectedData: Map<string, LotData & { sourceFile: string }>,
  consolidatedData: Map<string, LotData & { row: number }>
): Issue[] {
  const issues: Issue[] = [];

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

  return issues;
}

/**
 * Compare values for matching lots
 */
export function compareMatchingLots(
  expectedData: Map<string, LotData & { sourceFile: string }>,
  consolidatedData: Map<string, LotData & { row: number }>
): Issue[] {
  const issues: Issue[] = [];

  for (const [lotCode, expected] of expectedData) {
    const consolidated = consolidatedData.get(lotCode);
    if (!consolidated) continue;

    // Check Principal
    const principalDiff = Math.abs(expected.principal - consolidated.principal);
    if (principalDiff > TOLERANCE) {
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
    if (penaltyDiff > TOLERANCE) {
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
    if (areaDiff > AREA_TOLERANCE) {
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
    const oldAccountDiff = Math.abs(expected.oldAccount - consolidated.oldAccount);
    if (oldAccountDiff > TOLERANCE) {
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
    const expectedTotal = expected.principal + expected.penalty + expected.oldAccount;
    const consolidatedTotal = consolidated.principal + consolidated.penalty + consolidated.oldAccount;
    const totalDiff = Math.abs(expectedTotal - consolidatedTotal);
    if (totalDiff > TOLERANCE) {
      issues.push({
        lotCode,
        issueType: "total_mismatch",
        field: "Total",
        ifrValue: expectedTotal.toFixed(2),
        consolidatedValue: consolidatedTotal.toFixed(2),
        difference: consolidatedTotal - expectedTotal,
        severity: totalDiff > 100 ? "error" : "warning",
        reason: `Total mismatch: Expected ${expectedTotal.toFixed(2)} (Principal + Penalty + Old Account), found ${consolidatedTotal.toFixed(2)} in consolidated (difference: ${(consolidatedTotal - expectedTotal).toFixed(2)})`,
      });
    }
  }

  return issues;
}

/**
 * Validate IFR files against consolidated file
 */
export async function validateIFRFiles(
  ifrFiles: File[],
  consolidatedFile: File
): Promise<ValidationResult> {
  // Process IFR files
  const expectedData = await processIFRFiles(ifrFiles);

  // Parse consolidated file
  const consolidatedBuffer = Buffer.from(await consolidatedFile.arrayBuffer());
  const consolidatedData = parseConsolidatedFile(consolidatedBuffer);

  // Find issues
  const issues: Issue[] = [
    ...findMissingInConsolidated(expectedData, consolidatedData),
    ...findMissingInIFR(expectedData, consolidatedData),
    ...compareMatchingLots(expectedData, consolidatedData),
  ];

  // Sort issues by severity and lot code
  issues.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "error" ? -1 : 1;
    }
    return a.lotCode.localeCompare(b.lotCode);
  });

  // Generate summary
  const summary: ValidationSummary = {
    totalLots: expectedData.size,
    consolidatedLots: consolidatedData.size,
    matchingLots:
      expectedData.size -
      issues.filter((i) => i.issueType === "missing_in_consolidated").length,
    totalIssues: issues.length,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
  };

  return {
    success: true,
    summary,
    issues,
  };
}
