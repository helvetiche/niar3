"use client";

export type MergeMode = "pdf" | "excel";

export type PdfPageOrderItem = {
  fileIndex: number;
  pageIndex: number;
};

export type MergeFilesPayload = {
  mode: MergeMode;
  files: File[];
  fileName?: string;
  pageOrder?: PdfPageOrderItem[];
  excelPageNames?: string[];
};

export type MergeFilesResult = {
  blob: Blob;
  fileName: string;
  mergedCount: number;
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

export const mergeFiles = async (
  payload: MergeFilesPayload,
): Promise<MergeFilesResult> => {
  const formData = new FormData();
  formData.append("mode", payload.mode);

  payload.files.forEach((file) => {
    formData.append("files", file);
  });

  if (payload.fileName?.trim()) {
    formData.append("fileName", payload.fileName.trim());
  }

  if (payload.mode === "pdf" && payload.pageOrder?.length) {
    formData.append("pageOrder", JSON.stringify(payload.pageOrder));
  }

  if (payload.mode === "excel" && payload.excelPageNames?.length) {
    formData.append("excelPageNames", JSON.stringify(payload.excelPageNames));
  }

  const response = await fetch("/api/v1/merge-files", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to merge files",
    );
  }

  const blob = await response.blob();
  const mergedCount = Number(response.headers.get("X-Merged-Count") ?? "0");
  const defaultName = payload.mode === "pdf" ? "merged.pdf" : "merged.xlsx";
  const fileName = getFileNameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    defaultName,
  );

  return { blob, fileName, mergedCount };
};
