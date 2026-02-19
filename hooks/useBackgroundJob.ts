import { useState, useEffect, useCallback, useRef } from "react";

type JobStatus = "pending" | "processing" | "completed" | "failed";

type BackgroundJob = {
  id: string;
  status: JobStatus;
  progress: number;
  error?: string;
  resultStoragePath?: string;
};

type UseBackgroundJobOptions = {
  jobId: string | null;
  pollInterval?: number;
  onComplete?: (job: BackgroundJob) => void;
  onError?: (error: string) => void;
};

export function useBackgroundJob(options: UseBackgroundJobOptions) {
  const { jobId, pollInterval = 2000, onComplete, onError } = options;
  const [job, setJob] = useState<BackgroundJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const fetchJobStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/v1/jobs/status?jobId=${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job status");
      }
      const data = await response.json();
      return data as BackgroundJob;
    } catch (error) {
      throw error instanceof Error ? error : new Error("Unknown error");
    }
  }, []);

  const startPolling = useCallback(() => {
    if (!jobId || isPolling) return;

    setIsPolling(true);

    const poll = async () => {
      try {
        const jobData = await fetchJobStatus(jobId);
        setJob(jobData);

        if (jobData.status === "completed") {
          setIsPolling(false);
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onComplete?.(jobData);
        } else if (jobData.status === "failed") {
          setIsPolling(false);
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onError?.(jobData.error || "Job failed");
        }
      } catch (error) {
        setIsPolling(false);
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onError?.(
          error instanceof Error ? error.message : "Failed to poll job",
        );
      }
    };

    void poll();
    intervalRef.current = window.setInterval(() => {
      void poll();
    }, pollInterval);
  }, [jobId, isPolling, pollInterval, fetchJobStatus, onComplete, onError]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (jobId) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [jobId, startPolling, stopPolling]);

  return {
    job,
    isPolling,
    startPolling,
    stopPolling,
  };
}
