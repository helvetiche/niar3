"use client";

import {
  FilePdfIcon,
  FileXlsIcon,
  ArrowsDownUpIcon,
} from "@phosphor-icons/react";
import type { PdfPageOrderItem } from "@/lib/api/merge-files";

type PdfPageItem = PdfPageOrderItem & {
  id: string;
  label: string;
};

interface FileListProps {
  mode: "pdf" | "excel";
  files: File[];
  pdfPages: PdfPageItem[];
  excelPageNames: Record<string, string>;
  onRemoveFile: (index: number) => void;
  onExcelPageNameChange: (fileIndex: number, value: string) => void;
}

export function FileList({
  mode,
  files,
  pdfPages,
  excelPageNames,
  onRemoveFile,
  onExcelPageNameChange,
}: FileListProps) {
  if (files.length === 0) return null;

  return (
    <section className="mt-4 rounded-xl border border-white/35 bg-white/10 p-4">
      <p className="flex items-center gap-2 text-sm text-white">
        {mode === "pdf" ? (
          <FilePdfIcon size={16} className="text-white" />
        ) : (
          <FileXlsIcon size={16} className="text-white" />
        )}
        Selected files: {String(files.length)}
      </p>

      {mode === "pdf" && pdfPages.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-white/80">
            Drag pages to reorder. Final PDF will follow this sequence.
          </p>
          {pdfPages.map((page, index) => (
            <div
              key={page.id}
              draggable
              onDragStart={() => {
                const event = new CustomEvent("dragstart", { detail: index });
                window.dispatchEvent(event);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const event = new CustomEvent("drop", { detail: index });
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white cursor-move hover:bg-white/15"
            >
              <ArrowsDownUpIcon size={14} className="text-white/70" />
              <span>{page.label}</span>
            </div>
          ))}
        </div>
      )}

      {mode === "excel" && (
        <div className="mt-4 space-y-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="rounded-lg border border-white/30 bg-white/10 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  className="text-xs text-white/70 hover:text-white underline"
                >
                  Remove
                </button>
              </div>
              <label className="mt-2 block">
                <span className="mb-1 block text-xs text-white/85">
                  Sheet name in merged workbook
                </span>
                <input
                  type="text"
                  value={excelPageNames[index] || ""}
                  onChange={(e) => onExcelPageNameChange(index, e.target.value)}
                  className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder={`Sheet ${index + 1}`}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
