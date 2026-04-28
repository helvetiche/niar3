/**
 * Normalize lot codes to digits, letters, and hyphen only (NIA IFR convention).
 * e.g. "104.32-A" → "10432-A" so stray punctuation does not split the same lot.
 * Removes all whitespace first so consolidated manual entries like "1023 - A"
 * match IFR "1023-A".
 */
export const standardizeLotNumber = (
  raw: string | number | null | undefined
): string => {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  s = s.replace(/\s+/g, "");
  return s.replace(/[^0-9A-Za-z-]/g, "");
};
