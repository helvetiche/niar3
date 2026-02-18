"use client";

import { getClientAuth } from "@/lib/firebase/config";

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

const refreshSessionCookie = async (): Promise<void> => {
  const auth = getClientAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const token = await user.getIdToken(true);
  const response = await fetch("/api/v1/auth/session", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error("Unable to refresh session. Please sign in again.");
  }
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

  const executeRequest = () =>
    fetch("/api/v1/lipa-summary", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

  let response = await executeRequest();
  if (response.status === 401) {
    await refreshSessionCookie();
    response = await executeRequest();
  }

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

export const scanLipaFile = async (
  payload: ScanLipaFilePayload,
): Promise<LipaScannedFileResult> => {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append(
    "payload",
    JSON.stringify({
      divisionName: payload.mapping.divisionName,
      pageNumber: payload.mapping.pageNumber,
    }),
  );

  const executeRequest = () =>
    fetch("/api/v1/lipa-summary/scan", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

  let response = await executeRequest();
  if (response.status === 401) {
    await refreshSessionCookie();
    response = await executeRequest();
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to scan LIPA PDF");
  }

  const data = (await response.json()) as { scanned: LipaScannedFileResult };
  return data.scanned;
};

export const buildLipaSummaryReport = async (
  payload: BuildLipaSummaryReportPayload,
): Promise<GenerateLipaSummaryResult> => {
  const executeRequest = () =>
    fetch("/api/v1/lipa-summary/report", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  let response = await executeRequest();
  if (response.status === 401) {
    await refreshSessionCookie();
    response = await executeRequest();
  }

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
