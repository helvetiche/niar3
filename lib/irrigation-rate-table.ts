/**
 * Irrigation Rate and Penalty Lookup Table
 *
 * Format: YEAR-SEASON
 * - W = Wet Season
 * - D = Dry Season
 */

export interface IrrigationRateEntry {
  cropSeason: string;
  rate: number;
  penaltyMonths: number;
}

export const IRRIGATION_RATE_TABLE: IrrigationRateEntry[] = [
  // 1975-1979
  { cropSeason: "75-D", rate: 2250.0, penaltyMonths: 497 }, // Added missing 1975-D
  { cropSeason: "75-W", rate: 1500.0, penaltyMonths: 503 },
  { cropSeason: "76-D", rate: 2250.0, penaltyMonths: 491 },
  { cropSeason: "76-W", rate: 1500.0, penaltyMonths: 491 },
  { cropSeason: "77-D", rate: 2250.0, penaltyMonths: 479 },
  { cropSeason: "77-W", rate: 1500.0, penaltyMonths: 479 },
  { cropSeason: "78-D", rate: 2250.0, penaltyMonths: 467 },
  { cropSeason: "78-W", rate: 1500.0, penaltyMonths: 467 },
  { cropSeason: "79-D", rate: 2250.0, penaltyMonths: 461 },
  { cropSeason: "79-W", rate: 1500.0, penaltyMonths: 455 },

  // 1980-1989
  { cropSeason: "80-D", rate: 2250.0, penaltyMonths: 449 },
  { cropSeason: "80-W", rate: 1500.0, penaltyMonths: 443 },
  { cropSeason: "81-D", rate: 2250.0, penaltyMonths: 437 },
  { cropSeason: "81-W", rate: 1500.0, penaltyMonths: 431 },
  { cropSeason: "82-D", rate: 2250.0, penaltyMonths: 425 },
  { cropSeason: "82-W", rate: 1500.0, penaltyMonths: 419 },
  { cropSeason: "83-D", rate: 2250.0, penaltyMonths: 413 },
  { cropSeason: "83-W", rate: 1500.0, penaltyMonths: 407 },
  { cropSeason: "84-D", rate: 2250.0, penaltyMonths: 401 },
  { cropSeason: "84-W", rate: 1500.0, penaltyMonths: 395 },
  { cropSeason: "85-D", rate: 2250.0, penaltyMonths: 389 },
  { cropSeason: "85-W", rate: 1500.0, penaltyMonths: 383 },
  { cropSeason: "86-D", rate: 2250.0, penaltyMonths: 377 },
  { cropSeason: "86-W", rate: 1500.0, penaltyMonths: 371 },
  { cropSeason: "87-D", rate: 2250.0, penaltyMonths: 365 },
  { cropSeason: "87-W", rate: 1500.0, penaltyMonths: 359 },
  { cropSeason: "88-D", rate: 2250.0, penaltyMonths: 353 },
  { cropSeason: "88-W", rate: 1500.0, penaltyMonths: 347 },
  { cropSeason: "89-D", rate: 2250.0, penaltyMonths: 341 },
  { cropSeason: "89-W", rate: 1500.0, penaltyMonths: 335 },

  // 1990-1999
  { cropSeason: "90-D", rate: 2250.0, penaltyMonths: 329 },
  { cropSeason: "90-W", rate: 1500.0, penaltyMonths: 323 },
  { cropSeason: "91-D", rate: 2250.0, penaltyMonths: 317 },
  { cropSeason: "91-W", rate: 1500.0, penaltyMonths: 311 },
  { cropSeason: "92-D", rate: 2250.0, penaltyMonths: 305 },
  { cropSeason: "92-W", rate: 1500.0, penaltyMonths: 299 },
  { cropSeason: "93-D", rate: 2250.0, penaltyMonths: 293 },
  { cropSeason: "93-W", rate: 1500.0, penaltyMonths: 287 },
  { cropSeason: "94-D", rate: 2250.0, penaltyMonths: 281 },
  { cropSeason: "94-W", rate: 1500.0, penaltyMonths: 275 },
  { cropSeason: "95-D", rate: 2250.0, penaltyMonths: 269 },
  { cropSeason: "95-W", rate: 1500.0, penaltyMonths: 263 },
  { cropSeason: "96-D", rate: 2250.0, penaltyMonths: 257 },
  { cropSeason: "96-W", rate: 1500.0, penaltyMonths: 251 },
  { cropSeason: "97-D", rate: 2250.0, penaltyMonths: 245 },
  { cropSeason: "97-W", rate: 1500.0, penaltyMonths: 239 },
  { cropSeason: "98-D", rate: 0, penaltyMonths: 233 },
  { cropSeason: "98-W", rate: 400.0, penaltyMonths: 227 },
  { cropSeason: "99-D", rate: 600.0, penaltyMonths: 221 },
  { cropSeason: "99-W", rate: 450.0, penaltyMonths: 215 },

  // 2000-2009
  { cropSeason: "2000-D", rate: 750.0, penaltyMonths: 209 },
  { cropSeason: "2000-W", rate: 450.0, penaltyMonths: 203 },
  { cropSeason: "2001-D", rate: 750.0, penaltyMonths: 197 },
  { cropSeason: "2001-W", rate: 1500.0, penaltyMonths: 191 },
  { cropSeason: "2002-D", rate: 2250.0, penaltyMonths: 185 },
  { cropSeason: "2002-W", rate: 1500.0, penaltyMonths: 179 },
  { cropSeason: "2003-D", rate: 2250.0, penaltyMonths: 173 },
  { cropSeason: "2003-W", rate: 1500.0, penaltyMonths: 167 },
  { cropSeason: "2004-D", rate: 2250.0, penaltyMonths: 161 },
  { cropSeason: "2004-W", rate: 1500.0, penaltyMonths: 155 },
  { cropSeason: "2005-D", rate: 2250.0, penaltyMonths: 149 },
  { cropSeason: "2005-W", rate: 1500.0, penaltyMonths: 143 },
  { cropSeason: "2006-D", rate: 2250.0, penaltyMonths: 137 },
  { cropSeason: "2006-W", rate: 1500.0, penaltyMonths: 131 },
  { cropSeason: "2007-D", rate: 2250.0, penaltyMonths: 125 },
  { cropSeason: "2007-W", rate: 1500.0, penaltyMonths: 119 },
  { cropSeason: "2008-D", rate: 2250.0, penaltyMonths: 113 },
  { cropSeason: "2008-W", rate: 1500.0, penaltyMonths: 107 },
  { cropSeason: "2009-D", rate: 2250.0, penaltyMonths: 101 },
  { cropSeason: "2009-W", rate: 1500.0, penaltyMonths: 95 },

  // 2010-2016
  { cropSeason: "2010-D", rate: 2250.0, penaltyMonths: 89 },
  { cropSeason: "2010-W", rate: 1500.0, penaltyMonths: 83 },
  { cropSeason: "2011-D", rate: 2250.0, penaltyMonths: 77 },
  { cropSeason: "2011-W", rate: 1500.0, penaltyMonths: 71 },
  { cropSeason: "2012-D", rate: 2550.0, penaltyMonths: 65 },
  { cropSeason: "2012-W", rate: 1700.0, penaltyMonths: 59 },
  { cropSeason: "2013-D", rate: 2550.0, penaltyMonths: 53 },
  { cropSeason: "2013-W", rate: 1700.0, penaltyMonths: 47 },
  { cropSeason: "2014-D", rate: 2550.0, penaltyMonths: 41 },
  { cropSeason: "2014-W", rate: 1700.0, penaltyMonths: 35 },
  { cropSeason: "2015-D", rate: 2550.0, penaltyMonths: 29 },
  { cropSeason: "2015-W", rate: 1700.0, penaltyMonths: 23 },
  { cropSeason: "2016-D", rate: 2550.0, penaltyMonths: 17 },
  { cropSeason: "2016-W", rate: 1700.0, penaltyMonths: 11 },
];

/**
 * Lookup irrigation rate and penalty months by crop season
 */
export function lookupIrrigationRate(
  cropSeason: string,
): IrrigationRateEntry | null {
  return (
    IRRIGATION_RATE_TABLE.find((entry) => entry.cropSeason === cropSeason) ||
    null
  );
}

/**
 * Get all available crop seasons
 */
export function getAllCropSeasons(): string[] {
  return IRRIGATION_RATE_TABLE.map((entry) => entry.cropSeason);
}
