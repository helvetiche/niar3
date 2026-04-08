import useSWR from "swr";
import type { Schedule } from "@/types/schedule";

type SchedulesResponse = {
  schedules: Schedule[];
};

const TASK_MANAGER_SCHEDULES_KEY = "/api/v1/schedules?limit=1000&page=1";

const fetcher = async (url: string): Promise<Schedule[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch schedules");
  const data = (await res.json()) as SchedulesResponse;
  return data.schedules ?? [];
};

/**
 * Loads up to 1000 schedules for the task manager (period completion checklist).
 */
export function useAllSchedulesForTaskManager() {
  return useSWR<Schedule[]>(TASK_MANAGER_SCHEDULES_KEY, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 8000,
    keepPreviousData: true,
  });
}
