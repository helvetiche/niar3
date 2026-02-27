"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowsMergeIcon,
  DownloadSimpleIcon,
  FileXlsIcon,
  UploadSimpleIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { WorkspaceStepper } from "@/components/WorkspaceStepper";
import { consolidateIfrFile } from "@/lib/api/consolidate-ifr";
import { TemplateManagerInline } from "@/components/TemplateManagerInline";
import { downloadBlob, getErrorMessage } from "@/lib/utils";
import { useTemplates } from "@/hooks/useTemplates";

const defaultOutputFileName = "DIVISION X CONSOLIDATED";
const defaultDivision = "0";
const defaultIA = "IA";

export function ConsolidateIfrToolStepped() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [fileName, setFileName] = useState(defaultOutputFileName);
  const [division, setDivision] = useState(defaultDivision);
  const [ia, setIA] = useState(defaultIA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ifrInputRef = useRef<HTMLInputElement | null>(null);
  const { data: consolidateTemplates = [] } = useTemplates("consolidate-ifr");

  const handleIfrFileSelection = (incoming: FileList | null) => {
    setFiles(Array.from(incoming ?? []));
  };

  const handleConsolidate = async () => {
    if (files.length === 0) {
      toast.error("Please upload one or more IFR Excel files.");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("Please select a saved consolidation template.");
      return;
    }

    setIsSubmitting(true);
    const loadingToastId = toast.loading("Consolidating files...");

    try {
      const result = await consolidateIfrFile({
        files,
        templateId: selectedTemplateId,
        fileName: fileName.trim(),
        division: division.trim(),
        ia: ia.trim(),
      });

      const ifrBaseName = fileName.trim() || defaultOutputFileName;
      const outputFilename = ifrBaseName.endsWith(".xlsx")
        ? ifrBaseName
        : `${ifrBaseName}.xlsx`;
      downloadBlob(result.blob, outputFilename);

      const skippedMessage =
        result.skippedCount > 0
          ? ` Skipped ${String(result.skippedCount)} item(s): ${result.skippedDetails
              .map((detail) => `${detail.fileName}: ${detail.reason}`)
              .join("; ")}`
          : "";
      toast.dismiss(loadingToastId);
      toast.success(
        `Consolidated ${String(result.consolidatedCount)} file(s).${skippedMessage}`,
      );
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getErrorMessage(error, "Failed to consolidate IFR."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    {
      title: "Upload Files",
      description: "Select IFR files",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Upload IFR Files</h3>
            <p className="mt-1 text-sm text-white/80">
              Upload one or more IFR Excel files to consolidate.
            </p>
          </div>

          <input
            id="consolidate-file-input"
            ref={ifrInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={(event) => {
              handleIfrFileSelection(event.target.files);
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => ifrInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleIfrFileSelection(event.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/5 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/10"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              Drag and drop IFR files here, or click to browse
            </span>
          </button>

          {files.length > 0 && (
            <div className="rounded-xl border border-white/35 bg-white/5 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <CheckCircleIcon size={16} className="text-white" />
                {files.length} file(s) selected
              </p>
              <ul className="space-y-1 text-sm text-white/80">
                {files.map((file, idx) => (
                  <li key={idx} className="truncate">
                    • {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Template",
      description: "Select template",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Select Template</h3>
            <p className="mt-1 text-sm text-white/80">
              Choose a saved consolidation template for the output.
            </p>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <FileXlsIcon size={16} className="text-white" />
              Consolidation Template
            </p>
            <TemplateManagerInline
              scope="consolidate-ifr"
              selectedTemplateId={selectedTemplateId}
              onSelectedTemplateIdChange={setSelectedTemplateId}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Configure",
      description: "Output settings",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Configure Output</h3>
            <p className="mt-1 text-sm text-white/80">
              Set the output file name, division, and IA values.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block" htmlFor="output-file-name-input">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
                <DownloadSimpleIcon size={16} className="text-white" />
                File Name
              </span>
              <input
                id="output-file-name-input"
                type="text"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder={defaultOutputFileName}
              />
              <span className="mt-2 block text-xs leading-5 text-white/70">
                Downloaded workbook name
              </span>
            </label>

            <label className="block" htmlFor="division-input">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
                <ArrowsMergeIcon size={16} className="text-white" />
                DIVISION
              </span>
              <input
                id="division-input"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={division}
                onChange={(event) =>
                  setDivision(event.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder={defaultDivision}
              />
              <span className="mt-2 block text-xs leading-5 text-white/70">
                Written to column O
              </span>
            </label>

            <label className="block" htmlFor="ia-input">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
                <FileXlsIcon size={16} className="text-white" />
                IA
              </span>
              <input
                id="ia-input"
                type="text"
                value={ia}
                onChange={(event) => setIA(event.target.value)}
                className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder={defaultIA}
              />
              <span className="mt-2 block text-xs leading-5 text-white/70">
                Written to column N
              </span>
            </label>
          </div>
        </div>
      ),
    },
    {
      title: "Review",
      description: "Consolidate",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Review & Consolidate
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Review your configuration and consolidate the files.
            </p>
          </div>

          <div className="rounded-lg border border-white/30 bg-white/5 p-4">
            <h4 className="mb-3 text-sm font-medium text-white">Summary</h4>
            <div className="space-y-2 text-sm text-white/90">
              <p>
                <span className="text-white/70">IFR Files:</span> {files.length}
              </p>
              <p>
                <span className="text-white/70">Template:</span>{" "}
                {selectedTemplateId
                  ? consolidateTemplates.find(
                      (t) => t.id === selectedTemplateId,
                    )?.name || selectedTemplateId
                  : "Not selected"}
              </p>
              <p>
                <span className="text-white/70">Output Name:</span>{" "}
                {fileName || defaultOutputFileName}
              </p>
              <p>
                <span className="text-white/70">Division:</span>{" "}
                {division || defaultDivision}
              </p>
              <p>
                <span className="text-white/70">IA:</span> {ia || defaultIA}
              </p>
            </div>
          </div>
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
          Consolidate Billing Unit
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <FileXlsIcon size={12} className="text-white" />
            IFR Consolidation
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <DownloadSimpleIcon size={12} className="text-white" />
            Template Output
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85">
          Follow the steps below to consolidate billing units.
        </p>
      </div>

      <WorkspaceStepper
        steps={steps}
        onComplete={() => void handleConsolidate()}
        canProceed={(step) => {
          if (step === 0) return files.length > 0;
          if (step === 1) return !!selectedTemplateId;
          return true;
        }}
        completeButtonText={isSubmitting ? "Consolidating..." : "Consolidate"}
      />
    </section>
  );
}
