"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useId,
  useRef,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowsMergeIcon,
  CalendarBlankIcon,
  CalendarCheckIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  ColumnsIcon,
  EnvelopeIcon,
  EyeIcon,
  FilePdfIcon,
  FolderOpenIcon,
  LayoutIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  MicrosoftExcelLogoIcon,
  PlusIcon,
  SquaresFourIcon,
  StarIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
  CheckIcon,
  FileXlsIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import {
  useWidgetSidebar,
  type ScheduleWidgetType,
} from "@/contexts/WidgetSidebarContext";
import { useUpcomingSchedules } from "@/hooks/useUpcomingSchedules";
import { useAllSchedulesForTaskManager } from "@/hooks/useAllSchedulesForTaskManager";
import { useScheduleCompletions } from "@/hooks/useScheduleCompletions";
import { calculateNextDeadline } from "@/lib/deadline-calculator";
import { getCurrentPeriod, getPeriodLabel } from "@/lib/period-calculator";
import { buildCompletionLookup, completionPeriodKey } from "@/lib/task-manager-utils";
import { apiDelete, apiPost } from "@/lib/api-client";
import type { Schedule, TaskCompletion } from "@/types/schedule";
import { useTemplates } from "@/hooks/useTemplates";
import { useAccomplishmentTasks } from "@/hooks/useAccomplishmentTasks";
import {
  ACCOMPLISHMENT_TASK_DESIGNATIONS,
  type AccomplishmentTask,
  type AccomplishmentTaskDesignation,
} from "@/lib/api/accomplishment-tasks";
import { generateAccomplishmentReport } from "@/lib/api/accomplishment-report";
import { downloadBlob, getErrorMessage } from "@/lib/utils";
import { MasonryModal } from "@/components/MasonryModal";
import { TaskAccomplishmentsDrawer } from "@/components/TaskAccomplishmentsDrawer";
import { ProcessingOverlay } from "@/components/ifr-scanner/ProcessingOverlay";
import { useMergeFiles } from "@/hooks/useMergeFiles";
import {
  defaultBillingUnitFolderName,
  defaultZipName,
  useGenerateProfiles,
} from "@/hooks/useGenerateProfiles";
import { useConsolidateLandProfiles } from "@/hooks/useConsolidateLandProfiles";
import { getFileKey, sanitizeFolderName } from "@/lib/file-utils";

type WidgetChromeVariant = "sidebar" | "glass";

const ALL_MONTHS_ACCOMPLISHMENT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

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
  <ClockCountdownIcon className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />
);

const priorityFocusTitleIcon = (
  <StarIcon className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
);

const quickAccomplishmentTitleIcon = (
  <FileXlsIcon className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
);

const quickMergeTitleIcon = (
  <ArrowsMergeIcon className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
);

const quickBillingUnitTitleIcon = (
  <MagnifyingGlassIcon className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
);

const quickConsolidateIfrTitleIcon = (
  <FolderOpenIcon className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
);

