"use client";

import { useState } from "react";
import {
  GearIcon,
  StackIcon,
  FileXlsIcon,
  MagnifyingGlassIcon,
  UsersThreeIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { TemplateManager } from "@/components/TemplateManager";

export function TemplatesTool() {
  const [scannerTemplateId, setScannerTemplateId] = useState("");
  const [consolidationTemplateId, setConsolidationTemplateId] = useState("");
  const [swrftTemplateId, setSwrftTemplateId] = useState("");

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <GearIcon size={18} className="text-white" />
          </span>
          Template Manager
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <UsersThreeIcon size={12} className="text-white" />
            Shared Templates
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <ArrowsClockwiseIcon size={12} className="text-white" />
            Version Updates
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <GearIcon size={12} className="text-white" />
            Central Control
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85 text-justify">
          Use this page as the centralized template workspace for IFR Scanner,
          Consolidate Billing Unit, and Accomplishment Report. You can review saved templates,
          select active ones, upload replacements, rename outdated files, and keep
          a clean list that stays consistent for every authenticated user. This
          prevents duplicate uploads per account, improves alignment across
          teams, and keeps all template-driven outputs standardized from one
          controlled place.
        </p>
      </div>

      <div className="grid gap-4">
        <section className="rounded-xl border border-white/35 bg-white/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <MagnifyingGlassIcon size={16} className="text-white" />
            IFR Scanner Templates
          </p>
          <TemplateManager
            scope="ifr-scanner"
            selectedTemplateId={scannerTemplateId}
            onSelectedTemplateIdChange={setScannerTemplateId}
          />
        </section>

        <section className="rounded-xl border border-white/35 bg-white/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <StackIcon size={16} className="text-white" />
            Consolidate Billing Unit Templates
          </p>
          <TemplateManager
            scope="consolidate-ifr"
            selectedTemplateId={consolidationTemplateId}
            onSelectedTemplateIdChange={setConsolidationTemplateId}
          />
        </section>

        <section className="rounded-xl border border-white/35 bg-white/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <FileXlsIcon size={16} className="text-white" />
            Accomplishment Report Templates
          </p>
          <TemplateManager
            scope="swrft"
            selectedTemplateId={swrftTemplateId}
            onSelectedTemplateIdChange={setSwrftTemplateId}
          />
        </section>
      </div>
    </section>
  );
}
