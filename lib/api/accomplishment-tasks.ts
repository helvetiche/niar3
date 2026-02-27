"use client";

export type AccomplishmentTaskDesignation =
  | "SWRFT"
  | "WRFOB"
  | "Senior Engineer A"
  | "Senior Engineer B"
  | "Engineer A"
  | "Administrative Aide";

export type AccomplishmentTask = {
  id: string;
  label: string;
  designation: AccomplishmentTaskDesignation;
  createdAt: number;
};

export const fetchAccomplishmentTasks = async (): Promise<
  AccomplishmentTask[]
> => {
  const res = await fetch("/api/v1/accomplishment-tasks", {
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      (data as { error?: string }).error ??
        "Failed to load accomplishment tasks",
    );
  }
  return res.json();
};

export const createAccomplishmentTask = async (
  label: string,
  designation: AccomplishmentTaskDesignation = "SWRFT",
): Promise<AccomplishmentTask> => {
  const res = await fetch("/api/v1/accomplishment-tasks", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, designation }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to create accomplishment task");
  }
  return res.json();
};

export const deleteAccomplishmentTask = async (
  taskId: string,
): Promise<void> => {
  const res = await fetch(
    `/api/v1/accomplishment-tasks/${encodeURIComponent(taskId)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to delete accomplishment task");
  }
};
