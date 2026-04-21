"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { ColumnsIcon, PlusIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import {
  useWidgetSidebar,
  type ScheduleWidgetType,
} from "@/contexts/WidgetSidebarContext";
import { useAllSchedulesForTaskManager } from "@/hooks/useAllSchedulesForTaskManager";
import {
  NearestDeadlineWidget,
  PriorityFocusWorkspacePromoEmbed,
  QuickAccomplishmentSidebarWidget,
  QuickBillingUnitSidebarWidget,
  QuickConsolidateIfrSidebarWidget,
  QuickIfrCheckerSidebarWidget,
  QuickMergeSidebarWidget,
  TasksThisMonthWidget,
  TasksThisWeekWidget,
} from "@/components/WidgetSidebar";
import { QuickSendMessageSidebarWidget } from "@/components/widget-sidebar/QuickSendMessageSidebarWidget";

/** Quick-tool promo: bounded preview so long forms stay scrollable. */
const QUICK_PROMO_PREVIEW_BOX_CLASS =
  "h-[min(28rem,55svh)] min-h-[20rem] w-full overflow-y-auto overflow-x-hidden rounded-lg border border-emerald-800/50 bg-emerald-950/50 p-1";

type ScheduleWidgetsSidebarPromoProps = {
  variant: "schedules" | "task-manager";
};

type SchedulePromoTile = {
  id: string;
  title: string;
  description: string;
  preview: ReactNode;
  onAdd: () => void;
  addLabel: string;
  addDisabled?: boolean;
  addDisabledReason?: string;
};

