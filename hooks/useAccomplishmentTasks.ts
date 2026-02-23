import useSWR from "swr";
import {
  fetchAccomplishmentTasks,
  type AccomplishmentTask,
} from "@/lib/api/accomplishment-tasks";

const SWR_KEY = "/api/v1/accomplishment-tasks";

/**
 * Fetches accomplishment tasks with SWR for automatic caching and revalidation.
 * Revalidates on focus and provides mutate for manual cache updates after create/delete.
 */
export function useAccomplishmentTasks() {
  return useSWR<AccomplishmentTask[]>(SWR_KEY, fetchAccomplishmentTasks, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });
}
