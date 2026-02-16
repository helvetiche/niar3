"use client";

import { useRef, useState } from "react";
import { ArrowsMergeIcon, FileXlsIcon } from "@phosphor-icons/react";
import { consolidateIfrFile } from "@/lib/api/consolidate-ifr";

export function ConsolidateIfrTool() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetId, setSheetId] = useState("");
  const [tabName, setTabName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleConsolidate = async () => {
    if (!file) {
      setMessage("Please upload an IFR Excel file.");
      return;
    }
    if (!sheetId.trim()) {
      setMessage("Google Sheet ID is required.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Consolidating file...");

    try {
      const result = await consolidateIfrFile({
        file,
        sheetId: sheetId.trim(),
        tabName: tabName.trim(),
      });
      setMessage(
        `Success. Updated row ${String(result.row)} with ${String(result.rowsWritten)} write batch(es).`,
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to consolidate IFR.";
      setMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-zinc-900">Consolidate IFR to Sheet</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Upload a generated IFR workbook and write extracted values to your Google
          Sheet.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block" htmlFor="consolidate-file-input">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
            <FileXlsIcon size={18} />
            IFR Excel File
          </span>
          <input
            id="consolidate-file-input"
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            aria-label="Upload IFR excel file"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
            }}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-800"
          />
        </label>

        <label className="block" htmlFor="sheet-id-input">
          <span className="mb-2 block text-sm font-medium text-zinc-800">
            Google Sheet ID
          </span>
          <input
            id="sheet-id-input"
            type="text"
            aria-label="Input target Google Sheet ID"
            value={sheetId}
            onChange={(event) => setSheetId(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            placeholder="1AbCdEf..."
          />
        </label>
      </div>

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
          aria-label="Consolidate IFR file to Google Sheet"
          onClick={() => {
            void handleConsolidate();
          }}
          disabled={isSubmitting || !file || !sheetId.trim()}
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
