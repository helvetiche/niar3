"use client";

import { useEffect, useRef, useState } from "react";
import { WorkspaceLoadingScreen } from "@/components/WorkspaceLoadingScreen";
import { GenerateProfilesTool } from "@/components/GenerateProfilesTool";
import { GenerateProfilesToolStepped } from "@/components/GenerateProfilesToolStepped";
import { ConsolidateIfrTool } from "@/components/ConsolidateIfrTool";
import { ConsolidateIfrToolStepped } from "@/components/ConsolidateIfrToolStepped";
import { MergeFilesTool } from "@/components/MergeFilesTool";
import { MergeFilesToolStepped } from "@/components/MergeFilesToolStepped";
import { SwrftTool } from "@/components/SwrftTool";
import { SwrftToolStepped } from "@/components/SwrftToolStepped";
import { LipaSummaryTool } from "@/components/LipaSummaryTool";
import { WorkspaceHub } from "@/components/WorkspaceHub";
import { TemplatesTool } from "@/components/TemplatesTool";
import { WorkspaceToolPlaceholder } from "@/components/WorkspaceToolPlaceholder";
import { AccountManagement } from "@/components/AccountManagement";
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
      "Manage shared templates used by IFR Scanner and Consolidate Billing Unit.",
  },
  "lipa-summary": {
    name: "LIPA SUMMARY",
    description: "Generate summary reports for LIPA documents and records.",
  },
  "consolidate-ifr": {
    name: "CONSOLIDATE BILLING UNIT",
    description:
      "Merge and consolidate billing unit documents into a single file.",
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
    name: "IFR SCANNER",
    description: "Scan and extract data from IFR documents automatically.",
  },
  accounts: {
    name: "ACCOUNTS",
    description: "Manage user accounts and permissions in the system.",
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
          {selectedTab === "lipa-summary" ? (
            <LipaSummaryTool />
          ) : selectedTab === "hub" ? (
            <WorkspaceHub />
          ) : selectedTab === "template-manager" ? (
            <TemplatesTool />
          ) : selectedTab === "ifr-scanner" ? (
            <GenerateProfilesToolStepped />
          ) : selectedTab === "consolidate-ifr" ? (
            <ConsolidateIfrToolStepped />
          ) : selectedTab === "merge-files" ? (
            <MergeFilesToolStepped />
          ) : selectedTab === "swrft" ? (
            <SwrftToolStepped />
          ) : selectedTab === "accounts" ? (
            <AccountManagement />
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