/** Shared shell: sidebar = solid emerald panel; glass = frosted for modal previews. */
const ScheduleWidgetChrome = ({
  title,
  titleIcon,
  onRemove,
  children,
  variant = "sidebar",
  fillHeight = false,
  titleClassName,
}: {
  title: string;
  titleIcon?: ReactNode;
  onRemove?: () => void;
  children: React.ReactNode;
  variant?: WidgetChromeVariant;
  fillHeight?: boolean;
  /** Override default `text-sm` title (e.g. compact priority header). */
  titleClassName?: string;
}) => {
  const shell =
    variant === "glass"
      ? "min-w-0 overflow-hidden rounded-lg border border-white/40 bg-white/10 p-4 shadow-sm backdrop-blur-md"
      : "min-w-0 overflow-hidden rounded-lg border border-emerald-700/60 bg-emerald-800/30 p-4";
  const trashMuted = variant === "glass" ? "text-white/35" : "text-emerald-300/40";
  const trashBtn =
    variant === "glass"
      ? "text-white/60 transition-colors hover:text-red-300"
      : "text-emerald-300/70 transition-colors hover:text-red-400";
  const titleIconWrapClass =
    variant === "glass" ? "text-emerald-200/95" : "text-emerald-300/90";

  const fillClass = fillHeight ? "flex min-h-0 flex-1 flex-col" : "";

  return (
    <div className={`${shell} ${fillClass}`.trim()}>
      <div className="mb-3 flex min-w-0 shrink-0 items-center justify-between gap-2">
        <h3
          className={`flex min-w-0 items-center gap-1.5 font-semibold leading-tight text-white ${
            titleClassName ?? "text-sm"
          }`}
        >
          {titleIcon ? (
            <span className={`inline-flex shrink-0 items-center ${titleIconWrapClass}`}>
              {titleIcon}
            </span>
          ) : null}
          <span className="min-w-0 truncate">{title}</span>
        </h3>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className={`shrink-0 ${trashBtn}`}
            aria-label={`Remove ${title} widget`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : (
          <span className={`shrink-0 ${trashMuted}`} aria-hidden>
            <TrashIcon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div
        className={
          fillHeight
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            : "min-w-0 overflow-hidden"
        }
      >
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
  const trackInnerClass = variant === "glass" ? "bg-white/10" : "bg-emerald-950/80";
  const fillClass = variant === "glass" ? "bg-emerald-400" : "bg-emerald-400";

  const outerBodyClass = fillHeight ? "flex min-h-0 flex-1 flex-col" : "";
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

const PriorityFocusCard = ({
  taskTitle,
  taskDescription,
  nextDeadline,
  personEmail,
  urgencyPercent,
  remainingClock,
  periodComplete,
  periodLabel,
  onRemove,
  onTogglePeriodComplete,
  toggleDisabled = false,
  togglePending = false,
  variant = "sidebar",
  fillHeight = false,
}: {
  taskTitle: string;
  taskDescription: string;
  nextDeadline: Date;
  personEmail: string;
  urgencyPercent: number;
  remainingClock: string;
  periodComplete: boolean;
  periodLabel: string;
  onRemove?: () => void;
  /** Omit in modal previews so the card stays read-only. */
  onTogglePeriodComplete?: () => void;
  toggleDisabled?: boolean;
  togglePending?: boolean;
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
  const trackInnerClass = variant === "glass" ? "bg-white/10" : "bg-emerald-950/80";
  const fillClass = "bg-amber-400";

  const outerBodyClass = fillHeight ? "flex min-h-0 flex-1 flex-col" : "";
  const progressBlockClass = fillHeight
    ? "mt-auto flex min-h-[3.25rem] flex-col justify-end gap-1.5 pt-1"
    : "mt-3 space-y-1.5";

  const periodShell =
    variant === "glass"
      ? periodComplete
        ? "border-emerald-400/45 bg-emerald-500/20 text-emerald-50"
        : "border-white/35 bg-white/10 text-white/90"
      : periodComplete
        ? "border-amber-400/50 bg-amber-500/15 text-amber-50"
        : "border-emerald-600/50 bg-emerald-950/50 text-emerald-100";

  const markDoneBtnClass =
    variant === "glass"
      ? periodComplete
        ? "border-white/40 bg-white/10 text-white hover:bg-white/15"
        : "border-emerald-300/50 bg-emerald-400/90 text-emerald-950 hover:bg-emerald-300"
      : periodComplete
        ? "border-amber-400/50 bg-amber-500/20 text-amber-50 hover:bg-amber-500/30"
        : "border-emerald-500/60 bg-emerald-600 text-white hover:bg-emerald-500";

  return (
    <ScheduleWidgetChrome
      title="Priority focus"
      titleIcon={priorityFocusTitleIcon}
      onRemove={onRemove}
      variant={variant}
      fillHeight={fillHeight}
      titleClassName="text-xs"
    >
      <div className={`min-w-0 ${outerBodyClass}`.trim()}>
        <div className={`min-w-0 space-y-2 ${fillHeight ? "shrink-0" : ""}`}>
          <p className="line-clamp-2 min-w-0 text-sm font-medium text-white">
            {taskTitle}
          </p>
          {descriptionTrimmed ? (
            <p className={`line-clamp-3 leading-snug ${descClass}`}>
              {descriptionTrimmed}
            </p>
          ) : (
            <p className={descPlaceholderClass}>No Description Written</p>
          )}
          <div
            className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${periodShell}`}
            role="status"
            aria-label={
              periodComplete
                ? `Completed for ${periodLabel}`
                : `Not yet completed for ${periodLabel}`
            }
          >
            {periodComplete ? (
              <CheckCircleIcon
                className="h-3.5 w-3.5 shrink-0"
                weight="fill"
                aria-hidden
              />
            ) : (
              <ListChecksIcon
                className="h-3.5 w-3.5 shrink-0 opacity-90"
                weight="duotone"
                aria-hidden
              />
            )}
            <span className="min-w-0 truncate">
              {periodComplete
                ? `Done for ${periodLabel}`
                : `Still due for ${periodLabel}`}
            </span>
          </div>
          {onTogglePeriodComplete ? (
            <button
              type="button"
              onClick={onTogglePeriodComplete}
              disabled={toggleDisabled || togglePending}
              className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${markDoneBtnClass}`}
              aria-label={
                periodComplete
                  ? `Mark incomplete for ${periodLabel}`
                  : `Mark as done for ${periodLabel}`
              }
            >
              {togglePending ? (
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden
                />
              ) : periodComplete ? (
                <ListChecksIcon
                  className="h-4 w-4 shrink-0"
                  weight="duotone"
                  aria-hidden
                />
              ) : (
                <CheckIcon className="h-4 w-4 shrink-0" weight="bold" aria-hidden />
              )}
              <span className="min-w-0 truncate">
                {togglePending
                  ? "Saving…"
                  : periodComplete
                    ? `Mark incomplete (${periodLabel})`
                    : `Mark as done (${periodLabel})`}
              </span>
            </button>
          ) : null}
          <div className={`flex min-w-0 items-center gap-2 ${metaClass}`}>
            <CalendarCheckIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">
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
          <div className={`flex min-w-0 items-start gap-2 ${metaClass}`}>
            <EnvelopeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 break-all">{personEmail}</span>
          </div>
        </div>
        <div className={`min-w-0 ${progressBlockClass}`.trim()}>
          <p
            className={`mb-1 text-center text-[10px] font-medium uppercase tracking-wide ${
              variant === "glass" ? "text-white/55" : "text-emerald-300/65"
            }`}
          >
            Time until next deadline
          </p>
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
  const listIntroClass = variant === "glass" ? "text-white/45" : "text-emerald-200/50";
  const listItemClass = variant === "glass" ? "text-white/85" : "text-emerald-100/90";
  const moreClass = variant === "glass" ? "text-white/55" : "text-emerald-300/60";

  const countSizeClass = "text-2xl font-semibold tabular-nums text-white";

  const PillIcon = taskListScope === "week" ? ListChecksIcon : CalendarBlankIcon;
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
              className={fillHeight ? "min-h-0 flex-1 overflow-y-auto pr-0.5" : "mt-1"}
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

  const assigneeEmail = schedule.personEmail.trim() || schedule.personAssigned;

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
  const dueLabel = tasksThisWeek === 1 ? "task due this week" : "tasks due this week";
  const taskTitles = weekTasks.slice(0, MAX_TASK_PREVIEW_LINES).map((s) => s.title);
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
  const taskTitles = monthTasks.slice(0, MAX_TASK_PREVIEW_LINES).map((s) => s.title);
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

function PriorityFocusWidget({
  scheduleId,
  onRemove,
}: {
  scheduleId: string;
  onRemove: () => void;
}) {
  const { data: schedules = [], isLoading: schedulesLoading } =
    useAllSchedulesForTaskManager();
  const {
    data: completions = [],
    isLoading: completionsLoading,
    mutate: mutateCompletions,
  } = useScheduleCompletions();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [optimisticKeys, setOptimisticKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const schedule = useMemo(
    () => schedules.find((s) => s.id === scheduleId) ?? null,
    [schedules, scheduleId]
  );

  const completionByPeriodKey = useMemo(
    () => buildCompletionLookup(completions),
    [completions]
  );

  const periodMeta = useMemo(() => {
    if (!schedule) return null;
    const period = getCurrentPeriod(schedule.deadline.type);
    const key = completionPeriodKey(schedule.id, period.start, period.end);
    const completion = completionByPeriodKey.get(key);
    const isOptimistic = optimisticKeys.has(key);
    const effectiveComplete = isOptimistic ? !completion : !!completion;
    return {
      periodKey: key,
      completion,
      effectiveComplete,
      isOptimistic,
      periodLabel: getPeriodLabel(schedule.deadline.type),
    };
  }, [schedule, completionByPeriodKey, optimisticKeys]);

  const handleTogglePeriodComplete = useCallback(async () => {
    if (!schedule || schedule.status !== "active") return;
    const period = getCurrentPeriod(schedule.deadline.type);
    const periodKey = completionPeriodKey(schedule.id, period.start, period.end);

    if (optimisticKeys.has(periodKey)) return;

    const existingCompletion = completionByPeriodKey.get(periodKey);
    const isCurrentlyCompleted = !!existingCompletion;

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
        if (!existingCompletion) {
          clearOptimistic();
          return;
        }
        await apiDelete<{ ok: boolean }>(
          `/api/v1/completions/${encodeURIComponent(existingCompletion.id)}`
        );
        await mutateCompletions(
          (prev) => (prev ?? []).filter((c) => c.id !== existingCompletion.id),
          { revalidate: false }
        );
      } else {
        const { completion } = await apiPost<{ completion: TaskCompletion }>(
          "/api/v1/completions",
          {
            scheduleId: schedule.id,
            periodStart: period.start,
            periodEnd: period.end,
            deadlineType: schedule.deadline.type,
          }
        );
        await mutateCompletions((prev) => [...(prev ?? []), completion], {
          revalidate: false,
        });
      }
    } catch (err) {
      console.error("Priority widget toggle completion failed:", err);
    } finally {
      clearOptimistic();
    }
  }, [schedule, completionByPeriodKey, mutateCompletions, optimisticKeys]);

  const nextDeadline = useMemo(() => {
    if (!schedule) return null;
    try {
      return calculateNextDeadline(schedule.deadline, currentTime, schedule.createdAt);
    } catch {
      return null;
    }
  }, [schedule, currentTime]);

  const isLoading = schedulesLoading || completionsLoading;

  if (isLoading) {
    return (
      <ScheduleWidgetChrome
        title="Priority focus"
        titleIcon={priorityFocusTitleIcon}
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
        title="Priority focus"
        titleIcon={priorityFocusTitleIcon}
        onRemove={onRemove}
      >
        <p className="py-4 text-center text-xs text-emerald-200/70">
          This schedule is no longer available. Remove the widget or pick another in Add
          widget.
        </p>
      </ScheduleWidgetChrome>
    );
  }

  if (!nextDeadline) {
    return (
      <ScheduleWidgetChrome
        title="Priority focus"
        titleIcon={priorityFocusTitleIcon}
        onRemove={onRemove}
      >
        <p className="py-4 text-center text-xs text-emerald-200/70">
          Could not compute the next deadline for this schedule.
        </p>
      </ScheduleWidgetChrome>
    );
  }

  const timeUntil = nextDeadline.getTime() - currentTime.getTime();
  const urgencyPercent = computeDeadlineUrgencyPercent(timeUntil);
  const remainingClock = formatRemainingClock(timeUntil);
  const assigneeEmail = schedule.personEmail.trim() || schedule.personAssigned;

  return (
    <PriorityFocusCard
      taskTitle={schedule.title}
      taskDescription={schedule.description}
      nextDeadline={nextDeadline}
      personEmail={assigneeEmail}
      urgencyPercent={urgencyPercent}
      remainingClock={remainingClock}
      periodComplete={periodMeta?.effectiveComplete ?? false}
      periodLabel={periodMeta?.periodLabel ?? "Current Period"}
      onRemove={onRemove}
      onTogglePeriodComplete={
        schedule.status === "active" ? handleTogglePeriodComplete : undefined
      }
      togglePending={periodMeta?.isOptimistic ?? false}
    />
  );
}

const QUICK_ACCOMPLISHMENT_SUGGESTION_LIMIT = 8;

const QUICK_ACCOMPLISHMENT_SUGGESTIONS_Z = 100;

type QuickAccomplishmentSuggestionPortalRect = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const collectScrollableAncestors = (start: HTMLElement | null): HTMLElement[] => {
  const list: HTMLElement[] = [];
  let cur: HTMLElement | null = start?.parentElement ?? null;
  while (cur) {
    const st = getComputedStyle(cur);
    if (
      /(auto|scroll|overlay)/.test(st.overflowY) ||
      /(auto|scroll|overlay)/.test(st.overflow) ||
      /(auto|scroll|overlay)/.test(st.overflowX)
    ) {
      list.push(cur);
    }
    cur = cur.parentElement;
  }
  return list;
};

function QuickAccomplishmentSidebarWidget({ onRemove }: { onRemove: () => void }) {
  const formId = useId();
  const taskComboboxRef = useRef<HTMLDivElement>(null);
  const taskTextareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsPortalRef = useRef<HTMLUListElement>(null);
  const { data: templates = [], isLoading: templatesLoading } = useTemplates(
    "accomplishment-report"
  );
  const { data: accomplishmentTasks = [] } = useAccomplishmentTasks();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] =
    useState<AccomplishmentTaskDesignation>("SWRFT");
  const [taskText, setTaskText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskSuggestionsOpen, setTaskSuggestionsOpen] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
  const [suggestionPortalRect, setSuggestionPortalRect] =
    useState<QuickAccomplishmentSuggestionPortalRect | null>(null);

  const updateSuggestionPortalRect = useCallback(() => {
    const el = taskTextareaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const pad = 8;
    const belowTop = r.bottom + gap;
    const spaceBelow = window.innerHeight - belowTop - pad;
    const maxListPx = 160;
    const maxHeight = Math.min(maxListPx, Math.max(96, spaceBelow));
    setSuggestionPortalRect({
      top: belowTop,
      left: r.left,
      width: r.width,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const taskQueryTrimmed = taskText.trim();
  const matchingTasks = useMemo(() => {
    if (taskQueryTrimmed.length < 1) return [];
    const q = taskQueryTrimmed.toLowerCase();
    return accomplishmentTasks
      .filter((t) => t.label.toLowerCase().includes(q))
      .slice(0, QUICK_ACCOMPLISHMENT_SUGGESTION_LIMIT);
  }, [accomplishmentTasks, taskQueryTrimmed]);

  useEffect(() => {
    setHighlightedSuggestionIndex(0);
  }, [matchingTasks]);

  useEffect(() => {
    if (!taskSuggestionsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (taskComboboxRef.current?.contains(target)) return;
      if (suggestionsPortalRef.current?.contains(target)) return;
      setTaskSuggestionsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [taskSuggestionsOpen]);

  const showTaskSuggestions = taskSuggestionsOpen && matchingTasks.length > 0;

  useLayoutEffect(() => {
    if (!showTaskSuggestions) {
      setSuggestionPortalRect(null);
      return;
    }

    updateSuggestionPortalRect();

    const textareaEl = taskTextareaRef.current;
    const scrollParents = collectScrollableAncestors(textareaEl);
    const onReposition = () => {
      updateSuggestionPortalRect();
    };

    const ro =
      typeof ResizeObserver !== "undefined" && textareaEl
        ? new ResizeObserver(onReposition)
        : null;
    if (textareaEl && ro) {
      ro.observe(textareaEl);
    }

    window.addEventListener("resize", onReposition);
    scrollParents.forEach((node) =>
      node.addEventListener("scroll", onReposition, { passive: true })
    );

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onReposition);
      scrollParents.forEach((node) => node.removeEventListener("scroll", onReposition));
    };
  }, [showTaskSuggestions, matchingTasks, updateSuggestionPortalRect]);

  const applyTaskSuggestion = (task: AccomplishmentTask) => {
    setTaskText(task.label);
    setDesignation(task.designation);
    setTaskSuggestionsOpen(false);
  };

  const handleTaskKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showTaskSuggestions) {
      if (event.key === "Escape") {
        setTaskSuggestionsOpen(false);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedSuggestionIndex((i) => Math.min(i + 1, matchingTasks.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedSuggestionIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const picked = matchingTasks[highlightedSuggestionIndex];
      if (picked) applyTaskSuggestion(picked);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setTaskSuggestionsOpen(false);
    }
  };

  const handleGenerate = async () => {
    const name = fullName.trim();
    const task = taskText.trim();
    if (!name) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!task) {
      toast.error("Please enter the task text for your report.");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("No accomplishment template available. Add one in Template Manager.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateAccomplishmentReport({
        templateId: selectedTemplateId,
        firstName: name,
        lastName: "",
        designation,
        months: [...ALL_MONTHS_ACCOMPLISHMENT],
        includeFirstHalf: true,
        includeSecondHalf: true,
        customTasks: [task],
      });
      downloadBlob(result.blob, result.fileName);
      const periodCount = ALL_MONTHS_ACCOMPLISHMENT.length * 2;
      toast.success(
        `Downloaded accomplishment report with ${String(periodCount)} period sheets.`
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to generate accomplishment report."));
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestionsListId = `${formId}-task-suggestions`;

  const suggestionListPortal =
    showTaskSuggestions && suggestionPortalRect && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={suggestionsPortalRef}
            id={suggestionsListId}
            role="listbox"
            aria-label="Matching saved tasks"
            style={{
              position: "fixed",
              top: suggestionPortalRect.top,
              left: suggestionPortalRect.left,
              width: suggestionPortalRect.width,
              maxHeight: suggestionPortalRect.maxHeight,
              zIndex: QUICK_ACCOMPLISHMENT_SUGGESTIONS_Z,
            }}
            className="overflow-y-auto rounded-lg border border-emerald-600 bg-emerald-950 py-1 shadow-lg shadow-black/50"
          >
            {matchingTasks.map((task, index) => {
              const isActive = index === highlightedSuggestionIndex;
              return (
                <li key={task.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    id={`${suggestionsListId}-opt-${task.id}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyTaskSuggestion(task)}
                    onMouseEnter={() => setHighlightedSuggestionIndex(index)}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "bg-emerald-700/80 text-white"
                        : "text-white/90 hover:bg-emerald-800/80"
                    }`}
                  >
                    <span className="font-medium">{task.label}</span>
                    <span className="text-[10px] font-normal text-white/60">
                      {task.designation}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <ScheduleWidgetChrome
      title="Quick accomplishment"
      titleIcon={quickAccomplishmentTitleIcon}
      titleClassName="text-xs"
      onRemove={onRemove}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-[11px] leading-snug text-emerald-200/75">
          Jan–Dec, 1st and 2nd half each month. Uses your first available accomplishment
          template.
        </p>
        {templatesLoading ? (
          <div className="flex justify-center py-4">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
              aria-hidden
            />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-center text-xs text-emerald-200/70">
            No accomplishment report templates yet. Upload one in Template Manager, then
            try again.
          </p>
        ) : (
          <>
            <div>
              <label
                htmlFor={`${formId}-name`}
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65"
              >
                Full name
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder="Your full name"
                className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-position`}
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65"
              >
                Position
              </label>
              <select
                id={`${formId}-position`}
                value={designation}
                onChange={(e) =>
                  setDesignation(e.target.value as AccomplishmentTaskDesignation)
                }
                className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                aria-label="Position for the accomplishment report"
              >
                {ACCOMPLISHMENT_TASK_DESIGNATIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-emerald-950">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div ref={taskComboboxRef} className="min-w-0">
              <label
                htmlFor={`${formId}-task`}
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65"
              >
                Task
              </label>
              <textarea
                ref={taskTextareaRef}
                id={`${formId}-task`}
                role="combobox"
                value={taskText}
                onChange={(e) => {
                  setTaskText(e.target.value);
                  setTaskSuggestionsOpen(true);
                }}
                onFocus={() => setTaskSuggestionsOpen(true)}
                onKeyDown={handleTaskKeyDown}
                rows={4}
                placeholder="Describe accomplishments for weekdays in the report…"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={showTaskSuggestions}
                aria-haspopup="listbox"
                aria-controls={suggestionsListId}
                aria-activedescendant={
                  showTaskSuggestions && matchingTasks[highlightedSuggestionIndex]
                    ? `${suggestionsListId}-opt-${matchingTasks[highlightedSuggestionIndex].id}`
                    : undefined
                }
                className="w-full resize-y rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <p className="mt-1 text-[10px] text-emerald-200/55">
                Type to search saved tasks from Task manager. Arrow keys and Enter to
                pick; Shift+Enter for a new line.
              </p>
              {suggestionListPortal}
            </div>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isGenerating || !selectedTemplateId}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
              ) : (
                <DownloadSimpleIcon
                  className="h-4 w-4 shrink-0"
                  weight="bold"
                  aria-hidden
                />
              )}
              {isGenerating ? "Generating…" : "Generate Excel"}
            </button>
          </>
        )}
      </div>
    </ScheduleWidgetChrome>
  );
}

function QuickMergeSidebarWidget({ onRemove }: { onRemove: () => void }) {
  const formId = useId();
  const {
    fileInputRef,
    mode,
    files,
    isSubmitting,
    isPreparingPages,
    defaultFileName,
    processIncomingFiles,
    changeMergeMode,
    executeMerge,
    setFileName,
    fileName,
    clearAll,
  } = useMergeFiles();

  return (
    <ScheduleWidgetChrome
      title="Quick merge files"
      titleIcon={quickMergeTitleIcon}
      titleClassName="text-xs"
      onRemove={onRemove}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-[11px] leading-snug text-emerald-200/75">
          Merge PDFs (page order follows upload) or Excel workbooks into one file. Same
          behavior as the workspace tool, without the stepper.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => changeMergeMode("pdf")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
              mode === "pdf"
                ? "border-emerald-400 bg-emerald-600/50 text-white"
                : "border-emerald-700 bg-emerald-950/40 text-emerald-100/90 hover:bg-emerald-900/50"
            }`}
            aria-pressed={mode === "pdf"}
            aria-label="Merge PDF files"
          >
            <FilePdfIcon className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />
            PDF
          </button>
          <button
            type="button"
            onClick={() => changeMergeMode("excel")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
              mode === "excel"
                ? "border-emerald-400 bg-emerald-600/50 text-white"
                : "border-emerald-700 bg-emerald-950/40 text-emerald-100/90 hover:bg-emerald-900/50"
            }`}
            aria-pressed={mode === "excel"}
            aria-label="Merge Excel files"
          >
            <MicrosoftExcelLogoIcon
              className="h-4 w-4 shrink-0"
              weight="duotone"
              aria-hidden
            />
            Excel
          </button>
        </div>
        <input
          ref={fileInputRef}
          id={`${formId}-merge-files`}
          type="file"
          accept={mode === "pdf" ? ".pdf" : ".xlsx,.xls"}
          multiple
          onChange={(e) => void processIncomingFiles(e.target.files)}
          className="sr-only"
          aria-label={`Select ${mode === "pdf" ? "PDF" : "Excel"} files to merge`}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void processIncomingFiles(e.dataTransfer.files);
          }}
          className="flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-emerald-600 bg-emerald-950/40 px-2 py-3 text-center text-[11px] text-emerald-100/90 transition hover:border-emerald-500 hover:bg-emerald-900/40"
        >
          <UploadSimpleIcon className="h-5 w-5 text-emerald-200" aria-hidden />
          <span>Drop files here or tap to browse</span>
        </button>
        {isPreparingPages ? (
          <p className="text-center text-[11px] text-emerald-200/70">
            Reading PDF pages…
          </p>
        ) : null}
        {files.length > 0 ? (
          <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/50 p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/65">
                {files.length} file{files.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => clearAll()}
                className="text-[10px] font-medium text-emerald-300 underline-offset-2 hover:text-white hover:underline"
              >
                Clear
              </button>
            </div>
            <ul className="max-h-24 space-y-1 overflow-y-auto text-[11px] text-white/90">
              {files.map((f) => (
                <li key={`${f.name}-${String(f.size)}`} className="truncate">
                  {f.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <label
            htmlFor={`${formId}-merge-out-name`}
            className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65"
          >
            Output name
          </label>
          <input
            id={`${formId}-merge-out-name`}
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder={defaultFileName}
            className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        <button
          type="button"
          onClick={() => void executeMerge()}
          disabled={isSubmitting || isPreparingPages || files.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden
            />
          ) : (
            <DownloadSimpleIcon
              className="h-4 w-4 shrink-0"
              weight="bold"
              aria-hidden
            />
          )}
          {isSubmitting ? "Merging…" : "Merge & download"}
        </button>
      </div>
    </ScheduleWidgetChrome>
  );
}

function QuickBillingUnitSidebarWidget({ onRemove }: { onRemove: () => void }) {
  const formId = useId();
  const { data: ifrTemplates = [], isLoading: ifrTemplatesLoading } =
    useTemplates("ifr-scanner");
  const {
    fileInputRef,
    sourceFiles,
    selectedTemplateId,
    zipName,
    billingUnitFolderName,
    sourceFolderNames,
    isGenerating,
    isOverlayVisible,
    isOverlayOpaque,
    elapsedSeconds,
    isFinalizing,
    handleFileSelection,
    setBillingUnitFolderName,
    setZipName,
    updateFolderName,
    generateBillingUnits,
  } = useGenerateProfiles();

  const templateName =
    ifrTemplates.find((t) => t.id === selectedTemplateId)?.name ??
    (selectedTemplateId ? "Selected template" : "");

  return (
    <ScheduleWidgetChrome
      title="Quick billing unit"
      titleIcon={quickBillingUnitTitleIcon}
      titleClassName="text-xs"
      onRemove={onRemove}
    >
      <div className="relative flex min-w-0 flex-col gap-3">
        <p className="text-[11px] leading-snug text-emerald-200/75">
          Upload IFR Excel files and generate a billing unit ZIP. Uses the first
          available Generate Billing Unit template unless you pick another in Template
          Manager.
        </p>
        {ifrTemplatesLoading ? (
          <div className="flex justify-center py-4">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
              aria-hidden
            />
          </div>
        ) : ifrTemplates.length === 0 ? (
          <p className="text-center text-xs text-emerald-200/70">
            No IFR scanner templates yet. Add one in Template Manager, then try again.
          </p>
        ) : (
          <>
            <p className="text-[10px] text-emerald-200/65">
              Template:{" "}
              <span className="font-medium text-emerald-100/90">
                {templateName || "Auto-selected"}
              </span>
            </p>
            <input
              ref={fileInputRef}
              id={`${formId}-billing-files`}
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={(e) => handleFileSelection(e.target.files)}
              className="sr-only"
              aria-label="Select IFR Excel source files"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelection(e.dataTransfer.files);
              }}
              className="flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-emerald-600 bg-emerald-950/40 px-2 py-3 text-center text-[11px] text-emerald-100/90 transition hover:border-emerald-500 hover:bg-emerald-900/40"
            >
              <UploadSimpleIcon className="h-5 w-5 text-emerald-200" aria-hidden />
              <span>Drop IFR Excel files or tap to browse</span>
            </button>
            {sourceFiles.length > 0 ? (
              <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/50 p-2">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-emerald-200/65">
                  {sourceFiles.length} file{sourceFiles.length === 1 ? "" : "s"}
                </p>
                <div className="max-h-28 space-y-2 overflow-y-auto pr-0.5">
                  {sourceFiles.map((file) => {
                    const fileKey = getFileKey(file);
                    const folderName = sourceFolderNames[fileKey] ?? "";
                    return (
                      <div
                        key={fileKey}
                        className="rounded border border-emerald-800/80 bg-emerald-950/60 p-2"
                      >
                        <p className="mb-1 truncate text-[11px] text-white/90">
                          {file.name}
                        </p>
                        <label className="sr-only" htmlFor={`${formId}-fn-${fileKey}`}>
                          Division folder for {file.name}
                        </label>
                        <input
                          id={`${formId}-fn-${fileKey}`}
                          type="text"
                          value={folderName}
                          onChange={(e) => updateFolderName(fileKey, e.target.value)}
                          placeholder="Division folder name"
                          className="w-full rounded border border-emerald-700 bg-emerald-950/80 px-2 py-1 text-[11px] text-white placeholder:text-white/35 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div>
              <label
                htmlFor={`${formId}-billing-folder`}
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65"
              >
                Billing unit folder name
              </label>
              <input
                id={`${formId}-billing-folder`}
                type="text"
                value={billingUnitFolderName}
                onChange={(e) =>
                  setBillingUnitFolderName(sanitizeFolderName(e.target.value))
                }
                placeholder={defaultBillingUnitFolderName}
                className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-zip-name`}
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-emerald-200/65"
              >
                ZIP file name
              </label>
              <input
                id={`${formId}-zip-name`}
                type="text"
                value={zipName}
                onChange={(e) => setZipName(e.target.value)}
                placeholder={defaultZipName}
                className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <button
              type="button"
              onClick={() => void generateBillingUnits()}
              disabled={isGenerating || sourceFiles.length === 0 || !selectedTemplateId}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
              ) : (
                <DownloadSimpleIcon
                  className="h-4 w-4 shrink-0"
                  weight="bold"
                  aria-hidden
                />
              )}
              {isGenerating ? "Generating…" : "Generate ZIP"}
            </button>
          </>
        )}
        <ProcessingOverlay
          isVisible={isOverlayVisible}
          isOpaque={isOverlayOpaque}
          isFinalizing={isFinalizing}
          elapsedSeconds={elapsedSeconds}
        />
      </div>
    </ScheduleWidgetChrome>
  );
}

function QuickConsolidateIfrSidebarWidget({ onRemove }: { onRemove: () => void }) {
  const formId = useId();
  const { data: consolidationTemplates = [], isLoading: consolidationLoading } =
    useTemplates("consolidation");
  const {
    landProfileInputRef,
    selectedTemplateId,
    landProfileFiles,
    isProcessing,
    isOverlayVisible,
    isOverlayOpaque,
    elapsedSeconds,
    isFinalizing,
    handleLandProfileSelection,
    removeLandProfileFile,
    handleConsolidate,
    updateFileDetails,
  } = useConsolidateLandProfiles();

  const templateName =
    consolidationTemplates.find((t) => t.id === selectedTemplateId)?.name ??
    (selectedTemplateId ? "Selected template" : "");

  const canRun =
    landProfileFiles.length > 0 &&
    landProfileFiles.every(
      (f) => f.divisionNumber?.trim() && f.irrigationAssociation?.trim()
    ) &&
    Boolean(selectedTemplateId);

  return (
    <ScheduleWidgetChrome
      title="Quick consolidate IFR"
      titleIcon={quickConsolidateIfrTitleIcon}
      titleClassName="text-xs"
      onRemove={onRemove}
    >
      <div className="relative flex min-w-0 flex-col gap-3">
        <p className="text-[11px] leading-snug text-emerald-200/75">
          Upload IFR Excel files and merge them into the shared consolidation template.
          Division number and irrigation association are required for each file.
        </p>
        {consolidationLoading ? (
          <div className="flex justify-center py-4">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
              aria-hidden
            />
          </div>
        ) : consolidationTemplates.length === 0 ? (
          <p className="text-center text-xs text-emerald-200/70">
            No consolidation templates yet. Add one in Template Manager, then try again.
          </p>
        ) : (
          <>
            <p className="text-[10px] text-emerald-200/65">
              Template:{" "}
              <span className="font-medium text-emerald-100/90">
                {templateName || "Auto-selected"}
              </span>
            </p>
            <input
              ref={landProfileInputRef}
              id={`${formId}-consolidate-files`}
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={(e) => handleLandProfileSelection(e.target.files)}
              className="sr-only"
              aria-label="Select IFR files to consolidate"
            />
            <button
              type="button"
              onClick={() => landProfileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleLandProfileSelection(e.dataTransfer.files);
              }}
              className="flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-emerald-600 bg-emerald-950/40 px-2 py-3 text-center text-[11px] text-emerald-100/90 transition hover:border-emerald-500 hover:bg-emerald-900/40"
            >
              <UploadSimpleIcon className="h-5 w-5 text-emerald-200" aria-hidden />
              <span>Drop IFR files or tap to browse</span>
            </button>
            {landProfileFiles.length > 0 ? (
              <div className="max-h-40 space-y-2 overflow-y-auto pr-0.5">
                {landProfileFiles.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-emerald-700/60 bg-emerald-950/50 p-2"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-[11px] text-white/90">
                        {item.file.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeLandProfileFile(item.id)}
                        className="shrink-0 rounded p-0.5 text-emerald-300/80 hover:bg-white/10 hover:text-white"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <XIcon className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <div className="grid gap-2">
                      <div>
                        <label
                          className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-emerald-200/55"
                          htmlFor={`${formId}-div-${item.id}`}
                        >
                          Division no.
                        </label>
                        <input
                          id={`${formId}-div-${item.id}`}
                          type="text"
                          value={item.divisionNumber ?? ""}
                          onChange={(e) =>
                            updateFileDetails(item.id, "divisionNumber", e.target.value)
                          }
                          className="w-full rounded border border-emerald-700 bg-emerald-950/80 px-2 py-1 text-[11px] text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-emerald-200/55"
                          htmlFor={`${formId}-ia-${item.id}`}
                        >
                          Irrigation association
                        </label>
                        <input
                          id={`${formId}-ia-${item.id}`}
                          type="text"
                          value={item.irrigationAssociation ?? ""}
                          onChange={(e) =>
                            updateFileDetails(
                              item.id,
                              "irrigationAssociation",
                              e.target.value
                            )
                          }
                          className="w-full rounded border border-emerald-700 bg-emerald-950/80 px-2 py-1 text-[11px] text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void handleConsolidate()}
              disabled={isProcessing || !canRun}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
              ) : (
                <DownloadSimpleIcon
                  className="h-4 w-4 shrink-0"
                  weight="bold"
                  aria-hidden
                />
              )}
              {isProcessing ? "Consolidating…" : "Consolidate & download"}
            </button>
          </>
        )}
        <ProcessingOverlay
          isVisible={isOverlayVisible}
          isOpaque={isOverlayOpaque}
          isFinalizing={isFinalizing}
          elapsedSeconds={elapsedSeconds}
        />
      </div>
    </ScheduleWidgetChrome>
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
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 1000);
    queueMicrotask(tick);
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
        PREVIEW_SAMPLE.nextDeadline.getTime() - now.getTime()
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
    const assigneeEmail = nearest.personEmail.trim() || nearest.personAssigned;
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

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:items-stretch md:auto-rows-fr">
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
            dueLabel={weekCount === 1 ? "task due this week" : "tasks due this week"}
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
            dueLabel={monthCount === 1 ? "task due this month" : "tasks due this month"}
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

function AddWidgetModalPrioritySection({
  isOpen,
  onPickSchedule,
  hasExistingPriority,
}: {
  isOpen: boolean;
  onPickSchedule: (scheduleId: string) => void;
  hasExistingPriority: boolean;
}) {
  const { data: schedules = [], isLoading: schedulesLoading } =
    useAllSchedulesForTaskManager();
  const { data: completions = [], isLoading: completionsLoading } =
    useScheduleCompletions();
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isOpen) return;
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 1000);
    queueMicrotask(tick);
    return () => window.clearInterval(id);
  }, [isOpen]);

  const activeSchedules = useMemo(
    () =>
      [...schedules]
        .filter((s) => s.status === "active")
        .sort((a, b) => a.title.localeCompare(b.title)),
    [schedules]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeSchedules;
    return activeSchedules.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        s.personAssigned.toLowerCase().includes(q) ||
        s.personEmail.toLowerCase().includes(q)
    );
  }, [activeSchedules, search]);

  const completionByPeriodKey = useMemo(
    () => buildCompletionLookup(completions),
    [completions]
  );

  const previewForSchedule = (s: Schedule): ReactNode => {
    const period = getCurrentPeriod(s.deadline.type);
    const key = completionPeriodKey(s.id, period.start, period.end);
    const periodComplete = completionByPeriodKey.has(key);
    const periodLabel = getPeriodLabel(s.deadline.type);
    let nd: Date;
    try {
      nd = calculateNextDeadline(s.deadline, now, s.createdAt);
    } catch {
      return (
        <ScheduleWidgetChrome
          title="Priority focus"
          titleIcon={priorityFocusTitleIcon}
          variant="glass"
          fillHeight
        >
          <p className="flex flex-1 items-center justify-center px-1 py-4 text-center text-xs text-white/70">
            Could not compute a preview deadline for this schedule.
          </p>
        </ScheduleWidgetChrome>
      );
    }
    const timeUntil = nd.getTime() - now.getTime();
    const assigneeEmail = s.personEmail.trim() || s.personAssigned;
    return (
      <PriorityFocusCard
        taskTitle={s.title}
        taskDescription={s.description}
        nextDeadline={nd}
        personEmail={assigneeEmail}
        urgencyPercent={computeDeadlineUrgencyPercent(timeUntil)}
        remainingClock={formatRemainingClock(timeUntil)}
        periodComplete={periodComplete}
        periodLabel={periodLabel}
        variant="glass"
        fillHeight
      />
    );
  };

  const priorityPreview = (() => {
    const loading = schedulesLoading || completionsLoading;
    if (loading) {
      return (
        <ScheduleWidgetChrome
          title="Priority focus"
          titleIcon={priorityFocusTitleIcon}
          variant="glass"
          fillHeight
        >
          <div className="flex flex-1 items-center justify-center py-8">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-white/50 border-t-transparent"
              aria-hidden
            />
          </div>
        </ScheduleWidgetChrome>
      );
    }
    if (activeSchedules.length === 0) {
      const mockUntil = Math.max(
        0,
        PREVIEW_SAMPLE.nextDeadline.getTime() - now.getTime()
      );
      return (
        <PriorityFocusCard
          taskTitle={PREVIEW_SAMPLE.taskTitle}
          taskDescription={PREVIEW_SAMPLE.taskDescription}
          nextDeadline={PREVIEW_SAMPLE.nextDeadline}
          personEmail={PREVIEW_SAMPLE.personEmail}
          urgencyPercent={computeDeadlineUrgencyPercent(mockUntil)}
          remainingClock={formatRemainingClock(mockUntil)}
          periodComplete={false}
          periodLabel="This Month"
          variant="glass"
          fillHeight
        />
      );
    }
    const first = filtered[0] ?? activeSchedules[0];
    return previewForSchedule(first);
  })();

  const handleRowKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    scheduleId: string
  ) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onPickSchedule(scheduleId);
  };

  return (
    <div className="w-full space-y-4">
      <div className="w-full">
        <h4 className="flex items-center gap-2 text-lg font-medium text-white sm:text-xl">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <StarIcon size={20} className="text-white" weight="duotone" aria-hidden />
          </span>
          Priority focus
        </h4>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <StarIcon size={12} className="text-white" weight="duotone" aria-hidden />
            One schedule
          </span>
          {hasExistingPriority ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/45 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-100">
              Replacing current priority
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-w-3xl text-sm text-white/85">
          Choose one active schedule to pin in the sidebar. It shows a live countdown to
          the next deadline, urgency, and whether you have finished it for the current
          period. Only one priority is kept—picking another replaces it.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:grid-rows-1 md:items-stretch md:h-[min(52dvh,26rem)]">
        <div className="flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-white/35 bg-white/10 p-3 shadow-sm backdrop-blur-md">
          <p className="mb-2 shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/50">
            Live preview
          </p>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col [&>*]:min-h-0 [&>*]:flex-1">
            {priorityPreview}
          </div>
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-white/35 bg-white/10 p-3 shadow-sm backdrop-blur-md">
          <label className="mb-2 block shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/50">
            Pick a schedule
          </label>
          <div className="relative mb-2 shrink-0">
            <MagnifyingGlassIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, assignee…"
              className="w-full rounded-lg border border-white/30 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/25"
              aria-label="Filter schedules for priority"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/20 bg-emerald-950/40">
            {schedulesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-2 border-white/50 border-t-transparent"
                  aria-hidden
                />
              </div>
            ) : activeSchedules.length === 0 ? (
              <p className="p-4 text-center text-xs text-white/65">
                No active schedules yet. Create one in the workspace, then choose it
                here.
              </p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-xs text-white/65">
                No schedules match your search.
              </p>
            ) : (
              <ul className="divide-y divide-white/10 p-0">
                {filtered.map((s) => (
                  <li key={s.id} className="list-none">
                    <button
                      type="button"
                      onClick={() => onPickSchedule(s.id)}
                      onKeyDown={(e) => handleRowKeyDown(e, s.id)}
                      className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30"
                      aria-label={`Set priority to ${s.title}`}
                    >
                      <span className="line-clamp-2 text-sm font-medium text-white">
                        {s.title}
                      </span>
                      <span className="text-xs text-white/60">
                        {s.personAssigned}
                        <span aria-hidden> · </span>
                        <span className="capitalize">
                          {s.deadline.type.replace(/-/g, " ")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const SIDEBAR_QUICK_WIDGET_ORDER = [
  "quick-accomplishment",
  "quick-merge-files",
  "quick-billing-unit",
  "quick-consolidate-ifr",
] as const;

function AddWidgetModalQuickToolSection({
  title,
  description,
  chipIcon,
  chipLabel,
  cardTitle,
  cardBody,
  onAdd,
  hasExisting,
  ariaLabel,
  headerIcon,
  cardIcon,
}: {
  title: string;
  description: string;
  chipIcon: ReactNode;
  chipLabel: string;
  cardTitle: string;
  cardBody: string;
  onAdd: () => void;
  hasExisting: boolean;
  ariaLabel: string;
  headerIcon: ReactNode;
  cardIcon: ReactNode;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onAdd();
  };

  return (
    <div className="w-full space-y-4">
      <div className="w-full">
        <h4 className="flex items-center gap-2 text-lg font-medium text-white sm:text-xl">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            {headerIcon}
          </span>
          {title}
        </h4>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <span className="inline-flex shrink-0 items-center" aria-hidden>
              {chipIcon}
            </span>
            {chipLabel}
          </span>
          {hasExisting ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/45 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-100">
              Replaces current shortcut
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-w-3xl text-sm text-white/85">{description}</p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        onKeyDown={handleKeyDown}
        className="group flex w-full flex-col rounded-xl border border-white/35 bg-white/10 p-4 text-left shadow-sm backdrop-blur-md transition-all hover:border-white/50 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 sm:flex-row sm:items-center sm:gap-4"
        aria-label={ariaLabel}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/35 bg-white/10 p-2.5">
            {cardIcon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{cardTitle}</p>
            <p className="mt-1 text-xs font-normal leading-snug text-white/80">
              {cardBody}
            </p>
          </div>
        </div>
        <div className="mt-3 flex shrink-0 items-center justify-end gap-1 text-xs font-medium text-emerald-200/95 sm:mt-0 sm:flex-col sm:items-end">
          <span className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <PlusIcon className="h-3.5 w-3.5" weight="bold" aria-hidden />
            Add to sidebar
          </span>
        </div>
      </button>
    </div>
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
  const {
    isOpen,
    toggleSidebar,
    widgets,
    addWidget,
    removeWidget,
    isTaskDrawerOpen,
    openTaskDrawer,
    closeTaskDrawer,
  } = useWidgetSidebar();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddScheduleWidget = (scheduleType: ScheduleWidgetType) => {
    addWidget({
      id: `${scheduleType}-${Date.now()}`,
      type: "schedule",
      scheduleType,
    });
    setIsAddModalOpen(false);
  };

  const handleSetPrioritySchedule = (scheduleId: string) => {
    addWidget({
      id: `priority-${Date.now()}`,
      type: "priority",
      scheduleId,
    });
    setIsAddModalOpen(false);
  };

  const handleAddQuickAccomplishmentWidget = () => {
    addWidget({
      id: `quick-accomplishment-${Date.now()}`,
      type: "quick-accomplishment",
    });
    setIsAddModalOpen(false);
  };

  const handleAddQuickMergeWidget = () => {
    addWidget({
      id: `quick-merge-files-${Date.now()}`,
      type: "quick-merge-files",
    });
    setIsAddModalOpen(false);
  };

  const handleAddQuickBillingUnitWidget = () => {
    addWidget({
      id: `quick-billing-unit-${Date.now()}`,
      type: "quick-billing-unit",
    });
    setIsAddModalOpen(false);
  };

  const handleAddQuickConsolidateIfrWidget = () => {
    addWidget({
      id: `quick-consolidate-ifr-${Date.now()}`,
      type: "quick-consolidate-ifr",
    });
    setIsAddModalOpen(false);
  };

  const hasExistingPriority = useMemo(
    () => widgets.some((w) => w.type === "priority"),
    [widgets]
  );

  const hasExistingQuickAccomplishment = useMemo(
    () => widgets.some((w) => w.type === "quick-accomplishment"),
    [widgets]
  );

  const hasExistingQuickMerge = useMemo(
    () => widgets.some((w) => w.type === "quick-merge-files"),
    [widgets]
  );

  const hasExistingQuickBillingUnit = useMemo(
    () => widgets.some((w) => w.type === "quick-billing-unit"),
    [widgets]
  );

  const hasExistingQuickConsolidateIfr = useMemo(
    () => widgets.some((w) => w.type === "quick-consolidate-ifr"),
    [widgets]
  );

  const orderedWidgets = useMemo(() => {
    const priority = widgets.filter((w) => w.type === "priority");
    const quickOrdered = SIDEBAR_QUICK_WIDGET_ORDER.flatMap((t) =>
      widgets.filter((w) => w.type === t)
    );
    const allowedQuick = new Set<string>(SIDEBAR_QUICK_WIDGET_ORDER);
    const rest = widgets.filter(
      (w) => w.type !== "priority" && !allowedQuick.has(w.type)
    );
    return [...priority, ...quickOrdered, ...rest];
  }, [widgets]);

  return (
    <>
      {/* In-flow width only on lg+: reserves space so main content does not sit under the fixed panel */}
      <div
        aria-hidden
        className={`hidden shrink-0 transition-[width] duration-300 lg:block ${
          isOpen ? "lg:w-96" : "lg:w-0"
        }`}
      />

      {isOpen ? (
        <button
          type="button"
          aria-label="Close widget sidebar"
          className="fixed inset-0 z-20 bg-emerald-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={toggleSidebar}
        />
      ) : null}

      <aside
        className={`fixed z-30 flex flex-col bg-emerald-900 transition-[width] duration-300 lg:border-l lg:border-emerald-700/60 lg:shadow-none ${
          isOpen
            ? "max-lg:inset-0 max-lg:w-full max-lg:min-w-0 max-lg:overflow-hidden max-lg:border-0 max-lg:shadow-none lg:inset-x-auto lg:bottom-auto lg:right-0 lg:top-0 lg:h-[100dvh] lg:max-h-[100dvh] lg:w-96 lg:overflow-visible"
            : "max-lg:inset-y-0 max-lg:right-0 max-lg:left-auto max-lg:w-0 max-lg:overflow-hidden max-lg:border-0 lg:right-0 lg:top-0 lg:h-[100dvh] lg:overflow-visible"
        }`}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute top-3 z-10 hidden rounded-l-lg border border-r-0 border-emerald-700/60 bg-emerald-900 p-2 text-white shadow-lg transition-all hover:bg-emerald-800 lg:inline-flex lg:top-4 lg:-left-10 lg:right-auto"
          aria-label={isOpen ? "Close widget sidebar" : "Open widget sidebar"}
        >
          {isOpen ? (
            <CaretRightIcon className="h-5 w-5" />
          ) : (
            <CaretLeftIcon className="h-5 w-5" />
          )}
        </button>

        {isOpen && (
          <div className="flex min-h-0 flex-1 flex-col max-lg:min-h-0 max-lg:flex-1 max-lg:pt-[var(--mobile-workspace-chrome)]">
            <div className="border-b border-emerald-700/60 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3 lg:px-4 lg:pb-4 lg:pt-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 text-base font-semibold leading-snug text-white sm:text-lg">
                    <span className="inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
                      <CalendarCheckIcon className="h-5 w-5" weight="duotone" />
                    </span>
                    <span className="min-w-0">Widgets</span>
                  </h2>
                  <p className="mt-1.5 text-xs font-normal leading-relaxed text-emerald-200/75 sm:text-[13px]">
                    Productivity shortcuts and insights next to your workspace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openTaskDrawer()}
                  className="group flex shrink-0 flex-col items-center gap-1 rounded-xl border border-emerald-600/50 bg-emerald-800/40 px-2.5 py-2 text-center shadow-sm transition hover:border-emerald-500/60 hover:bg-emerald-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45 sm:px-3 sm:py-2.5"
                  aria-label="Open tasks and calendar in a side panel"
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-4 lg:px-4 lg:pb-[max(1rem,env(safe-area-inset-bottom))] lg:pt-2">
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
                  {orderedWidgets.map((widget) => {
                    if (widget.type === "priority") {
                      return (
                        <PriorityFocusWidget
                          key={widget.id}
                          scheduleId={widget.scheduleId}
                          onRemove={() => removeWidget(widget.id)}
                        />
                      );
                    }
                    if (widget.type === "quick-accomplishment") {
                      return (
                        <QuickAccomplishmentSidebarWidget
                          key={widget.id}
                          onRemove={() => removeWidget(widget.id)}
                        />
                      );
                    }
                    if (widget.type === "quick-merge-files") {
                      return (
                        <QuickMergeSidebarWidget
                          key={widget.id}
                          onRemove={() => removeWidget(widget.id)}
                        />
                      );
                    }
                    if (widget.type === "quick-billing-unit") {
                      return (
                        <QuickBillingUnitSidebarWidget
                          key={widget.id}
                          onRemove={() => removeWidget(widget.id)}
                        />
                      );
                    }
                    if (widget.type === "quick-consolidate-ifr") {
                      return (
                        <QuickConsolidateIfrSidebarWidget
                          key={widget.id}
                          onRemove={() => removeWidget(widget.id)}
                        />
                      );
                    }
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
                    <LayoutIcon className="mx-auto mb-1 h-5 w-5" weight="duotone" />
                    Add widget
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      <TaskAccomplishmentsDrawer
        isOpen={isTaskDrawerOpen}
        onClose={closeTaskDrawer}
      />

      <MasonryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        panelClassName="w-full max-w-6xl px-1 sm:px-2"
        animateFrom="bottom"
      >
        <section className="relative max-h-[min(85dvh,90svh)] overflow-y-auto rounded-2xl border border-white/40 bg-emerald-900 p-4 shadow-xl sm:p-6 md:p-8">
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
              Pick a schedule widget for the right sidebar. Each preview below is the
              same layout you will see after you add it—counts and deadlines stay in
              sync with your active schedules.
            </p>
          </header>

          <div className="w-full space-y-8">
            <AddWidgetModalScheduleSection
              isOpen={isAddModalOpen}
              onAdd={handleAddScheduleWidget}
            />

            <AddWidgetModalPrioritySection
              isOpen={isAddModalOpen}
              onPickSchedule={handleSetPrioritySchedule}
              hasExistingPriority={hasExistingPriority}
            />

            <AddWidgetModalQuickToolSection
              title="Quick accomplishment report"
              description="Add a compact sidebar form: full name, position, and task description. Task text suggests matching entries from Task manager as you type. Months default to January through December, with first and second half of each month included. The first available accomplishment template is used."
              chipIcon={<FileXlsIcon size={12} className="text-white" aria-hidden />}
              chipLabel="Excel · Accomplishment report"
              cardTitle="Sidebar shortcut"
              cardBody="Generate the full-year workbook from the sidebar without the workspace stepper."
              onAdd={handleAddQuickAccomplishmentWidget}
              hasExisting={hasExistingQuickAccomplishment}
              ariaLabel="Add Quick accomplishment widget to sidebar"
              headerIcon={
                <FileXlsIcon
                  size={20}
                  className="text-white"
                  weight="duotone"
                  aria-hidden
                />
              }
              cardIcon={
                <FileXlsIcon
                  className="h-6 w-6 text-white"
                  weight="duotone"
                  aria-hidden
                />
              }
            />

            <AddWidgetModalQuickToolSection
              title="Quick merge files"
              description="Merge PDF or Excel files from the sidebar: choose mode, drop files in order (PDF page order follows upload), set an output name, and download—same engine as Merge Files in the workspace."
              chipIcon={
                <ArrowsMergeIcon size={12} className="text-white" aria-hidden />
              }
              chipLabel="PDF / Excel · Merge"
              cardTitle="Sidebar shortcut"
              cardBody="Compact merge without the stepper; ideal when you already know the mode and files."
              onAdd={handleAddQuickMergeWidget}
              hasExisting={hasExistingQuickMerge}
              ariaLabel="Add Quick merge files widget to sidebar"
              headerIcon={
                <ArrowsMergeIcon
                  size={20}
                  className="text-white"
                  weight="duotone"
                  aria-hidden
                />
              }
              cardIcon={
                <ArrowsMergeIcon
                  className="h-6 w-6 text-white"
                  weight="duotone"
                  aria-hidden
                />
              }
            />

            <AddWidgetModalQuickToolSection
              title="Quick generate billing unit"
              description="Upload IFR Excel sources, set per-file division folder names and billing folder name, then generate the ZIP. Uses the first IFR scanner template from Template Manager unless you change it in the full tool."
              chipIcon={
                <MagnifyingGlassIcon size={12} className="text-white" aria-hidden />
              }
              chipLabel="Excel · Billing unit ZIP"
              cardTitle="Sidebar shortcut"
              cardBody="Run Generate Billing Unit from the sidebar with upload, mapping fields, and progress overlay."
              onAdd={handleAddQuickBillingUnitWidget}
              hasExisting={hasExistingQuickBillingUnit}
              ariaLabel="Add Quick billing unit widget to sidebar"
              headerIcon={
                <MagnifyingGlassIcon
                  size={20}
                  className="text-white"
                  weight="duotone"
                  aria-hidden
                />
              }
              cardIcon={
                <MagnifyingGlassIcon
                  className="h-6 w-6 text-white"
                  weight="duotone"
                  aria-hidden
                />
              }
            />

            <AddWidgetModalQuickToolSection
              title="Quick consolidate IFR"
              description="Upload IFR Excel files, enter division number and irrigation association for each, and consolidate using the shared template from Template Manager. Filenames may pre-fill details when they match the expected pattern."
              chipIcon={<FolderOpenIcon size={12} className="text-white" aria-hidden />}
              chipLabel="Excel · Consolidate IFR"
              cardTitle="Sidebar shortcut"
              cardBody="Same consolidation API as Consolidate IFR in the workspace, in a narrow sidebar layout."
              onAdd={handleAddQuickConsolidateIfrWidget}
              hasExisting={hasExistingQuickConsolidateIfr}
              ariaLabel="Add Quick consolidate IFR widget to sidebar"
              headerIcon={
                <FolderOpenIcon
                  size={20}
                  className="text-white"
                  weight="duotone"
                  aria-hidden
                />
              }
              cardIcon={
                <FolderOpenIcon
                  className="h-6 w-6 text-white"
                  weight="duotone"
                  aria-hidden
                />
              }
            />
          </div>
        </section>
      </MasonryModal>
    </>
  );
}
