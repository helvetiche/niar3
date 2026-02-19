import type {
  AccountUser,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "@/types/account";

export async function fetchAccounts(
  page = 1,
  limit = 8,
): Promise<{ accounts: AccountUser[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const response = await fetch(
    `/api/v1/accounts?page=${page}&limit=${limit}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error ?? "Something went wrong");
  }

  return (await response.json()) as {
    accounts: AccountUser[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export async function createAccount(
  request: CreateAccountRequest,
): Promise<AccountUser> {
  const response = await fetch("/api/v1/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error ?? "Something went wrong");
  }

  return (await response.json()) as AccountUser;
}

export async function updateAccount(
  uid: string,
  request: UpdateAccountRequest,
): Promise<AccountUser> {
  const response = await fetch(`/api/v1/accounts/${uid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error ?? "Something went wrong");
  }

  return (await response.json()) as AccountUser;
}

export async function deleteAccount(uid: string): Promise<void> {
  const response = await fetch(`/api/v1/accounts/${uid}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error ?? "Something went wrong");
  }
}
