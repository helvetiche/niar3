"use client";

import type { UserProfile } from "@/types/profile";

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch("/api/v1/profile", { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to load profile",
    );
  }
  return res.json();
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const res = await fetch("/api/v1/profile", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to save profile",
    );
  }
}
