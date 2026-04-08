"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/types/auth";

export const WORKSPACE_TABS = [
  "hub",
  "template-manager",
  "lipa-summary",
  "merge-files",
  "swrft",
  "ifr-scanner",
  "accounts",
  "consolidate-land-profiles",
  "ifr-checker",
  "inventory",
  "calendar",
  "schedules",
  "task-manager",
] as const;
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

type WorkspaceContextValue = {
  user: AuthUser;
  selectedTab: WorkspaceTab;
  setSelectedTab: (tab: WorkspaceTab) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const [selectedTab, setSelectedTab] = useState<WorkspaceTab>("hub");
  
  const handleSetSelectedTab = useCallback((tab: WorkspaceTab) => {
    setSelectedTab((current) => {
      if (tab === current) return current;
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return tab;
    });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ user, selectedTab, setSelectedTab: handleSetSelectedTab }),
    [user, selectedTab, handleSetSelectedTab]
  );

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceTab() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspaceTab must be used within WorkspaceProvider");
  return ctx;
}

export function useWorkspaceUser() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspaceUser must be used within WorkspaceProvider");
  return ctx.user;
}

export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  return ctx;
}
