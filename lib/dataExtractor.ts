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

const formatNumber = (value: string | number | undefined): string => {
  if (value === undefined || value === null || value === "") return "";
  const numStr = typeof value === "number" ? String(value) : value;
  const number = Number(numStr.replace(/,/g, ""));
  if (Number.isNaN(number)) return "";
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

const getCellValueByAddress = (
  ws: ParsedSheet["worksheet"],
  data: unknown[][],
  address: string,
): string => {
  const directValue = getCellByAddress(ws, address);
  if (directValue !== undefined) {
    return formatNumber(directValue);
  }

  const colLetter = address.replace(/[0-9]/g, "");
  const rowNum = Number.parseInt(address.replace(/[A-Z]/gi, ""), 10);

  const colIndex = colLetter.toUpperCase().charCodeAt(0) - 65;
  const rowIndex = rowNum - 1;

  return getCellValue(data, rowIndex, colIndex, true);
};

export const extractSOADetails = (
  sheet: ParsedSheet,
): SOADetail[] => {
  const details: SOADetail[] = [];
  const soaStart = findRowByText(sheet.data, "STATEMENT OF ACCOUNT");
  if (soaStart === -1) return details;

  const ws = sheet.worksheet;
  const data = sheet.data;

  const area = getCellValueByAddress(ws, data, "G13");
  const principal = getCellValueByAddress(ws, data, "D100");
  const penalty = getCellValueByAddress(ws, data, "F100");
  const oldAccount = getCellValueByAddress(ws, data, "G101");
  const total = getCellValueByAddress(ws, data, "G102");

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
    const extracted = extractSOADetails(soaSheet);
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
