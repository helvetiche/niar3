"use client";

import {
  CalendarIcon,
  ClockIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  XIcon,
  CircleNotchIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { MasonryModal } from "@/components/MasonryModal";
import type { Schedule, ScheduleDeadline, ReminderDate } from "@/types/schedule";
import { calculateNextDeadline, calculateReminderDate } from "@/lib/deadline-calculator";
import { formatDeadline, formatReminder } from "@/lib/schedule-helpers";
import { useWorkspaceUser } from "@/contexts/WorkspaceContext";
import { useSchedules } from "@/hooks/useSchedules";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Schedules() {
  const user = useWorkspaceUser();
  const [currentTime, setCurrentTime] = useState(new Date());

  // SWR hook for server-side pagination, search, and filtering
  const {
    schedules,
    pagination,
    isLoading,
    search,
    setSearch,
    nextPage,
    prevPage,
    mutate,
  } = useSchedules();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [deadlineType, setDeadlineType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [deadlineTime, setDeadlineTime] = useState("17:00");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);
  const [reminderTime, setReminderTime] = useState("08:00");

  // Live countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("active");
    setDeadlineType("daily");
    setDeadlineTime("17:00");
    setDayOfWeek(1);
    setDayOfMonth(1);
    setReminderDaysBefore(1);
    setReminderTime("08:00");
  };

  const handleAddSchedule = async () => {
    if (!title.trim() || !user.email) return;

    const deadline: ScheduleDeadline = {
      type: deadlineType,
      time: deadlineTime,
      ...(deadlineType === "weekly" && { dayOfWeek }),
      ...(deadlineType === "monthly" && { dayOfMonth }),
    };

    const reminderDate: ReminderDate = {
      type: "relative",
      daysBefore: reminderDaysBefore,
      time: reminderTime,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/v1/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          deadline,
          reminderDate,
          personAssigned: user.email.split("@")[0],
          personEmail: user.email,
          status,
        }),
      });

      if (response.ok) {
        resetForm();
        setIsAddModalOpen(false);
        mutate();
      }
    } catch (error) {
      console.error("Failed to add schedule:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (e: React.MouseEvent, scheduleId: string) => {
    e.stopPropagation();
    if (deletingScheduleId) return;

    try {
      setDeletingScheduleId(scheduleId);
      const response = await fetch(`/api/v1/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        mutate();
      }
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    } finally {
      setDeletingScheduleId(null);
    }
  };

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDetailModalOpen(true);
  };

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <header className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white sm:text-2xl">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <CalendarIcon size={20} className="text-white" />
          </span>
          Email Schedules
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <EnvelopeIcon size={12} className="text-white" />
            {pagination?.totalItems ?? 0} Schedule{(pagination?.totalItems ?? 0) !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <ClockIcon size={12} className="text-white" />
            Auto Reminders
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-white/85">
          Create and manage email schedules with automatic reminders.
        </p>
      </header>

      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schedules..."
              className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                <XIcon size={16} weight="bold" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            <PlusIcon size={18} />
            Add Schedule
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-emerald-700 bg-emerald-950/50 p-4"
              >
                <div className="mb-2 h-4 w-24 rounded bg-emerald-700/50" />
                <div className="h-3 w-32 rounded bg-emerald-700/50" />
              </div>
            ))}
          </div>
        ) : schedules.length > 0 ? (
          <div className="overflow-x-auto overflow-y-visible rounded-lg border border-emerald-700">
            <table className="w-full min-w-0 table-fixed border-collapse">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[24%]" />
                <col className="w-[30%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-emerald-700 bg-emerald-950/70">
                  <th className="min-w-0 border-r border-emerald-700 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={14} />
                      Title
                    </div>
                  </th>
                  <th className="min-w-0 border-r border-emerald-700 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">
                    <div className="flex items-center gap-1.5">
                      <EnvelopeIcon size={14} />
                      Next Email
                    </div>
                  </th>
                  <th className="min-w-0 border-r border-emerald-700 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">
                    <div className="flex items-center gap-1.5">
                      <EnvelopeIcon size={14} />
                      Email
                    </div>
                  </th>
                  <th className="min-w-0 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/70">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => {
                  return (
                    <tr
                      key={schedule.id}
                      onClick={() => handleScheduleClick(schedule)}
                      className="cursor-pointer border-b border-emerald-700/50 bg-emerald-950/30 transition hover:bg-emerald-800/50 last:border-b-0"
                    >
                      <td className="max-w-0 min-w-0 border-r border-emerald-700/50 px-4 py-3 align-top">
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700/50">
                            <CalendarIcon size={16} className="text-white" />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <span className="line-clamp-2 break-words text-sm font-medium text-white">
                              {schedule.title}
                            </span>
                            {schedule.description ? (
                              <span className="mt-0.5 line-clamp-2 break-words text-xs text-white/60">
                                {schedule.description}
                              </span>
                            ) : (
                              <span className="mt-0.5 block text-xs italic text-white/40">
                                No Description Written
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-0 min-w-0 border-r border-emerald-700/50 px-4 py-3 align-top">
                        {(() => {
                          let nextDeadline = calculateNextDeadline(schedule.deadline, currentTime);
                          let nextReminder = calculateReminderDate(schedule.reminderDate, nextDeadline);
                          
                          let attempts = 0;
                          while (nextReminder <= currentTime && attempts < 10) {
                            const nextDeadlineTime = new Date(nextDeadline.getTime() + 60000);
                            nextDeadline = calculateNextDeadline(schedule.deadline, nextDeadlineTime);
                            nextReminder = calculateReminderDate(schedule.reminderDate, nextDeadline);
                            attempts++;
                          }
                          
                          const diffMs = nextReminder.getTime() - currentTime.getTime();
                          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

                          return (
                            <div className="min-w-0 space-y-2">
                              <div className="flex min-w-0 items-start gap-1.5 text-sm text-white/80">
                                <EnvelopeIcon
                                  size={14}
                                  className="mt-0.5 shrink-0 text-white/50"
                                />
                                <span className="min-w-0 break-words">
                                  {nextReminder.toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </span>
                              </div>
                              <div
                                className={`inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white ${
                                  days === 0 && hours < 24
                                    ? "border-amber-400/60 bg-amber-500/20"
                                    : ""
                                }`}
                              >
                                <ClockIcon size={12} className="shrink-0" />
                                <span className="truncate">{`${days}d ${hours}h ${minutes}m ${seconds}s`}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="max-w-0 min-w-0 border-r border-emerald-700/50 px-4 py-3 align-top">
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700/50">
                            <EnvelopeIcon size={16} className="text-white" />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <span className="block truncate text-sm text-white/80">
                              {schedule.personEmail}
                            </span>
                            <span className="block truncate text-xs text-white/50">
                              {schedule.personAssigned}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-right">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSchedule(e, schedule.id)}
                          disabled={deletingScheduleId === schedule.id}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-white/60 transition hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Delete schedule"
                        >
                          {deletingScheduleId === schedule.id ? (
                            <CircleNotchIcon size={16} className="animate-spin" />
                          ) : (
                            <TrashIcon size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <CalendarIcon size={48} weight="duotone" className="mx-auto mb-4 text-white/40" />
            <p className="text-sm text-white/70">
              {search ? "No schedules found" : "No schedules yet. Click Add Schedule to get started."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-emerald-700/50 pt-4">
          <p className="text-xs text-white/60">
            Showing {((pagination.page - 1) * pagination.itemsPerPage) + 1} to{" "}
            {Math.min(pagination.page * pagination.itemsPerPage, pagination.totalItems)} of{" "}
            {pagination.totalItems} schedules
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevPage}
              disabled={!pagination.hasPrevPage}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CaretLeftIcon size={14} />
              Previous
            </button>
            <span className="text-xs text-white/70">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={nextPage}
              disabled={!pagination.hasNextPage}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <CaretRightIcon size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      <MasonryModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        panelClassName="max-w-2xl"
        animateFrom="bottom"
      >
        {(close) => (
          <div className="rounded-2xl border border-white/40 bg-emerald-900 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-medium text-white">
                <span className="inline-flex rounded-lg border border-white/40 bg-white/10 p-2">
                  <PlusIcon size={24} className="text-white" />
                </span>
                Add Schedule
              </h3>
              <button
                type="button"
                onClick={close}
                className="rounded p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <XIcon size={20} weight="bold" />
              </button>
            </div>
            
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Submit Weekly Status Report"
                  className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Additional details..."
                  className="w-full resize-y rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Deadline Type
                </label>
                <div className="flex gap-2">
                  {(["daily", "weekly", "monthly"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDeadlineType(type)}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                        deadlineType === type
                          ? "border-2 border-white bg-white/30 text-white"
                          : "border border-white/40 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {deadlineType === "weekly" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Day of Week
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    {DAYS_OF_WEEK.map((day, index) => (
                      <option key={index} value={index} className="bg-gray-800">
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {deadlineType === "monthly" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Deadline Time
                </label>
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Reminder Days Before
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={reminderDaysBefore}
                    onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Reminder Time
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Status
                </label>
                <div className="flex gap-2">
                  {(["active", "inactive"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                        status === s
                          ? "border-2 border-white bg-white/30 text-white"
                          : "border border-white/40 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-white/40 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAddSchedule()}
                disabled={!title.trim() || !user.email || isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
              >
                <PlusIcon size={18} />
                {isSubmitting ? "Adding..." : "Add Schedule"}
              </button>
            </div>
          </div>
        )}
      </MasonryModal>

      {/* Schedule Detail Modal */}
      <MasonryModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        panelClassName="max-w-lg"
        animateFrom="bottom"
      >
        {(close) => (
          <div className="rounded-2xl border border-white/40 bg-emerald-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Schedule Details</h3>
              <button
                type="button"
                onClick={close}
                className="rounded p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <XIcon size={20} weight="bold" />
              </button>
            </div>
            {selectedSchedule && (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-700 bg-emerald-950/50 p-4">
                  <h4 className="mb-2 text-base font-medium text-white">
                    {selectedSchedule.title}
                  </h4>
                  {selectedSchedule.description && (
                    <p className="mb-3 text-sm text-white/70">
                      {selectedSchedule.description}
                    </p>
                  )}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-white/80">
                      <CalendarIcon size={14} />
                      <span>{formatDeadline(selectedSchedule.deadline)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <ClockIcon size={14} />
                      <span>{formatReminder(selectedSchedule.reminderDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <UserIcon size={14} />
                      <span>{selectedSchedule.personAssigned}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <EnvelopeIcon size={14} />
                      <span>{selectedSchedule.personEmail}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </MasonryModal>
    </section>
  );
}