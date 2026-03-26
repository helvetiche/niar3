"use client";

import {
  CheckCircleIcon,
  ClockIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  XIcon,
  CaretDownIcon,
  CircleNotchIcon,
  PencilSimpleIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useState, useMemo, useEffect } from "react";
import { MasonryModal } from "@/components/MasonryModal";
import type { AccomplishmentTask } from "@/lib/api/accomplishment-tasks";

const DESIGNATION_OPTIONS = [
  "SWRFT",
  "WRFOB",
  "Senior Engineer A",
  "Senior Engineer B",
  "Engineer A",
  "Administrative Aide",
] as const;

export function TaskManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<AccomplishmentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AccomplishmentTask | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskDesignation, setNewTaskDesignation] = useState<
    (typeof DESIGNATION_OPTIONS)[number]
  >("SWRFT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/v1/accomplishment-tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskLabel.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/v1/accomplishment-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newTaskLabel.trim(),
          designation: newTaskDesignation,
        }),
      });

      if (response.ok) {
        setNewTaskLabel("");
        setNewTaskDesignation("SWRFT");
        setIsAddModalOpen(false);
        await fetchTasks();
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (
    e: React.MouseEvent,
    taskId: string,
  ) => {
    e.stopPropagation();
    if (deletingTaskId) return;

    try {
      setDeletingTaskId(taskId);
      const response = await fetch(
        `/api/v1/accomplishment-tasks/${taskId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;

    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.label.toLowerCase().includes(query) ||
        task.designation.toLowerCase().includes(query),
    );
  }, [tasks, searchQuery]);

  const taskGroups = useMemo(() => {
    if (searchQuery.trim()) return [];

    const groups = DESIGNATION_OPTIONS.map((designation) => ({
      type: designation,
      label: designation,
      tasks: filteredTasks.filter((t) => t.designation === designation),
    })).filter((group) => group.tasks.length > 0);

    return groups;
  }, [filteredTasks, searchQuery]);

  const handleTaskClick = (task: AccomplishmentTask) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <header className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white sm:text-2xl">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <ListChecksIcon size={20} className="text-white" />
          </span>
          Task Manager
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <CheckCircleIcon size={12} className="text-white" />
            {tasks.length} Task{tasks.length !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <TagIcon size={12} className="text-white" />
            By Designation
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-white/85">
          Manage and track your accomplishment tasks with status updates.
        </p>
      </header>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
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
          Add Task
        </button>
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
        ) : (
          <>
            {searchQuery.trim() && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-white/70">
                    Search Results
                  </h3>
                  <span className="text-xs text-white/60">
                    {filteredTasks.length} task
                    {filteredTasks.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="relative flex items-center gap-3 rounded-lg border border-emerald-700 bg-emerald-950/50 p-3 transition hover:bg-emerald-800/50"
                      >
                        <button
                          onClick={() => handleTaskClick(task)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="mb-1 line-clamp-2 text-sm font-medium text-white">
                            {task.label}
                          </p>
                          <p className="text-xs text-white/60">
                            {task.designation}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTask(e, task.id)}
                          disabled={deletingTaskId === task.id}
                          className="rounded p-1 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <MagnifyingGlassIcon
                        size={48}
                        weight="duotone"
                        className="mx-auto mb-4 text-white/40"
                      />
                      <p className="text-sm text-white/70">No tasks found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!searchQuery.trim() && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-white/70">
                  By Designation
                </h3>
                {taskGroups.length > 0 ? (
                  taskGroups.map((group) => (
                    <div
                      key={group.type}
                      className="rounded-lg border border-emerald-700 bg-emerald-950/50"
                    >
                      <button
                        onClick={() =>
                          setExpandedType(
                            expandedType === group.type ? null : group.type,
                          )
                        }
                        className="flex w-full items-center justify-between p-3 transition hover:bg-emerald-800/50"
                      >
                        <div className="flex flex-1 items-center justify-between">
                          <span className="text-sm font-medium text-white">
                            {group.label}
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-emerald-900">
                            {group.tasks.length}
                          </span>
                        </div>
                        <CaretDownIcon
                          size={16}
                          className={`ml-2 flex-shrink-0 text-white transition-transform ${
                            expandedType === group.type ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {expandedType === group.type && (
                        <div className="space-y-2 border-t border-emerald-700 p-3">
                          {group.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="relative flex items-center gap-3 rounded-lg border border-emerald-700/50 bg-emerald-900/50 p-2 transition hover:bg-emerald-800/50"
                            >
                              <button
                                onClick={() => handleTaskClick(task)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className="line-clamp-2 text-sm font-medium text-white">
                                  {task.label}
                                </p>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTask(e, task.id)}
                                disabled={deletingTaskId === task.id}
                                className="rounded p-1 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <ListChecksIcon
                      size={48}
                      weight="duotone"
                      className="mx-auto mb-4 text-white/40"
                    />
                    <p className="text-sm text-white/70">
                      No tasks yet. Click Add Task to get started.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Task Modal */}
      <MasonryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
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
                Add Task
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
                  Task Label
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
                      e.target.value as (typeof DESIGNATION_OPTIONS)[number],
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
                disabled={!newTaskLabel.trim() || isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
              >
                <PlusIcon size={18} />
                {isSubmitting ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        )}
      </MasonryModal>

      {/* Task Detail Modal */}
      <MasonryModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        panelClassName="max-w-md"
        animateFrom="bottom"
      >
        {(close) => (
          <div className="rounded-2xl border border-white/40 bg-emerald-900 p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Task Details</h3>
              <button
                type="button"
                onClick={close}
                className="rounded p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <XIcon size={20} weight="bold" />
              </button>
            </div>
            {selectedTask && (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-700 bg-emerald-950/50 p-4">
                  <p className="mb-2 text-sm font-medium text-white">
                    {selectedTask.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <TagIcon size={14} className="text-white/60" />
                    <span className="text-xs text-white/70">
                      {selectedTask.designation}
                    </span>
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
