import { useState, useEffect } from "react";
import type { WorkspaceTab } from "@/contexts/WorkspaceContext";

const TOOL_ORDER_KEY = "workspace_tool_order";

function loadToolOrderFromStorage(defaultOrder: WorkspaceTab[]): WorkspaceTab[] {
  if (typeof window === "undefined") return defaultOrder;

  try {
    const saved = localStorage.getItem(TOOL_ORDER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as WorkspaceTab[];
      // Validate that all tools are still present (in case TOOLS array changed)
      const validTools = parsed.filter((tool) => defaultOrder.includes(tool));
      // Add any new tools that weren't in the saved order
      const newTools = defaultOrder.filter((tool) => !validTools.includes(tool));
      return [...validTools, ...newTools];
    }
  } catch {
    // If parsing fails, use default order
  }
  return defaultOrder;
}

export function useToolOrder(defaultOrder: WorkspaceTab[]) {
  const [toolOrder, setToolOrder] = useState<WorkspaceTab[]>(() => {
    // Initialize from localStorage on mount
    return loadToolOrderFromStorage(defaultOrder);
  });

  // Save to localStorage whenever order changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TOOL_ORDER_KEY, JSON.stringify(toolOrder));
      } catch {
        // Silently fail if localStorage is unavailable
      }
    }
  }, [toolOrder]);

  // Save to localStorage whenever order changes
  const updateToolOrder = (newOrder: WorkspaceTab[]) => {
    setToolOrder(newOrder);
  };

  // Reset to default order
  const resetToolOrder = () => {
    setToolOrder(defaultOrder);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(TOOL_ORDER_KEY);
      } catch {
        // Silently fail if localStorage is unavailable
      }
    }
  };

  return {
    toolOrder,
    updateToolOrder,
    resetToolOrder,
  };
}
