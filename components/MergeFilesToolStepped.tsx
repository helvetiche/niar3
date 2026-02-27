"use client";

import {
  ArrowsMergeIcon,
  UploadSimpleIcon,
  FilePdfIcon,
  MicrosoftExcelLogoIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { WorkspaceStepper } from "@/components/WorkspaceStepper";
import { useMergeFiles } from "@/hooks/useMergeFiles";
import { FileList } from "@/components/merge-files/FileList";

export function MergeFilesToolStepped() {
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
    setFileName,
  } = useMergeFiles();

  const steps = [
    {
      title: "Select Mode",
      description: "PDF or Excel",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Select File Type</h3>
            <p className="mt-1 text-sm text-white/80">
              Choose whether you want to merge PDF or Excel files.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => changeMergeMode("pdf")}
              className={`flex flex-col items-center gap-3 rounded-xl border p-6 transition ${
                mode === "pdf"
                  ? "border-2 border-white bg-white/30"
                  : "border border-white/40 bg-white/5 hover:bg-white/10"
              }`}
            >
              <FilePdfIcon size={32} weight="duotone" className="text-white" />
              <div className="text-center">
                <p className="font-medium text-white">PDF Files</p>
                <p className="mt-1 text-xs text-white/70">
                  Merge and reorder PDF pages
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => changeMergeMode("excel")}
              className={`flex flex-col items-center gap-3 rounded-xl border p-6 transition ${
                mode === "excel"
                  ? "border-2 border-white bg-white/30"
                  : "border border-white/40 bg-white/5 hover:bg-white/10"
              }`}
            >
              <MicrosoftExcelLogoIcon
                size={32}
                weight="duotone"
                className="text-white"
              />
              <div className="text-center">
                <p className="font-medium text-white">Excel Files</p>
                <p className="mt-1 text-xs text-white/70">
                  Combine into one workbook
                </p>
              </div>
            </button>
          </div>
        </div>
      ),
    },
    {
      title: "Upload Files",
      description: "Select files",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Upload Files</h3>
            <p className="mt-1 text-sm text-white/80">
              Upload {mode.toUpperCase()} files to merge.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={mode === "pdf" ? ".pdf" : ".xlsx,.xls"}
            multiple
            onChange={(e) => processIncomingFiles(e.target.files)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              processIncomingFiles(e.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/5 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/10"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              Drag and drop {mode.toUpperCase()} files, or click to browse
            </span>
          </button>

          {isPreparingPages && (
            <p className="text-sm text-white/80">Preparing pages...</p>
          )}

          {files.length > 0 && (
            <div className="rounded-xl border border-white/35 bg-white/5 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <CheckCircleIcon size={16} className="text-white" />
                {files.length} file(s) selected
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Configure",
      description: "Order & name",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Configure Files
            </h3>
            <p className="mt-1 text-sm text-white/80">
              {mode === "pdf"
                ? "Reorder pages and set output name."
                : "Customize sheet names and set output name."}
            </p>
          </div>

          <FileList
            mode={mode}
            files={files}
            pdfPages={pdfPages}
            excelPageNames={excelPageNames}
            onRemoveFile={removeFile}
            onExcelPageNameChange={updateExcelPageName}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/90">
              Output File Name
            </span>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder={defaultFileName}
            />
          </label>
        </div>
      ),
    },
  ];

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-3 shadow-xl shadow-emerald-950/30 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <ArrowsMergeIcon size={18} className="text-white" />
          </span>
          Merge Files
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <FilePdfIcon size={12} className="text-white" />
            PDF Merge
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <MicrosoftExcelLogoIcon size={12} className="text-white" />
            Excel Merge
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85">
          Follow the steps below to merge your files.
        </p>
      </div>

      <WorkspaceStepper
        steps={steps}
        onComplete={() => void executeMerge()}
        canProceed={(step) => {
          if (step === 1) return files.length > 0;
          return true;
        }}
        completeButtonText={isSubmitting ? "Merging..." : "Merge & Download"}
      />
    </section>
  );
}
