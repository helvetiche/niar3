"use client";

import { useMemo, useState } from "react";
import {
  ArrowsMergeIcon,
  CheckCircleIcon,
  DatabaseIcon,
  GearIcon,
  FilePdfIcon,
  FileTextIcon,
  FilesIcon,
  FunnelSimpleIcon,
  HouseIcon,
  LightningIcon,
  LinkSimpleIcon,
  MicrosoftExcelLogoIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  ScanIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  SparkleIcon,
  SquaresFourIcon,
  StackIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import {
  useWorkspaceTab,
  type WorkspaceTab,
} from "@/contexts/WorkspaceContext";

type HubTag = {
  id: string;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    weight?: "duotone";
  }>;
};

type HubTool = {
  id: WorkspaceTab;
  name: string;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    weight?: "duotone";
  }>;
  tags: HubTag[];
};

const HUB_TOOLS: HubTool[] = [
  {
    id: "template-manager",
    name: "TEMPLATE MANAGER",
    description:
      "Create, view, rename, replace, and delete shared templates used by all authenticated users across workspace tools.",
    icon: GearIcon,
    tags: [
      { id: "shared", label: "Shared Access", icon: LinkSimpleIcon },
      { id: "update", label: "Update Templates", icon: CheckCircleIcon },
      { id: "manage", label: "Template Control", icon: SquaresFourIcon },
    ],
  },
  {
    id: "ifr-scanner",
    name: "IFR SCANNER",
    description:
      "Scan IFR documents automatically, extract relevant data fields accurately, minimize encoding mistakes, and speed up reporting tasks for operations teams.",
    icon: MagnifyingGlassIcon,
    tags: [
      { id: "fast-scan", label: "Fast Scan", icon: ScanIcon },
      { id: "field-extract", label: "Field Extraction", icon: DatabaseIcon },
      { id: "error-check", label: "Error Check", icon: WarningCircleIcon },
    ],
  },
  {
    id: "consolidate-ifr",
    name: "CONSOLIDATE BILLING UNIT",
    description:
      "Combine multiple billing unit documents into one consistent file, preserve essential information, remove duplication, and simplify verification across records quickly.",
    icon: StackIcon,
    tags: [
      { id: "combine", label: "Combine", icon: FilesIcon },
      { id: "clean", label: "Clean Structure", icon: FunnelSimpleIcon },
      { id: "linked", label: "Linked Records", icon: LinkSimpleIcon },
    ],
  },
  {
    id: "lipa-summary",
    name: "LIPA SUMMARY",
    description:
      "Generate concise summaries from LIPA files, highlight key details, organize outputs clearly, and reduce manual review time for teams daily.",
    icon: FileTextIcon,
    tags: [
      { id: "accurate", label: "Accurate", icon: CheckCircleIcon },
      { id: "verified", label: "Verified Data", icon: ShieldCheckIcon },
      { id: "quick", label: "Quick Turnaround", icon: SparkleIcon },
    ],
  },
  {
    id: "merge-files",
    name: "MERGE FILES",
    description:
      "Merge PDF and Excel files in correct order, maintain structure integrity, and produce one finalized package ready for submission workflows.",
    icon: ArrowsMergeIcon,
    tags: [
      { id: "ordered-pages", label: "Ordered Pages", icon: ScissorsIcon },
      { id: "pdf-merge", label: "PDF Merge", icon: FilePdfIcon },
      { id: "excel-merge", label: "Excel Merge", icon: MicrosoftExcelLogoIcon },
    ],
  },
  {
    id: "swrft",
    name: "SWRFT",
    description:
      "Generate quincena accomplishment reports for the year. Creates 24 period sheets, detects weekends, and merges into one workbook.",
    icon: FileTextIcon,
    tags: [
      { id: "accomplishment", label: "Accomplishment", icon: CheckCircleIcon },
      { id: "quincena", label: "Quincena Report", icon: FileTextIcon },
      { id: "auto-merge", label: "Auto Merge", icon: ArrowsMergeIcon },
    ],
  },
];

export function WorkspaceHub() {
  const { setSelectedTab } = useWorkspaceTab();
  const [search, setSearch] = useState("");

  const handleSelectTool = (toolId: WorkspaceTab) => {
    if (toolId === "hub") return;
    setSelectedTab(toolId);
  };

  const filteredTools = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return HUB_TOOLS;
    return HUB_TOOLS.filter((tool) => {
      const inName = tool.name.toLowerCase().includes(keyword);
      const inDescription = tool.description.toLowerCase().includes(keyword);
      const inTags = tool.tags.some((tag) =>
        tag.label.toLowerCase().includes(keyword),
      );
      return inName || inDescription || inTags;
    });
  }, [search]);

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <header className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white sm:text-2xl">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <HouseIcon size={20} className="text-white" />
          </span>
          What would you like to do?
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <SquaresFourIcon size={12} className="text-white" />
            Workspace Hub
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <RocketLaunchIcon size={12} className="text-white" />
            Tool Launcher
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <LightningIcon size={12} className="text-white" />
            Quick Actions
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-white/85">
          Choose a tool to start your workflow. Each option takes you directly
          to the feature page with all controls ready so you can upload files,
          configure inputs, and generate outputs faster.
        </p>
        <div className="mt-4 w-full max-w-md">
          <label
            htmlFor="workspace-hub-search"
            className="flex items-center gap-2 rounded-lg border border-white/50 bg-white/15 px-3 py-2 backdrop-blur-sm"
          >
            <MagnifyingGlassIcon
              size={16}
              weight="duotone"
              className="text-white"
            />
            <input
              id="workspace-hub-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tools..."
              aria-label="Search tools"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/70 focus:outline-none"
            />
          </label>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleSelectTool(tool.id)}
              className="group w-full rounded-xl border border-emerald-700/70 bg-emerald-900/60 p-4 text-left backdrop-blur-sm transition hover:border-white/55 hover:bg-emerald-900/70 sm:p-5"
              aria-label={`Open ${tool.name}`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-800/50 p-2.5">
                  <Icon size={22} weight="duotone" className="text-white" />
                </div>
                <h3 className="text-sm font-semibold tracking-wide text-white sm:text-base">
                  {tool.name}
                </h3>
              </div>
              <p className="mt-3 text-justify text-xs leading-relaxed text-white sm:text-sm">
                {tool.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tool.tags.map((tag) => {
                  const TagIcon = tag.icon;
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm group-hover:bg-white/30"
                    >
                      <TagIcon
                        size={13}
                        weight="duotone"
                        className="shrink-0"
                      />
                      {tag.label}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
        {filteredTools.length === 0 && (
          <div className="col-span-full rounded-xl border border-white/35 bg-white/10 p-4 text-sm text-white/85 backdrop-blur-sm">
            No tools matched your search.
          </div>
        )}
      </div>
    </section>
  );
}
