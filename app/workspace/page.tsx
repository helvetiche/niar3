"use client";

import { useEffect, useRef, useState } from "react";
import { WorkspaceLoadingScreen } from "@/components/WorkspaceLoadingScreen";
import { GenerateProfilesToolStepped } from "@/components/GenerateProfilesToolStepped";
import { MergeFilesToolStepped } from "@/components/MergeFilesToolStepped";
import { SwrftToolStepped } from "@/components/SwrftToolStepped";
import { LipaSummaryToolStepped } from "@/components/LipaSummaryToolStepped";
import { WorkspaceHub } from "@/components/WorkspaceHub";
import { TemplatesTool } from "@/components/TemplatesTool";
import { WorkspaceToolPlaceholder } from "@/components/WorkspaceToolPlaceholder";
import { AccountManagement } from "@/components/AccountManagement";
import ConsolidateLandProfilesTool from "@/components/ConsolidateLandProfilesTool";
import IFRCheckerTool from "@/components/IFRCheckerTool";
import { Inventory } from "@/components/Inventory/Inventory";
import { WorkspaceCalendar } from "@/components/WorkspaceCalendar";
import { Schedules } from "@/components/Schedules";
import { PermissionGuard } from "@/components/PermissionGuard";
import {
  useWorkspaceTab,
  type WorkspaceTab,
} from "@/contexts/WorkspaceContext";

const TOOL_CONTENT: Record<string, { name: string; description: string }> = {
  hub: {
    name: "HUB",
    description:
      "Central workspace hub for quick access to all productivity tools.",
  },
  "template-manager": {
    name: "TEMPLATE MANAGER",
    description:
      "Manage shared templates used by Generate Billing Unit and Accomplishment Report.",
  },
  "lipa-summary": {
    name: "LIPA SUMMARY",
    description: "Generate summary reports for LIPA documents and records.",
  },
  "merge-files": {
    name: "MERGE FILES",
    description:
      "Merge PDF files with page ordering and combine Excel files into one workbook.",
  },
  swrft: {
    name: "ACCOMPLISHMENT REPORT",
    description: "Generate quincena accomplishment reports.",
  },
  "ifr-scanner": {
    name: "GENERATE BILLING UNIT",
    description: "Scan and extract data from IFR documents automatically.",
  },
  accounts: {
    name: "ACCOUNTS",
    description: "Manage user accounts and permissions in the system.",
  },
  "consolidate-land-profiles": {
    name: "CONSOLIDATE LAND PROFILES",
    description:
      "Consolidate multiple land profile Excel files into a single template.",
  },
  "ifr-checker": {
    name: "IFR CHECKER",
    description:
      "Validate consolidated files against source IFR data and identify discrepancies.",
  },
  inventory: {
    name: "INVENTORY",
    description: "Track and manage inventory items with quarterly data.",
  },
  calendar: {
    name: "CALENDAR",
    description: "Manage your schedule with color-coded calendar notes and deadlines.",
  },
  schedules: {
    name: "SCHEDULES",
    description: "Email schedules with automatic reminders and deadline tracking.",
  },
};

export default function WorkspacePage() {
  const { selectedTab } = useWorkspaceTab();
  const previousTabRef = useRef<WorkspaceTab | null>(null);
  const [isLoadingVisible, setIsLoadingVisible] = useState(true);
  const [loadingDurationMs, setLoadingDurationMs] = useState(2000);
  const [loadingInstanceKey, setLoadingInstanceKey] = useState(0);

  useEffect(() => {
    if (previousTabRef.current === null) {
      previousTabRef.current = selectedTab;
      return;
    }

    if (previousTabRef.current === selectedTab) return;
    previousTabRef.current = selectedTab;

    const timeoutId = setTimeout(() => {
      setLoadingDurationMs(250);
      setLoadingInstanceKey((prev) => prev + 1);
      setIsLoadingVisible(true);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [selectedTab]);

  return (
    <>
      {isLoadingVisible && (
        <WorkspaceLoadingScreen
          key={loadingInstanceKey}
          durationMs={loadingDurationMs}
          onComplete={() => setIsLoadingVisible(false)}
        />
      )}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-emerald-950">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2 sm:p-3 md:p-4">
          {selectedTab === "hub" ? (
            <WorkspaceHub />
          ) : selectedTab === "lipa-summary" ? (
            <PermissionGuard toolId="lipa-summary">
              <LipaSummaryToolStepped />
            </PermissionGuard>
          ) : selectedTab === "template-manager" ? (
            <PermissionGuard toolId="template-manager">
              <TemplatesTool />
            </PermissionGuard>
          ) : selectedTab === "ifr-scanner" ? (
            <PermissionGuard toolId="ifr-scanner">
              <GenerateProfilesToolStepped />
            </PermissionGuard>
          ) : selectedTab === "merge-files" ? (
            <PermissionGuard toolId="merge-files">
              <MergeFilesToolStepped />
            </PermissionGuard>
          ) : selectedTab === "swrft" ? (
            <PermissionGuard toolId="swrft">
              <SwrftToolStepped />
            </PermissionGuard>
          ) : selectedTab === "accounts" ? (
            <PermissionGuard toolId="accounts">
              <AccountManagement />
            </PermissionGuard>
          ) : selectedTab === "consolidate-land-profiles" ? (
            <PermissionGuard toolId="consolidate-land-profiles">
              <ConsolidateLandProfilesTool />
            </PermissionGuard>
          ) : selectedTab === "ifr-checker" ? (
            <PermissionGuard toolId="ifr-checker">
              <IFRCheckerTool />
            </PermissionGuard>
          ) : selectedTab === "inventory" ? (
            <PermissionGuard toolId="inventory">
              <Inventory />
            </PermissionGuard>
          ) : selectedTab === "calendar" ? (
            <PermissionGuard toolId="calendar">
              <WorkspaceCalendar />
            </PermissionGuard>
          ) : selectedTab === "schedules" ? (
            <PermissionGuard toolId="schedules">
              <Schedules />
            </PermissionGuard>
          ) : (
            TOOL_CONTENT[selectedTab] && (
              <WorkspaceToolPlaceholder
                name={TOOL_CONTENT[selectedTab].name}
                description={TOOL_CONTENT[selectedTab].description}
              />
            )
          )}
        </div>
      </main>
    </>
  );
}
