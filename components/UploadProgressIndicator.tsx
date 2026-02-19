"use client";

import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";

type UploadProgressIndicatorProps = {
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  fileName?: string;
  status?: "uploading" | "success" | "error";
  error?: string | null;
};

export function UploadProgressIndicator({
  progress,
  uploadedBytes,
  totalBytes,
  fileName,
  status = "uploading",
  error,
}: UploadProgressIndicatorProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const isComplete = status === "success" || progress >= 100;
  const hasError = status === "error" || error;

  return (
    <div className="rounded-lg border border-white/35 bg-white/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete && (
            <CheckCircleIcon size={20} weight="fill" className="text-white" />
          )}
          {hasError && (
            <WarningCircleIcon
              size={20}
              weight="fill"
              className="text-red-400"
            />
          )}
          <span className="text-sm font-medium text-white">
            {fileName || "Uploading file"}
          </span>
        </div>
        <span className="text-sm text-white/80">{progress}%</span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-emerald-950/80 ring-1 ring-white/20">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${
            hasError ? "bg-red-400" : "bg-white"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-white/70">
        <span>
          {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
        </span>
        {!hasError && !isComplete && (
          <span>
            {Math.ceil((totalBytes - uploadedBytes) / (1024 * 1024))} MB
            remaining
          </span>
        )}
      </div>

      {hasError && error && (
        <p className="mt-2 text-xs text-red-300">{error}</p>
      )}
    </div>
  );
}
