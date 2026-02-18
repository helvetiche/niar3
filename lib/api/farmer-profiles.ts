"use client";

export const generateProfilesZip = async (
  mastersFile: File,
  templateFile?: File | null,
  templateId?: string,
): Promise<Blob> => {
  const formData = new FormData();
  formData.append("file", mastersFile);
  if (templateFile) {
    formData.append("template", templateFile);
  }
  if (!templateFile && templateId?.trim()) {
    formData.append("templateId", templateId.trim());
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
