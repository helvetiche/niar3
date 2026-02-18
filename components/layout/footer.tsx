"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MapPinIcon,
  CheckCircleIcon,
  LightbulbIcon,
  TargetIcon,
  FlagBannerIcon,
  CrosshairIcon,
  InfoIcon,
  ShieldWarningIcon,
  SealCheckIcon,
} from "@phosphor-icons/react";

const FOOTER_PANELS = [
  {
    id: "goals",
    label: "GOALS",
    icon: FlagBannerIcon,
    content:
      "To create a workflow that helps employees complete core tasks faster without sacrificing document quality, coordination, or accountability. This goal focuses on removing repetitive manual steps, reducing delays between teams, and supporting consistent daily execution so staff can prioritize meaningful responsibilities, service delivery, and reliable operational outcomes for all units.",
  },
  {
    id: "objectives",
    label: "OBJECTIVES",
    icon: CrosshairIcon,
    content:
      "To turn hours of work into minutes by applying practical automation, standardized templates, and guided processing flows across priority tasks. The objective is to shorten turnaround times, improve handoff accuracy, minimize correction cycles, and ensure every output remains complete, traceable, and aligned with agency reporting requirements for all field offices.",
  },
  {
    id: "about",
    label: "ABOUT",
    icon: InfoIcon,
    content:
      "This productivity tools platform is designed for NIA employees who manage documents, summaries, scans, and file consolidation across daily operations. It combines useful utilities in one workspace to support faster processing, clearer outputs, and dependable collaboration while keeping the user experience simple, focused, and practical for routine agency needs nationwide.",
  },
  {
    id: "limitation",
    label: "LIMITATION",
    icon: ShieldWarningIcon,
    content:
      "Access to this system is limited to authorized NIA employees and approved internal users. The platform is intended for official agency workflows only, so external distribution, public deployment, and non-NIA operational use are not supported. Usage must follow organizational policies, data handling standards, and designated administrative controls at all times.",
  },
  {
    id: "ownership",
    label: "OWNERSHIP",
    icon: SealCheckIcon,
    content:
      "Everything produced, processed, stored, or generated through this platform is owned by the National Irrigation Administration. All workflows, output files, extracted records, and resulting documentation remain under NIA authority and governance. Users are granted operational access for official tasks, but ownership rights, control, and stewardship remain exclusively with NIA always.",
  },
] as const;

export function Footer() {
  const [activePanel, setActivePanel] =
    useState<(typeof FOOTER_PANELS)[number]["id"]>("goals");
  const selectedPanel =
    FOOTER_PANELS.find((panel) => panel.id === activePanel) ?? FOOTER_PANELS[0];

  return (
    <footer
      className="w-full bg-[#003c2d] px-4 py-8 text-white md:px-8 md:py-9"
      aria-label="Site footer"
    >
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src="/pfp.jpeg"
                alt="Nasche Del Ponso"
                width={52}
                height={52}
                className="h-[52px] w-[52px] rounded-full border border-emerald-500/70 object-cover"
              />
              <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/90 bg-white text-emerald-700 shadow-sm">
                <CheckCircleIcon size={12} weight="fill" />
              </span>
            </div>
            <div className="flex flex-col">
              <h2
                className="text-lg font-medium tracking-tight text-white sm:text-xl"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Nasche Del Ponso
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:px-3">
                  <MapPinIcon size={12} weight="duotone" className="shrink-0" />
                  NIA
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:px-3">
                  <LightbulbIcon
                    size={12}
                    weight="duotone"
                    className="shrink-0"
                  />
                  INTERN
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:px-3">
                  <TargetIcon size={12} weight="duotone" className="shrink-0" />
                  OJT
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 self-start md:self-auto">
            <div className="flex flex-col gap-2">
              <p
                className="text-sm font-medium tracking-tight text-white sm:text-base md:text-right"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                National Irrigation Administration R3
              </p>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:px-3">
                  <MapPinIcon size={14} weight="duotone" className="shrink-0" />
                  Region 3
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:px-3">
                  <MapPinIcon size={14} weight="duotone" className="shrink-0" />
                  Tambubong, San Rafael, Bulacan
                </span>
              </div>
            </div>
            <Image
              src="/logo.png"
              alt="NIA Logo"
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-sm object-contain"
            />
          </div>
        </div>
        <div className="rounded-xl border border-emerald-700/60 bg-emerald-900/35 p-4">
          <div className="flex flex-wrap gap-2">
            {FOOTER_PANELS.map((panel) => {
              const PanelIcon = panel.icon;
              const isActive = activePanel === panel.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => setActivePanel(panel.id)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm ${
                    isActive ? "bg-white/35" : "bg-white/20 hover:bg-white/30"
                  }`}
                >
                  <PanelIcon size={13} weight="duotone" className="shrink-0" />
                  {panel.label}
                </button>
              );
            })}
          </div>
          <p
            className="mt-3 text-sm leading-relaxed text-white sm:text-base"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            {selectedPanel.content}
          </p>
        </div>
      </div>
    </footer>
  );
}
