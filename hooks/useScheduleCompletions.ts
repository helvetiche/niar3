import useSWR from "swr";
import { apiGet } from "@/lib/api-client";
import type { TaskCompletion } from "@/types/schedule";

type CompletionsResponse = { completions: TaskCompletion[] };

const fetcher = async (url: string): Promise<TaskCompletion[]> => {
  const data = await apiGet<CompletionsResponse>(url);
  return data.completions ?? [];
};

export function useScheduleCompletions() {
  return useSWR<TaskCompletion[]>("/api/v1/completions", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 8000,
    keepPreviousData: true,
  });
}
