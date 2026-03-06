import * as XLSX from "xlsx";
import { lookupIrrigationRate } from "./irrigation-rate-table";

export function roundHalfUp(num: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier + Number.EPSILON) / multiplier;
}

export interface LotGroup {
  lotCode: string;
  ownerLastName: string;
  ownerFirstName: string;
  tillerLastName: string;
  tillerFirstName: string;
  oldAccount: number;
  latestArea: number;
  latestYear: number;
  totalPrincipal: number;
  totalPenalty: number;
  numberOfSeasons: number;
  seenSeasons: Set<string>;
}

export const COLUMN_MAPPING = {
  LOT_CODE: "C",
  CROP_SEASON: "D",
  CROP_YEAR: "E",
  PLANTED_AREA: "H",
  OWNER_LAST: "M",
  OWNER_FIRST: "N",
  TILLER_LAST: "O",
  TILLER_FIRST: "P",
  OLD_ACCOUNT: "Q",
} as const;

export function shouldSkipSeason(cropYear: number, cropSeason: string): boolean {
  if (cropYear < 1975) return true;
  if (cropYear === 1975 && cropSeason.toUpperCase() === "DRY") return true;
  return false;
}

export function buildCropSeasonCode(year: number, season: string): string {
  const yearCode = year >= 2000 ? String(year) : String(year).slice(-2);
  const seasonCode = season.toUpperCase() === "DRY" ? "D" : "W";
  return `${yearCode}-${seasonCode}`;
}

export function calculateSeasonCharges(
  area: number,
  cropSeasonCode: string,
): { principal: number; penalty: number } | null {
  const rateData = lookupIrrigationRate(cropSeasonCode);
  if (!rateData) return null;

  const principal = area * rateData.rate;
  const penalty = principal * (rateData.penaltyMonths / 100);

  return { principal, penalty };
}

export function extractRowData(
  sheet: XLSX.WorkSheet,
  row: number,
): {
  lotCode: string | null;
  cropSeason: string | null;
  cropYear: number | null;
  area: number | null;
  ownerLastName: string;
  ownerFirstName: string;
  tillerLastName: string;
  tillerFirstName: string;
  oldAccount: number;
} {
  const { LOT_CODE, CROP_SEASON, CROP_YEAR, PLANTED_AREA, OWNER_LAST, OWNER_FIRST, TILLER_LAST, TILLER_FIRST, OLD_ACCOUNT } = COLUMN_MAPPING;

  return {
    lotCode: sheet[`${LOT_CODE}${row}`]?.v || null,
    cropSeason: sheet[`${CROP_SEASON}${row}`]?.v || null,
    cropYear: sheet[`${CROP_YEAR}${row}`]?.v ? parseInt(String(sheet[`${CROP_YEAR}${row}`].v)) : null,
    area: sheet[`${PLANTED_AREA}${row}`]?.v ? parseFloat(String(sheet[`${PLANTED_AREA}${row}`].v)) : null,
    ownerLastName: String(sheet[`${OWNER_LAST}${row}`]?.v || ""),
    ownerFirstName: String(sheet[`${OWNER_FIRST}${row}`]?.v || ""),
    tillerLastName: String(sheet[`${TILLER_LAST}${row}`]?.v || ""),
    tillerFirstName: String(sheet[`${TILLER_FIRST}${row}`]?.v || ""),
    oldAccount: parseFloat(String(sheet[`${OLD_ACCOUNT}${row}`]?.v || 0)),
  };
}
