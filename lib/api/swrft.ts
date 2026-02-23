"use client";

export type GenerateSwrftPayload = {
  templateId: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  months?: number[];
  includeFirstHalf?: boolean;
  includeSecondHalf?: boolean;
};

export type GenerateSwrftResult = {
  blob: Blob;
  fileName: string;
};

export const generateSwrft = async (
  payload: GenerateSwrftPayload,
): Promise<GenerateSwrftResult> => {
  const formData = new FormData();
  formData.append("templateId", payload.templateId.trim());
  if (payload.firstName?.trim()) {
    formData.append("firstName", payload.firstName.trim());
  }
  if (payload.lastName?.trim()) {
    formData.append("lastName", payload.lastName.trim());
  }
  if (payload.designation?.trim()) {
    formData.append("designation", payload.designation.trim());
  }
  if (payload.months && payload.months.length > 0) {
    formData.append("months", JSON.stringify(payload.months));
  }
  if (payload.includeFirstHalf !== undefined) {
    formData.append("includeFirstHalf", String(payload.includeFirstHalf));
  }
  if (payload.includeSecondHalf !== undefined) {
    formData.append("includeSecondHalf", String(payload.includeSecondHalf));
  }

  const response = await fetch("/api/v1/generate-swrft", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error ?? "Failed to generate SWRFT reports");
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("Content-Disposition");
  let fileName = "SWRFT Accomplishment Report.xlsx";
  if (contentDisposition) {
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      fileName = decodeURIComponent(utf8Match[1]).trim() || fileName;
    } else {
      const simpleMatch = contentDisposition.match(/filename="([^"]+)"/i);
      if (simpleMatch?.[1]) {
        fileName = simpleMatch[1].trim() || fileName;
      }
    }
  }
  return { blob, fileName };
};
