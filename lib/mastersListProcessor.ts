export interface MastersListRow {
  cropSeason: string;
  cropYear: string;
  farmerFirst: string;
  farmerLast: string;
  landOwnerFirst: string;
  landOwnerLast: string;
  lotCode: string;
  oldAccount: string;
  plantedArea: string;
}

export interface LotGroup {
  lotCode: string;
  landOwnerFirst: string;
  landOwnerLast: string;
  rows: MastersListRow[];
}

const getCellString = (row: unknown[], colIndex: number): string => {
  if (!Array.isArray(row) || colIndex < 0 || colIndex >= row.length) return "";
  const value = row[colIndex];
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeLotCode = (raw: string): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const num = Number(s.replace(/,/g, ""));
  if (!Number.isNaN(num) && Number.isInteger(num)) return String(num);
  return s;
};

const emptyIfN = (value: string): string =>
  value.trim().toUpperCase() === "N" ? "" : value.trim();

const buildOwnerGroupKey = (row: MastersListRow): string => {
  const loLast = (row.landOwnerLast ?? "").trim().toUpperCase();
  const loFirst = (row.landOwnerFirst ?? "").trim().toUpperCase();
  const fLast = (row.farmerLast ?? "").trim().toUpperCase();
  const fFirst = (row.farmerFirst ?? "").trim().toUpperCase();
  return `${row.lotCode}\0${loLast}\0${loFirst}\0${fLast}\0${fFirst}`;
};

export const processMastersList = (data: unknown[][]): LotGroup[] => {
  const groups: LotGroup[] = [];
  const groupKeyToIndex = new Map<string, number>();

  const COL_LOT = 2;
  const COL_CROP_SEASON = 3;
  const COL_CROP_YEAR = 4;
  const COL_PLANTED_AREA = 7;
  const COL_LAND_OWNER_LAST = 12;
  const COL_LAND_OWNER_FIRST = 13;
  const COL_FARMER_LAST = 14;
  const COL_FARMER_FIRST = 15;
  const COL_OLD_ACCOUNT = 16;

  for (let i = 1; i < data.length; i += 1) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const rawLotCode = getCellString(row, COL_LOT);
    if (!rawLotCode) continue;

    const lotCode = normalizeLotCode(rawLotCode);

    const rowData: MastersListRow = {
      cropSeason: emptyIfN(getCellString(row, COL_CROP_SEASON)),
      cropYear: emptyIfN(getCellString(row, COL_CROP_YEAR)),
      farmerFirst: emptyIfN(getCellString(row, COL_FARMER_FIRST)),
      farmerLast: emptyIfN(getCellString(row, COL_FARMER_LAST)),
      landOwnerFirst: emptyIfN(getCellString(row, COL_LAND_OWNER_FIRST)),
      landOwnerLast: emptyIfN(getCellString(row, COL_LAND_OWNER_LAST)),
      lotCode,
      oldAccount: emptyIfN(getCellString(row, COL_OLD_ACCOUNT)),
      plantedArea: emptyIfN(getCellString(row, COL_PLANTED_AREA)),
    };

    const ownerGroupKey = buildOwnerGroupKey(rowData);
    let groupIndex = groupKeyToIndex.get(ownerGroupKey);
    if (groupIndex === undefined) {
      groupIndex = groups.length;
      groupKeyToIndex.set(ownerGroupKey, groupIndex);
      groups.push({
        lotCode,
        landOwnerFirst: rowData.landOwnerFirst,
        landOwnerLast: rowData.landOwnerLast,
        rows: [],
      });
    }

    groups[groupIndex].rows.push(rowData);
  }

  return groups;
};
