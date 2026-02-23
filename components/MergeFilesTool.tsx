"use client";

import {
  ArrowsMergeIcon,
  DownloadSimpleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { useMergeFiles } from "@/hooks/useMergeFiles";
import { ModeSelector } from "@/components/merge-files/ModeSelector";
import { FileList } from "@/components/merge-files/FileList";

export function MergeFilesTool() {
  const {
    fileInputRef,
    mode,
    files,
    pdfPages,
    excelPageNames,
    fileName,
    isSubmitting,
    isPreparingPages,
    defaultFileName,
    processIncomingFiles,
    changeMergeMode,
    removeFile,
    updateExcelPageName,
    executeMerge,
    clearAll,
    setFileName,
  } = useMergeFiles();

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <ArrowsMergeIcon size={18} className="text-white" />
          </span>
          Merge Files
        </h2>
        <p className="mt-2 text-sm text-white/85 text-justify">
          Combine multiple PDF or Excel files into a single document. For PDFs,
          reorder pages as needed. For Excel, customize sheet names in the
          merged workbook.
        </p>
      </div>

      <ModeSelector mode={mode} onModeChange={changeMergeMode} />

      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={mode === "pdf" ? ".pdf" : ".xlsx,.xls"}
          multiple
          aria-label={`Upload ${mode} files`}
          onChange={(e) => processIncomingFiles(e.target.files)}
          className="hidden"
        />

        <button
          type="button"
          aria-label={`Choose ${mode} files`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            processIncomingFiles(e.dataTransfer.files);
          }}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/10 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/15"
        >
          <UploadSimpleIcon size={34} className="text-white" />
          <span className="font-medium">
            Drag and drop {mode.toUpperCase()} files, or click to browse
          </span>
        </button>
      </div>

      {isPreparingPages && (
        <p className="mt-3 text-sm text-white/80">Preparing pages...</p>
      )}

      <FileList
        mode={mode}
        files={files}
        pdfPages={pdfPages}
        excelPageNames={excelPageNames}
        onRemoveFile={removeFile}
        onExcelPageNameChange={updateExcelPageName}
      />

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-medium text-white/90">
          Output File Name
        </span>
        <input
          type="text"
          aria-label="Set output file name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder={defaultFileName}
        />
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Merge files"
          onClick={() => {
            void executeMerge();
          }}
          disabled={isSubmitting || files.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
        >
          <DownloadSimpleIcon size={18} />
          {isSubmitting ? "Merging..." : "Merge and Download"}
        </button>

        <button
          type="button"
          aria-label="Clear files"
          onClick={clearAll}
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg border border-white/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/60"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
