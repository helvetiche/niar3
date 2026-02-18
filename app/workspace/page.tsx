"use client";

import { WorkspaceLoadingScreen } from "@/components/WorkspaceLoadingScreen";
import { GenerateProfilesTool } from "@/components/GenerateProfilesTool";
import { ConsolidateIfrTool } from "@/components/ConsolidateIfrTool";
import { MergeFilesTool } from "@/components/MergeFilesTool";
import { LipaSummaryTool } from "@/components/LipaSummaryTool";
import { WorkspaceToolPlaceholder } from "@/components/WorkspaceToolPlaceholder";
import { useWorkspaceTab } from "@/contexts/WorkspaceContext";

const TOOL_CONTENT: Record<string, { name: string; description: string }> = {
  "lipa-summary": {
    name: "LIPA SUMMARY",
    description: "Generate summary reports for LIPA documents and records.",
  },
  "consolidate-ifr": {
    name: "CONSOLIDATE LAND PROFILE",
    description: "Merge and consolidate land profile documents into a single file.",
  },
  "merge-files": {
    name: "MERGE FILES",
    description:
      "Merge PDF files with page ordering and combine Excel files into one workbook.",
  },
  "ifr-scanner": {
    name: "IFR SCANNER",
    description: "Scan and extract data from IFR documents automatically.",
  },
};

export default function WorkspacePage() {
  const { selectedTab } = useWorkspaceTab();

  return (
    <>
      <WorkspaceLoadingScreen />
      <main className="flex min-h-0 flex-1 flex-col bg-zinc-50">
        <div className="flex min-h-0 flex-1 flex-col p-4">
          {selectedTab === "lipa-summary" ? (
            <LipaSummaryTool />
          ) : selectedTab === "ifr-scanner" ? (
            <GenerateProfilesTool />
          ) : selectedTab === "consolidate-ifr" ? (
            <ConsolidateIfrTool />
          ) : selectedTab === "merge-files" ? (
            <MergeFilesTool />
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
