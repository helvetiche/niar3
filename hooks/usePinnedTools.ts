import { useState, useEffect } from "react";
import type { WorkspaceTab } from "@/contexts/WorkspaceContext";

const PINNED_TOOLS_KEY = "workspace_pinned_tools";

function loadPinnedToolsFromStorage(): WorkspaceTab[] {
  if (typeof window === "undefined") return [];
  
  try {
    const saved = localStorage.getItem(PINNED_TOOLS_KEY);
    if (saved) {
      return JSON.parse(saved) as WorkspaceTab[];
    }
  } catch {
    // If parsing fails, return empty array
  }
  return [];
}

export function usePinnedTools() {
  const [pinnedTools, setPinnedTools] = useState<WorkspaceTab[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (!isInitialized) {
      const saved = loadPinnedToolsFromStorage();
      setPinnedTools(saved);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Toggle pin status for a tool
  const togglePin = (toolId: WorkspaceTab) => {
    setPinnedTools((current) => {
      const newPinned = current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId];
      
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(PINNED_TOOLS_KEY, JSON.stringify(newPinned));
        } catch {
          // Silently fail if localStorage is unavailable
        }
      }
      
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
