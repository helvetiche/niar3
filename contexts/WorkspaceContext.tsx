"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export const WORKSPACE_TABS = ["calendar", "lipa-summary", "consolidate-ifr", "ifr-scanner", "email-automation"] as const;
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

type WorkspaceContextValue = {
  selectedTab: WorkspaceTab;
  setSelectedTab: (tab: WorkspaceTab) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedTab, setSelectedTab] = useState<WorkspaceTab>("calendar");
  return (
    <WorkspaceContext.Provider value={{ selectedTab, setSelectedTab }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceTab() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceTab must be used within WorkspaceProvider");
  return ctx;
}
