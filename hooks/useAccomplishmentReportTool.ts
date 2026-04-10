import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTemplates } from "@/hooks/useTemplates";
import { useAccomplishmentTasks } from "@/hooks/useAccomplishmentTasks";
import { generateAccomplishmentReport } from "@/lib/api/accomplishment-report";
import {
  createAccomplishmentTask,
  deleteAccomplishmentTask,
  type AccomplishmentTaskDesignation,
} from "@/lib/api/accomplishment-tasks";
import { downloadBlob, getErrorMessage } from "@/lib/utils";

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useAccomplishmentReportTool() {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([...ALL_MONTHS]);
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
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isOverlayOpaque, setIsOverlayOpaque] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const elapsedIntervalRef = useRef<number | null>(null);

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    mutate: mutateTasks,
  } = useAccomplishmentTasks();

  const { data: accomplishmentReportTemplates = [] } = useTemplates(
    "accomplishment-report"
  );

  // Auto-select the first template when templates are loaded
  useEffect(() => {
    if (accomplishmentReportTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(accomplishmentReportTemplates[0].id);
    }
  }, [accomplishmentReportTemplates, selectedTemplateId]);

  useEffect(() => {
    return () => {
      if (elapsedIntervalRef.current !== null) {
        clearInterval(elapsedIntervalRef.current);
      }
    };
  }, []);

  const startTimer = () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
    }
    elapsedIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  };

  const showOverlay = () => {
    setIsOverlayVisible(true);
    setIsOverlayOpaque(false);
    window.requestAnimationFrame(() => {
      setIsOverlayOpaque(true);
    });
  };

  const hideOverlay = async (fadeMs: number) => {
    setIsOverlayOpaque(false);
    await wait(fadeMs);
    setIsOverlayVisible(false);
  };

  const selectedTask = selectedTaskId
    ? (tasks.find((t) => t.id === selectedTaskId) ?? null)
    : null;
  const designation = selectedTask?.designation ?? "SWRFT";

  const filteredTasks = useMemo(() => {
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
  }, [tasks, taskSearchQuery, taskDesignationFilter]);

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
    const name = fullName.trim();
    if (!name) {
      toast.error("Please enter your full name.");
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
    setIsFinalizing(false);
    setElapsedSeconds(0);
    showOverlay();
    startTimer();

    try {
      const customTasks = selectedTask ? [selectedTask.label] : undefined;

      const result = await generateAccomplishmentReport({
        templateId: selectedTemplateId,
        firstName: name,
        lastName: "",
        designation,
        months: selectedMonths,
        includeFirstHalf,
        includeSecondHalf,
        customTasks,
      });

      setIsFinalizing(true);

      downloadBlob(result.blob, result.fileName);
      const count =
        selectedMonths.length * (includeFirstHalf ? 1 : 0) +
        selectedMonths.length * (includeSecondHalf ? 1 : 0);
      toast.success(
        `Downloaded merged accomplishment report with ${String(count)} period sheet(s).`
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate accomplishment report."));
    } finally {
      stopTimer();
      await hideOverlay(300);
      setIsSubmitting(false);
    }
  };

  const canProceedToStep = (step: number): boolean => {
    if (step === 0) return !!fullName.trim();
    if (step === 2)
      return selectedMonths.length > 0 && (includeFirstHalf || includeSecondHalf);
    return true;
  };

  return {
    // State
    selectedTemplateId,
    fullName,
    selectedMonths,
    includeFirstHalf,
    includeSecondHalf,
    isSubmitting,
    selectedTaskId,
    selectedTask,
    designation,
    newTaskLabel,
    newTaskDesignation,
    isAddingTask,
    deletingTaskId,
    taskSearchQuery,
    taskDesignationFilter,
    isTaskModalOpen,
    tasks,
    isTasksLoading,
    accomplishmentReportTemplates,
    filteredTasks,
    isOverlayVisible,
    isOverlayOpaque,
    elapsedSeconds,
    isFinalizing,
    // Setters
    setSelectedTemplateId,
    setFullName,
    setIncludeFirstHalf,
    setIncludeSecondHalf,
    setNewTaskLabel,
    setNewTaskDesignation,
    setTaskSearchQuery,
    setTaskDesignationFilter,
    setIsTaskModalOpen,
    // Handlers
    handleTaskToggle,
    handleAddTask,
    handleDeleteTask,
    handleMonthToggle,
    handleSelectAllMonths,
    handleDeselectAllMonths,
    handleGenerate,
    canProceedToStep,
  };
}
