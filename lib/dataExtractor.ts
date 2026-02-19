import { getCellByAddress, type ParsedSheet } from "@/lib/excelParser";

export interface LotOwner {
  firstName: string;
  lastName: string;
  middleName: string;
}

export interface Farmer {
  firstName: string;
  lastName: string;
  middleName: string;
}

export interface AccountDetail {
  division: string;
  farmer: Farmer;
  lotNo: string;
  lotOwner: LotOwner;
  nameOfIA: string;
}

export interface SOADetail {
  area: string;
  oldAccount: string;
  penalty: string;
  principal: string;
  total: string;
}

export interface ExtractedData {
  accountDetails: AccountDetail[];
  fileId: string;
  soaDetails: SOADetail[];
}

const formatNumber = (value: string): string => {
  const number = Number(value.replace(/,/g, ""));
  if (Number.isNaN(number)) return value;
  return number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getCellValue = (
  data: unknown[][],
  row: number,
  col: number,
  isNumeric = false,
): string => {
  if (row < 0 || row >= data.length) return "";
  const rowData = data[row];
  if (!Array.isArray(rowData) || col < 0 || col >= rowData.length) return "";

  const cell = rowData[col];
  const value =
    typeof cell === "string" || typeof cell === "number"
      ? String(cell).trim()
      : "";

  if (isNumeric && value) return formatNumber(value);
  return value;
};

const findRowByText = (data: unknown[][], text: string): number => {
  const target = text.toUpperCase();
  for (const [index, row] of data.entries()) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      if (typeof cell === "string" && cell.toUpperCase().includes(target)) {
        return index;
      }
    }
  }
  return -1;
};

const sumPlantedAreaFromAcc = (accData: unknown[][]): string => {
  let total = 0;
  const startRow = 29;
  const col = 3;
  const maxRows = 30;

  for (let row = startRow; row < startRow + maxRows; row += 1) {
    const rowData = accData[row];
    if (!Array.isArray(rowData)) break;
    const cell = rowData[col];
    const number =
      typeof cell === "number"
        ? cell
        : Number(String(cell ?? "").replace(/,/g, ""));
    if (!Number.isNaN(number) && number > 0) total += number;
  }

  return total > 0 ? formatNumber(String(total)) : "";
};

const sumSoaPrincipalPenaltyFromIfrRows = (
  data: unknown[][],
): { principal: string; penalty: string } => {
  let principalTotal = 0;
  let penaltyTotal = 0;

  for (let row = 94; row <= 98; row += 1) {
    const rowData = data[row];
    if (!Array.isArray(rowData)) continue;
    const principalCell = rowData[3];
    const penaltyCell = rowData[5];
    const principal =
      typeof principalCell === "number"
        ? principalCell
        : Number(String(principalCell ?? "").replace(/,/g, ""));
    const penalty =
      typeof penaltyCell === "number"
        ? penaltyCell
        : Number(String(penaltyCell ?? "").replace(/,/g, ""));

    if (!Number.isNaN(principal)) principalTotal += principal;
    if (!Number.isNaN(penalty)) penaltyTotal += penalty;
  }

  return {
    principal: principalTotal > 0 ? formatNumber(String(principalTotal)) : "",
    penalty: penaltyTotal > 0 ? formatNumber(String(penaltyTotal)) : "",
  };
};

const computePrincipalPenaltyFromAccAndSoa = (
  accData: unknown[][],
  soaData: unknown[][],
): { principal: string; penalty: string } => {
  let principalTotal = 0;
  let penaltyTotal = 0;
  const accStart = 29;
  const soaStart = 94;
  const maxRows = 10;

  for (let i = 0; i < maxRows; i += 1) {
    const accRow = accData[accStart + i];
    const soaRow = soaData[soaStart + i];
    if (!Array.isArray(accRow) || !Array.isArray(soaRow)) break;

    const area =
      typeof accRow[3] === "number"
        ? accRow[3]
        : Number(String(accRow[3] ?? "").replace(/,/g, ""));
    const rate =
      typeof soaRow[2] === "number"
        ? soaRow[2]
        : Number(String(soaRow[2] ?? "").replace(/,/g, ""));
    const penaltyPercent =
      typeof soaRow[4] === "number"
        ? soaRow[4]
        : Number(String(soaRow[4] ?? "").replace(/,/g, ""));

    if (Number.isNaN(area) || area <= 0 || Number.isNaN(rate)) continue;

    const principal = area * rate;
    const penalty =
      Number.isNaN(penaltyPercent) || penaltyPercent <= 0
        ? 0
        : principal * (penaltyPercent / 100);

    principalTotal += principal;
    penaltyTotal += penalty;
  }

  return {
    principal: principalTotal > 0 ? formatNumber(String(principalTotal)) : "",
    penalty: penaltyTotal > 0 ? formatNumber(String(penaltyTotal)) : "",
  };
};

