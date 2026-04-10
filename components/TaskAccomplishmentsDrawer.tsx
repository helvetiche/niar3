"use client";

import { useEffect, useState } from "react";
import {
  CalendarBlankIcon,
  ListChecksIcon,
  XIcon,
} from "@phosphor-icons/react";
import { MasonryModal } from "@/components/MasonryModal";
import { TaskManager } from "@/components/TaskManager";
import { WorkspaceCalendar } from "@/components/WorkspaceCalendar";

type TaskAccomplishmentsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

type PanelView = "tasks" | "calendar";

/**
 * Right half-screen panel: task manager and workspace calendar with a view toggle.
 */
export function TaskAccomplishmentsDrawer({
  isOpen,
  onClose,
}: TaskAccomplishmentsDrawerProps) {
  const [view, setView] = useState<PanelView>("tasks");

  useEffect(() => {
    if (!isOpen) {
      setView("tasks");
    }
  }, [isOpen]);

  return (
    <MasonryModal
      isOpen={isOpen}
      onClose={onClose}
      animateFrom="right"
      placement="right"
      blurToFocus
      duration={0.55}
      ease="power3.out"
      panelClassName=""
    >
      {(close) => (
        <div className="flex h-full min-h-0 flex-col bg-emerald-900">
          <div className="flex shrink-0 items-center gap-2 border-b border-emerald-700/60 px-3 py-2.5 sm:gap-3 sm:px-4">
            <div
              className="flex min-w-0 flex-1 rounded-lg border border-emerald-700/60 bg-emerald-950/50 p-0.5"
              role="tablist"
              aria-label="Workspace panel view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === "tasks"}
                tabIndex={0}
                onClick={() => setView("tasks")}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition sm:gap-2 sm:px-3 sm:text-sm ${
                  view === "tasks"
                    ? "bg-emerald-800/80 text-white shadow-sm"
                    : "text-white/65 hover:bg-emerald-900/50 hover:text-white"
                }`}
              >
                <ListChecksIcon
                  className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]"
                  weight="duotone"
                  aria-hidden
                />
                <span className="truncate">Tasks</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "calendar"}
                tabIndex={0}
                onClick={() => setView("calendar")}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition sm:gap-2 sm:px-3 sm:text-sm ${
                  view === "calendar"
                    ? "bg-emerald-800/80 text-white shadow-sm"
                    : "text-white/65 hover:bg-emerald-900/50 hover:text-white"
                }`}
              >
                <CalendarBlankIcon
                  className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]"
                  weight="duotone"
                  aria-hidden
                />
                <span className="truncate">Calendar</span>
              </button>
            </div>
            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-lg border border-emerald-700/50 bg-emerald-950/40 p-2 text-white/85 transition hover:border-emerald-600/60 hover:bg-emerald-900/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45"
              aria-label="Close panel"
            >
              <XIcon className="h-5 w-5" weight="bold" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden" role="tabpanel">
            {view === "tasks" ? (
              <TaskManager variant="drawer" />
            ) : (
              <WorkspaceCalendar variant="drawer" />
            )}
          </div>
        </div>
      )}
    </MasonryModal>
  );
}
