"use client";

import { useState } from "react";
import { CalendarBlankIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useSwrft } from "@/hooks/useSwrft";
import { TemplateManager } from "@/components/TemplateManager";

const REPORT_TYPES = ["SWRFT", "WRFOB", "MONITORING", "INSPECTION"];

export function SwrftTool() {
  const currentYear = new Date().getFullYear();
  const [fullName, setFullName] = useState("");
  const [reportType, setReportType] = useState("SWRFT");
  const [year, setYear] = useState(currentYear);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const { isGenerating, message, generate, clearMessage } = useSwrft();

  const submitGeneration = async () => {
    if (!fullName.trim()) {
      return;
    }
    if (!selectedTemplateId) {
      return;
    }

    await generate({
      fullName: fullName.trim(),
      reportType,
      year,
      templateId: selectedTemplateId,
    });
  };

  const canGenerate =
    !isGenerating &&
    fullName.trim().length > 0 &&
    selectedTemplateId.length > 0;

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <CalendarBlankIcon size={18} className="text-white" />
          </span>
          SWRFT Generator
        </h2>
        <p className="mt-2 text-sm text-white/85 text-justify">
          Generate bi-monthly accomplishment reports for an entire year.
          Creates 24 reports (2 per month) with automatic weekend detection and
          merges them into a single file.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/90">
            Full Name
          </span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              clearMessage();
            }}
            placeholder="Enter full name"
            className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/90">
            Report Type
          </span>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              clearMessage();
            }}
            className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            {REPORT_TYPES.map((type) => (
              <option key={type} value={type} className="bg-emerald-900">
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/90">
            Year
          </span>
          <input
            type="number"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              clearMessage();
            }}
            min={2000}
            max={2100}
            className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </label>

        <div className="block">
          <span className="mb-2 block text-sm font-medium text-white/90">
            Template
          </span>
          <TemplateManager
            scope="swrft"
            selectedTemplateId={selectedTemplateId}
            onSelectedTemplateIdChange={(id) => {
              setSelectedTemplateId(id);
              clearMessage();
            }}
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => {
            void submitGeneration();
          }}
          disabled={!canGenerate}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
        >
          <DownloadSimpleIcon size={18} />
          {isGenerating ? "Generating..." : "Generate & Download"}
        </button>
      </div>

      {message && (
        <p
          className="mt-4 rounded-lg border border-white/35 bg-white/10 px-4 py-3 text-sm text-white"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </section>
  );
}
