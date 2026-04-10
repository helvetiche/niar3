import useSWR from "swr";
import { useState, useCallback } from "react";
import type { Schedule } from "@/types/schedule";

interface Pagination {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface SchedulesResponse {
  schedules: Schedule[];
  pagination: Pagination;
}

interface UseSchedulesOptions {
  initialPage?: number;
  initialSearch?: string;
  initialStatus?: string;
}

interface UseSchedulesReturn {
  schedules: Schedule[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  search: string;
  status: string;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setStatus: (status: string) => void;
  nextPage: () => void;
  prevPage: () => void;
  mutate: () => void;
}

const fetcher = async (url: string): Promise<SchedulesResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch schedules");
  }
  return response.json();
};

export function useSchedules(options: UseSchedulesOptions = {}): UseSchedulesReturn {
  const { initialPage = 1, initialSearch = "", initialStatus = "" } = options;

  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);

  // Build query params
  const params = new URLSearchParams();
  params.set("page", page.toString());
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  const { data, error, isLoading, mutate } = useSWR<SchedulesResponse>(
    `/api/v1/schedules?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 1000,
    }
  );

  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSetSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page on search
  }, []);

  const handleSetStatus = useCallback((newStatus: string) => {
    setStatus(newStatus);
    setPage(1); // Reset to first page on filter change
  }, []);

  const nextPage = useCallback(() => {
    if (data?.pagination?.hasNextPage) {
      setPage((p) => p + 1);
    }
  }, [data?.pagination?.hasNextPage]);

  const prevPage = useCallback(() => {
    if (data?.pagination?.hasPrevPage) {
      setPage((p) => p - 1);
    }
  }, [data?.pagination?.hasPrevPage]);

  return {
    schedules: data?.schedules || [],
    pagination: data?.pagination || null,
    isLoading,
    error: error || null,
    page,
    search,
    status,
    setPage: handleSetPage,
    setSearch: handleSetSearch,
    setStatus: handleSetStatus,
    nextPage,
    prevPage,
    mutate,
  };
}
