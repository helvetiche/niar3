"use client";

import { useEffect, useMemo, useState } from "react";
import { FunnelIcon, SparkleIcon } from "@phosphor-icons/react";
import type { AiUsageStatus, AiUsageTaskType } from "@/lib/ai-usage";
import { getUsageLogs, type UsageSummary } from "@/lib/api/usage";
import { getErrorMessage } from "@/lib/utils";

const TASK_OPTIONS: Array<{ value: "" | AiUsageTaskType; label: string }> = [
  { value: "", label: "All tasks" },
  { value: "compose-email", label: "Compose Email" },
  { value: "lipa-summary-scan", label: "LIPA Scan" },
  { value: "lipa-summary-bulk", label: "LIPA Bulk" },
];

const STATUS_OPTIONS: Array<{ value: "" | AiUsageStatus; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
];

const formatNumber = (value: number): string => new Intl.NumberFormat().format(value);
const formatPhp = (value: number): string =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

const defaultSummary: UsageSummary = {
  totalCalls: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  totalEstimatedCostUsd: 0,
  totalEstimatedCostPhp: 0,
  countByTask: {},
};

export function UsageTool() {
  const [taskType, setTaskType] = useState<"" | AiUsageTaskType>("");
  const [status, setStatus] = useState<"" | AiUsageStatus>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<UsageSummary>(defaultSummary);
  const [entries, setEntries] = useState<
    Array<{
      id: string;
      taskType: string;
      model: string;
      status: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      estimatedCostPhp?: number;
      createdAtIso: string;
    }>
  >([]);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await getUsageLogs({
          limit: 200,
          taskType: taskType || undefined,
          status: status || undefined,
        });

        if (isCancelled) return;
        setSummary(data.summary);
        setEntries(data.entries);
      } catch (loadError) {
        if (isCancelled) return;
        setError(getErrorMessage(loadError, "Failed to load usage logs."));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [taskType, status]);

  const taskBreakdown = useMemo(() => {
    return Object.entries(summary.countByTask).sort((a, b) => b[1] - a[1]);
  }, [summary.countByTask]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-medium text-white sm:text-2xl">
            <SparkleIcon size={20} weight="duotone" className="text-white" />
            Usage
          </h2>
          <p className="mt-1 text-sm text-white/80">
            Logs AI usage with token and estimated cost tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-medium text-white">
          <FunnelIcon size={14} weight="duotone" />
          Filters
        </div>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-white/80">
          Task
          <select
            value={taskType}
            onChange={(event) =>
              setTaskType(event.target.value as "" | AiUsageTaskType)
            }
            className="h-10 rounded-lg border border-white/30 bg-emerald-950/60 px-3 text-sm text-white focus:outline-none"
          >
            {TASK_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-white/80">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | AiUsageStatus)}
            className="h-10 rounded-lg border border-white/30 bg-emerald-950/60 px-3 text-sm text-white focus:outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/25 bg-white/10 p-3 text-white">
          <p className="text-xs text-white/75">Total calls</p>
          <p className="mt-1 text-lg font-medium">{formatNumber(summary.totalCalls)}</p>
        </div>
        <div className="rounded-xl border border-white/25 bg-white/10 p-3 text-white">
          <p className="text-xs text-white/75">Input tokens</p>
          <p className="mt-1 text-lg font-medium">
            {formatNumber(summary.totalInputTokens)}
          </p>
        </div>
        <div className="rounded-xl border border-white/25 bg-white/10 p-3 text-white">
          <p className="text-xs text-white/75">Output tokens</p>
          <p className="mt-1 text-lg font-medium">
            {formatNumber(summary.totalOutputTokens)}
          </p>
        </div>
        <div className="rounded-xl border border-white/25 bg-white/10 p-3 text-white">
          <p className="text-xs text-white/75">Estimated spend</p>
          <p className="mt-1 text-lg font-medium">
            {formatPhp(summary.totalEstimatedCostPhp)}
          </p>
        </div>
      </div>

      {taskBreakdown.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {taskBreakdown.map(([task, count]) => (
            <span
              key={task}
              className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white"
            >
              {task}: {count}
            </span>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/25 bg-emerald-950/40">
        {isLoading ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-white/80">
            Loading usage logs...
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-rose-200">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-sm text-white/75">No usage logs found.</div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="min-w-full text-left text-sm text-white">
              <thead className="bg-white/10 text-xs uppercase text-white/80">
                <tr>
                  <th className="px-3 py-2">Task</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Input</th>
                  <th className="px-3 py-2">Output</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/10">
                    <td className="px-3 py-2">{entry.taskType}</td>
                    <td className="px-3 py-2">{entry.model}</td>
                    <td className="px-3 py-2 capitalize">{entry.status}</td>
                    <td className="px-3 py-2">{formatNumber(entry.inputTokens)}</td>
                    <td className="px-3 py-2">{formatNumber(entry.outputTokens)}</td>
                    <td className="px-3 py-2">{formatNumber(entry.totalTokens)}</td>
                    <td className="px-3 py-2">
                      {formatPhp(entry.estimatedCostPhp ?? entry.estimatedCostUsd * 59)}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(entry.createdAtIso).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
