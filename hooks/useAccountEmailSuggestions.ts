"use client";

import useSWR from "swr";

export type AccountEmailSuggestion = {
  email: string;
  displayName: string;
};

type EmailSuggestionsResponse = {
  suggestions: AccountEmailSuggestion[];
};

const fetcher = async (url: string): Promise<AccountEmailSuggestion[]> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return [];
  const data = (await res.json()) as EmailSuggestionsResponse;
  return Array.isArray(data.suggestions) ? data.suggestions : [];
};

/**
 * Cached list of workspace account emails (same source as Account Management).
 * Non–super-admins receive an empty list from the API.
 */
export const useAccountEmailSuggestions = () => {
  const { data, error, isLoading } = useSWR<AccountEmailSuggestion[]>(
    "/api/v1/accounts/email-suggestions",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    suggestions: data ?? [],
    isLoading,
    isError: Boolean(error),
  };
};