export const extractAccountDetails = (sheet: ParsedSheet): AccountDetail[] => {
  const details: AccountDetail[] = [];
  const headerRow = findRowByText(sheet.data, "ACCOUNT DETAILS");
  if (headerRow === -1) return details;

  const lotNo = getCellValue(sheet.data, headerRow + 1, 2);
  if (!lotNo) return details;

  const division = getCellValue(sheet.data, 3, 2);
  const nameOfIA = getCellValue(sheet.data, 4, 2);
  const ownerFirstName = getCellValue(sheet.data, headerRow + 5, 2);
  const ownerMiddleName = getCellValue(sheet.data, headerRow + 6, 2);
  const ownerLastName = getCellValue(sheet.data, headerRow + 7, 2);
  const farmerFirstName = getCellValue(sheet.data, headerRow + 9, 2);
  const farmerMiddleName = getCellValue(sheet.data, headerRow + 10, 2);
  const farmerLastName = getCellValue(sheet.data, headerRow + 11, 2);

  if (
    !ownerFirstName &&
    !ownerMiddleName &&
    !ownerLastName &&
    !farmerFirstName &&
    !farmerMiddleName &&
    !farmerLastName
  ) {
    return details;
  }

  details.push({
    division,
    farmer: {
      firstName: farmerFirstName,
      middleName: farmerMiddleName,
      lastName: farmerLastName,
    },
    lotNo,
    lotOwner: {
      firstName: ownerFirstName,
      middleName: ownerMiddleName,
      lastName: ownerLastName,
    },
    nameOfIA,
  });

  return details;
};

export const extractSOADetails = (
  sheet: ParsedSheet,
  accSheet: ParsedSheet | null,
): SOADetail[] => {
  const details: SOADetail[] = [];
  const soaStart = findRowByText(sheet.data, "STATEMENT OF ACCOUNT");
  if (soaStart === -1) return details;

  const areaFromSoa = getCellValue(sheet.data, 12, 6, true);
  const areaFromAcc = accSheet ? sumPlantedAreaFromAcc(accSheet.data) : "";
  const area = areaFromSoa || areaFromAcc;

  const subtotalRow = 99;
  let principal = getCellValue(sheet.data, subtotalRow, 3, true);
  let penalty = getCellValue(sheet.data, subtotalRow, 5, true);

  if (!principal || !penalty) {
    const d100 = getCellByAddress(sheet.worksheet, "D100");
    const f100 = getCellByAddress(sheet.worksheet, "F100");
    if (!principal && d100 !== undefined && String(d100).trim() !== "") {
      principal = formatNumber(String(d100).replace(/,/g, ""));
    }
    if (!penalty && f100 !== undefined && String(f100).trim() !== "") {
      penalty = formatNumber(String(f100).replace(/,/g, ""));
    }
  }

  const fromIfrRows = sumSoaPrincipalPenaltyFromIfrRows(sheet.data);
  const computed = accSheet
    ? computePrincipalPenaltyFromAccAndSoa(accSheet.data, sheet.data)
    : { principal: "", penalty: "" };

  principal = principal || fromIfrRows.principal || computed.principal;
  penalty = penalty || fromIfrRows.penalty || computed.penalty;

  const oldAccount = getCellValue(sheet.data, 100, 6, true);
  let total = getCellValue(sheet.data, 101, 6, true);
  if (!total) {
    const g102 = getCellByAddress(sheet.worksheet, "G102");
    if (g102 !== undefined && String(g102).trim() !== "") {
      total = formatNumber(String(g102).replace(/,/g, ""));
    }
  }

  if (!area && !principal && !penalty && !oldAccount && !total) return details;

  details.push({ area, principal, penalty, oldAccount, total });
  return details;
};

const extractFileId = (filename: string): string => {
  const match = /^(\d+)\s/.exec(filename);
  if (!match) return "";
  return String(Number.parseInt(match[1], 10));
};

export const extractData = (
  sheets: ParsedSheet[],
  filename = "",
): ExtractedData => {
  const accSheet = sheets.find((sheet) =>
    sheet.name.includes("00 ACC DETAILS"),
  );
  const soaSheets = sheets.filter((sheet) => sheet.name.includes("01 SOA"));

  let bestSoaDetails: SOADetail[] = [];
  for (const soaSheet of soaSheets) {
    const extracted = extractSOADetails(soaSheet, accSheet ?? null);
    if (extracted.length === 0) continue;
    const first = extracted[0];
    if (first.principal && first.penalty) {
      bestSoaDetails = extracted;
      break;
    }
    if (bestSoaDetails.length === 0 || first.principal || first.penalty) {
      bestSoaDetails = extracted;
    }
  }

  return {
    accountDetails: accSheet ? extractAccountDetails(accSheet) : [],
    fileId: extractFileId(filename),
    soaDetails: bestSoaDetails,
  };
};
