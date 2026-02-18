"use client";

import { useRef, useState } from "react";
import {
  ArrowsMergeIcon,
  DownloadSimpleIcon,
  FileXlsIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { consolidateIfrFile } from "@/lib/api/consolidate-ifr";
import { TemplateManager } from "@/components/TemplateManager";

const defaultOutputFileName = "DIVISION X CONSOLIDATED";
const defaultDivision = "0";
const defaultIA = "IA";

export function ConsolidateIfrTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [fileName, setFileName] = useState(defaultOutputFileName);
  const [division, setDivision] = useState(defaultDivision);
  const [ia, setIA] = useState(defaultIA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const ifrInputRef = useRef<HTMLInputElement | null>(null);

  const handleIfrFileSelection = (incoming: FileList | null) => {
    setFiles(Array.from(incoming ?? []));
  };

  const handleConsolidate = async () => {
    if (files.length === 0) {
      setMessage("Please upload one or more IFR Excel files.");
      return;
    }
    if (!selectedTemplateId) {
      setMessage("Please select a saved consolidation template.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Consolidating files...");

    try {
      const result = await consolidateIfrFile({
        files,
        templateId: selectedTemplateId,
        fileName: fileName.trim(),
        division: division.trim(),
        ia: ia.trim(),
      });

      const blobUrl = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      const ifrBaseName = fileName.trim() || defaultOutputFileName;
      link.href = blobUrl;
      link.download = ifrBaseName.endsWith(".xlsx")
        ? ifrBaseName
        : `${ifrBaseName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      const skippedMessage =
        result.skippedCount > 0
          ? `\nSkipped ${String(result.skippedCount)} item(s):\n${result.skippedDetails
              .map((detail) => `- ${detail.fileName}: ${detail.reason}`)
              .join("\n")}`
          : "";
      setMessage(
        `Success. Consolidated ${String(result.consolidatedCount)} file(s).${skippedMessage}`,
      );
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Failed to consolidate IFR.";
      setMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setSelectedTemplateId("");
    setFileName(defaultOutputFileName);
    setDivision(defaultDivision);
    setIA(defaultIA);
    setMessage("");
    if (ifrInputRef.current) ifrInputRef.current.value = "";
  };

  const missingRequirements: string[] = [];
  if (files.length === 0) {
    missingRequirements.push("Upload one or more IFR Excel files.");
  }
  if (!selectedTemplateId) {
    missingRequirements.push("Select a saved consolidation template.");
  }

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <ArrowsMergeIcon size={18} className="text-white" />
          </span>
          Consolidate Land Profile
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
        <p className="mt-2 text-sm text-white/85 text-justify">
          Upload one or more IFR workbooks, choose a saved template, and set
          output naming with DIVISION and IA values. The tool maps matched
          records into a single consolidated file, keeps formatting aligned with
          your template, and produces a ready-to-download workbook for faster
          validation, submission, and team handoff across monthly reporting.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
            <FileXlsIcon size={18} className="text-white" />
            IFR Excel Files
          </span>

          <input
            id="consolidate-file-input"
            ref={ifrInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            aria-label="Upload one or more IFR excel files"
            onChange={(event) => {
              handleIfrFileSelection(event.target.files);
            }}
            className="hidden"
          />

          <button
            type="button"
            aria-label="Choose IFR Excel files"
            onClick={() => ifrInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleIfrFileSelection(event.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/10 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/15"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              Drag and drop IFR files here, or click to browse
            </span>
          </button>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
              <FileXlsIcon size={12} className="text-white" />
              Supported: .xlsx, .xls
            </span>
          </div>

          <p className="mt-2 text-xs text-white/80">
            Upload one or many IFR Excel files in .xlsx or .xls format. You can
            drag files directly into the box or click to open your file browser.
            After selection, confirm your saved template in Template Manager,
            then run consolidation to merge all matched records in one generated
            output.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-white/85">
          <FileXlsIcon size={16} className="text-white" />
          Selected IFR files: {String(files.length)}
        </p>
      )}

      <TemplateManager
        scope="consolidate-ifr"
        selectedTemplateId={selectedTemplateId}
        onSelectedTemplateIdChange={(id) => {
          setSelectedTemplateId(id);
        }}
      />

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="block" htmlFor="output-file-name-input">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
            <DownloadSimpleIcon size={16} className="text-white" />
            File Name
          </span>
          <input
            id="output-file-name-input"
            type="text"
            aria-label="Input output file name"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder={defaultOutputFileName}
          />
          <span className="mt-2 block text-xs leading-5 text-white/80">
            Sets the downloaded consolidated workbook name. Keep it descriptive
            so your team can identify the correct batch quickly.
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
            aria-label="Input division"
            value={division}
            onChange={(event) =>
              setDivision(event.target.value.replace(/[^0-9]/g, ""))
            }
            className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder={defaultDivision}
          />
          <span className="mt-2 block text-xs leading-5 text-white/80">
            Numeric division value written to column O for every processed row.
            Use whole numbers only.
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
            aria-label="Input IA"
            value={ia}
            onChange={(event) => setIA(event.target.value)}
            className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder={defaultIA}
          />
          <span className="mt-2 block text-xs leading-5 text-white/80">
            Irrigation Association code written to column N for every processed
            row in the consolidated template.
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Consolidate IFR into template and download"
          onClick={() => {
            void handleConsolidate();
          }}
          disabled={isSubmitting || files.length === 0 || !selectedTemplateId}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
        >
          <ArrowsMergeIcon size={18} />
          {isSubmitting ? "Consolidating..." : "Consolidate"}
        </button>

        <button
          type="button"
          aria-label="Reset IFR file input"
          onClick={handleReset}
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg border border-white/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/60"
        >
          Reset
        </button>
      </div>
      {missingRequirements.length > 0 && (
        <div className="mt-3 rounded-lg border border-white/50 bg-white/20 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-md">
          <p className="text-sm font-medium text-white">
            Requirements before consolidate:
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-white/90">
            {missingRequirements.map((item) => `- ${item}`).join("\n")}
          </p>
        </div>
      )}

      {message && (
        <p
          className="mt-4 whitespace-pre-line rounded-lg border border-white/35 bg-white/10 px-4 py-3 text-sm text-white"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </section>
  );
}
