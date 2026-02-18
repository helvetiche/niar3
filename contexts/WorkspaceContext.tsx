"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthUser } from "@/types/auth";

export const WORKSPACE_TABS = [
  "lipa-summary",
  "consolidate-ifr",
  "merge-files",
  "ifr-scanner",
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
  const [selectedTab, setSelectedTab] = useState<WorkspaceTab>("ifr-scanner");
  return (
    <WorkspaceContext.Provider value={{ user, selectedTab, setSelectedTab }}>
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
