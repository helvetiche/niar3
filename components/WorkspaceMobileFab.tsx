"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CalendarCheckIcon,
  ListChecksIcon,
  SparkleIcon,
  XIcon,
  ArrowsInLineVerticalIcon,
} from "@phosphor-icons/react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  animate,
  useDragControls,
  useMotionValue,
} from "motion/react";
import { useWidgetSidebar } from "@/contexts/WidgetSidebarContext";

const FAB_MINIMIZED_KEY = "workspace_mobile_fab_minimized";
const FAB_CORNER_KEY = "workspace_mobile_fab_corner";

type FabCorner = "tl" | "tr" | "bl" | "br";

const FAB_CORNERS: readonly FabCorner[] = ["tl", "tr", "bl", "br"];

const isFabCorner = (value: string): value is FabCorner =>
  (FAB_CORNERS as readonly string[]).includes(value);

const SNAP_MARGIN_PX = 28;

const getNearestCorner = (rect: DOMRect): FabCorner => {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const w = rect.width;
  const h = rect.height;
  const m = SNAP_MARGIN_PX;

  const targets: Record<FabCorner, { x: number; y: number }> = {
    tl: { x: m + w / 2, y: m + h / 2 },
    tr: { x: vw - m - w / 2, y: m + h / 2 },
    bl: { x: m + w / 2, y: vh - m - h / 2 },
    br: { x: vw - m - w / 2, y: vh - m - h / 2 },
  };

  let best: FabCorner = "br";
  let bestDist = Infinity;
  for (const c of FAB_CORNERS) {
    const t = targets[c];
    const d = (cx - t.x) ** 2 + (cy - t.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
};

const FAB_CORNER_POSITION: Record<FabCorner, string> = {
  br: "bottom-0 right-0 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-4 pt-2",
  bl: "bottom-0 left-0 pl-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,env(safe-area-inset-bottom))] pr-4 pt-2",
  tr: "top-0 right-0 pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] pl-4 pb-2",
  tl: "top-0 left-0 pl-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] pr-4 pb-2",
};

const FAB_CORNER_MENU_ORIGIN: Record<FabCorner, string> = {
  tl: "top left",
  tr: "top right",
  bl: "bottom left",
  br: "bottom right",
};

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
  const [corner, setCorner] = useState<FabCorner>("br");
  const reduceMotion = useReducedMotion();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setFabMinimized(localStorage.getItem(FAB_MINIMIZED_KEY) === "1");
      } catch {
        /* ignore */
      }
      try {
        const raw = localStorage.getItem(FAB_CORNER_KEY);
        if (raw && isFabCorner(raw)) {
          setCorner(raw);
        }
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

  const persistCorner = useCallback((next: FabCorner) => {
    try {
      localStorage.setItem(FAB_CORNER_KEY, next);
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

  const handleDragEnd = useCallback(() => {
    const el = dragRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = getNearestCorner(rect);
    const snapTransition = reduceMotion
      ? { duration: 0 }
      : { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.68 };

    setCorner((prev) => {
      if (next === prev) {
        void animate(dragX, 0, snapTransition);
        void animate(dragY, 0, snapTransition);
        return prev;
      }
      dragX.set(0);
      dragY.set(0);
      persistCorner(next);
      return next;
    });
  }, [dragX, dragY, persistCorner, reduceMotion]);

  const handleFabPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      dragControls.start(e);
    },
    [dragControls]
  );

  const fabDiameter = fabMinimized
    ? "h-11 w-11 min-h-[2.75rem] min-w-[2.75rem]"
    : "h-14 w-14 min-h-[3.5rem] min-w-[3.5rem]";
  const iconSize = fabMinimized ? "h-5 w-5" : "h-7 w-7";

  const fadeTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

  const popoverTransition = reduceMotion ? { duration: 0 } : popoverSpring;

  const isTopCorner = corner === "tl" || corner === "tr";
  const isRightCorner = corner === "tr" || corner === "br";

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] lg:hidden">
      <div ref={constraintsRef} className="absolute inset-0" aria-hidden />

      <AnimatePresence>
        {menuOpen ? (
          <motion.button
            key="fab-backdrop"
            type="button"
            aria-label="Close shortcuts menu"
            className="pointer-events-auto fixed inset-0 z-[55] bg-emerald-950/45 backdrop-blur-[1px]"
            onClick={() => setMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
          />
        ) : null}
      </AnimatePresence>

      <div
        className={`pointer-events-auto fixed z-[60] max-w-full min-w-0 lg:hidden ${FAB_CORNER_POSITION[corner]}`}
      >
        <motion.div
          ref={dragRef}
          style={{ x: dragX, y: dragY }}
          drag
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={constraintsRef}
          dragMomentum={false}
          dragElastic={0}
          onDragEnd={handleDragEnd}
          className={`flex max-w-full min-w-0 cursor-grab touch-none gap-2 active:cursor-grabbing ${isTopCorner ? "flex-col-reverse" : "flex-col"} ${isRightCorner ? "items-end" : "items-start"}`}
        >
          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                key="fab-menu-column"
                className={`pointer-events-auto flex w-full max-w-full min-w-0 flex-col gap-2 ${isRightCorner ? "items-end" : "items-start"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fadeTransition}
              >
                <motion.div
                  key="fab-menu-panel"
                  className="flex w-[min(18rem,calc(100vw-2rem))] max-w-full flex-col gap-1.5 rounded-2xl border border-emerald-600/50 bg-emerald-900/98 p-2 shadow-xl shadow-emerald-950/40 ring-1 ring-white/10"
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
                  style={{ transformOrigin: FAB_CORNER_MENU_ORIGIN[corner] }}
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

          <div className="pointer-events-auto flex flex-col items-stretch gap-2">
            <button
              type="button"
              onClick={handleToggleMain}
              onPointerDown={handleFabPointerDown}
              className={`flex items-center justify-center rounded-full border border-emerald-600/55 bg-emerald-800 text-white shadow-lg shadow-emerald-950/30 transition hover:border-emerald-500/50 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950 ${fabDiameter}`}
              aria-label={
                menuOpen
                  ? "Close shortcuts menu"
                  : "Open shortcuts: widgets and tasks. Drag from this button to move shortcuts to another corner."
              }
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <SparkleIcon className={iconSize} weight="duotone" aria-hidden />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
