"use client";

import {
  getCachedTemplates,
  setCachedTemplates,
  invalidateTemplateCache,
} from "@/lib/services/template-cache";

export type TemplateScope = "ifr-scanner" | "consolidate-ifr";

export type StoredTemplate = {
  id: string;
  name: string;
  scope: TemplateScope;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  createdAt: number;
  updatedAt?: number;
  uploaderUid?: string;
  updatedByUid?: string;
};

export async function listTemplates(
  scope: TemplateScope,
): Promise<StoredTemplate[]> {
  const cached = getCachedTemplates(scope);
  if (cached) return cached;

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
  const templates = data.templates ?? [];

  setCachedTemplates(scope, templates);
  return templates;
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

  invalidateTemplateCache(scope);
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

  invalidateTemplateCache();
}

export async function updateTemplate(
  templateId: string,
  updates: {
    name?: string;
    file?: File | null;
  },
): Promise<StoredTemplate> {
  const formData = new FormData();
  if (updates.name?.trim()) {
    formData.append("name", updates.name.trim());
  }
  if (updates.file) {
    formData.append("file", updates.file);
  }

  const response = await fetch(`/api/v1/templates/${templateId}`, {
    method: "PATCH",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to update template",
    );
  }

  invalidateTemplateCache();
  return response.json() as Promise<StoredTemplate>;
}
