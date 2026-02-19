/**
 * Shared file and filename utilities used across API routes and components.
 */

export const sanitizeFolderName = (value: string): string =>
  value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

export const getBaseName = (fileName: string): string => {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) return trimmed;
  return trimmed.slice(0, lastDot);
};

/**
 * Generates a stable unique key for a File. Order: name::size::lastModified (consistent across codebase).
 */
export const getFileKey = (file: File): string =>
  `${file.name}::${String(file.size)}::${String(file.lastModified)}`;

export const getUniqueFolderName = (
  rawName: string,
  seenFolders: Map<string, number>,
): string => {
  const baseName = sanitizeFolderName(rawName) || "division";
  const currentCount = seenFolders.get(baseName) ?? 0;
  seenFolders.set(baseName, currentCount + 1);
  if (currentCount === 0) return baseName;
  return `${baseName} (${String(currentCount + 1)})`;
};

export const detectDivisionAndIAFromFilename = (
  fileName: string,
): { division: string; ia: string } => {
  const baseName = getBaseName(fileName).replace(/_/g, " ").trim();
  const divisionMatch = /\bDIV\.?\s*([0-9]{1,2})\b/i.exec(baseName);
  if (!divisionMatch) {
    return { division: "0", ia: "IA" };
  }

  const division = String(Number.parseInt(divisionMatch[1], 10) || 0);
  const matchStart = divisionMatch.index ?? 0;
  const remainderStart = matchStart + divisionMatch[0].length;
  let iaPart = baseName.slice(remainderStart).trim();
  iaPart = iaPart.replace(/^[-:–—]+\s*/, "");
  iaPart = iaPart.replace(/\s{2,}/g, " ");

  return {
    division: division || "0",
    ia: iaPart || "IA",
  };
};

export const buildConsolidationFileName = (
  division: string,
  ia: string,
  includeExtension = false,
): string => {
  const digits = division.replace(/[^0-9]/g, "");
  const paddedDivision = digits ? digits.padStart(2, "0") : "00";
  const iaName = ia.trim().toUpperCase() || "IA";
  const name = `${paddedDivision} ${iaName} CONSOLIDATED`;
  return includeExtension ? `${name}.xlsx` : name;
};

export const DEFAULT_MERGED_CONSOLIDATION_FILE_NAME = "ALL DIVISION CONSOLIDATED";

export const ensureXlsxExtension = (
  value: string,
  fallback = DEFAULT_MERGED_CONSOLIDATION_FILE_NAME,
): string => {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const baseName = cleaned || fallback;
  return baseName.toLowerCase().endsWith(".xlsx")
    ? baseName
    : `${baseName}.xlsx`;
};
