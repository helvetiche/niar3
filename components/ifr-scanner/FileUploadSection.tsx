"use client";

import { FileXlsIcon, UploadSimpleIcon } from "@phosphor-icons/react";

type FileUploadSectionProps = {
  onFilesSelected: (files: FileList | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

export function FileUploadSection({
  onFilesSelected,
  inputRef,
}: FileUploadSectionProps) {
  return (
    <div className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
        <FileXlsIcon size={18} className="text-white" />
        IFR Source Files (Required)
      </span>

      <input
        id="source-files-input"
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        multiple
        aria-label="Upload one or more source Excel files"
        onChange={(event) => onFilesSelected(event.target.files)}
        className="hidden"
      />

      <button
        type="button"
        aria-label="Choose source Excel files"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onFilesSelected(event.dataTransfer.files);
        }}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/10 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/15"
      >
        <UploadSimpleIcon size={34} className="text-white" />
        <span className="font-medium">
          Drag and drop IFR source files, or click to browse
        </span>
      </button>

      <div className="mt-2 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
          <FileXlsIcon size={12} className="text-white" />
          Supported: .xlsx, .xls
        </span>
      </div>

      <p className="mt-2 text-xs text-white/80">
        Upload one or many .xlsx/.xls files. Each uploaded file is processed as
        a separate division folder in the ZIP with one{" "}
        <span className="font-medium">billing unit</span> subfolder.
      </p>
    </div>
  );
}
