"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarBlankIcon,
  CalendarCheckIcon,
  CalendarDotsIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  DownloadSimpleIcon,
  FileXlsIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from "@phosphor-icons/react";
import { WorkspaceStepper } from "@/components/WorkspaceStepper";
import { generateSwrft } from "@/lib/api/swrft";
import {
  createAccomplishmentTask,
  deleteAccomplishmentTask,
  type AccomplishmentTaskDesignation,
} from "@/lib/api/accomplishment-tasks";
import { useAccomplishmentTasks } from "@/hooks/useAccomplishmentTasks";
import { TemplateManagerInline } from "@/components/TemplateManagerInline";
import { MasonryModal } from "@/components/MasonryModal";
import { downloadBlob, getErrorMessage } from "@/lib/utils";
import { useTemplates } from "@/hooks/useTemplates";

const DESIGNATION_OPTIONS = [
  "SWRFT",
  "WRFOB",
  "Senior Engineer A",
  "Senior Engineer B",
  "Engineer A",
  "Administrative Aide",
] as const;

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

export function SwrftToolStepped() {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([
    ...ALL_MONTHS,
  ]);
  const [includeFirstHalf, setIncludeFirstHalf] = useState(false);
  const [includeSecondHalf, setIncludeSecondHalf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskDesignation, setNewTaskDesignation] =
    useState<AccomplishmentTaskDesignation>("SWRFT");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskDesignationFilter, setTaskDesignationFilter] = useState<
    "all" | AccomplishmentTaskDesignation
  >("all");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    mutate: mutateTasks,
  } = useAccomplishmentTasks();

  const { data: swrftTemplates = [] } = useTemplates("swrft");

  const selectedTask = selectedTaskId
    ? (tasks.find((t) => t.id === selectedTaskId) ?? null)
    : null;
  const designation = selectedTask?.designation ?? "SWRFT";

  const handleTaskToggle = (taskId: string) => {
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const handleAddTask = async () => {
    const trimmed = newTaskLabel.trim();
    if (!trimmed) return;
    setIsAddingTask(true);
    try {
      await createAccomplishmentTask(trimmed, newTaskDesignation);
      setNewTaskLabel("");
      await mutateTasks();
      toast.success("Task added");
    } catch {
      toast.error("Failed to add task");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setDeletingTaskId(taskId);
    try {
      await deleteAccomplishmentTask(taskId);
      setSelectedTaskId((prev) => (prev === taskId ? null : prev));
      await mutateTasks();
      toast.success("Task removed");
    } catch {
      toast.error("Failed to remove task");
    } finally {
      setDeletingTaskId(null);
    }
  };

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
    const loadingToastId = toast.loading(
      "Generating accomplishment reports...",
    );

    try {
      const customTasks = selectedTask ? [selectedTask.label] : undefined;

      const result = await generateSwrft({
        templateId: selectedTemplateId,
        firstName: first,
        lastName: last,
        designation,
        months: selectedMonths,
        includeFirstHalf,
        includeSecondHalf,
        customTasks,
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
      toast.error(
        getErrorMessage(error, "Failed to generate accomplishment report."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = (() => {
    const query = taskSearchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (
        taskDesignationFilter !== "all" &&
        task.designation !== taskDesignationFilter
      ) {
        return false;
      }
      if (query && !task.label.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  })();

  const steps = [
    {
      title: "Template & Info",
      description: "Basic details",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Template & Personal Info
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Select your template and enter your name for the report.
            </p>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <FileXlsIcon size={16} className="text-white" />
              Accomplishment Template
            </p>
            <TemplateManagerInline
              scope="swrft"
              selectedTemplateId={selectedTemplateId}
              onSelectedTemplateIdChange={setSelectedTemplateId}
            />
          </div>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <label className="block" htmlFor="swrft-first-name">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
                <UserIcon size={16} className="text-white" />
                First Name
              </span>
              <input
                id="swrft-first-name"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Enter first name"
                className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
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
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Enter last name"
                className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </label>
          </div>
          <p className="text-xs text-white/70">
            These appear in the report header and output filename.
          </p>
        </div>
      ),
    },
    {
      title: "Task Selection",
      description: "Optional",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Task Selection</h3>
            <p className="mt-1 text-sm text-white/80">
              Optionally select a task. Its designation will be used in the
              report.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-white/90">
              <ListChecksIcon size={16} className="text-white" />
              Available Tasks
            </span>
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <PlusIcon size={18} />
              Add task
            </button>
          </div>

          {selectedTask && (
            <p className="text-xs font-medium text-white">
              Report designation: {designation}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <MagnifyingGlassIcon
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
              />
              <input
                type="search"
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full rounded-lg border border-white/40 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="designation-filter"
                className="text-xs text-white/70"
              >
                Filter:
              </label>
              <select
                id="designation-filter"
                value={taskDesignationFilter}
                onChange={(e) =>
                  setTaskDesignationFilter(
                    e.target.value as "all" | AccomplishmentTaskDesignation,
                  )
                }
                className="rounded-lg border border-white/40 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="all" className="bg-gray-800">
                  All
                </option>
                {DESIGNATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-gray-800">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {isTasksLoading ? (
              <span className="col-span-full text-xs text-white/70">
                Loading tasks...
              </span>
            ) : filteredTasks.length === 0 ? (
              <span className="col-span-full text-xs text-white/70">
                No tasks found. Click Add task to create one.
              </span>
            ) : (
              filteredTasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className={`relative flex flex-col gap-2 rounded-xl border px-3 py-3 transition ${
                      isSelected
                        ? "border-2 border-white bg-white/30"
                        : "border border-white/40 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleTaskToggle(task.id)}
                      className="flex min-w-0 flex-1 flex-col items-start gap-2 pr-6 text-left"
                    >
                      <span className="line-clamp-2 text-sm font-medium text-white">
                        {task.label}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTask(e, task.id)}
                      disabled={deletingTaskId === task.id}
                      className="absolute right-2 top-2 rounded p-1 transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingTaskId === task.id ? (
                        <CircleNotchIcon
                          size={14}
                          className="animate-spin text-white"
                        />
                      ) : (
                        <TrashIcon size={14} className="text-white" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Months & Periods",
      description: "Select range",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Months & Periods
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Select which months and periods to include in your report.
            </p>
          </div>

          <div>
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
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition sm:gap-2 sm:px-3 sm:py-2 ${
                      isSelected
                        ? "border-2 border-white bg-white/30 text-white"
                        : "border border-white/40 bg-white/5 text-white/90 hover:bg-white/10"
                    }`}
                  >
                    <CalendarBlankIcon size={14} weight="duotone" className="sm:hidden" />
                    <CalendarBlankIcon size={16} weight="duotone" className="hidden sm:block" />
                    <span className="text-xs sm:text-sm">{MONTH_LABELS[month - 1]}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleSelectAllMonths}
                className="rounded-lg border border-white/40 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={handleDeselectAllMonths}
                className="rounded-lg border border-white/40 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
              >
                Deselect all
              </button>
            </div>
          </div>

          <div>
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
              Period (half of month)
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIncludeFirstHalf((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  includeFirstHalf
                    ? "border-2 border-white bg-white/30 text-white"
                    : "border border-white/40 bg-white/5 text-white/90 hover:bg-white/10"
                }`}
              >
                <CalendarDotsIcon size={18} weight="duotone" />
                <span>First half (1-15)</span>
              </button>
              <button
                type="button"
                onClick={() => setIncludeSecondHalf((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  includeSecondHalf
                    ? "border-2 border-white bg-white/30 text-white"
                    : "border border-white/40 bg-white/5 text-white/90 hover:bg-white/10"
                }`}
              >
                <CalendarCheckIcon size={18} weight="duotone" />
                <span>Second half (16-30/31)</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-white/70">
              Select at least one period. Both can be selected for full month
              reports.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Review",
      description: "Generate report",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Review & Generate
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Review your selections and generate the report.
            </p>
          </div>

          <div className="rounded-lg border border-white/30 bg-white/5 p-4">
            <h4 className="mb-3 text-sm font-medium text-white">Summary</h4>
            <div className="space-y-2 text-sm text-white/90">
              <p>
                <span className="text-white/70">Template:</span>{" "}
                {selectedTemplateId
                  ? swrftTemplates.find((t) => t.id === selectedTemplateId)
                      ?.name || selectedTemplateId
                  : "Not selected"}
              </p>
              <p>
                <span className="text-white/70">Name:</span> {firstName}{" "}
                {lastName}
              </p>
              <p>
                <span className="text-white/70">Task:</span>{" "}
                {selectedTask?.label || "None"}
              </p>
              <p>
                <span className="text-white/70">Designation:</span>{" "}
                {designation}
              </p>
              <p>
                <span className="text-white/70">Months:</span>{" "}
                {selectedMonths.length > 0
                  ? selectedMonths.map((m) => MONTH_LABELS[m - 1]).join(", ")
                  : "None"}
              </p>
              <p>
                <span className="text-white/70">Periods:</span>{" "}
                {includeFirstHalf && includeSecondHalf
                  ? "Both halves"
                  : includeFirstHalf
                    ? "First half"
                    : includeSecondHalf
                      ? "Second half"
                      : "None"}
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-3 shadow-xl shadow-emerald-950/30 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <FileXlsIcon size={18} className="text-white" />
          </span>
          Accomplishment Report
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <CalendarBlankIcon size={12} className="text-white" />
            Quincena Report
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <DownloadSimpleIcon size={12} className="text-white" />
            Excel Output
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85">
          Follow the steps below to generate your accomplishment report.
        </p>
      </div>

      <WorkspaceStepper
        steps={steps}
        onComplete={() => void handleGenerate()}
        canProceed={(step) => {
          if (step === 0)
            return !!selectedTemplateId && !!firstName.trim() && !!lastName.trim();
          if (step === 2)
            return (
              selectedMonths.length > 0 &&
              (includeFirstHalf || includeSecondHalf)
            );
          return true;
        }}
        completeButtonText={isSubmitting ? "Generating..." : "Generate"}
      />

      <MasonryModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        panelClassName="max-w-md"
        animateFrom="bottom"
      >
        {(close) => (
          <div className="rounded-2xl border border-white/40 bg-emerald-900 p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-medium text-white">
                <span className="inline-flex rounded-lg border border-white/40 bg-white/10 p-2">
                  <PlusIcon size={20} className="text-white" />
                </span>
                Add task
              </h3>
              <button
                type="button"
                onClick={close}
                className="rounded p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <XIcon size={20} weight="bold" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="block" htmlFor="add-task-label">
                <span className="mb-1 flex items-center gap-2 text-xs font-medium text-white/90">
                  <PencilSimpleIcon size={14} className="text-white" />
                  Task label
                </span>
                <textarea
                  id="add-task-label"
                  value={newTaskLabel}
                  onChange={(e) => setNewTaskLabel(e.target.value)}
                  rows={4}
                  placeholder="e.g. Supervise IA meeting"
                  className="w-full resize-y rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <div>
                <label
                  htmlFor="task-designation"
                  className="mb-2 flex items-center gap-2 text-xs font-medium text-white/90"
                >
                  <TagIcon size={14} className="text-white" />
                  Designation
                </label>
                <select
                  id="task-designation"
                  value={newTaskDesignation}
                  onChange={(e) =>
                    setNewTaskDesignation(
                      e.target.value as AccomplishmentTaskDesignation,
                    )
                  }
                  className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {DESIGNATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-gray-800">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void handleAddTask()}
                disabled={!newTaskLabel.trim() || isAddingTask}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
              >
                <PlusIcon size={18} />
                {isAddingTask ? "Adding..." : "Add task"}
              </button>
            </div>
          </div>
        )}
      </MasonryModal>
    </section>
  );
}
