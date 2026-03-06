"use client";

import {
  getFileNameFromContentDisposition,
  FormDataBuilder,
  handleApiError,
} from "@/lib/api/api-client-utils";

export type GenerateSwrftPayload = {
  templateId: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  months?: number[];
  includeFirstHalf?: boolean;
  includeSecondHalf?: boolean;
  customTasks?: string[];
};

export type GenerateSwrftResult = {
  blob: Blob;
  fileName: string;
};

export const generateSwrft = async (
  payload: GenerateSwrftPayload,
): Promise<GenerateSwrftResult> => {
  const formData = new FormDataBuilder()
    .append("templateId", payload.templateId.trim())
    .appendOptional("firstName", payload.firstName)
    .appendOptional("lastName", payload.lastName)
    .appendOptional("designation", payload.designation)
    .appendBoolean("includeFirstHalf", payload.includeFirstHalf)
    .appendBoolean("includeSecondHalf", payload.includeSecondHalf)
    .build();

  if (payload.months && payload.months.length > 0) {
    formData.append("months", JSON.stringify(payload.months));
  }
  if (payload.customTasks && payload.customTasks.length > 0) {
    formData.append("customTasks", JSON.stringify(payload.customTasks));
  }

  const response = await fetch("/api/v1/generate-swrft", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to generate accomplishment report");
  }

  const blob = await response.blob();
  const fileName = getFileNameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    "Accomplishment Report.xlsx",
  );

  return { blob, fileName };
};
