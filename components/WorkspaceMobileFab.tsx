"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheckIcon,
  ListChecksIcon,
  SparkleIcon,
  XIcon,
  ArrowsInLineVerticalIcon,
} from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useWidgetSidebar } from "@/contexts/WidgetSidebarContext";

const FAB_MINIMIZED_KEY = "workspace_mobile_fab_minimized";

const popoverSpring = {
  type: "spring" as const,
  damping: 26,
  stiffness: 380,
  mass: 0.72,
};

export function WorkspaceMobileFab() {
  const { openSidebar, closeSidebar, openTaskDrawer, closeTaskDrawer } =
    useWidgetSidebar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [fabMinimized, setFabMinimized] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setFabMinimized(localStorage.getItem(FAB_MINIMIZED_KEY) === "1");
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const persistMinimized = useCallback((next: boolean) => {
    setFabMinimized(next);
    try {
      localStorage.setItem(FAB_MINIMIZED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const handleOpenWidgets = useCallback(() => {
    closeTaskDrawer();
    openSidebar();
    setMenuOpen(false);
  }, [closeTaskDrawer, openSidebar]);

  const handleOpenTasks = useCallback(() => {
    closeSidebar();
    openTaskDrawer();
    setMenuOpen(false);
  }, [closeSidebar, openTaskDrawer]);

  const handleToggleMain = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const handleMinimizeFab = useCallback(() => {
    setMenuOpen(false);
    persistMinimized(true);
  }, [persistMinimized]);

  const handleUseLargerFab = useCallback(() => {
    persistMinimized(false);
  }, [persistMinimized]);

  const fabDiameter = fabMinimized
    ? "h-11 w-11 min-h-[2.75rem] min-w-[2.75rem]"
    : "h-14 w-14 min-h-[3.5rem] min-w-[3.5rem]";
  const iconSize = fabMinimized ? "h-5 w-5" : "h-7 w-7";

  const fadeTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

  const popoverTransition = reduceMotion ? { duration: 0 } : popoverSpring;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] lg:hidden">
      <AnimatePresence>
        {menuOpen ? (
          <motion.button
            key="fab-backdrop"
            type="button"
            aria-label="Close shortcuts menu"
            className="fixed inset-0 z-[55] bg-emerald-950/45 backdrop-blur-[1px]"
            onClick={() => setMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
          />
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none relative z-[60] flex flex-col items-end pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-4 pt-2">
        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              key="fab-menu-column"
              className="pointer-events-auto mb-2 flex w-full flex-col items-end gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeTransition}
            >
              <motion.div
                key="fab-menu-panel"
                className="flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-1.5 rounded-2xl border border-emerald-600/50 bg-emerald-900/98 p-2 shadow-xl shadow-emerald-950/40 ring-1 ring-white/10"
                role="menu"
                aria-label="Workspace shortcuts"
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }
                }
                transition={popoverTransition}
                style={{ transformOrigin: "bottom right" }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleOpenWidgets}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-white transition hover:bg-emerald-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10">
                    <CalendarCheckIcon
                      className="h-5 w-5 text-emerald-100"
                      weight="duotone"
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Widgets</span>
                    <span className="mt-0.5 block text-xs font-normal text-emerald-200/70">
                      Sidebar tools and quick actions
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleOpenTasks}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-white transition hover:bg-emerald-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10">
                    <ListChecksIcon
                      className="h-5 w-5 text-emerald-100"
                      weight="duotone"
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Tasks &amp; calendar</span>
                    <span className="mt-0.5 block text-xs font-normal text-emerald-200/70">
                      Task manager and workspace calendar
                    </span>
                  </span>
                </button>
                <div className="my-1 h-px bg-emerald-700/60" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleMinimizeFab}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-emerald-200/85 transition hover:bg-emerald-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                >
                  <ArrowsInLineVerticalIcon
                    className="h-4 w-4 shrink-0 text-emerald-300/90"
                    weight="bold"
                    aria-hidden
                  />
                  Shrink shortcut button
                </button>
                {fabMinimized ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleUseLargerFab}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-emerald-200/85 transition hover:bg-emerald-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                  >
                    Use larger shortcut button
                  </button>
                ) : null}
              </motion.div>

              <motion.button
                key="fab-close-x"
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-600/50 bg-emerald-900/95 text-white shadow-md transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                aria-label="Close menu"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88 }}
                transition={popoverTransition}
              >
                <XIcon className="h-5 w-5" weight="bold" aria-hidden />
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleToggleMain}
            className={`flex items-center justify-center rounded-full border border-emerald-600/55 bg-emerald-800 text-white shadow-lg shadow-emerald-950/30 transition hover:border-emerald-500/50 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950 ${fabDiameter}`}
            aria-label={
              menuOpen ? "Close shortcuts menu" : "Open shortcuts: widgets and tasks"
            }
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <SparkleIcon className={iconSize} weight="duotone" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
