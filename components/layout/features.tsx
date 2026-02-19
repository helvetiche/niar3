"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import {
  FileTextIcon,
  StackIcon,
  ArrowsMergeIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
  LightningIcon,
  ArrowsClockwiseIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  ClockClockwiseIcon,
  ShieldCheckIcon,
  FilesIcon,
  FunnelSimpleIcon,
  LinkSimpleIcon,
  ScissorsIcon,
  FilePdfIcon,
  MicrosoftExcelLogoIcon,
  ScanIcon,
  DatabaseIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

type FeatureTag = {
  id: string;
  label: string;
  icon: ComponentType<{
    size?: number;
    weight?: "duotone";
    className?: string;
  }>;
};

const FEATURES = [
  {
    id: "lipa-summary",
    title: "LIPA SUMMARY",
    description:
      "Generate concise summaries from LIPA files, highlight key details, organize outputs clearly, and reduce manual review time for teams daily.",
    icon: FileTextIcon,
    tags: [
      { id: "accurate", label: "Accurate", icon: CheckCircleIcon },
      { id: "quick", label: "Quick Turnaround", icon: ClockClockwiseIcon },
      { id: "verified", label: "Verified Data", icon: ShieldCheckIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "consolidate-billing-unit",
    title: "CONSOLIDATE BILLING UNIT",
    description:
      "Combine multiple billing unit documents into one consistent file, preserve essential information, remove duplication, and simplify verification across records quickly.",
    icon: StackIcon,
    tags: [
      { id: "batch", label: "Combine", icon: FilesIcon },
      { id: "clean", label: "Clean Structure", icon: FunnelSimpleIcon },
      { id: "connected", label: "Linked Records", icon: LinkSimpleIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "merge-files",
    title: "MERGE FILES",
    description:
      "Merge PDF and Excel files in correct order, maintain structure integrity, and produce one finalized package ready for submission workflows.",
    icon: ArrowsMergeIcon,
    tags: [
      { id: "ordered", label: "Ordered Pages", icon: ScissorsIcon },
      { id: "pdf", label: "PDF Merge", icon: FilePdfIcon },
      { id: "excel", label: "Excel Merge", icon: MicrosoftExcelLogoIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "ifr-scanner",
    title: "IFR SCANNER",
    description:
      "Scan IFR documents automatically, extract relevant data fields accurately, minimize encoding mistakes, and speed up reporting tasks for operations teams.",
    icon: MagnifyingGlassIcon,
    tags: [
      { id: "scan", label: "Fast Scan", icon: ScanIcon },
      { id: "extract", label: "Field Extraction", icon: DatabaseIcon },
      { id: "quality", label: "Error Check", icon: WarningCircleIcon },
    ] satisfies FeatureTag[],
  },
] as const;

export function Features() {
  const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});

  const handleToggleTag = (featureId: string, tagId: string) => {
    const key = `${featureId}:${tagId}`;
    setSelectedTags((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <section
      className="w-screen bg-[#004e3b] px-4 py-14 md:px-8 md:py-16"
      aria-labelledby="features-heading"
      style={{ fontFamily: "var(--font-jetbrains-mono)" }}
    >
      <div className="w-full">
        <div className="flex items-center gap-2">
          <SparkleIcon size={26} weight="duotone" className="text-white" />
          <h2
            id="features-heading"
            className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Features
          </h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm">
            <LightningIcon size={16} weight="duotone" className="shrink-0" />
            Speed
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm">
            <ArrowsClockwiseIcon
              size={16}
              weight="duotone"
              className="shrink-0"
            />
            Consistency
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm">
            <ChartLineUpIcon size={16} weight="duotone" className="shrink-0" />
            Efficiency
          </span>
        </div>
        <p className="mt-2 w-full text-justify text-sm text-white sm:text-base md:w-1/2">
          NIA Productivity Tools unifies four capabilities that reduce
          repetitive work, improve accuracy, accelerate processing, and deliver
          consistent verified outputs daily.
        </p>
        <div className="mt-8 flex flex-nowrap gap-4 overflow-x-auto pb-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="min-w-[260px] flex-1 rounded-xl border border-emerald-700/70 bg-emerald-900/60 p-5 backdrop-blur-sm"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-800/50 p-2.5">
                      <Icon size={22} weight="duotone" className="text-white" />
                    </div>
                    <h3
                      className="text-sm font-semibold tracking-wide text-white sm:text-base"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      {feature.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-justify text-xs leading-relaxed text-white sm:text-sm">
                    {feature.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {feature.tags.map((tag) => {
                      const TagIcon = tag.icon;
                      const selected =
                        selectedTags[`${feature.id}:${tag.id}`] ?? false;
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(feature.id, tag.id)}
                          aria-pressed={selected}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm ${
                            selected
                              ? "bg-white/35"
                              : "bg-white/20 hover:bg-white/30"
                          }`}
                        >
                          <TagIcon
                            size={13}
                            weight="duotone"
                            className="shrink-0"
                          />
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
