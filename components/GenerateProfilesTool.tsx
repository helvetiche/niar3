"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckSquareIcon,
  DownloadSimpleIcon,
  FileXlsIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { generateProfilesZip } from "@/lib/api/farmer-profiles";
import { TemplateManager } from "@/components/TemplateManager";
import { listTemplates, type StoredTemplate } from "@/lib/api/templates";

const defaultZipName = "farmer-profiles";
const defaultConsolidationName = "DIVISION X CONSOLIDATED";
const defaultConsolidationDivision = "0";
const defaultConsolidationIA = "IA";

export function GenerateProfilesTool() {
  const [mastersFile, setMastersFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [zipName, setZipName] = useState(defaultZipName);
  const [createConsolidation, setCreateConsolidation] = useState(false);
  const [consolidationTemplates, setConsolidationTemplates] = useState<
    StoredTemplate[]
  >([]);
  const [consolidationTemplateId, setConsolidationTemplateId] = useState("");
  const [consolidationFileName, setConsolidationFileName] = useState(
    defaultConsolidationName,
  );
  const [consolidationDivision, setConsolidationDivision] = useState(
    defaultConsolidationDivision,
  );
  const [consolidationIA, setConsolidationIA] = useState(defaultConsolidationIA);
  const [isLoadingConsolidationTemplates, setIsLoadingConsolidationTemplates] =
    useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const mastersInputRef = useRef<HTMLInputElement | null>(null);

  const handleMastersSelection = (incoming: FileList | null) => {
    setMastersFile(incoming?.[0] ?? null);
  };

  useEffect(() => {
    if (!createConsolidation) return;

    let active = true;
    const loadTemplates = async () => {
      setIsLoadingConsolidationTemplates(true);
      try {
        const items = await listTemplates("consolidate-ifr");
        if (!active) return;
        setConsolidationTemplates(items);
        setConsolidationTemplateId((previous) => {
          if (previous && items.some((item) => item.id === previous)) return previous;
          return items[0]?.id ?? "";
        });
      } catch (error) {
        if (!active) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to load consolidation templates.",
        );
      } finally {
        if (active) setIsLoadingConsolidationTemplates(false);
      }
    };
    void loadTemplates();
    return () => {
      active = false;
    };
  }, [createConsolidation]);

  const handleGenerateProfiles = async () => {
    if (!mastersFile) {
      setMessage("Please upload the master's list file first.");
      return;
    }
    if (!selectedTemplateId) {
      setMessage("Please select a template from Template Manager.");
      return;
    }
    if (createConsolidation && !consolidationTemplateId) {
      setMessage("Please select a consolidation template.");
      return;
    }

    setIsGenerating(true);
    setMessage("Generating profile files...");

    try {
      const blob = await generateProfilesZip(mastersFile, {
        templateId: selectedTemplateId,
        createConsolidation,
        consolidationTemplateId,
        consolidationFileName,
        consolidationDivision,
        consolidationIA,
      });
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
    setSelectedTemplateId("");
    setCreateConsolidation(false);
    setConsolidationTemplateId("");
    setConsolidationFileName(defaultConsolidationName);
    setConsolidationDivision(defaultConsolidationDivision);
    setConsolidationIA(defaultConsolidationIA);
    setMessage("");
    if (mastersInputRef.current) mastersInputRef.current.value = "";
  };

  return (
    <section className="flex h-full w-full flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-zinc-900">
          <MagnifyingGlassIcon size={22} className="text-emerald-700" />
          IFR Scanner
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Upload the master&apos;s list and scan records to generate one profile
          workbook per lot. You can also include a ready-to-use consolidated IFR
          file in the same output ZIP.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="block">
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
              handleMastersSelection(event.target.files);
            }}
            className="hidden"
          />

          <button
            type="button"
            aria-label="Choose master's list Excel file"
            onClick={() => mastersInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleMastersSelection(event.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-base text-zinc-700 transition hover:border-emerald-600 hover:bg-emerald-50"
          >
            <UploadSimpleIcon size={34} className="text-emerald-700" />
            <span className="font-medium">
              Drag and drop master&apos;s list, or click to browse
            </span>
          </button>

          <p className="mt-2 text-xs text-zinc-600">
            Upload the official master&apos;s list in .xlsx or .xls format. Use the
            drag-and-drop area for faster selection or click to browse manually.
            This file is required and drives the profile generation process,
            including lot grouping and filename output. Ensure the spreadsheet
            structure matches your expected encoding columns.
          </p>
        </div>
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
        <span className="mt-2 block text-xs leading-5 text-zinc-600">
          Sets the final downloaded ZIP name that contains all generated profile
          files. Use a clear batch label like{" "}
          <span className="font-medium">division-3-week-7</span> so your team can
          quickly identify the correct output.
        </span>
      </label>

      <TemplateManager
        scope="ifr-scanner"
        selectedTemplateId={selectedTemplateId}
        onSelectedTemplateIdChange={(id) => {
          setSelectedTemplateId(id);
        }}
      />
      <p className="mt-2 text-xs leading-5 text-zinc-600">
        Select the saved IFR Scanner template used to generate each lot profile.
        This template controls the output workbook layout and cell mapping.
      </p>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-700"
            checked={createConsolidation}
            onChange={(event) => setCreateConsolidation(event.target.checked)}
            aria-label="Create consolidation file from generated land profiles"
          />
          <span>
            <span className="flex items-center gap-2 text-sm font-medium text-zinc-800">
              <CheckSquareIcon size={16} className="text-emerald-700" />
              Create Consolidation
            </span>
            <span className="mt-1 block text-xs text-zinc-600">
              Enable this to generate a consolidated XLSX and include it in the same ZIP.
            </span>
          </span>
        </label>

        {createConsolidation && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800">
                Consolidation Template
              </span>
              <select
                aria-label="Select consolidation template"
                value={consolidationTemplateId}
                onChange={(event) => setConsolidationTemplateId(event.target.value)}
                disabled={isLoadingConsolidationTemplates}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              >
                <option value="">Select template...</option>
                {consolidationTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs text-zinc-600">
                Uses saved templates from Consolidate IFR scope. This template is
                used to build the combined workbook included in the ZIP.
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800">
                Consolidation File Name
              </span>
              <input
                type="text"
                aria-label="Consolidation file name"
                value={consolidationFileName}
                onChange={(event) => setConsolidationFileName(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                placeholder={defaultConsolidationName}
              />
              <span className="mt-2 block text-xs text-zinc-600">
                Sets the filename of the consolidated workbook added to your ZIP.
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800">
                Division
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                aria-label="Consolidation division"
                value={consolidationDivision}
                onChange={(event) =>
                  setConsolidationDivision(event.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                placeholder={defaultConsolidationDivision}
              />
              <span className="mt-2 block text-xs text-zinc-600">
                Numeric DIVISION value written to all consolidated rows.
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800">IA</span>
              <input
                type="text"
                aria-label="Consolidation IA"
                value={consolidationIA}
                onChange={(event) => setConsolidationIA(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                placeholder={defaultConsolidationIA}
              />
              <span className="mt-2 block text-xs text-zinc-600">
                IA code written to all consolidated rows in the generated workbook.
              </span>
            </label>
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Generate profile zip file"
          onClick={() => {
            void handleGenerateProfiles();
          }}
          disabled={
            isGenerating ||
            !mastersFile ||
            !selectedTemplateId ||
            (createConsolidation && !consolidationTemplateId)
          }
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          <DownloadSimpleIcon size={18} />
          {isGenerating ? "Generating..." : "Scan and Generate"}
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
      <p className="mt-2 text-xs leading-5 text-zinc-600">
        Click <span className="font-medium">Scan and Generate</span> to process
        your master&apos;s list and download the ZIP immediately. Use{" "}
        <span className="font-medium">Clear</span> to reset all selected files,
        template choices, and optional consolidation settings.
      </p>

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