export const ScheduleWidgetsSidebarPromo = ({
  variant,
}: ScheduleWidgetsSidebarPromoProps) => {
  const { addWidget, openSidebar } = useWidgetSidebar();
  const { data: schedules = [] } = useAllSchedulesForTaskManager();
  const firstActiveScheduleId = useMemo(
    () => schedules.find((s) => s.status === "active")?.id,
    [schedules]
  );

  const handleAddScheduleType = useCallback(
    (scheduleType: ScheduleWidgetType) => {
      addWidget({
        id: `${scheduleType}-${Date.now()}`,
        type: "schedule",
        scheduleType,
      });
      openSidebar();
      const label =
        scheduleType === "nearest-deadline"
          ? "Nearest Deadline"
          : scheduleType === "tasks-this-week"
            ? "Tasks This Week"
            : "Tasks This Month";
      toast.success(`${label} added to your widget sidebar.`);
    },
    [addWidget, openSidebar]
  );

  const handleAddPriority = useCallback(() => {
    if (!firstActiveScheduleId) {
      toast.error("Create at least one active schedule before adding Priority focus.");
      return;
    }
    addWidget({
      id: `priority-${Date.now()}`,
      type: "priority",
      scheduleId: firstActiveScheduleId,
    });
    openSidebar();
    toast.success(
      "Priority focus added for your first active schedule. Change it anytime from Add widget."
    );
  }, [addWidget, openSidebar, firstActiveScheduleId]);

  const introLead =
    variant === "schedules"
      ? "You can pin live schedule summaries next to the rest of the workspace."
      : "Keep the same live summaries beside the hub while you work through this checklist.";

  const tiles: SchedulePromoTile[] = [
    {
      id: "nearest",
      title: "Nearest Deadline",
      description:
        "Shows your next upcoming deadline, assignee email, urgency bar, and a live countdown.",
      preview: <NearestDeadlineWidget />,
      onAdd: () => handleAddScheduleType("nearest-deadline"),
      addLabel: "Add Nearest Deadline to widget sidebar",
    },
    {
      id: "week",
      title: "Tasks This Week",
      description:
        "Counts active tasks due within seven days and lists who is on the hook.",
      preview: <TasksThisWeekWidget />,
      onAdd: () => handleAddScheduleType("tasks-this-week"),
      addLabel: "Add Tasks This Week to widget sidebar",
    },
    {
      id: "month",
      title: "Tasks This Month",
      description:
        "Same idea as the week view, using a thirty-day window for planning ahead.",
      preview: <TasksThisMonthWidget />,
      onAdd: () => handleAddScheduleType("tasks-this-month"),
      addLabel: "Add Tasks This Month to widget sidebar",
    },
    {
      id: "priority",
      title: "Priority focus",
      description:
        "Pins one schedule with countdown, period status, and mark-done for the current period. The preview uses your first active schedule; only one priority widget is kept at a time.",
      preview: <PriorityFocusWorkspacePromoEmbed />,
      onAdd: handleAddPriority,
      addLabel: "Add Priority focus to widget sidebar",
      addDisabled: !firstActiveScheduleId,
      addDisabledReason:
        variant === "schedules"
          ? "Add an active schedule above before pinning Priority focus from here."
          : "Add an active email schedule before pinning Priority focus from here.",
    },
  ];

  return (
    <div className="mt-8 border-t border-emerald-700/60 pt-6">
      <div className="mb-2 flex items-center gap-2 text-white">
        <span className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/35 bg-white/10 p-1.5">
          <ColumnsIcon className="h-4 w-4" weight="duotone" aria-hidden />
        </span>
        <h3 className="text-base font-medium sm:text-lg">Widget sidebar</h3>
      </div>
      <p className="w-full text-sm font-medium text-white">
        Would you like to add any of these modules to your widget sidebar?
      </p>
      <p className="mt-2 w-full max-w-none text-sm leading-relaxed text-emerald-200/80">
        {introLead} Open the{" "}
        <span className="font-medium text-emerald-100">Widgets</span> strip on the right
        (desktop) or from the shortcuts menu on mobile. The cards below use the same
        components as the sidebar so what you see here is what you get after you add
        one.
      </p>

      <div className="mt-6 grid min-h-0 grid-cols-1 gap-6 lg:min-h-[min(76svh,52rem)] lg:grid-cols-2 lg:grid-rows-2 lg:items-stretch lg:gap-6">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className="flex h-full min-h-[22rem] flex-col gap-3 rounded-xl border border-emerald-700/50 bg-emerald-950/25 p-4 lg:min-h-0"
          >
            <h4 className="shrink-0 text-sm font-medium text-white">{tile.title}</h4>

            <div className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-emerald-800/50 bg-emerald-950/50 p-1">
              {tile.preview}
            </div>

            <p className="shrink-0 text-xs leading-relaxed text-emerald-200/75">
              {tile.description}
            </p>

            {tile.addDisabled && tile.addDisabledReason ? (
              <p className="shrink-0 text-xs text-amber-200/85">
                {tile.addDisabledReason}
              </p>
            ) : null}

            <button
              type="button"
              onClick={tile.onAdd}
              disabled={tile.addDisabled}
              aria-label={tile.addLabel}
              className="mt-auto inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:border-emerald-800 disabled:bg-emerald-900/60 disabled:text-emerald-300/60"
            >
              <PlusIcon className="h-4 w-4 shrink-0" weight="bold" aria-hidden />
              {tile.addLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export type QuickWorkspacePromoWidget =
  | "quick-accomplishment"
  | "quick-merge-files"
  | "quick-billing-unit"
  | "quick-consolidate-ifr"
  | "quick-ifr-checker"
  | "quick-send-message";

type QuickSingletonWidgetSidebarPromoProps = {
  widget: QuickWorkspacePromoWidget;
  title: string;
  intro: string;
  description: string;
  addButtonLabel: string;
};

export const QuickSingletonWidgetSidebarPromo = ({
  widget,
  title,
  intro,
  description,
  addButtonLabel,
}: QuickSingletonWidgetSidebarPromoProps) => {
  const { addWidget, openSidebar } = useWidgetSidebar();

  const handleAdd = () => {
    const idSuffix = `${Date.now()}`;
    if (widget === "quick-accomplishment") {
      addWidget({
        id: `quick-accomplishment-${idSuffix}`,
        type: "quick-accomplishment",
      });
    } else if (widget === "quick-merge-files") {
      addWidget({ id: `quick-merge-files-${idSuffix}`, type: "quick-merge-files" });
    } else if (widget === "quick-billing-unit") {
      addWidget({ id: `quick-billing-unit-${idSuffix}`, type: "quick-billing-unit" });
    } else if (widget === "quick-consolidate-ifr") {
      addWidget({
        id: `quick-consolidate-ifr-${idSuffix}`,
        type: "quick-consolidate-ifr",
      });
    } else if (widget === "quick-ifr-checker") {
      addWidget({
        id: `quick-ifr-checker-${idSuffix}`,
        type: "quick-ifr-checker",
      });
    } else {
      addWidget({
        id: `quick-send-message-${idSuffix}`,
        type: "quick-send-message",
      });
    }
    openSidebar();
    toast.success(`${title} added to your widget sidebar.`);
  };

  const preview =
    widget === "quick-accomplishment" ? (
      <QuickAccomplishmentSidebarWidget />
    ) : widget === "quick-merge-files" ? (
      <QuickMergeSidebarWidget />
    ) : widget === "quick-billing-unit" ? (
      <QuickBillingUnitSidebarWidget />
    ) : widget === "quick-consolidate-ifr" ? (
      <QuickConsolidateIfrSidebarWidget />
    ) : widget === "quick-ifr-checker" ? (
      <QuickIfrCheckerSidebarWidget />
    ) : (
      <QuickSendMessageSidebarWidget />
    );

  return (
    <div className="mt-8 border-t border-emerald-700/60 pt-6">
      <div className="mb-2 flex items-center gap-2 text-white">
        <span className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/35 bg-white/10 p-1.5">
          <ColumnsIcon className="h-4 w-4" weight="duotone" aria-hidden />
        </span>
        <h3 className="text-base font-medium sm:text-lg">Widget sidebar</h3>
      </div>
      <p className="w-full text-sm font-medium text-white">
        Would you like to add this module to your widget sidebar?
      </p>
      <p className="mt-2 w-full max-w-none text-sm leading-relaxed text-emerald-200/80">
        {intro}
      </p>

      <div className="mt-5 flex w-full max-w-none flex-col gap-3">
        <div className={QUICK_PROMO_PREVIEW_BOX_CLASS}>{preview}</div>

        <p className="w-full max-w-none text-sm leading-relaxed text-emerald-200/80">
          {description}
        </p>
        <p className="w-full max-w-none text-xs leading-relaxed text-emerald-300/70">
          The preview above is the same sidebar card you will get after you add it—same
          fields, layout, and behavior as in the right-hand Widgets column.
        </p>

        <button
          type="button"
          onClick={handleAdd}
          aria-label={addButtonLabel}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          <PlusIcon className="h-4 w-4 shrink-0" weight="bold" aria-hidden />
          {addButtonLabel}
        </button>
      </div>
    </div>
  );
};
