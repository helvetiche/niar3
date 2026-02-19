import useSWR from "swr";

interface Account {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  disabled: boolean;
  permissions: string[];
}

interface AccountsResponse {
  accounts: Account[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextPageToken?: string;
  };
}

/**
 * Custom hook for fetching and caching accounts with cursor-based pagination.
 * Implements efficient server-side pagination for scalability.
 * @param limit - Number of accounts per page
 * @param pageToken - Cursor token for next page
 * @returns SWR response with accounts data, loading state, and error
 */
export function useAccounts(limit = 8, pageToken?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (pageToken) params.set("pageToken", pageToken);

  return useSWR<AccountsResponse>(
    `/api/v1/accounts?${params.toString()}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not load accounts");
      return res.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    },
  );
}
