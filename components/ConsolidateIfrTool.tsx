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
      const text = error instanceof Error ? error.message : "Failed to consolidate IFR.";
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

  return (
    <section className="flex h-full w-full flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-zinc-900">
          <ArrowsMergeIcon size={22} className="text-emerald-700" />
          Consolidate IFR to Template
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Upload one or more IFR workbooks, choose a saved template from Template
          Manager, set your output file name, DIVISION, and IA values, then run
          consolidation to generate and download a single updated template file with
          all matched rows filled automatically.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
            <FileXlsIcon size={18} />
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
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-base text-zinc-700 transition hover:border-emerald-600 hover:bg-emerald-50"
          >
            <UploadSimpleIcon size={34} className="text-emerald-700" />
            <span className="font-medium">
              Drag and drop IFR files here, or click to browse
            </span>
          </button>

          <p className="mt-2 text-xs text-zinc-600">
            Upload one or many IFR Excel files in .xlsx or .xls format. You can
            drag files directly into the box or click to open your file browser.
            After selection, confirm your saved template in Template Manager, then
            run consolidation to merge all matched records in one generated output.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
          <FileXlsIcon size={16} className="text-emerald-700" />
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
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
            <DownloadSimpleIcon size={16} className="text-emerald-700" />
            File Name
          </span>
          <input
            id="output-file-name-input"
            type="text"
            aria-label="Input output file name"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            placeholder={defaultOutputFileName}
          />
          <span className="mt-2 block text-xs leading-5 text-zinc-600">
            Sets the downloaded consolidated workbook name. Keep it descriptive so
            your team can identify the correct batch quickly.
          </span>
        </label>

        <label className="block" htmlFor="division-input">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
            <ArrowsMergeIcon size={16} className="text-emerald-700" />
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            placeholder={defaultDivision}
          />
          <span className="mt-2 block text-xs leading-5 text-zinc-600">
            Numeric division value written to column O for every processed row.
            Use whole numbers only.
          </span>
        </label>

        <label className="block" htmlFor="ia-input">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
            <FileXlsIcon size={16} className="text-emerald-700" />
            IA
          </span>
          <input
            id="ia-input"
            type="text"
            aria-label="Input IA"
            value={ia}
            onChange={(event) => setIA(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            placeholder={defaultIA}
          />
          <span className="mt-2 block text-xs leading-5 text-zinc-600">
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
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          <ArrowsMergeIcon size={18} />
          {isSubmitting ? "Consolidating..." : "Consolidate"}
        </button>

        <button
          type="button"
          aria-label="Reset IFR file input"
          onClick={handleReset}
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          Reset
        </button>
      </div>

      {message && (
        <p
          className="mt-4 whitespace-pre-line rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </section>
  );
}
