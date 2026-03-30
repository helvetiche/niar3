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
} from "@phosphor-icons/react";
import { useState, useEffect, useMemo } from "react";
import { MasonryModal } from "@/components/MasonryModal";
import type { Schedule, ScheduleDeadline, ReminderDate } from "@/types/schedule";
import { calculateNextDeadline, formatDeadline, formatReminder } from "@/lib/schedule-helpers";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Schedules() {
  const [searchQuery, setSearchQuery] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [personAssigned, setPersonAssigned] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [deadlineType, setDeadlineType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [deadlineTime, setDeadlineTime] = useState("17:00");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/v1/schedules");
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPersonAssigned("");
    setPersonEmail("");
    setStatus("active");
    setDeadlineType("daily");
    setDeadlineTime("17:00");
    setDayOfWeek(1);
    setDayOfMonth(1);
    setReminderDaysBefore(1);
    setReminderTime("08:00");
  };

  const handleAddSchedule = async () => {
    if (!title.trim() || !personAssigned.trim() || !personEmail.trim()) return;

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
          personAssigned: personAssigned.trim(),
          personEmail: personEmail.trim(),
          status,
        }),
      });

      if (response.ok) {
        resetForm();
        setIsAddModalOpen(false);
        await fetchSchedules();
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
        await fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    } finally {
      setDeletingScheduleId(null);
    }
  };

  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) return schedules;

    const query = searchQuery.toLowerCase();
    return schedules.filter(
      (schedule) =>
        schedule.title.toLowerCase().includes(query) ||
        schedule.description.toLowerCase().includes(query) ||
        schedule.personAssigned.toLowerCase().includes(query) ||
        schedule.personEmail.toLowerCase().includes(query),
    );
  }, [schedules, searchQuery]);

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDetailModalOpen(true);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) return;

    try {
      setIsSendingTest(true);
      setTestEmailResult(null);
      const response = await fetch("/api/v1/schedules/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestEmailResult({ success: true, message: data.message });
      } else {
        setTestEmailResult({ success: false, message: data.error || "Failed to send test email" });
      }
    } catch (error) {
      setTestEmailResult({ success: false, message: "Network error" });
      console.error("Failed to send test email:", error);
    } finally {
      setIsSendingTest(false);
    }
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
            {schedules.length} Schedule{schedules.length !== 1 ? "s" : ""}
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

      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedules..."
              className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
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

        {/* Test Email Section */}
        <div className="rounded-lg border border-emerald-700 bg-emerald-950/50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <EnvelopeIcon size={16} className="text-white" />
            <span className="text-sm font-medium text-white">Test Email System</span>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to test..."
              className="flex-1 rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={!testEmail.trim() || isSendingTest}
              className="inline-flex items-center gap-2 rounded-lg border border-white bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSendingTest ? (
                <>
                  <CircleNotchIcon size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <EnvelopeIcon size={16} />
                  Send Test
                </>
              )}
            </button>
          </div>
          {testEmailResult && (
            <div
              className={`mt-2 rounded-lg px-3 py-2 text-sm ${
                testEmailResult.success
                  ? "bg-emerald-700/30 text-emerald-200"
                  : "bg-red-700/30 text-red-200"
              }`}
            >
              {testEmailResult.message}
            </div>
          )}
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
        ) : filteredSchedules.length > 0 ? (
          <div className="space-y-3">
            {filteredSchedules.map((schedule) => {
              const nextDeadline = calculateNextDeadline(schedule.deadline, currentTime, schedule.createdAt);
              const diffMs = nextDeadline.getTime() - currentTime.getTime();
              const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

              return (
                <div
                  key={schedule.id}
                  className="relative rounded-lg border border-emerald-700 bg-emerald-950/50 p-4 transition hover:bg-emerald-800/50"
                >
                  <button
                    onClick={() => handleScheduleClick(schedule)}
                    className="w-full text-left"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="mb-1 text-sm font-medium text-white">
                          {schedule.title}
                        </h3>
                        <p className="text-xs text-white/60">
                          {formatDeadline(schedule.deadline)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          schedule.status === "active"
                            ? "bg-emerald-700 text-white"
                            : "bg-white/20 text-white/70"
                        }`}
                      >
                        {schedule.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/60">
                      <div className="flex items-center gap-1">
                        <UserIcon size={12} />
                        {schedule.personAssigned}
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon size={12} />
                        {days > 0 ? `${days}d ${hours}h` : `${hours}h`}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSchedule(e, schedule.id)}
                    disabled={deletingScheduleId === schedule.id}
                    className="absolute right-2 top-2 rounded p-1 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingScheduleId === schedule.id ? (
                      <CircleNotchIcon size={14} className="animate-spin text-white" />
                    ) : (
                      <TrashIcon size={14} className="text-white" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <CalendarIcon size={48} weight="duotone" className="mx-auto mb-4 text-white/40" />
            <p className="text-sm text-white/70">
              {searchQuery ? "No schedules found" : "No schedules yet. Click Add Schedule to get started."}
            </p>
          </div>
        )}
      </div>

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
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Person Assigned <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={personAssigned}
                    onChange={(e) => setPersonAssigned(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={personEmail}
                    onChange={(e) => setPersonEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
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
                disabled={!title.trim() || !personAssigned.trim() || !personEmail.trim() || isSubmitting}
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
