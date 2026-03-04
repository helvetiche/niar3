"use client";

export type GenerateBillingUnitsOptions = {
  templateId: string;
  billingUnitFolderName?: string;
  sourceFolderNames?: Record<string, string>;
};

export const generateBillingUnitsZip = async (
  sourceFiles: File[],
  options: GenerateBillingUnitsOptions,
): Promise<Blob> => {
  if (sourceFiles.length === 0) {
    throw new Error("Please upload at least one source Excel file.");
  }

  const formData = new FormData();
  sourceFiles.forEach((file) => {
    formData.append("files", file);
  });
  if (options.templateId?.trim()) {
    formData.append("templateId", options.templateId.trim());
  }
  if (options.billingUnitFolderName?.trim()) {
    formData.append(
      "billingUnitFolderName",
      options.billingUnitFolderName.trim(),
    );
  }
  if (options.sourceFolderNames) {
    formData.append(
      "sourceFolderNames",
      JSON.stringify(options.sourceFolderNames),
    );
  }

  const response = await fetch("/api/v1/generate-billing-units", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ??
        "Failed to generate billing unit files",
    );
  }

  return response.blob();
};
