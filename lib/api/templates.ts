"use client";

export type TemplateScope = "ifr-scanner" | "consolidate-ifr";

export type StoredTemplate = {
  id: string;
  name: string;
  scope: TemplateScope;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  createdAt: number;
};

export async function listTemplates(
  scope: TemplateScope,
): Promise<StoredTemplate[]> {
  const response = await fetch(`/api/v1/templates?scope=${scope}`, {
    credentials: "include",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to load templates",
    );
  }
  const data = (await response.json()) as { templates?: StoredTemplate[] };
  return data.templates ?? [];
}

export async function uploadTemplate(
  scope: TemplateScope,
  file: File,
  name?: string,
): Promise<StoredTemplate> {
  const formData = new FormData();
  formData.append("scope", scope);
  formData.append("file", file);
  if (name?.trim()) {
    formData.append("name", name.trim());
  }

  const response = await fetch("/api/v1/templates", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to upload template",
    );
  }
  return response.json() as Promise<StoredTemplate>;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const response = await fetch(`/api/v1/templates/${templateId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to delete template",
    );
  }
}
