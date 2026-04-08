"use client";

import {
  CalendarIcon,
  CaretDownIcon,
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  ListChecksIcon,
  SquaresFourIcon,
  MagnifyingGlassIcon,
  UserIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";
import { MasonryModal } from "@/components/MasonryModal";
import { useScheduleCompletions } from "@/hooks/useScheduleCompletions";
import { useAllSchedulesForTaskManager } from "@/hooks/useAllSchedulesForTaskManager";
import { getCurrentPeriod, getPeriodLabel } from "@/lib/period-calculator";
import { formatDeadline, formatReminder } from "@/lib/schedule-helpers";
import {
  buildCompletionLookup,
  completionPeriodKey,
  groupActiveTasksByDeadlineType,
} from "@/lib/task-manager-utils";
import { apiDelete, apiPost } from "@/lib/api-client";
import type { ReminderDate, Schedule, TaskCompletion } from "@/types/schedule";

type ScheduleWithCompletion = Schedule & {
  currentPeriodCompleted: boolean;
  lastCompletedAt?: string;
};

const formatReminderDetail = (reminderDate: ReminderDate): string => {
  if (reminderDate.type === "absolute" && reminderDate.dateTime) {
    try {
      return new Date(reminderDate.dateTime).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return reminderDate.dateTime;
    }
  }
  return formatReminder(reminderDate);
};

export type TaskManagerProps = {
  /** `drawer` = right shortcut panel; schedule groups are always expanded with checkboxes visible. */
  variant?: "page" | "drawer";
  /** When set, shows a close control in the header (e.g. side panel). */
  onRequestClose?: () => void;
};

export function TaskManager({
  variant = "page",
  onRequestClose,
}: TaskManagerProps) {
  const isDrawer = variant === "drawer";
  const { data: schedules = [], error: schedulesError, isLoading: schedulesLoading } =
    useAllSchedulesForTaskManager();
  const {
    data: completions = [],
    error: completionsError,
    isLoading: completionsLoading,
    mutate: mutateCompletions,
  } = useScheduleCompletions();

  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Schedule | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [optimisticKeys, setOptimisticKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = schedulesLoading || completionsLoading;

  const completionByPeriodKey = useMemo(
    () => buildCompletionLookup(completions),
    [completions],
  );

  const schedulesWithCompletion: ScheduleWithCompletion[] = useMemo(() => {
    return schedules.map((schedule) => {
      const period = getCurrentPeriod(schedule.deadline.type);
      const periodKey = completionPeriodKey(
        schedule.id,
        period.start,
        period.end,
      );
      const completion = completionByPeriodKey.get(periodKey);
      const isOptimistic = optimisticKeys.has(periodKey);
      const currentPeriodCompleted = isOptimistic ? !completion : !!completion;

      return {
        ...schedule,
        currentPeriodCompleted,
        lastCompletedAt: completion?.completedAt,
      };
    });
  }, [schedules, completionByPeriodKey, optimisticKeys]);

  const activeSchedules = useMemo(
    () => schedulesWithCompletion.filter((s) => s.status === "active"),
    [schedulesWithCompletion],
  );

  const inactiveSchedules = useMemo(
    () => schedulesWithCompletion.filter((s) => s.status === "inactive"),
    [schedulesWithCompletion],
  );

  const doneThisPeriodCount = useMemo(
    () => activeSchedules.filter((s) => s.currentPeriodCompleted).length,
    [activeSchedules],
  );

  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeSchedules;
    }
    const query = searchQuery.toLowerCase();
    return activeSchedules.filter(
      (schedule) =>
        schedule.title.toLowerCase().includes(query) ||
        (schedule.description || "").toLowerCase().includes(query) ||
        schedule.personAssigned.toLowerCase().includes(query) ||
        schedule.personEmail.toLowerCase().includes(query),
    );
  }, [activeSchedules, searchQuery]);

  const taskGroups = useMemo(() => {
    if (searchQuery.trim()) {
      return [];
    }
    return groupActiveTasksByDeadlineType(filteredSchedules);
  }, [filteredSchedules, searchQuery]);

  const handleTaskClick = (task: Schedule) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleToggleComplete = useCallback(
    async (schedule: ScheduleWithCompletion, e?: React.SyntheticEvent) => {
      e?.stopPropagation();
      e?.preventDefault();

      const period = getCurrentPeriod(schedule.deadline.type);
      const periodKey = completionPeriodKey(
        schedule.id,
        period.start,
        period.end,
      );

      if (optimisticKeys.has(periodKey)) {
        return;
      }

      const isCurrentlyCompleted = schedule.currentPeriodCompleted;

      setOptimisticKeys((prev) => {
        const next = new Set(prev);
        next.add(periodKey);
        return next;
      });

      const clearOptimistic = () => {
        setOptimisticKeys((prev) => {
          const next = new Set(prev);
          next.delete(periodKey);
          return next;
        });
      };

      try {
        if (isCurrentlyCompleted) {
          const completion = completionByPeriodKey.get(periodKey);
          if (!completion) {
            clearOptimistic();
            return;
          }
          await apiDelete<{ ok: boolean }>(
            `/api/v1/completions/${encodeURIComponent(completion.id)}`,
          );
          await mutateCompletions(
            (prev) => (prev ?? []).filter((c) => c.id !== completion.id),
            { revalidate: false },
          );
        } else {
          const { completion } = await apiPost<{
            completion: TaskCompletion;
          }>("/api/v1/completions", {
            scheduleId: schedule.id,
            periodStart: period.start,
            periodEnd: period.end,
            deadlineType: schedule.deadline.type,
          });
          await mutateCompletions(
            (prev) => [...(prev ?? []), completion],
            { revalidate: false },
          );
        }
      } catch (err) {
        console.error("Toggle completion failed:", err);
      } finally {
        clearOptimistic();
      }
    },
    [completionByPeriodKey, mutateCompletions, optimisticKeys],
  );

  const handleCheckboxKeyDown = (
    e: React.KeyboardEvent,
    schedule: ScheduleWithCompletion,
  ) => {
    if (e.key !== "Enter" && e.key !== " ") {
      return;
    }
    e.preventDefault();
    void handleToggleComplete(schedule, e);
  };

  const renderCheckbox = (task: ScheduleWithCompletion) => {
    const label = task.currentPeriodCompleted
      ? `Completed for ${getPeriodLabel(task.deadline.type)}. Press to mark incomplete.`
      : `Mark complete for ${getPeriodLabel(task.deadline.type)}`;

    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={task.currentPeriodCompleted}
        aria-label={label}
        tabIndex={0}
        onClick={(e) => void handleToggleComplete(task, e)}
        onKeyDown={(e) => handleCheckboxKeyDown(e, task)}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-2 focus:ring-offset-emerald-950 ${
          task.currentPeriodCompleted
            ? "border-white bg-white"
            : "border-white/40 hover:border-white/70"
        }`}
      >
        {task.currentPeriodCompleted ? (
          <CheckIcon size={14} weight="bold" className="text-emerald-900" />
        ) : null}
      </button>
    );
  };

  const renderTaskRow = (task: ScheduleWithCompletion) => (
    <div
      key={task.id}
      className="flex items-center gap-3 rounded-lg border border-emerald-700/50 bg-emerald-900/50 p-2 transition hover:bg-emerald-800/50"
    >
      {renderCheckbox(task)}
      <button
        type="button"
        onClick={() => handleTaskClick(task)}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={`mb-0.5 line-clamp-2 text-sm font-medium ${
            task.currentPeriodCompleted ? "text-white/50 line-through" : "text-white"
          }`}
        >
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/60">
          <span>{task.personAssigned}</span>
          <span aria-hidden>·</span>
          <span className="capitalize">{task.deadline.type.replace(/-/g, " ")}</span>
        </div>
      </button>
    </div>
  );

  const sectionClass = isDrawer
    ? "flex h-full min-h-0 w-full min-w-0 flex-col bg-emerald-900 px-4 pb-4 pt-4 sm:px-5 sm:pb-5"
    : "flex h-full min-h-[420px] w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6";

  return (
    <section className={sectionClass}>
      <header className={isDrawer ? "mb-4" : "mb-6"}>
        <div
          className={
            onRequestClose
              ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              : undefined
          }
        >
          <div className="min-w-0 flex-1">
            <h2
              className={`flex items-center gap-2 font-medium text-white ${
                isDrawer ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
              }`}
            >
              <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
                <ListChecksIcon
                  size={isDrawer ? 18 : 20}
                  className="text-white"
                />
              </span>
              Task Manager
            </h2>
            {schedulesError || completionsError ? null : isLoading ? (
              <div className="mt-3 flex flex-wrap gap-2" aria-hidden>
                <span className="inline-block h-7 w-36 animate-pulse rounded-full bg-white/10" />
                <span className="inline-block h-7 w-40 animate-pulse rounded-full bg-white/10" />
                <span className="inline-block h-7 w-32 animate-pulse rounded-full bg-white/10" />
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  <ListChecksIcon size={12} className="text-white" />
                  {activeSchedules.length} active task
                  {activeSchedules.length !== 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  <CheckCircleIcon size={12} className="text-white" />
                  {doneThisPeriodCount} done this period
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  <SquaresFourIcon size={12} className="text-white" />
                  By schedule type
                </span>
                {inactiveSchedules.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                    <ClockIcon size={12} className="text-white/90" />
                    {inactiveSchedules.length} inactive
                  </span>
                ) : null}
              </div>
            )}
            <p
              className={`mt-2 max-w-3xl text-white/85 ${
                isDrawer ? "text-xs sm:text-sm" : "text-sm"
              }`}
            >
              {isDrawer
                ? "Same checklist as the workspace hub—tick tasks for the current period."
                : "Check off recurring schedules for the current period (today, this week, or this month)."}
            </p>
          </div>
          {onRequestClose ? (
            <button
              type="button"
              onClick={onRequestClose}
              className="shrink-0 self-end rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:self-start"
              aria-label="Close task manager"
            >
              <XIcon className="h-5 w-5" weight="bold" />
            </button>
          ) : null}
        </div>
      </header>

      {schedulesError || completionsError ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-amber-600/40 bg-amber-950/20 p-6 text-center">
          <p className="text-sm text-amber-100/90">
            Could not load tasks or completions. Refresh the page or try again.
          </p>
        </div>
      ) : null}

      {!schedulesError && !completionsError && isLoading ? (
        <div className="flex-1 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-emerald-700 bg-emerald-950/50 p-4"
            >
              <div className="mb-2 h-4 w-28 rounded bg-emerald-700/50" />
              <div className="h-3 w-full rounded bg-emerald-700/50" />
            </div>
          ))}
        </div>
      ) : null}

      {!schedulesError && !completionsError && !isLoading ? (
        <>
          <div className="relative mb-4">
            <MagnifyingGlassIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                aria-label="Clear search"
              >
                <XIcon size={16} weight="bold" />
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {searchQuery.trim() ? (
              <div className="space-y-2">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-white/70">
                    Search results
                  </h3>
                  <span className="text-xs text-white/60">
                    {filteredSchedules.length}{" "}
                    {filteredSchedules.length === 1 ? "task" : "tasks"}
                  </span>
                </div>
                {filteredSchedules.length > 0 ? (
                  filteredSchedules.map((task) => renderTaskRow(task))
                ) : (
                  <div className="py-10 text-center">
                    <MagnifyingGlassIcon
                      size={40}
                      className="mx-auto mb-3 text-white/40"
                    />
                    <p className="text-sm text-white/70">No tasks found</p>
                  </div>
                )}
              </div>
            ) : null}

            {!searchQuery.trim() && taskGroups.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-white/70">
                  By schedule type
                </h3>
                {taskGroups.map((group) =>
                  isDrawer ? (
                    <div
                      key={group.type}
                      className="rounded-lg border border-emerald-700 bg-emerald-950/50"
                    >
                      <div className="flex items-center justify-between border-b border-emerald-700 px-3 py-2.5">
                        <span className="text-sm font-medium text-white">
                          {group.label}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-emerald-900">
                          {group.tasks.length}
                        </span>
                      </div>
                      <div className="space-y-2 p-3">
                        {group.tasks.map((task) => renderTaskRow(task))}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={group.type}
                      className="rounded-lg border border-emerald-700 bg-emerald-950/50"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedType(expandedType === group.type ? null : group.type)
                        }
                        className="flex w-full items-center justify-between p-3 transition hover:bg-emerald-800/50"
                      >
                        <span className="text-sm font-medium text-white">{group.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-emerald-900">
                            {group.tasks.length}
                          </span>
                          <CaretDownIcon
                            size={16}
                            className={`text-white transition-transform ${
                              expandedType === group.type ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>
                      {expandedType === group.type ? (
                        <div className="space-y-2 border-t border-emerald-700 p-3">
                          {group.tasks.map((task) => renderTaskRow(task))}
                        </div>
                      ) : null}
                    </div>
                  ),
                )}
              </div>
            ) : null}

            {!searchQuery.trim() && activeSchedules.length === 0 ? (
              <div className="py-10 text-center">
                <CalendarIcon size={40} className="mx-auto mb-3 text-white/40" />
                <p className="text-sm text-white/70">No active schedules to track</p>
                <p className="mt-1 text-xs text-white/50">
                  {isDrawer
                    ? "Add a schedule from the main workspace hub."
                    : "Add a schedule in the list beside this panel."}
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <MasonryModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        panelClassName="max-w-md"
        animateFrom="bottom"
      >
        {(close) => (
          <div className="rounded-2xl border border-white/40 bg-emerald-900 p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Task details</h3>
              <button
                type="button"
                onClick={close}
                className="rounded p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
                aria-label="Close"
              >
                <XIcon size={20} weight="bold" />
              </button>
            </div>
            {selectedTask ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-700 bg-emerald-950/50 p-4">
                  <h4 className="text-base font-medium text-white">{selectedTask.title}</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        selectedTask.status === "active"
                          ? "bg-emerald-600/40 text-white"
                          : "bg-white/10 text-white/80"
                      }`}
                    >
                      {selectedTask.status === "active" ? "Active" : "Inactive"}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize text-white/80">
                      {selectedTask.deadline.type.replace(/-/g, " ")}
                    </span>
                  </div>
                </div>
                {selectedTask.description ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-white/70">Description</p>
                    <p className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 p-3 text-sm text-white/85">
                      {selectedTask.description}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 p-3">
                  <div className="flex gap-3">
                    <UserIcon size={18} className="mt-0.5 flex-shrink-0 text-white/70" />
                    <div className="min-w-0">
                      <p className="text-xs text-white/60">Assigned to</p>
                      <p className="text-sm text-white">{selectedTask.personAssigned}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                        <EnvelopeIcon size={14} />
                        <span className="truncate">{selectedTask.personEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 p-3">
                  <p className="text-xs text-white/60">Deadline</p>
                  <p className="mt-1 text-sm text-white">
                    {formatDeadline(selectedTask.deadline)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 p-3">
                  <p className="text-xs text-white/60">Reminder</p>
                  <p className="mt-1 text-sm text-white">
                    {formatReminderDetail(selectedTask.reminderDate)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
                >
                  Close
                </button>
              </div>
            ) : null}
          </div>
        )}
      </MasonryModal>
    </section>
  );
}
