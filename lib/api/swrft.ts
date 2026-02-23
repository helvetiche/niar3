"use client";

export type GenerateSwrftRequest = {
  fullName: string;
  reportType: string;
  year: number;
  templateId: string;
};

export async function generateSwrft(
  request: GenerateSwrftRequest,
): Promise<Blob> {
  const response = await fetch("/api/v1/generate-swrft", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to generate SWRFT",
    );
  }

  return response.blob();
}
