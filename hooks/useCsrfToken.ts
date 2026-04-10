"use client";

import { useState } from "react";

/**
 * Hook to get CSRF token from cookies
 * Use this to attach CSRF token to state-changing requests
 */
export function useCsrfToken(): string | null {
  const [token] = useState<string | null>(() => {
    // Extract CSRF token from cookies on initial render
    if (typeof document === "undefined") return null;

    const cookies = document.cookie.split(";");
    const csrfCookie = cookies.find((c) => c.trim().startsWith("__csrf-token="));

    return csrfCookie ? csrfCookie.split("=")[1] : null;
  });

  return token;
}

/**
 * Helper to add CSRF token to fetch headers
 */
export function addCsrfHeader(
  headers: Record<string, string>,
  token: string | null
): Record<string, string> {
  if (!token) return headers;
  return {
    ...headers,
    "x-csrf-token": token,
  };
}
