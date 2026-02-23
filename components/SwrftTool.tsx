"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarBlankIcon,
  CalendarCheckIcon,
  CalendarDotsIcon,
  DownloadSimpleIcon,
  FileXlsIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { generateSwrft } from "@/lib/api/swrft";
import { fetchProfile } from "@/lib/api/profile";
import { TemplateManager } from "@/components/TemplateManager";
import { downloadBlob, getErrorMessage } from "@/lib/utils";

const DESIGNATION_OPTIONS = ["SWRFT", "WRFOB"] as const;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function SwrftTool() {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [designation, setDesignation] = useState<"SWRFT" | "WRFOB">(
    "SWRFT",
  );
  const [selectedMonths, setSelectedMonths] = useState<number[]>(
    [...ALL_MONTHS],
  );
  const [includeFirstHalf, setIncludeFirstHalf] = useState(false);
  const [includeSecondHalf, setIncludeSecondHalf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsProfileLoading(true);
    fetchProfile()
      .then((profile) => {
        if (cancelled) return;
        setFirstName(profile.first?.trim() ?? "");
        setLastName(profile.last?.trim() ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setFirstName("");
          setLastName("");
        }
      })
      .finally(() => {
        if (!cancelled) setIsProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMonthToggle = (month: number) => {
    setSelectedMonths((prev) => {
      const next = prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort((a, b) => a - b);
      return next;
    });
  };

  const handleSelectAllMonths = () => setSelectedMonths([...ALL_MONTHS]);
  const handleDeselectAllMonths = () => setSelectedMonths([]);

  const handleGenerate = async () => {
    if (!selectedTemplateId.trim()) {
      toast.error("Please select an accomplishment template.");
      return;
    }
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      toast.error("Please enter your first name and last name.");
      return;
    }
    if (selectedMonths.length < 1) {
      toast.error("Select at least one month.");
      return;
    }
    if (!includeFirstHalf && !includeSecondHalf) {
      toast.error("Select at least one period: first half or second half.");
      return;
    }

    setIsSubmitting(true);
    const loadingToastId = toast.loading("Generating accomplishment reports...");

    try {
      const result = await generateSwrft({
        templateId: selectedTemplateId,
        firstName: first,
        lastName: last,
        designation,
        months: selectedMonths,
        includeFirstHalf,
        includeSecondHalf,
      });

      downloadBlob(result.blob, result.fileName);
      const count =
        selectedMonths.length * (includeFirstHalf ? 1 : 0) +
        selectedMonths.length * (includeSecondHalf ? 1 : 0);
      toast.dismiss(loadingToastId);
      toast.success(
        `Downloaded merged accomplishment report with ${String(count)} period sheet(s).`,
      );
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getErrorMessage(error, "Failed to generate accomplishment report."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const missingRequirements: string[] = [];
  if (!selectedTemplateId) {
    missingRequirements.push("Select an accomplishment template.");
  }
  if (!firstName.trim() || !lastName.trim()) {
    missingRequirements.push("Enter your first name and last name.");
  }
  if (selectedMonths.length < 1) {
    missingRequirements.push("Select at least one month.");
  }
  if (!includeFirstHalf && !includeSecondHalf) {
    missingRequirements.push(
      "Select at least one period: first half (1-15) or second half (16-30/31).",
    );
  }

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <FileXlsIcon size={18} className="text-white" />
          </span>
          Accomplishment Report
        </h2>
        <p className="mt-2 text-sm text-white/85 text-justify">
          Generate quincena accomplishment reports. Select months and periods,
          then the system populates weekday tasks and weekend labels into one
          workbook. Output filename: LastName, FirstName - [Designation].
        </p>
      </div>

      <TemplateManager
        scope="swrft"
        selectedTemplateId={selectedTemplateId}
        onSelectedTemplateIdChange={setSelectedTemplateId}
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block" htmlFor="swrft-first-name">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
            <UserIcon size={16} className="text-white" />
            First Name
          </span>
          <input
            id="swrft-first-name"
            type="text"
            aria-label="First name for accomplishment report"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder={
              isProfileLoading ? "Loading from profile..." : "Enter first name"
            }
            disabled={isProfileLoading}
            className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60"
          />
        </label>
        <label className="block" htmlFor="swrft-last-name">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
            <UserIcon size={16} className="text-white" />
            Last Name
          </span>
          <input
            id="swrft-last-name"
            type="text"
            aria-label="Last name for accomplishment report"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder={
              isProfileLoading ? "Loading from profile..." : "Enter last name"
            }
            disabled={isProfileLoading}
            className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60"
          />
        </label>
      </div>
      <div className="mt-2">
        <span className="text-xs leading-5 text-white/80">
          Filled from your profile if available. Edit as needed.
        </span>
      </div>

      <div className="mt-4">
        <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
          Months to include
        </span>
        <div className="flex flex-wrap gap-2">
          {ALL_MONTHS.map((month) => {
            const isSelected = selectedMonths.includes(month);
            return (
              <button
                key={month}
                type="button"
                onClick={() => handleMonthToggle(month)}
                aria-label={`Include ${MONTH_LABELS[month - 1]}`}
                aria-pressed={isSelected}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                  isSelected
                    ? "border-2 border-white bg-white/30 text-white"
                    : "border border-white/40 bg-white/10 text-white/90 hover:bg-white/20"
                }`}
              >
                <CalendarBlankIcon size={16} weight="duotone" />
                <span>{MONTH_LABELS[month - 1]}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleSelectAllMonths}
            aria-label="Select all months"
            className="rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={handleDeselectAllMonths}
            aria-label="Deselect all months"
            className="rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
          >
            Deselect all
          </button>
        </div>
        <span className="mt-2 block text-xs leading-5 text-white/80">
          Default: all months. Minimum: 1 month.
        </span>
      </div>

      <div className="mt-4">
        <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
          Period (half of month)
        </span>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setIncludeFirstHalf((prev) => !prev)}
            aria-label="Include first half (1-15)"
            aria-pressed={includeFirstHalf}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              includeFirstHalf
                ? "border-2 border-white bg-white/30 text-white"
                : "border border-white/40 bg-white/10 text-white/90 hover:bg-white/20"
                }`}
          >
            <CalendarDotsIcon size={18} weight="duotone" />
            <span>First half (1-15)</span>
          </button>
          <button
            type="button"
            onClick={() => setIncludeSecondHalf((prev) => !prev)}
            aria-label="Include second half (16-30/31)"
            aria-pressed={includeSecondHalf}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              includeSecondHalf
                ? "border-2 border-white bg-white/30 text-white"
                : "border border-white/40 bg-white/10 text-white/90 hover:bg-white/20"
                }`}
          >
            <CalendarCheckIcon size={18} weight="duotone" />
            <span>Second half (16-30/31)</span>
          </button>
        </div>
        <span className="mt-2 block text-xs leading-5 text-white/80">
          Default: both. Minimum: one period.
        </span>
      </div>

      <div className="mt-4">
        <div className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
            Designation
          </span>
          <div className="flex flex-wrap gap-2">
            {DESIGNATION_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                aria-label={`Select ${opt} designation`}
                aria-pressed={designation === opt}
                onClick={() => setDesignation(opt)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  designation === opt
                    ? "border-2 border-white bg-white/30 text-white"
                    : "border border-white/40 bg-white/10 text-white/90 hover:bg-white/20"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <span className="mt-2 block text-xs leading-5 text-white/80">
            Select Designation.
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Generate and download accomplishment report"
          onClick={() => void handleGenerate()}
          disabled={
            isSubmitting ||
            !selectedTemplateId ||
            !firstName.trim() ||
            !lastName.trim() ||
            selectedMonths.length < 1 ||
            (!includeFirstHalf && !includeSecondHalf)
          }
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
        >
          <DownloadSimpleIcon size={18} />
          {isSubmitting ? "Generating..." : "Generate and Download"}
        </button>
      </div>

      {missingRequirements.length > 0 && (
        <div className="mt-3 rounded-lg border border-white/50 bg-white/20 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-md">
          <p className="text-sm font-medium text-white">
            Requirements before generating:
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-white/90">
            {missingRequirements.map((item) => `- ${item}`).join("\n")}
          </p>
        </div>
      )}
    </section>
  );
}
