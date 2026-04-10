"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type ScheduleWidgetType = 
  | "nearest-deadline"
  | "tasks-this-week"
  | "tasks-this-month";

export type ScheduleWidget = {
  id: string;
  type: "schedule";
  scheduleType: ScheduleWidgetType;
};

export type PriorityWidget = {
  id: string;
  type: "priority";
  scheduleId: string;
};

export type QuickAccomplishmentWidget = {
  id: string;
  type: "quick-accomplishment";
};

export type Widget =
  | ScheduleWidget
  | PriorityWidget
  | QuickAccomplishmentWidget;

type WidgetSidebarContextValue = {
  isOpen: boolean;
  widgets: Widget[];
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  addWidget: (widget: Widget) => void;
  removeWidget: (id: string) => void;
};

const WidgetSidebarContext = createContext<WidgetSidebarContextValue | null>(null);

const WIDGET_SIDEBAR_KEY = "widget_sidebar_open";
const WIDGETS_KEY = "widget_sidebar_widgets";

function loadSidebarState(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem(WIDGET_SIDEBAR_KEY);
    return saved === null ? true : saved === "1";
  } catch {
    return true;
  }
}

function saveSidebarState(isOpen: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WIDGET_SIDEBAR_KEY, isOpen ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function parseStoredWidgets(raw: string): Widget[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: Widget[] = [];
    let priorityKept = false;
    let quickAccomplishmentKept = false;
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      if (rec.type === "quick-accomplishment" && typeof rec.id === "string") {
        if (quickAccomplishmentKept) continue;
        quickAccomplishmentKept = true;
        out.push({ id: rec.id, type: "quick-accomplishment" });
        continue;
      }
      if (rec.type === "priority" && typeof rec.id === "string" && typeof rec.scheduleId === "string") {
        if (priorityKept) continue;
        priorityKept = true;
        out.push({ id: rec.id, type: "priority", scheduleId: rec.scheduleId });
        continue;
      }
      if (rec.type === "schedule" && typeof rec.id === "string") {
        const st = rec.scheduleType;
        if (
          st === "nearest-deadline" ||
          st === "tasks-this-week" ||
          st === "tasks-this-month"
        ) {
          out.push({ id: rec.id, type: "schedule", scheduleType: st });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

function loadWidgets(): Widget[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(WIDGETS_KEY);
    return saved ? parseStoredWidgets(saved) : [];
  } catch {
    return [];
  }
}

function saveWidgets(widgets: Widget[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(widgets));
  } catch {
    /* ignore */
  }
}

export function WidgetSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(loadSidebarState);
  const [widgets, setWidgets] = useState<Widget[]>(loadWidgets);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      saveSidebarState(next);
      return next;
    });
  }, []);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
    saveSidebarState(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
    saveSidebarState(false);
  }, []);

  const addWidget = useCallback((widget: Widget) => {
    setWidgets((prev) => {
      let next: Widget[];
      if (widget.type === "priority") {
        next = [...prev.filter((w) => w.type !== "priority"), widget];
      } else if (widget.type === "quick-accomplishment") {
        next = [
          ...prev.filter((w) => w.type !== "quick-accomplishment"),
          widget,
        ];
      } else {
        next = [...prev, widget];
      }
      saveWidgets(next);
      return next;
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveWidgets(next);
      return next;
    });
  }, []);

  const contextValue = useMemo(
    () => ({ 
      isOpen, 
      widgets,
      toggleSidebar, 
      openSidebar, 
      closeSidebar,
      addWidget,
      removeWidget,
    }),
    [isOpen, widgets, toggleSidebar, openSidebar, closeSidebar, addWidget, removeWidget]
  );

  return (
    <WidgetSidebarContext.Provider value={contextValue}>
      {children}
    </WidgetSidebarContext.Provider>
  );
}

export function useWidgetSidebar() {
  const ctx = useContext(WidgetSidebarContext);
  if (!ctx) {
    throw new Error("useWidgetSidebar must be used within WidgetSidebarProvider");
  }
  return ctx;
}
