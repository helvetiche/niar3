"use client";

export type ConsolidateIfrPayload = {
  files: File[];
  template: File;
  tabName?: string;
};

export type ConsolidateIfrResult = {
  blob: Blob;
  consolidatedCount: number;
  skippedCount: number;
  skippedItems: string[];
};

export const consolidateIfrFile = async (
  payload: ConsolidateIfrPayload,
): Promise<ConsolidateIfrResult> => {
  const formData = new FormData();
  payload.files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("template", payload.template);
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

  const blob = await response.blob();
  const consolidatedCount = Number(response.headers.get("X-Consolidated-Count") ?? "0");
  const skippedCount = Number(response.headers.get("X-Skipped-Count") ?? "0");
  const skippedItemsHeader = response.headers.get("X-Skipped-Items") ?? "";
  const skippedItems = skippedItemsHeader
    ? skippedItemsHeader.split(",").filter(Boolean)
    : [];

  return { blob, consolidatedCount, skippedCount, skippedItems };
};
