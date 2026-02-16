"use client";

export type NoteItem = { text: string; color: string };

export async function fetchCalendarNotes(): Promise<
  Record<string, NoteItem[]>
> {
  const res = await fetch("/api/v1/calendar-notes", { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to load notes",
    );
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
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to save notes",
    );
  }
}
