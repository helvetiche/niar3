"use client";

import { WorkspaceLoadingScreen } from "@/components/WorkspaceLoadingScreen";
import { WorkspaceCalendar } from "@/components/WorkspaceCalendar";
import { GenerateProfilesTool } from "@/components/GenerateProfilesTool";
import { ConsolidateIfrTool } from "@/components/ConsolidateIfrTool";
import { WorkspaceToolPlaceholder } from "@/components/WorkspaceToolPlaceholder";
import { useWorkspaceTab } from "@/contexts/WorkspaceContext";

const TOOL_CONTENT: Record<string, { name: string; description: string }> = {
  "lipa-summary": {
    name: "LIPA SUMMARY",
    description: "Generate summary reports for LIPA documents and records.",
  },
  "consolidate-ifr": {
    name: "CONSOLIDATE IFR",
    description: "Merge and consolidate IFR documents into a single file.",
  },
  "ifr-scanner": {
    name: "IFR SCANNER",
    description: "Scan and extract data from IFR documents automatically.",
  },
  "email-automation": {
    name: "EMAIL AUTOMATION",
    description: "Automate email workflows and bulk email tasks.",
  },
};

export default function WorkspacePage() {
  const { selectedTab } = useWorkspaceTab();

  return (
    <>
      <WorkspaceLoadingScreen />
      <main className="flex min-h-0 flex-1 flex-col bg-zinc-50">
        <div className="flex min-h-0 flex-1 flex-col p-4">
          {selectedTab === "calendar" ? (
            <WorkspaceCalendar />
          ) : selectedTab === "ifr-scanner" ? (
            <GenerateProfilesTool />
          ) : selectedTab === "consolidate-ifr" ? (
            <ConsolidateIfrTool />
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
