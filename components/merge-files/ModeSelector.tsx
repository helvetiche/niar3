"use client";

import { FilePdfIcon, FileXlsIcon } from "@phosphor-icons/react";
import type { MergeMode } from "@/lib/api/merge-files";

interface ModeSelectorProps {
  mode: MergeMode;
  onModeChange: (mode: MergeMode) => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onModeChange("pdf")}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
          mode === "pdf"
            ? "bg-white text-emerald-900"
            : "border border-white/40 text-white hover:bg-white/10"
        }`}
      >
        <FilePdfIcon size={16} />
        PDF
      </button>
      <button
        type="button"
        onClick={() => onModeChange("excel")}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
          mode === "excel"
            ? "bg-white text-emerald-900"
            : "border border-white/40 text-white hover:bg-white/10"
        }`}
      >
        <FileXlsIcon size={16} />
        Excel
      </button>
    </div>
  );
}
