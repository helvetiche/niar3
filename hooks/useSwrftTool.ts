import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTemplates } from "@/hooks/useTemplates";
import { useAccomplishmentTasks } from "@/hooks/useAccomplishmentTasks";
import { generateSwrft } from "@/lib/api/swrft";
import {
  createAccomplishmentTask,
  deleteAccomplishmentTask,
  type AccomplishmentTaskDesignation,
} from "@/lib/api/accomplishment-tasks";
import { downloadBlob, getErrorMessage } from "@/lib/utils";

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function useSwrftTool() {
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

  const canProceedToStep = (step: number): boolean => {
    if (step === 0)
      return !!selectedTemplateId && !!firstName.trim() && !!lastName.trim();
    if (step === 2)
      return (
        selectedMonths.length > 0 && (includeFirstHalf || includeSecondHalf)
      );
    return true;
  };

  return {
    // State
    selectedTemplateId,
    firstName,
    lastName,
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
    swrftTemplates,
    filteredTasks,
    // Setters
    setSelectedTemplateId,
    setFirstName,
    setLastName,
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
