"use client";

import { useRef, useState } from "react";
import { DownloadSimpleIcon, FileXlsIcon } from "@phosphor-icons/react";
import { generateProfilesZip } from "@/lib/api/farmer-profiles";

const defaultZipName = "farmer-profiles";

export function GenerateProfilesTool() {
  const [mastersFile, setMastersFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [zipName, setZipName] = useState(defaultZipName);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const mastersInputRef = useRef<HTMLInputElement | null>(null);
  const templateInputRef = useRef<HTMLInputElement | null>(null);

  const handleGenerateProfiles = async () => {
    if (!mastersFile) {
      setMessage("Please upload the master's list file first.");
      return;
    }

    setIsGenerating(true);
    setMessage("Generating profile files...");

    try {
      const blob = await generateProfilesZip(mastersFile, templateFile);
      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      const outputName = zipName.trim() || defaultZipName;

      downloadLink.href = objectUrl;
      downloadLink.download = outputName.endsWith(".zip")
        ? outputName
        : `${outputName}.zip`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(objectUrl);

      setMessage("Success. Profile ZIP has been downloaded.");
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Failed to generate profile files.";
      setMessage(text);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearFiles = () => {
    setMastersFile(null);
    setTemplateFile(null);
    setMessage("");
    if (mastersInputRef.current) mastersInputRef.current.value = "";
    if (templateInputRef.current) templateInputRef.current.value = "";
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-zinc-900">Generate Farmer Profiles</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Upload the master&apos;s list file and generate one profile workbook per lot.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block" htmlFor="masters-list-input">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
            <FileXlsIcon size={18} />
            Master&apos;s List (Required)
          </span>
          <input
            id="masters-list-input"
            ref={mastersInputRef}
            type="file"
            accept=".xlsx,.xls"
            aria-label="Upload master's list Excel file"
            onChange={(event) => {
              setMastersFile(event.target.files?.[0] ?? null);
            }}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-800"
          />
        </label>

        <label className="block" htmlFor="template-input">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
            <FileXlsIcon size={18} />
            Template (Optional)
          </span>
          <input
            id="template-input"
            ref={templateInputRef}
            type="file"
            accept=".xlsx,.xls"
            aria-label="Upload optional Excel template file"
            onChange={(event) => {
              setTemplateFile(event.target.files?.[0] ?? null);
            }}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
          />
        </label>
      </div>

      <label className="mt-4 block" htmlFor="zip-name-input">
        <span className="mb-2 block text-sm font-medium text-zinc-800">ZIP File Name</span>
        <input
          id="zip-name-input"
          type="text"
          aria-label="Set output zip file name"
          value={zipName}
          onChange={(event) => setZipName(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          placeholder={defaultZipName}
        />
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Generate profile zip file"
          onClick={() => {
            void handleGenerateProfiles();
          }}
          disabled={isGenerating || !mastersFile}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          <DownloadSimpleIcon size={18} />
          {isGenerating ? "Generating..." : "Generate Profiles"}
        </button>

        <button
          type="button"
          aria-label="Clear uploaded files"
          onClick={handleClearFiles}
          disabled={isGenerating}
          className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          Clear
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
