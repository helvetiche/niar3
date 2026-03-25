"use client";

import { CSRF_HEADER_NAME } from "@/constants/config";

/**
 * Get CSRF token from cookies
 */
function getCsrfTokenFromCookie(): string | null {
  const cookies = document.cookie.split(";");
  const csrfCookie = cookies.find((c) => c.trim().startsWith("__csrf-token="));

  if (csrfCookie) {
    const tokenValue = csrfCookie.split("=")[1];
    return tokenValue;
  }

  return null;
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Enhanced fetch wrapper that automatically includes CSRF token for state-changing requests
 */
export async function apiCall<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const method = options.method?.toUpperCase() || "GET";
  const headers = { ...options.headers };

  // Add CSRF token for state-changing operations
  if (method !== "GET" && method !== "HEAD") {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  // Add content-type if not already set
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error?.error?.message ||
        `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * GET request
 */
export function apiGet<T = unknown>(url: string): Promise<T> {
  return apiCall<T>(url, { method: "GET" });
}

/**
 * POST request
 */
export function apiPost<T = unknown>(url: string, data?: unknown): Promise<T> {
  return apiCall<T>(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export function apiPut<T = unknown>(url: string, data?: unknown): Promise<T> {
  return apiCall<T>(url, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export function apiDelete<T = unknown>(url: string): Promise<T> {
  return apiCall<T>(url, { method: "DELETE" });
}

/**
 * PATCH request
 */
export function apiPatch<T = unknown>(url: string, data?: unknown): Promise<T> {
  return apiCall<T>(url, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
}
