"use client";

import {
  fetchWithSessionRefresh,
  getFileNameFromContentDisposition,
  FormDataBuilder,
  handleApiError,
} from "@/lib/api/api-client-utils";

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

export type ScanLipaFilePayload = {
  file: File;
  mapping: LipaSummaryFileMapping;
};

export type LipaScannedFileResult = {
  fileName: string;
  divisionName: string;
  confidence: number;
  associations: Array<{ name: string; totalArea: number }>;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type BuildLipaSummaryReportPayload = {
  scannedFiles: LipaScannedFileResult[];
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

export const generateLipaSummary = async (
  payload: GenerateLipaSummaryPayload,
): Promise<GenerateLipaSummaryResult> => {
  const formData = new FormDataBuilder()
    .appendFiles("files", payload.files)
    .appendJSON("mappings", payload.mappings)
    .appendOptional("title", payload.title)
    .appendOptional("season", payload.season)
    .appendOptional("outputFileName", payload.outputFileName)
    .build();

  const response = await fetchWithSessionRefresh(() =>
    fetch("/api/v1/lipa-summary", {
      method: "POST",
      credentials: "include",
      body: formData,
    }),
  );

  if (!response.ok) {
    await handleApiError(response, "Failed to generate LIPA summary report");
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

export const scanLipaFile = async (
  payload: ScanLipaFilePayload,
): Promise<LipaScannedFileResult> => {
  const formData = new FormDataBuilder()
    .append("file", payload.file)
    .appendJSON("payload", {
      divisionName: payload.mapping.divisionName,
      pageNumber: payload.mapping.pageNumber,
    })
    .build();

  const response = await fetchWithSessionRefresh(() =>
    fetch("/api/v1/lipa-summary/scan", {
      method: "POST",
      credentials: "include",
      body: formData,
    }),
  );

  if (!response.ok) {
    await handleApiError(response, "Failed to scan LIPA PDF");
  }

  const data = (await response.json()) as { scanned: LipaScannedFileResult };
  return data.scanned;
};

export const buildLipaSummaryReport = async (
  payload: BuildLipaSummaryReportPayload,
): Promise<GenerateLipaSummaryResult> => {
  const response = await fetchWithSessionRefresh(() =>
    fetch("/api/v1/lipa-summary/report", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );

  if (!response.ok) {
    await handleApiError(response, "Failed to generate LIPA summary report");
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
