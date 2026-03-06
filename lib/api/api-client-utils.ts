/**
 * Shared utilities for API client functions
 */

import { getClientAuth } from "@/lib/firebase/config";

/**
 * Refresh the session cookie by getting a new ID token
 */
export const refreshSessionCookie = async (): Promise<void> => {
  const auth = getClientAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const token = await user.getIdToken(true);
  const response = await fetch("/api/v1/auth/session", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error("Unable to refresh session. Please sign in again.");
  }
};

/**
 * Execute a fetch request with automatic session refresh on 401
 */
export const fetchWithSessionRefresh = async (
  requestFn: () => Promise<Response>,
): Promise<Response> => {
  let response = await requestFn();
  
  if (response.status === 401) {
    await refreshSessionCookie();
    response = await requestFn();
  }
  
  return response;
};

/**
 * Extract filename from Content-Disposition header
 */
export const getFileNameFromContentDisposition = (
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

/**
 * Build FormData with optional fields
 */
export class FormDataBuilder {
  private formData: FormData;

  constructor() {
    this.formData = new FormData();
  }

  append(key: string, value: string | Blob | File): this {
    this.formData.append(key, value);
    return this;
  }

  appendOptional(key: string, value: string | undefined | null): this {
    if (value?.trim()) {
      this.formData.append(key, value.trim());
    }
    return this;
  }

  appendJSON(key: string, value: unknown): this {
    this.formData.append(key, JSON.stringify(value));
    return this;
  }

  appendBoolean(key: string, value: boolean | undefined): this {
    if (value !== undefined) {
      this.formData.append(key, String(value));
    }
    return this;
  }

  appendFiles(key: string, files: File[]): this {
    files.forEach((file) => {
      this.formData.append(key, file);
    });
    return this;
  }

  build(): FormData {
    return this.formData;
  }
}

/**
 * Handle API error response
 */
export const handleApiError = async (
  response: Response,
  defaultMessage: string,
): Promise<never> => {
  const data = await response.json().catch(() => ({}));
  throw new Error(
    (data as { error?: string }).error ?? defaultMessage,
  );
};
