"use client";

import { useRef } from "react";
import { UploadSimpleIcon, FileXlsIcon } from "@phosphor-icons/react";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label: string;
  description: string;
}

export function FileUploadZone({
  onFilesSelected,
  accept = ".xlsx,.xls",
  multiple = true,
  label,
  description,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const processFiles = (fileList: FileList | null) => {
    onFilesSelected(Array.from(fileList ?? []));
  };

  return (
    <div className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
        <FileXlsIcon size={18} className="text-white" />
        {label}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-label={label}
        onChange={(e) => processFiles(e.target.files)}
        className="hidden"
      />

      <button
        type="button"
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          processFiles(e.dataTransfer.files);
        }}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/10 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/15"
      >
        <UploadSimpleIcon size={34} className="text-white" />
        <span className="font-medium">
          Drag and drop files, or click to browse
        </span>
      </button>

      <div className="mt-2 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
          <FileXlsIcon size={12} className="text-white" />
          Supported: {accept}
        </span>
      </div>

      <p className="mt-2 text-xs text-white/80">{description}</p>
    </div>
  );
}
