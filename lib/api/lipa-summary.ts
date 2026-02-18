"use client";

export type LipaSummaryFileMapping = {
  fileIndex: number;
  fileName: string;
  divisionName: string;
  pageNumber: number;
};

export type GenerateLipaSummaryPayload = {
  files: File[];
  mappings: LipaSummaryFileMapping[];
  title?: string;
  season?: string;
  outputFileName?: string;
};

export type GenerateLipaSummaryResult = {
  blob: Blob;
  fileName: string;
  scannedFiles: number;
  extractedAssociations: number;
};

const getFileNameFromContentDisposition = (
  value: string | null,
  fallback: string,
): string => {
  if (!value) return fallback;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).trim() || fallback;
  }

  const simpleMatch = value.match(/filename="([^"]+)"/i);
  if (simpleMatch?.[1]) return simpleMatch[1].trim() || fallback;

  return fallback;
};

export const generateLipaSummary = async (
  payload: GenerateLipaSummaryPayload,
): Promise<GenerateLipaSummaryResult> => {
  const formData = new FormData();

  payload.files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("mappings", JSON.stringify(payload.mappings));

  if (payload.title?.trim()) formData.append("title", payload.title.trim());
  if (payload.season?.trim()) formData.append("season", payload.season.trim());
  if (payload.outputFileName?.trim()) {
    formData.append("outputFileName", payload.outputFileName.trim());
  }

  const response = await fetch("/api/v1/lipa-summary", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to generate LIPA summary report",
    );
  }

  const blob = await response.blob();
  const fileName = getFileNameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    "LIPA_Summary_Report.xlsx",
  );
  const scannedFiles = Number(response.headers.get("X-Scanned-Files") ?? "0");
  const extractedAssociations = Number(
    response.headers.get("X-Extracted-Associations") ?? "0",
  );

  return { blob, fileName, scannedFiles, extractedAssociations };
};
