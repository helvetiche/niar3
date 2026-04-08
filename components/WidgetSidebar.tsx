"use client";

import { useState, useEffect, type ReactNode, type KeyboardEvent } from "react";
import {
  CalendarBlankIcon,
  CalendarCheckIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ClockCountdownIcon,
  ColumnsIcon,
  EnvelopeIcon,
  EyeIcon,
  LayoutIcon,
  ListChecksIcon,
  PlusIcon,
  SquaresFourIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  useWidgetSidebar,
  type ScheduleWidgetType,
} from "@/contexts/WidgetSidebarContext";
import { useUpcomingSchedules } from "@/hooks/useUpcomingSchedules";
import { MasonryModal } from "@/components/MasonryModal";
import { TaskAccomplishmentsDrawer } from "@/components/TaskAccomplishmentsDrawer";

type WidgetChromeVariant = "sidebar" | "glass";

/** ~14-day horizon: bar fills as the deadline gets closer. */
const DEADLINE_URGENCY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const computeDeadlineUrgencyPercent = (timeUntilMs: number): number => {
  if (timeUntilMs <= 0) return 100;
  const ratio = 1 - timeUntilMs / DEADLINE_URGENCY_WINDOW_MS;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
};

/**
 * Live countdown with labeled units, e.g. `1d 3h 4m 3s`.
 * Skips zero higher units; always includes seconds so the line ticks every second.
 */
