"use client";

export type GenerateProfilesOptions = {
  templateId: string;
  createConsolidation?: boolean;
  consolidationTemplateId?: string;
  consolidationFileName?: string;
  consolidationDivision?: string;
  consolidationIA?: string;
};

export const generateProfilesZip = async (
  mastersFile: File,
  options: GenerateProfilesOptions,
): Promise<Blob> => {
  const formData = new FormData();
  formData.append("file", mastersFile);
  if (options.templateId?.trim()) {
    formData.append("templateId", options.templateId.trim());
  }

  if (options.createConsolidation) {
    formData.append("createConsolidation", "true");
    if (options.consolidationTemplateId?.trim()) {
      formData.append("consolidationTemplateId", options.consolidationTemplateId.trim());
    }
    if (options.consolidationFileName?.trim()) {
      formData.append("consolidationFileName", options.consolidationFileName.trim());
    }
    if (options.consolidationDivision?.trim()) {
      formData.append("consolidationDivision", options.consolidationDivision.trim());
    }
    if (options.consolidationIA?.trim()) {
      formData.append("consolidationIA", options.consolidationIA.trim());
    }
  }

  const response = await fetch("/api/v1/generate-profiles", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to generate profile files",
    );
  }

  return response.blob();
};
