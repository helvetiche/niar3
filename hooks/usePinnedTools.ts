import { useState, useEffect, useRef } from "react";
import { WORKSPACE_TABS, type WorkspaceTab } from "@/contexts/WorkspaceContext";

const PINNED_TOOLS_KEY = "workspace_pinned_tools";

function loadPinnedToolsFromStorage(): WorkspaceTab[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(PINNED_TOOLS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as unknown;
      if (!Array.isArray(parsed)) return [];
      const allowed = new Set<string>(WORKSPACE_TABS);
      return parsed
        .map((id) =>
          typeof id === "string" && id === "swrft" ? "accomplishment-report" : id
        )
        .filter((id): id is WorkspaceTab => typeof id === "string" && allowed.has(id));
    }
  } catch {
    // If parsing fails, return empty array
  }
  return [];
}

export function usePinnedTools() {
  const [pinnedTools, setPinnedTools] = useState<WorkspaceTab[]>([]);
  const skipNextPersist = useRef(true);

  useEffect(() => {
    setPinnedTools(loadPinnedToolsFromStorage());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(PINNED_TOOLS_KEY, JSON.stringify(pinnedTools));
    } catch {
      /* ignore */
    }
  }, [pinnedTools]);

  // Toggle pin status for a tool
  const togglePin = (toolId: WorkspaceTab) => {
    setPinnedTools((current) => {
      const newPinned = current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId];

      return newPinned;
    });
  };

  // Check if a tool is pinned
  const isPinned = (toolId: WorkspaceTab) => pinnedTools.includes(toolId);

  return {
    pinnedTools,
    togglePin,
    isPinned,
  };
}
