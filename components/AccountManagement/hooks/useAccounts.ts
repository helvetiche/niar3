import { useState, useCallback } from "react";
import { fetchAccounts } from "@/lib/api/accounts";
import type { AccountUser } from "@/types/account";
import toast from "react-hot-toast";

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadAccounts = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const data = await fetchAccounts(page, 8);
      setAccounts(data.accounts);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.page);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load accounts";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    accounts,
    setAccounts,
    loading,
    currentPage,
    totalPages,
    loadAccounts,
  };
}
