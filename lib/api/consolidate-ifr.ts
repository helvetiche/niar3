"use client";

export type ConsolidateIfrPayload = {
  file: File;
  sheetId: string;
  tabName?: string;
};

export type ConsolidateIfrResult = {
  success: boolean;
  row: number;
  rowsWritten: number;
};

export const consolidateIfrFile = async (
  payload: ConsolidateIfrPayload,
): Promise<ConsolidateIfrResult> => {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("sheetId", payload.sheetId);
  if (payload.tabName?.trim()) {
    formData.append("tabName", payload.tabName.trim());
  }

  const response = await fetch("/api/v1/consolidate-ifr", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to consolidate file");
  }

  return response.json() as Promise<ConsolidateIfrResult>;
};
