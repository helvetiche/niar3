"use client";

export type ConsolidateIfrPayload = {
  files: File[];
  template?: File | null;
  templateId?: string;
  fileName?: string;
  division?: string;
  ia?: string;
};

export type ConsolidateIfrResult = {
  blob: Blob;
  consolidatedCount: number;
  skippedCount: number;
  skippedItems: string[];
  skippedDetails: { fileName: string; fileId?: string; reason: string }[];
};

export const consolidateIfrFile = async (
  payload: ConsolidateIfrPayload,
): Promise<ConsolidateIfrResult> => {
  const formData = new FormData();
  payload.files.forEach((file) => {
    formData.append("files", file);
  });
  if (payload.template) {
    formData.append("template", payload.template);
  }
  if (!payload.template && payload.templateId?.trim()) {
    formData.append("templateId", payload.templateId.trim());
  }
  if (payload.fileName?.trim()) {
    formData.append("fileName", payload.fileName.trim());
  }
  if (payload.division?.trim()) {
    formData.append("division", payload.division.trim());
  }
  if (payload.ia?.trim()) {
    formData.append("ia", payload.ia.trim());
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
  const skippedDetailsHeader = response.headers.get("X-Skipped-Details") ?? "";
  let skippedDetails: { fileName: string; fileId?: string; reason: string }[] = [];
  if (skippedDetailsHeader) {
    try {
      skippedDetails = JSON.parse(
        decodeURIComponent(skippedDetailsHeader),
      ) as typeof skippedDetails;
    } catch {
      skippedDetails = [];
    }
  }

  return { blob, consolidatedCount, skippedCount, skippedItems, skippedDetails };
};