const formatRemainingClock = (timeUntilMs: number): string => {
  if (timeUntilMs <= 0) return "0s";
  const totalSec = Math.floor(timeUntilMs / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
};

const nearestDeadlineTitleIcon = (
  <ClockCountdownIcon
    className="h-4 w-4 shrink-0"
    weight="duotone"
    aria-hidden
  />
);

/** Shared shell: sidebar = solid emerald panel; glass = frosted for modal previews. */
const ScheduleWidgetChrome = ({
  title,
  titleIcon,
  onRemove,
  children,
  variant = "sidebar",
  fillHeight = false,
}: {
  title: string;
  titleIcon?: ReactNode;
  onRemove?: () => void;
  children: React.ReactNode;
  variant?: WidgetChromeVariant;
  fillHeight?: boolean;
}) => {
  const shell =
    variant === "glass"
      ? "rounded-lg border border-white/40 bg-white/10 p-4 shadow-sm backdrop-blur-md"
      : "rounded-lg border border-emerald-700/60 bg-emerald-800/30 p-4";
  const trashMuted =
    variant === "glass" ? "text-white/35" : "text-emerald-300/40";
  const trashBtn =
    variant === "glass"
      ? "text-white/60 transition-colors hover:text-red-300"
      : "text-emerald-300/70 transition-colors hover:text-red-400";
  const titleIconWrapClass =
    variant === "glass"
      ? "text-emerald-200/95"
      : "text-emerald-300/90";

  const fillClass = fillHeight
    ? "flex min-h-0 flex-1 flex-col"
    : "";

  return (
    <div className={`${shell} ${fillClass}`.trim()}>
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
          {titleIcon ? (
            <span
              className={`inline-flex shrink-0 items-center ${titleIconWrapClass}`}
            >
              {titleIcon}
            </span>
          ) : null}
          <span className="min-w-0 truncate">{title}</span>
        </h3>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className={trashBtn}
            aria-label={`Remove ${title} widget`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : (
          <span className={trashMuted} aria-hidden>
            <TrashIcon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className={fillHeight ? "flex min-h-0 flex-1 flex-col" : undefined}>
        {children}
      </div>
    </div>
  );
};

const NearestDeadlineWidgetCard = ({
  taskTitle,
  taskDescription,
  nextDeadline,
  personEmail,
  urgencyPercent,
  remainingClock,
  onRemove,
  variant = "sidebar",
  fillHeight = false,
}: {
  taskTitle: string;
  taskDescription: string;
  nextDeadline: Date;
  personEmail: string;
  urgencyPercent: number;
  remainingClock: string;
  onRemove?: () => void;
  variant?: WidgetChromeVariant;
  fillHeight?: boolean;
}) => {
  const descriptionTrimmed = taskDescription.trim();
  const metaClass =
    variant === "glass" ? "text-xs text-white/80" : "text-xs text-emerald-300/80";
  const descClass =
    variant === "glass" ? "text-xs text-white/70" : "text-xs text-emerald-200/75";
  const descPlaceholderClass =
    variant === "glass"
      ? "text-xs italic text-white/50"
      : "text-xs italic text-emerald-300/55";
  const trackOuterClass =
    variant === "glass"
      ? "border border-white/45 bg-white/10"
      : "border border-emerald-600/55 bg-emerald-950/60";
  const trackInnerClass =
    variant === "glass" ? "bg-white/10" : "bg-emerald-950/80";
  const fillClass =
    variant === "glass" ? "bg-emerald-400" : "bg-emerald-400";

  const outerBodyClass = fillHeight
    ? "flex min-h-0 flex-1 flex-col"
    : "";
  const progressBlockClass = fillHeight
    ? "mt-auto flex min-h-[3.25rem] flex-col justify-end gap-1.5 pt-1"
    : "mt-3 space-y-1.5";

  return (
    <ScheduleWidgetChrome
      title="Nearest Deadline"
      titleIcon={nearestDeadlineTitleIcon}
      onRemove={onRemove}
      variant={variant}
      fillHeight={fillHeight}
    >
      <div className={outerBodyClass}>
        <div className={`space-y-2 ${fillHeight ? "shrink-0" : ""}`}>
          <p className="line-clamp-2 text-sm font-medium text-white">{taskTitle}</p>
          {descriptionTrimmed ? (
            <p className={`line-clamp-3 leading-snug ${descClass}`}>
              {descriptionTrimmed}
            </p>
          ) : (
            <p className={descPlaceholderClass}>No Description Written</p>
          )}
          <div className={`flex items-center gap-2 ${metaClass}`}>
            <CalendarCheckIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {nextDeadline.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
          <div className={`flex items-start gap-2 ${metaClass}`}>
            <EnvelopeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 break-all">{personEmail}</span>
          </div>
        </div>
        <div className={progressBlockClass}>
          <div
            className={`rounded-full p-0.5 ${trackOuterClass}`}
            role="progressbar"
            aria-valuenow={urgencyPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Deadline closeness, ${urgencyPercent} percent`}
          >
            <div
              className={`h-2 w-full overflow-hidden rounded-full ${trackInnerClass}`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${fillClass}`}
                style={{ width: `${urgencyPercent}%` }}
              />
            </div>
          </div>
          <p
            className={`text-center font-mono text-xs tabular-nums tracking-wide ${
              variant === "glass" ? "text-white/90" : "text-emerald-100"
            }`}
            aria-live="polite"
            aria-label={`Time remaining ${remainingClock}`}
          >
            {remainingClock}
          </p>
        </div>
      </div>
    </ScheduleWidgetChrome>
  );
};

const MAX_TASK_PREVIEW_LINES = 4;

type TaskListScope = "week" | "month";

const TasksCountWidgetCard = ({
  title,
  count,
  isLoading,
  dueLabel,
  taskTitles,
  moreCount,
  taskListScope,
  onRemove,
  variant = "sidebar",
  fillHeight = false,
}: {
  title: string;
  count: number;
  isLoading: boolean;
  dueLabel: string;
  taskTitles: string[];
  moreCount: number;
  taskListScope: TaskListScope;
  onRemove?: () => void;
  variant?: WidgetChromeVariant;
  fillHeight?: boolean;
}) => {
  const spinClass =
    variant === "glass"
      ? "h-6 w-6 animate-spin rounded-full border-2 border-white/50 border-t-transparent"
      : "h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent";
  const dueClass =
    variant === "glass" ? "text-xs text-white/75" : "text-xs text-emerald-300/70";
  const listIntroClass =
    variant === "glass" ? "text-white/45" : "text-emerald-200/50";
  const listItemClass =
    variant === "glass" ? "text-white/85" : "text-emerald-100/90";
  const moreClass =
    variant === "glass" ? "text-white/55" : "text-emerald-300/60";

  const countSizeClass =
    "text-2xl font-semibold tabular-nums text-white";

  const PillIcon =
    taskListScope === "week" ? ListChecksIcon : CalendarBlankIcon;
  const TitleIcon = PillIcon;
  const titleIcon = (
    <TitleIcon className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />
  );
  const pillShellClass =
    variant === "glass"
      ? "border-white/35 bg-white/10 text-white/90"
      : "border-emerald-600/50 bg-emerald-950/40 text-emerald-100";

  const rootClass = fillHeight
    ? "flex min-h-0 flex-1 flex-col gap-3"
    : "flex flex-col gap-2.5";

  return (
    <ScheduleWidgetChrome
      title={title}
      titleIcon={titleIcon}
      onRemove={onRemove}
      variant={variant}
      fillHeight={fillHeight}
    >
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-4">
          <div className={spinClass} aria-hidden />
        </div>
      ) : (
        <div className={rootClass}>
          <div className={fillHeight ? "shrink-0" : "text-center"}>
            <div className={countSizeClass}>{count}</div>
            <div className={`mt-0.5 ${dueClass}`}>{dueLabel}</div>
          </div>
          {count > 0 && taskTitles.length > 0 ? (
            <div
              className={
                fillHeight
                  ? "min-h-0 flex-1 overflow-y-auto pr-0.5"
                  : "mt-1"
              }
            >
              <p
                className={`mb-1 text-[10px] font-medium uppercase tracking-wide ${listIntroClass}`}
              >
                Includes
              </p>
              <ul
                className="flex list-none flex-col gap-1.5 p-0"
                aria-label="Tasks included in this widget"
              >
                {taskTitles.slice(0, MAX_TASK_PREVIEW_LINES).map((t, i) => (
                  <li key={`${t}-${i}`} className="min-w-0 list-none">
                    <span
                      className={`inline-flex w-full max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 ${pillShellClass}`}
                    >
                      <PillIcon
                        className="h-3.5 w-3.5 shrink-0 opacity-90"
                        weight="duotone"
                        aria-hidden
                      />
                      <span
                        className={`min-w-0 truncate text-left text-[11px] font-normal leading-tight ${listItemClass}`}
                      >
                        {t}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {moreCount > 0 ? (
                <p className={`mt-1.5 text-[10px] font-medium ${moreClass}`}>
                  +{moreCount} more in this window
                </p>
              ) : null}
            </div>
          ) : null}
          {!isLoading && count === 0 ? (
            <p
              className={
                variant === "glass"
                  ? "text-xs text-white/60"
                  : "text-xs text-emerald-200/65"
              }
            >
              No tasks in this window.
            </p>
          ) : null}
        </div>
      )}
    </ScheduleWidgetChrome>
  );
};

function NearestDeadlineWidget({ onRemove }: { onRemove: () => void }) {
  const { schedules, isLoading } = useUpcomingSchedules(1);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const schedule = schedules[0];

  if (isLoading) {
    return (
      <ScheduleWidgetChrome
        title="Nearest Deadline"
        titleIcon={nearestDeadlineTitleIcon}
        onRemove={onRemove}
      >
        <div className="flex items-center justify-center py-4">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
            aria-hidden
          />
        </div>
      </ScheduleWidgetChrome>
    );
  }

  if (!schedule) {
    return (
      <ScheduleWidgetChrome
        title="Nearest Deadline"
        titleIcon={nearestDeadlineTitleIcon}
        onRemove={onRemove}
      >
        <p className="py-4 text-center text-xs text-emerald-200/70">
          No upcoming deadlines
        </p>
      </ScheduleWidgetChrome>
    );
  }

  const timeUntil = schedule.nextDeadline.getTime() - currentTime.getTime();
  const urgencyPercent = computeDeadlineUrgencyPercent(timeUntil);
  const remainingClock = formatRemainingClock(timeUntil);

  const assigneeEmail =
    schedule.personEmail.trim() || schedule.personAssigned;

  return (
    <NearestDeadlineWidgetCard
      taskTitle={schedule.title}
      taskDescription={schedule.description}
      nextDeadline={schedule.nextDeadline}
      personEmail={assigneeEmail}
      urgencyPercent={urgencyPercent}
      remainingClock={remainingClock}
      onRemove={onRemove}
    />
  );
}

function TasksThisWeekWidget({ onRemove }: { onRemove: () => void }) {
  const { schedules, isLoading } = useUpcomingSchedules(100);
  const weekTasks = schedules.filter((s) => s.daysUntil <= 7);
  const tasksThisWeek = weekTasks.length;
  const dueLabel =
    tasksThisWeek === 1 ? "task due this week" : "tasks due this week";
  const taskTitles = weekTasks
    .slice(0, MAX_TASK_PREVIEW_LINES)
    .map((s) => s.title);
  const moreCount = Math.max(0, tasksThisWeek - MAX_TASK_PREVIEW_LINES);

  return (
    <TasksCountWidgetCard
      title="Tasks This Week"
      count={tasksThisWeek}
      isLoading={isLoading}
      dueLabel={dueLabel}
      taskTitles={taskTitles}
      moreCount={moreCount}
      taskListScope="week"
      onRemove={onRemove}
    />
  );
}

function TasksThisMonthWidget({ onRemove }: { onRemove: () => void }) {
  const { schedules, isLoading } = useUpcomingSchedules(100);
  const monthTasks = schedules.filter((s) => s.daysUntil <= 30);
  const tasksThisMonth = monthTasks.length;
  const dueLabel =
    tasksThisMonth === 1 ? "task due this month" : "tasks due this month";
  const taskTitles = monthTasks
    .slice(0, MAX_TASK_PREVIEW_LINES)
    .map((s) => s.title);
  const moreCount = Math.max(0, tasksThisMonth - MAX_TASK_PREVIEW_LINES);

  return (
    <TasksCountWidgetCard
      title="Tasks This Month"
      count={tasksThisMonth}
      isLoading={isLoading}
      dueLabel={dueLabel}
      taskTitles={taskTitles}
      moreCount={moreCount}
      taskListScope="month"
      onRemove={onRemove}
    />
  );
}

const PREVIEW_SAMPLE = {
  taskTitle: "Example: Quarterly compliance review",
  taskDescription:
    "Consolidate Q1 figures, attach sign-offs, and submit via the compliance portal before the deadline.",
  personEmail: "alex.morgan@company.example",
  /** Sample deadline (modal mock ticks against real time until this date). */
  nextDeadline: new Date(2026, 3, 15, 14, 0),
  weekCount: 5,
  weekTaskTitles: [
    "Payroll export",
    "Safety checklist",
    "Client status report",
    "Team standup prep",
  ] as const,
  monthCount: 18,
  monthTaskTitles: [
    "Quarterly compliance review",
    "Budget draft v2",
    "Vendor contract renewals",
    "Training module QA",
  ] as const,
} as const;

function AddWidgetModalScheduleSection({
  isOpen,
  onAdd,
}: {
  isOpen: boolean;
  onAdd: (t: ScheduleWidgetType) => void;
}) {
  const { schedules, isLoading } = useUpcomingSchedules(100);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isOpen) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [isOpen]);

  const useMock = !isLoading && schedules.length === 0;

  const weekTasks = schedules.filter((s) => s.daysUntil <= 7);
  const monthTasks = schedules.filter((s) => s.daysUntil <= 30);
  const nearest = schedules[0];

  const nearestPreview = (() => {
    if (isLoading) {
      return (
        <ScheduleWidgetChrome
          title="Nearest Deadline"
          titleIcon={nearestDeadlineTitleIcon}
          variant="glass"
          fillHeight
        >
          <div className="flex flex-1 items-center justify-center py-10">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-white/50 border-t-transparent"
              aria-hidden
            />
          </div>
        </ScheduleWidgetChrome>
      );
    }
    if (useMock) {
      const mockUntil = Math.max(
        0,
        PREVIEW_SAMPLE.nextDeadline.getTime() - now.getTime(),
      );
      return (
        <NearestDeadlineWidgetCard
          taskTitle={PREVIEW_SAMPLE.taskTitle}
          taskDescription={PREVIEW_SAMPLE.taskDescription}
          nextDeadline={PREVIEW_SAMPLE.nextDeadline}
          personEmail={PREVIEW_SAMPLE.personEmail}
          urgencyPercent={computeDeadlineUrgencyPercent(mockUntil)}
          remainingClock={formatRemainingClock(mockUntil)}
          variant="glass"
          fillHeight
        />
      );
    }
    if (!nearest) {
      return (
        <ScheduleWidgetChrome
          title="Nearest Deadline"
          titleIcon={nearestDeadlineTitleIcon}
          variant="glass"
          fillHeight
        >
          <p className="flex flex-1 items-center justify-center px-2 py-8 text-center text-xs text-white/70">
            No upcoming deadlines in your schedules.
          </p>
        </ScheduleWidgetChrome>
      );
    }
    const timeUntil = nearest.nextDeadline.getTime() - now.getTime();
    const assigneeEmail =
      nearest.personEmail.trim() || nearest.personAssigned;
    return (
      <NearestDeadlineWidgetCard
        taskTitle={nearest.title}
        taskDescription={nearest.description}
        nextDeadline={nearest.nextDeadline}
        personEmail={assigneeEmail}
        urgencyPercent={computeDeadlineUrgencyPercent(timeUntil)}
        remainingClock={formatRemainingClock(timeUntil)}
        variant="glass"
        fillHeight
      />
    );
  })();

  const weekCount = useMock ? PREVIEW_SAMPLE.weekCount : weekTasks.length;
  const weekTitles = useMock
    ? [...PREVIEW_SAMPLE.weekTaskTitles]
    : weekTasks.slice(0, MAX_TASK_PREVIEW_LINES).map((s) => s.title);
  const weekMore = useMock
    ? Math.max(0, PREVIEW_SAMPLE.weekCount - MAX_TASK_PREVIEW_LINES)
    : Math.max(0, weekTasks.length - MAX_TASK_PREVIEW_LINES);

  const monthCount = useMock ? PREVIEW_SAMPLE.monthCount : monthTasks.length;
  const monthTitles = useMock
    ? [...PREVIEW_SAMPLE.monthTaskTitles]
    : monthTasks.slice(0, MAX_TASK_PREVIEW_LINES).map((s) => s.title);
  const monthMore = useMock
    ? Math.max(0, PREVIEW_SAMPLE.monthCount - MAX_TASK_PREVIEW_LINES)
    : Math.max(0, monthTasks.length - MAX_TASK_PREVIEW_LINES);

  return (
    <>
      <div className="mb-8 w-full">
        <h4 className="flex items-center gap-2 text-lg font-medium text-white sm:text-xl">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <CalendarCheckIcon
              size={20}
              className="text-white"
              weight="duotone"
              aria-hidden
            />
          </span>
          Schedule widgets
        </h4>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <CalendarCheckIcon size={12} className="text-white" aria-hidden />
            Active schedules
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-white/85">
          {useMock
            ? "Sample data below shows how each widget looks. Add your own schedules to see live previews here."
            : "Below are your live schedule widgets. Click a card to add it to the sidebar."}
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch md:auto-rows-fr">
        <AddScheduleWidgetOption
          scheduleType="nearest-deadline"
          description={
            useMock
              ? "Shows the next upcoming deadline, assignee, and time until due."
              : "Your next upcoming deadline, assignee, and time until due."
          }
          onAdd={onAdd}
        >
          {nearestPreview}
        </AddScheduleWidgetOption>

        <AddScheduleWidgetOption
          scheduleType="tasks-this-week"
          description={
            useMock
              ? "Count of example tasks due within the next 7 days."
              : "Your active tasks due within the next 7 days."
          }
          onAdd={onAdd}
        >
          <TasksCountWidgetCard
            title="Tasks This Week"
            count={weekCount}
            isLoading={isLoading}
            dueLabel={
              weekCount === 1 ? "task due this week" : "tasks due this week"
            }
            taskTitles={weekTitles}
            moreCount={weekMore}
            taskListScope="week"
            variant="glass"
            fillHeight
          />
        </AddScheduleWidgetOption>

        <AddScheduleWidgetOption
          scheduleType="tasks-this-month"
          description={
            useMock
              ? "Count of example tasks due within the next 30 days."
              : "Your active tasks due within the next 30 days."
          }
          onAdd={onAdd}
        >
          <TasksCountWidgetCard
            title="Tasks This Month"
            count={monthCount}
            isLoading={isLoading}
            dueLabel={
              monthCount === 1 ? "task due this month" : "tasks due this month"
            }
            taskTitles={monthTitles}
            moreCount={monthMore}
            taskListScope="month"
            variant="glass"
            fillHeight
          />
        </AddScheduleWidgetOption>
      </div>
    </>
  );
}

const AddScheduleWidgetOption = ({
  scheduleType,
  description,
  onAdd,
  children,
}: {
  scheduleType: ScheduleWidgetType;
  description: string;
  onAdd: (t: ScheduleWidgetType) => void;
  children: ReactNode;
}) => {
  const addLabel =
    scheduleType === "nearest-deadline"
      ? "Add Nearest Deadline widget"
      : scheduleType === "tasks-this-week"
        ? "Add Tasks This Week widget"
        : "Add Tasks This Month widget";

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onAdd(scheduleType);
  };

  return (
    <button
      type="button"
      onClick={() => onAdd(scheduleType)}
      onKeyDown={handleKeyDown}
      className="group flex h-full min-h-[17rem] min-w-0 flex-col rounded-xl border border-white/35 bg-white/10 p-3 text-left shadow-sm backdrop-blur-md transition-all hover:border-white/50 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 md:min-h-[19rem]"
      aria-label={addLabel}
    >
      <div className="pointer-events-none flex h-full min-h-0 flex-1 flex-col select-none">
        <div className="flex h-full min-h-0 flex-1 flex-col [&>*]:min-h-0 [&>*]:flex-1">
          {children}
        </div>
      </div>
      <p className="pointer-events-none mt-3 shrink-0 border-t border-white/20 pt-2 text-left text-xs font-normal leading-snug text-white/80">
        {description}
      </p>
      <div className="pointer-events-none mt-2 flex shrink-0 items-center justify-end gap-1 text-xs font-medium text-emerald-200/95 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <PlusIcon className="h-3.5 w-3.5" weight="bold" aria-hidden />
        Add to sidebar
      </div>
    </button>
  );
};

export function WidgetSidebar() {
  const { isOpen, toggleSidebar, widgets, addWidget, removeWidget } =
    useWidgetSidebar();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const handleAddScheduleWidget = (scheduleType: ScheduleWidgetType) => {
    addWidget({
      id: `${scheduleType}-${Date.now()}`,
      type: "schedule",
      scheduleType,
    });
    setIsAddModalOpen(false);
  };

  if (!isDesktop) {
    return null;
  }

  return (
    <>
      <aside
        className={`relative flex-shrink-0 border-l border-emerald-700/60 bg-emerald-900 transition-all duration-300 ${
          isOpen ? "w-96" : "w-0"
        }`}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -left-10 top-4 z-10 rounded-l-lg border border-r-0 border-emerald-700/60 bg-emerald-900 p-2 text-white shadow-lg transition-all hover:bg-emerald-800"
          aria-label={isOpen ? "Close widget sidebar" : "Open widget sidebar"}
        >
          {isOpen ? (
            <CaretRightIcon className="h-5 w-5" />
          ) : (
            <CaretLeftIcon className="h-5 w-5" />
          )}
        </button>

        {isOpen && (
          <div className="flex h-screen flex-col">
            <div className="border-b border-emerald-700/60 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
                      <CalendarCheckIcon className="h-5 w-5" weight="duotone" />
                    </span>
                    Widgets
                  </h2>
                  <p className="mt-1 text-xs font-normal text-emerald-200/70">
                    Productivity shortcuts and insights next to your workspace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTaskManagerOpen(true)}
                  className="group flex shrink-0 flex-col items-center gap-1 rounded-xl border border-emerald-600/50 bg-emerald-800/40 px-3 py-2.5 text-center shadow-sm transition hover:border-emerald-500/60 hover:bg-emerald-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45"
                  aria-label="Open task manager with checkboxes in a side panel"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10 transition group-hover:bg-white/15">
                    <ListChecksIcon
                      className="h-5 w-5 text-emerald-100"
                      weight="duotone"
                      aria-hidden
                    />
                  </span>
                  <span className="max-w-[4.5rem] text-[10px] font-medium leading-tight text-emerald-100/90">
                    Tasks
                  </span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {widgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarCheckIcon className="mb-3 h-16 w-16 text-emerald-700/50" />
                  <p className="mb-4 text-sm font-normal text-emerald-200/70">
                    No widgets added yet
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
                  >
                    <LayoutIcon className="h-4 w-4" weight="duotone" />
                    Add widgets
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {widgets.map((widget) => {
                    if (widget.type === "schedule") {
                      if (widget.scheduleType === "nearest-deadline") {
                        return (
                          <NearestDeadlineWidget
                            key={widget.id}
                            onRemove={() => removeWidget(widget.id)}
                          />
                        );
                      }
                      if (widget.scheduleType === "tasks-this-week") {
                        return (
                          <TasksThisWeekWidget
                            key={widget.id}
                            onRemove={() => removeWidget(widget.id)}
                          />
                        );
                      }
                      if (widget.scheduleType === "tasks-this-month") {
                        return (
                          <TasksThisMonthWidget
                            key={widget.id}
                            onRemove={() => removeWidget(widget.id)}
                          />
                        );
                      }
                    }
                    return null;
                  })}
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full rounded-lg border-2 border-dashed border-emerald-700/60 bg-emerald-800/20 px-4 py-3 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-600 hover:bg-emerald-800/30"
                  >
                    <LayoutIcon
                      className="mx-auto mb-1 h-5 w-5"
                      weight="duotone"
                    />
                    Add widget
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      <TaskAccomplishmentsDrawer
        isOpen={isTaskManagerOpen}
        onClose={() => setIsTaskManagerOpen(false)}
      />

      <MasonryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        panelClassName="w-full max-w-6xl px-1 sm:px-2"
        animateFrom="bottom"
      >
        <section className="relative max-h-[85dvh] overflow-y-auto rounded-2xl border border-white/40 bg-emerald-900 p-5 shadow-xl sm:p-6 md:p-8">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-lg p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white sm:right-5 sm:top-5"
            aria-label="Close add widget dialog"
          >
            <XIcon className="h-5 w-5" weight="bold" />
          </button>

          <header className="mb-6 border-b border-white/10 pb-6 pr-10 sm:pr-12">
            <h3 className="flex items-center gap-2 text-xl font-medium text-white sm:text-2xl">
              <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
                <LayoutIcon
                  size={20}
                  className="text-white"
                  weight="duotone"
                  aria-hidden
                />
              </span>
              Add widget
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <ColumnsIcon size={12} className="text-white" aria-hidden />
                Right sidebar
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <SquaresFourIcon size={12} className="text-white" aria-hidden />
                Widget gallery
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <EyeIcon size={12} className="text-white" aria-hidden />
                Live preview
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-white/85">
              Pick a schedule widget for the right sidebar. Each preview below is
              the same layout you will see after you add it—counts and deadlines
              stay in sync with your active schedules.
            </p>
          </header>

          <div className="w-full space-y-8">
            <AddWidgetModalScheduleSection
              isOpen={isAddModalOpen}
              onAdd={handleAddScheduleWidget}
            />

            <div className="w-full rounded-lg border border-white/30 bg-white/10 p-4 text-center backdrop-blur-sm">
              <p className="text-xs font-normal text-white/80">
                More widget types coming soon
              </p>
            </div>
          </div>
        </section>
      </MasonryModal>
    </>
  );
}
