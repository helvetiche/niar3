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

export interface Widget {
  id: string;
  type: "schedule";
  scheduleType?: ScheduleWidgetType;
}

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

function loadWidgets(): Widget[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(WIDGETS_KEY);
    return saved ? JSON.parse(saved) : [];
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
      const next = [...prev, widget];
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
