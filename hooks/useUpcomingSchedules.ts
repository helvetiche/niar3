import useSWR from "swr";
import type { Schedule } from "@/types/schedule";
import { calculateNextDeadline } from "@/lib/deadline-calculator";

interface UpcomingSchedule extends Schedule {
  nextDeadline: Date;
  daysUntil: number;
}

const fetcher = async (url: string): Promise<Schedule[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch schedules");
  }
  const data = await response.json();
  return data.schedules || [];
};

export function useUpcomingSchedules(limit: number = 10) {
  const { data, error, isLoading, mutate } = useSWR<Schedule[]>(
    `/api/v1/schedules?limit=100&status=active`,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  );

  const upcomingSchedules: UpcomingSchedule[] = (data || [])
    .map((schedule) => {
      const nextDeadline = calculateNextDeadline(schedule.deadline);
      const now = new Date();
      const daysUntil = Math.ceil(
        (nextDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        ...schedule,
        nextDeadline,
        daysUntil,
      };
    })
    .sort((a, b) => a.nextDeadline.getTime() - b.nextDeadline.getTime())
    .slice(0, limit);

  return {
    schedules: upcomingSchedules,
    isLoading,
    error: error || null,
    mutate,
  };
}
