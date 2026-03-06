"use client";

import { FormDataBuilder, handleApiError } from "@/lib/api/api-client-utils";

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

  const formData = new FormDataBuilder()
    .appendFiles("files", sourceFiles)
    .appendOptional("templateId", options.templateId)
    .appendOptional("billingUnitFolderName", options.billingUnitFolderName)
    .build();

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
    await handleApiError(response, "Failed to generate billing unit files");
  }

  return response.blob();
};
