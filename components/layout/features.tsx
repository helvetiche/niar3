"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { ComponentType } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {
  FileTextIcon,
  FileXlsIcon,
  ArrowsMergeIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
  LightningIcon,
  ArrowsClockwiseIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  ClockClockwiseIcon,
  ShieldCheckIcon,
  ScissorsIcon,
  FilePdfIcon,
  MicrosoftExcelLogoIcon,
  ScanIcon,
  DatabaseIcon,
  WarningCircleIcon,
  GearIcon,
  LinkSimpleIcon,
  SquaresFourIcon,
  FolderOpenIcon,
  UsersThreeIcon,
  PackageIcon,
  CubeIcon,
  CalendarIcon,
  BellSimpleIcon,
  ListChecksIcon,
  EnvelopeSimpleIcon,
  LockKeyIcon,
  CaretLeftIcon,
  CaretRightIcon,
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
    id: "template-manager",
    title: "TEMPLATE MANAGER",
    description:
      "Create, replace, and manage shared templates used across Generate Billing Unit, Accomplishment Report, and related document workflows for every authenticated user.",
    icon: GearIcon,
    tags: [
      { id: "shared", label: "Shared templates", icon: LinkSimpleIcon },
      { id: "update", label: "Version control", icon: CheckCircleIcon },
      { id: "manage", label: "Central library", icon: SquaresFourIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "lipa-summary",
    title: "LIPA SUMMARY",
    description:
      "Generate concise summaries from LIPA files, highlight key details, organize outputs clearly, and reduce manual review time for teams daily.",
    icon: FileTextIcon,
    tags: [
      { id: "accurate", label: "Accurate", icon: CheckCircleIcon },
      { id: "quick", label: "Quick turnaround", icon: ClockClockwiseIcon },
      { id: "verified", label: "Verified data", icon: ShieldCheckIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "merge-files",
    title: "MERGE FILES",
    description:
      "Merge PDF and Excel files in the correct order, preserve structure, and produce one finalized package ready for submission workflows.",
    icon: ArrowsMergeIcon,
    tags: [
      { id: "ordered", label: "Ordered pages", icon: ScissorsIcon },
      { id: "pdf", label: "PDF merge", icon: FilePdfIcon },
      { id: "excel", label: "Excel merge", icon: MicrosoftExcelLogoIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "accomplishment-report",
    title: "ACCOMPLISHMENT REPORT",
    description:
      "Build quincena accomplishment reports: pick months and periods, populate tasks, and merge results into a single workbook for reporting cycles.",
    icon: FileXlsIcon,
    tags: [
      { id: "quincena", label: "Quincena periods", icon: CalendarIcon },
      { id: "tasks", label: "Task capture", icon: CheckCircleIcon },
      { id: "merge", label: "Auto merge", icon: ArrowsMergeIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "ifr-scanner",
    title: "GENERATE BILLING UNIT",
    description:
      "Scan IFR documents automatically, extract billing fields accurately, reduce encoding errors, and speed up operations reporting.",
    icon: MagnifyingGlassIcon,
    tags: [
      { id: "scan", label: "Fast scan", icon: ScanIcon },
      { id: "extract", label: "Field extraction", icon: DatabaseIcon },
      { id: "quality", label: "Error check", icon: WarningCircleIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "consolidate-land-profiles",
    title: "CONSOLIDATE IFR",
    description:
      "Consolidate multiple IFR or land-profile Excel sources into one structured output with sheet and cell mapping, organized for downstream review.",
    icon: FolderOpenIcon,
    tags: [
      { id: "excel", label: "Excel sources", icon: MicrosoftExcelLogoIcon },
      { id: "consolidate", label: "Single output", icon: ArrowsMergeIcon },
      { id: "extract", label: "Structured extract", icon: DatabaseIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "ifr-checker",
    title: "IFR CHECKER",
    description:
      "Validate consolidated files against source IFR data to spot calculation issues, missing lots, and mismatches before sign-off.",
    icon: ShieldCheckIcon,
    tags: [
      { id: "validate", label: "Cross-check", icon: CheckCircleIcon },
      { id: "errors", label: "Discrepancies", icon: WarningCircleIcon },
      { id: "compare", label: "Source vs output", icon: MagnifyingGlassIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "inventory",
    title: "INVENTORY",
    description:
      "Track inventory with quarterly requested and received quantities, monitor stock and remaining balances across reporting periods.",
    icon: PackageIcon,
    tags: [
      { id: "stock", label: "Stock levels", icon: CubeIcon },
      { id: "quarterly", label: "Quarterly data", icon: DatabaseIcon },
      { id: "items", label: "Item catalog", icon: CheckCircleIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "calendar",
    title: "CALENDAR",
    description:
      "Plan work with color-coded calendar notes, deadlines, and progress cues so teams see what is due soon and what is already complete.",
    icon: CalendarIcon,
    tags: [
      { id: "notes", label: "Schedule notes", icon: FileTextIcon },
      { id: "color", label: "Color coded", icon: SparkleIcon },
      { id: "deadlines", label: "Deadlines", icon: LightningIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "schedules",
    title: "SCHEDULES",
    description:
      "Create email-backed schedules with recurring deadlines and automatic reminders so recurring agency work is less likely to slip.",
    icon: BellSimpleIcon,
    tags: [
      { id: "email", label: "Email reminders", icon: EnvelopeSimpleIcon },
      { id: "recurring", label: "Recurring", icon: ArrowsClockwiseIcon },
      { id: "track", label: "Deadline tracking", icon: ClockClockwiseIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "task-manager",
    title: "TASK MANAGER",
    description:
      "Mark recurring schedules complete by period—today, this week, or this month—with search and quick views tied to your assigned schedules.",
    icon: ListChecksIcon,
    tags: [
      { id: "period", label: "Period tracking", icon: CalendarIcon },
      { id: "checklist", label: "Checklist", icon: ListChecksIcon },
      { id: "done", label: "Completion log", icon: CheckCircleIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "compose-email",
    title: "COMPOSE EMAIL",
    description:
      "Send one-off messages through SMTP with rich formatting and optional AI-assisted drafting or tone adjustments when enabled for your account.",
    icon: EnvelopeSimpleIcon,
    tags: [
      { id: "smtp", label: "SMTP delivery", icon: LightningIcon },
      { id: "format", label: "Rich text", icon: FileTextIcon },
      { id: "ai", label: "AI assist", icon: SparkleIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "usage",
    title: "USAGE",
    description:
      "Review AI activity with per-task token totals, estimated model cost, and request outcomes so usage stays visible and accountable.",
    icon: ChartLineUpIcon,
    tags: [
      { id: "tokens", label: "Token totals", icon: DatabaseIcon },
      { id: "cost", label: "Cost estimate", icon: ChartLineUpIcon },
      { id: "history", label: "Activity history", icon: CheckCircleIcon },
    ] satisfies FeatureTag[],
  },
  {
    id: "accounts",
    title: "ACCOUNTS",
    description:
      "For designated administrators: manage user accounts, roles, and tool permissions so access stays aligned with agency policy.",
    icon: UsersThreeIcon,
    tags: [
      { id: "users", label: "User management", icon: UsersThreeIcon },
      { id: "roles", label: "Roles & claims", icon: ShieldCheckIcon },
      { id: "access", label: "Tool access", icon: LockKeyIcon },
    ] satisfies FeatureTag[],
  },
] as const;

const CAROUSEL_VIEWPORT_ID = "features-carousel-viewport";

export function Features() {
  const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});
  const [selectedSnap, setSelectedSnap] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const autoplayPlugin = useMemo(
    () =>
      Autoplay({
        delay: 5200,
        stopOnMouseEnter: true,
        stopOnInteraction: true,
        playOnInit: true,
      }),
    []
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      duration: 42,
      skipSnaps: false,
      dragFree: false,
    },
    [autoplayPlugin]
  );

  const handleToggleTag = (featureId: string, tagId: string) => {
    const key = `${featureId}:${tagId}`;
    setSelectedTags((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleScrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const handleScrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const handleKeyDownNav = useCallback(
    (event: KeyboardEvent, direction: "prev" | "next") => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (direction === "prev") handleScrollPrev();
      else handleScrollNext();
    },
    [handleScrollNext, handleScrollPrev]
  );

  useEffect(() => {
    if (!emblaApi) return;

    const syncState = () => {
      setSelectedSnap(emblaApi.selectedScrollSnap());
      setSnapCount(emblaApi.scrollSnapList().length);
      setScrollProgress(emblaApi.scrollProgress());
    };

    syncState();
    emblaApi.on("select", syncState);
    emblaApi.on("reInit", syncState);
    emblaApi.on("scroll", syncState);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyReducedMotion = () => {
      const plugin = emblaApi.plugins()?.autoplay;
      if (!plugin) return;
      if (media.matches) plugin.stop();
      else plugin.play();
    };
    applyReducedMotion();
    media.addEventListener("change", applyReducedMotion);

    return () => {
      emblaApi.off("select", syncState);
      emblaApi.off("reInit", syncState);
      emblaApi.off("scroll", syncState);
      media.removeEventListener("change", applyReducedMotion);
    };
  }, [emblaApi]);

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
            <ArrowsClockwiseIcon size={16} weight="duotone" className="shrink-0" />
            Consistency
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm">
            <ChartLineUpIcon size={16} weight="duotone" className="shrink-0" />
            Efficiency
          </span>
        </div>
        <p className="mt-2 w-full text-justify text-sm text-white sm:text-base md:max-w-3xl">
          NIA Productivity Tools brings document automation, IFR workflows, scheduling,
          inventory, email, and usage visibility into one workspace so teams spend less
          time on repetitive tasks and more on service delivery.
        </p>

        <div
          className="relative mt-8"
          role="region"
          aria-roledescription="carousel"
          aria-label="Product features"
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-[#004e3b] to-transparent sm:w-14"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-[#004e3b] to-transparent sm:w-14"
            aria-hidden
          />

          <button
            type="button"
            onClick={handleScrollPrev}
            onKeyDown={(e) => handleKeyDownNav(e, "prev")}
            className="absolute left-0 top-1/2 z-[2] hidden -translate-y-1/2 rounded-full border border-white/25 bg-emerald-950/80 p-2.5 text-white shadow-lg backdrop-blur-sm transition hover:border-white/40 hover:bg-emerald-900/90 sm:left-1 sm:flex"
            aria-label="Previous features"
            aria-controls={CAROUSEL_VIEWPORT_ID}
            tabIndex={0}
          >
            <CaretLeftIcon size={22} weight="bold" className="shrink-0" />
          </button>
          <button
            type="button"
            onClick={handleScrollNext}
            onKeyDown={(e) => handleKeyDownNav(e, "next")}
            className="absolute right-0 top-1/2 z-[2] hidden -translate-y-1/2 rounded-full border border-white/25 bg-emerald-950/80 p-2.5 text-white shadow-lg backdrop-blur-sm transition hover:border-white/40 hover:bg-emerald-900/90 sm:right-1 sm:flex"
            aria-label="Next features"
            aria-controls={CAROUSEL_VIEWPORT_ID}
            tabIndex={0}
          >
            <CaretRightIcon size={22} weight="bold" className="shrink-0" />
          </button>

          <div
            id={CAROUSEL_VIEWPORT_ID}
            ref={emblaRef}
            className="overflow-hidden rounded-xl sm:px-10"
          >
            <div className="-ml-4 flex touch-pan-y [-webkit-tap-highlight-color:transparent]">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.id}
                    className="min-w-0 shrink-0 grow-0 pl-4 basis-full sm:basis-1/2 xl:basis-1/3"
                  >
                    <article className="flex h-full min-h-[280px] min-w-0 flex-col rounded-xl border border-emerald-700/70 bg-emerald-900/60 p-5 backdrop-blur-sm sm:min-h-[300px]">
                      <div className="flex min-h-0 flex-1 flex-col">
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
                        <p className="mt-3 flex-1 text-justify text-xs leading-relaxed text-white sm:text-sm">
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
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-4">
            <div
              className="h-1 w-full max-w-md overflow-hidden rounded-full bg-white/15 sm:max-w-none sm:flex-1"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-white/55 motion-reduce:transition-none"
                style={{
                  width: `${Math.max(0, Math.min(1, scrollProgress)) * 100}%`,
                  transition: "width 120ms ease-out",
                }}
              />
            </div>
            <p
              className="shrink-0 text-xs tabular-nums text-white/70"
              aria-live="polite"
              aria-atomic="true"
            >
              {snapCount > 0 ? `${selectedSnap + 1} / ${snapCount}` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
