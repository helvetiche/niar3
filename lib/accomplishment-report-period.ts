/** One quincena slice: month + first (1–15) or second (16–end) half. */
export type AccomplishmentReportPeriod = {
  year: number;
  month: number;
  /** 1 = first half (1-15), 2 = second half (16-end) */
  half: 1 | 2;
};

export type AccomplishmentReportPeriodFilter = {
  months: number[];
  includeFirstHalf: boolean;
  includeSecondHalf: boolean;
};
