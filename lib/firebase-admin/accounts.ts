import "server-only";
import { getAdminAuth } from "./app";

export interface AccountUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  disabled: boolean;
  permissions: string[];
}

export interface PaginatedAccounts {
  accounts: AccountUser[];
  nextPageToken?: string;
  hasMore: boolean;
}

/**
 * Fetches accounts with cursor-based pagination for scalability.
 * Uses Firebase Admin SDK's native pagination support.
 * @param limit - Number of accounts to fetch (max 1000)
 * @param pageToken - Cursor token from previous page
 * @returns Paginated accounts with next page token
 */
export async function getAccountsPaginated(
  limit = 8,
  pageToken?: string,
): Promise<PaginatedAccounts> {
  const auth = getAdminAuth();

  const listResult = await auth.listUsers(limit, pageToken);

  const accounts: AccountUser[] = listResult.users.map((u) => ({
    uid: u.uid,
    email: u.email ?? "",
    displayName: u.displayName ?? "",
    role: u.customClaims?.role ?? "user",
    createdAt: u.metadata.creationTime,
    disabled: u.disabled,
    permissions: u.customClaims?.permissions ?? [],
  }));

  return {
    accounts,
    nextPageToken: listResult.pageToken,
    hasMore: !!listResult.pageToken,
  };
}

/**
 * Gets total account count (cached for 5 minutes).
 * Note: This is expensive for large user bases. Consider caching in Firestore.
 * @returns Total number of accounts
 */
export async function getAccountCount(): Promise<number> {
  const auth = getAdminAuth();
  let count = 0;
  let pageToken: string | undefined;

  do {
    const result = await auth.listUsers(1000, pageToken);
    count += result.users.length;
    pageToken = result.pageToken;
  } while (pageToken);

  return count;
}
