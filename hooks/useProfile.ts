import useSWR from "swr";
import type { UserProfile } from "@/types/profile";

const SWR_KEY = "/api/v1/profile";

async function fetcher(url: string): Promise<UserProfile> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to load profile");
  }
  return res.json();
}

/**
 * Fetches user profile with SWR for automatic caching and revalidation.
 * Revalidates on focus. Use mutate to refresh after saving profile.
 */
export function useProfile() {
  return useSWR<UserProfile>(SWR_KEY, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 30000,
  });
}
