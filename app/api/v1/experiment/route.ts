import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { lookupIrrigationRate } from "@/lib/irrigation-rate-table";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellFormula: true,
      cellStyles: true,
    });

    const results: {
      fileName: string;
      sheets: string[];
      sheetUsed: string;
      lotSummaries: Array<{
        lotCode: string;
        numberOfSeasons: number;
        duplicatesRemoved: number;
        totalPrincipal: number;
        totalPenalty: number;
        oldAccount: number;
        grandTotal: number;
        details: Array<Record<string, unknown>>;
      }>;
      debug: {
        sampleRows: Array<Record<string, unknown>>;
        allCalculations: Array<Record<string, unknown>>;
      };
    } = {
      fileName: file.name,
      sheets: workbook.SheetNames,
      sheetUsed: "",
      lotSummaries: [],
      debug: {
        sampleRows: [],
        allCalculations: [],
      },
    };

    // Look for registry sheet - use first sheet if specific name not found
    let registrySheet =
      workbook.Sheets["03 REGISTRY"] || workbook.Sheets["REGISTRY"];

    if (!registrySheet) {
      // Use the first sheet
      const firstSheetName = workbook.SheetNames[0];
      registrySheet = workbook.Sheets[firstSheetName];
      results.sheetUsed = firstSheetName;
    } else {
      results.sheetUsed = "03 REGISTRY or REGISTRY";
    }

    if (!registrySheet) {
      return NextResponse.json({
        error: "No valid sheet found",
        availableSheets: workbook.SheetNames,
      });
    }

    // Column mapping based on mastersListProcessor.ts and IFR structure
    const COL_LOT_CODE = "C"; // Column C: Lot Code
    const COL_CROP_SEASON = "D"; // Column D: Crop Season
    const COL_CROP_YEAR = "E"; // Column E: Crop Year
    const COL_PLANTED_AREA = "H"; // Column H: Planted Area
    const COL_OLD_ACCOUNT = "Q"; // Column Q: Old Account

    // Parse rows starting from row 2 (assuming row 1 is header)
    const range = XLSX.utils.decode_range(registrySheet["!ref"] || "A1");

    // First, show sample of first 3 rows for debugging
    for (let row = 2; row <= Math.min(4, range.e.r); row++) {
      results.debug.sampleRows.push({
        row,
        C: registrySheet[`C${row}`]?.v,
        D: registrySheet[`D${row}`]?.v,
        E: registrySheet[`E${row}`]?.v,
        H: registrySheet[`H${row}`]?.v,
        Q: registrySheet[`Q${row}`]?.v,
      });
    }

    // Group by lot code
    const lotGroups = new Map<
      string,
      {
        lotCode: string;
        rows: Array<Record<string, unknown>>;
        totalPrincipal: number;
        totalPenalty: number;
        oldAccount: number;
        grandTotal: number;
        duplicatesRemoved: number;
      }
    >();

    // Track seen crop seasons per lot to detect duplicates
    const seenCropSeasons = new Map<string, Set<string>>();

    for (let row = 2; row <= range.e.r; row++) {
      const lotCode = registrySheet[`${COL_LOT_CODE}${row}`]?.v;
      const cropSeason = registrySheet[`${COL_CROP_SEASON}${row}`]?.v;
      const cropYear = registrySheet[`${COL_CROP_YEAR}${row}`]?.v;
      const area = registrySheet[`${COL_PLANTED_AREA}${row}`]?.v;
      const oldAccount = registrySheet[`${COL_OLD_ACCOUNT}${row}`]?.v;

      if (!lotCode || !cropSeason || !cropYear || !area) continue;

      // Skip years before 1976 (old accounts are prior to July 1, 1975)
      const yearNum = parseInt(String(cropYear));
      if (yearNum < 1976) {
        results.debug.allCalculations.push({
          row,
          lotCode: String(lotCode),
          cropSeason,
          cropYear,
          note: "Skipped - prior to July 1, 1975 (old account period)",
        });
        continue;
      }

      // Build crop season code
      // For years 2000+, use full year; for years before 2000, use 2-digit
      const yearCode =
        yearNum >= 2000 ? String(yearNum) : String(yearNum).slice(-2);
      const seasonCode = String(cropSeason).toUpperCase() === "DRY" ? "D" : "W";
      const cropSeasonCode = `${yearCode}-${seasonCode}`;

      // Lookup rate and penalty
      const rateData = lookupIrrigationRate(cropSeasonCode);

      if (!rateData) {
        results.debug.allCalculations.push({
          row,
          lotCode,
          cropSeason,
          cropYear,
          cropSeasonCode,
          error: "Crop season not found in lookup table",
        });
        continue;
      }

      // Calculate
      const areaNum = parseFloat(String(area));
      const oldAccountNum = parseFloat(String(oldAccount || 0));
      const principal = areaNum * rateData.rate;
      const penalty = principal * (rateData.penaltyMonths / 100);

      // Store calculation details
      const calcDetail = {
        row,
        lotCode: String(lotCode),
        cropSeason,
        cropYear,
        cropSeasonCode,
        area: areaNum,
        rate: rateData.rate,
        penaltyMonths: rateData.penaltyMonths,
        principal: parseFloat(principal.toFixed(2)),
        penalty: parseFloat(penalty.toFixed(2)),
      };

      results.debug.allCalculations.push(calcDetail);

      // Group by lot code
      const lotKey = String(lotCode);

      // Check for duplicates: same lot code + same crop season code
      if (!seenCropSeasons.has(lotKey)) {
        seenCropSeasons.set(lotKey, new Set());
      }

      const seasonSet = seenCropSeasons.get(lotKey)!;
      if (seasonSet.has(cropSeasonCode)) {
        // Duplicate found - skip this row
        results.debug.allCalculations.push({
          ...calcDetail,
          warning: "Duplicate crop season - skipped",
        });

        if (!lotGroups.has(lotKey)) {
          lotGroups.set(lotKey, {
            lotCode: lotKey,
            rows: [],
            totalPrincipal: 0,
            totalPenalty: 0,
            oldAccount: oldAccountNum,
            grandTotal: 0,
            duplicatesRemoved: 0,
          });
        }
        lotGroups.get(lotKey)!.duplicatesRemoved++;
        continue;
      }

      // Mark this season as seen
      seasonSet.add(cropSeasonCode);

      if (!lotGroups.has(lotKey)) {
        lotGroups.set(lotKey, {
          lotCode: lotKey,
          rows: [],
          totalPrincipal: 0,
          totalPenalty: 0,
          oldAccount: oldAccountNum, // Old account is per lot, not per row
          grandTotal: 0,
          duplicatesRemoved: 0,
        });
      }

      const group = lotGroups.get(lotKey)!;
      group.rows.push(calcDetail);
      group.totalPrincipal += principal;
      group.totalPenalty += penalty;
    }

    // Calculate grand totals for each lot
    for (const group of lotGroups.values()) {
      group.totalPrincipal = parseFloat(group.totalPrincipal.toFixed(2));
      group.totalPenalty = parseFloat(group.totalPenalty.toFixed(2));
      group.grandTotal = parseFloat(
        (group.totalPrincipal + group.totalPenalty + group.oldAccount).toFixed(
          2,
        ),
      );

      results.lotSummaries.push({
        lotCode: group.lotCode,
        numberOfSeasons: group.rows.length,
        duplicatesRemoved: group.duplicatesRemoved,
        totalPrincipal: group.totalPrincipal,
        totalPenalty: group.totalPenalty,
        oldAccount: group.oldAccount,
        grandTotal: group.grandTotal,
        details: group.rows,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Experiment error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
