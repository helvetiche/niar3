"use client";

import { useRef, useState } from "react";
import { ArrowsMergeIcon, FileXlsIcon } from "@phosphor-icons/react";
import { consolidateIfrFile } from "@/lib/api/consolidate-ifr";

export function ConsolidateIfrTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [template, setTemplate] = useState<File | null>(null);
  const [tabName, setTabName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const ifrInputRef = useRef<HTMLInputElement | null>(null);
  const templateInputRef = useRef<HTMLInputElement | null>(null);

  const handleConsolidate = async () => {
    if (files.length === 0) {
      setMessage("Please upload one or more IFR Excel files.");
      return;
    }
    if (!template) {
      setMessage("Please upload a consolidation template Excel file.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Consolidating files...");

    try {
      const result = await consolidateIfrFile({
        files,
        template,
        tabName: tabName.trim(),
      });

      const blobUrl = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      const ifrBaseName =
        files.length === 1
          ? files[0].name.replace(/\.(xlsx|xls)$/i, "")
          : `${String(files.length)}-files`;
      link.href = blobUrl;
      link.download = `${ifrBaseName}-consolidated.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      const skippedMessage =
        result.skippedCount > 0
          ? ` Skipped ${String(result.skippedCount)} item(s): ${result.skippedItems.join(", ")}`
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
    setTemplate(null);
    setMessage("");
    if (ifrInputRef.current) ifrInputRef.current.value = "";
    if (templateInputRef.current) templateInputRef.current.value = "";
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-zinc-900">Consolidate IFR to Template</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Upload one or more IFR workbooks and a consolidation template, then download the
          updated template file.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block" htmlFor="consolidate-file-input">
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
              setFiles(Array.from(event.target.files ?? []));
            }}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-800"
          />
        </label>

        <label className="block" htmlFor="consolidation-template-input">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
            <FileXlsIcon size={18} />
            Consolidation Template
          </span>
          <input
            id="consolidation-template-input"
            ref={templateInputRef}
            type="file"
            accept=".xlsx,.xls"
            aria-label="Upload consolidation template file"
            onChange={(event) => {
              setTemplate(event.target.files?.[0] ?? null);
            }}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
          />
        </label>
      </div>

      {files.length > 0 && (
        <p className="mt-3 text-sm text-zinc-600">
          Selected IFR files: {String(files.length)}
        </p>
      )}

      <label className="mt-4 block" htmlFor="sheet-tab-name-input">
        <span className="mb-2 block text-sm font-medium text-zinc-800">
          Tab Name (Optional)
        </span>
        <input
          id="sheet-tab-name-input"
          type="text"
          aria-label="Input sheet tab name"
          value={tabName}
          onChange={(event) => setTabName(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          placeholder="Sheet1"
        />
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Consolidate IFR into template and download"
          onClick={() => {
            void handleConsolidate();
          }}
          disabled={isSubmitting || files.length === 0 || !template}
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
          className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </section>
  );
}
