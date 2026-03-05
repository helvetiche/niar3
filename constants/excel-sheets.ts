/**
 * Standard Excel sheet names used across the application
 */
export const EXCEL_SHEETS = {
  ACC_DETAILS: "00 ACC DETAILS 01",
  SOA: "01 SOA 01",
} as const;

/**
 * Excel cell addresses for common data fields
 */
export const EXCEL_CELLS = {
  ACC_DETAILS: {
    LOT_CODE: "C3",
    DIVISION: "C4",
    NAME_OF_IA: "C5",
    OWNER_FIRST_NAME: "C7",
    OWNER_LAST_NAME: "C9",
    TILLER_FIRST_NAME: "C11",
    TILLER_LAST_NAME: "C13",
    AREA: "G13",
  },
  SOA: {
    PRINCIPAL: "D100",
    PENALTY: "F100",
    OLD_ACCOUNT: "G101",
  },
} as const;
