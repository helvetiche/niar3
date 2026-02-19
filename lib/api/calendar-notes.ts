"use client";

export type NoteItem = { text: string; color: string };

export type ApiErrorResponse = { error?: string };

const parseApiError = async (res: Response): Promise<string> => {
  const data = (await res.json().catch(() => ({}))) as ApiErrorResponse;
  return data.error ?? "Unknown error";
};

export async function fetchCalendarNotes(): Promise<
  Record<string, NoteItem[]>
> {
  const res = await fetch("/api/v1/calendar-notes", { credentials: "include" });
  if (!res.ok) {
    const message = await parseApiError(res);
    throw new Error(message || "Failed to load notes");
  }
  return res.json();
}

export async function saveCalendarNotesForDate(
  dateKey: string,
  items: NoteItem[],
): Promise<void> {
  const res = await fetch(`/api/v1/calendar-notes/${dateKey}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const message = await parseApiError(res);
    throw new Error(message || "Failed to save notes");
  }
}
