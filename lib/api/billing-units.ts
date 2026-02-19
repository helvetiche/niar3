"use client";

export type GenerateBillingUnitsOptions = {
  templateId: string;
  createConsolidation?: boolean;
  consolidationTemplateId?: string;
  createMergedConsolidation?: boolean;
  mergedConsolidationFileName?: string;
  billingUnitFolderName?: string;
  sourceFolderNames?: Record<string, string>;
  sourceConsolidationDivisions?: Record<string, string>;
  sourceConsolidationIAs?: Record<string, string>;
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

  if (options.createConsolidation) {
    formData.append("createConsolidation", "true");
    if (options.consolidationTemplateId?.trim()) {
      formData.append(
        "consolidationTemplateId",
        options.consolidationTemplateId.trim(),
      );
    }
    if (options.createMergedConsolidation) {
      formData.append("createMergedConsolidation", "true");
      if (options.mergedConsolidationFileName?.trim()) {
        formData.append(
          "mergedConsolidationFileName",
          options.mergedConsolidationFileName.trim(),
        );
      }
    }
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
  if (options.sourceConsolidationDivisions) {
    formData.append(
      "sourceConsolidationDivisions",
      JSON.stringify(options.sourceConsolidationDivisions),
    );
  }
  if (options.sourceConsolidationIAs) {
    formData.append(
      "sourceConsolidationIAs",
      JSON.stringify(options.sourceConsolidationIAs),
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
