"use client";

import { useEffect, useRef, useState } from "react";
import {
  DownloadSimpleIcon,
  FileXlsIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { generateBillingUnitsZip } from "@/lib/api/billing-units";
import { TemplateManager } from "@/components/TemplateManager";
import { useTemplates } from "@/hooks/useTemplates";
import {
  getBaseName,
  getFileKey,
  detectDivisionAndIAFromFilename,
  sanitizeFolderName,
} from "@/lib/file-utils";
import { downloadBlob, getErrorMessage } from "@/lib/utils";
import { DEFAULT_MERGED_CONSOLIDATION_FILE_NAME } from "@/lib/file-utils";
import { ERROR_MESSAGES } from "@/constants/error-messages";
import { FileUploadZone } from "@/components/ifr-scanner/FileUploadZone";
import { SourceFileList } from "@/components/ifr-scanner/SourceFileList";
import { ConsolidationConfig } from "@/components/ifr-scanner/ConsolidationConfig";
import { ProcessingOverlay } from "@/components/ifr-scanner/ProcessingOverlay";

const defaultZipName = "BILLING UNITS";
const defaultBillingUnitFolderName = "billing unit";
const scannerConsolidationTemplateStorageKey =
  "ifr-scanner:last-consolidation-template-id";
const OVERLAY_OPAQUE_MS = 280;
const OVERLAY_FADE_MS = 320;
const OVERLAY_ERROR_FADE_MS = 240;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export function GenerateProfilesTool() {
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [zipName, setZipName] = useState(defaultZipName);
  const [createConsolidation, setCreateConsolidation] = useState(false);
  const [createMergedConsolidation, setCreateMergedConsolidation] =
    useState(false);
  const [mergedConsolidationFileName, setMergedConsolidationFileName] =
    useState(DEFAULT_MERGED_CONSOLIDATION_FILE_NAME);
  const [consolidationTemplateId, setConsolidationTemplateId] = useState("");
  const [billingUnitFolderName, setBillingUnitFolderName] = useState(
    defaultBillingUnitFolderName,
  );
  const [sourceFolderNames, setSourceFolderNames] = useState<
    Record<string, string>
  >({});
  const [sourceConsolidationDivisions, setSourceConsolidationDivisions] =
    useState<Record<string, string>>({});
  const [sourceConsolidationIAs, setSourceConsolidationIAs] = useState<
    Record<string, string>
  >({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isOverlayOpaque, setIsOverlayOpaque] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const elapsedIntervalRef = useRef<number | null>(null);

  const {
    data: consolidationTemplates = [],
    isLoading: isLoadingConsolidationTemplates,
    error: templatesError,
  } = useTemplates(createConsolidation ? "consolidate-ifr" : ("" as never));

  useEffect(() => {
    if (templatesError) {
      setMessage(
        getErrorMessage(templatesError, ERROR_MESSAGES.FAILED_LOAD_TEMPLATES),
      );
    }
  }, [templatesError]);

  useEffect(() => {
    if (!createConsolidation || !consolidationTemplates.length) return;

    setConsolidationTemplateId((previous) => {
      if (
        previous &&
        consolidationTemplates.some((item) => item.id === previous)
      )
        return previous;
      const savedTemplateId = window.localStorage.getItem(
        scannerConsolidationTemplateStorageKey,
      );
      if (
        savedTemplateId &&
        consolidationTemplates.some((item) => item.id === savedTemplateId)
      ) {
        return savedTemplateId;
      }
      return consolidationTemplates[0]?.id ?? "";
    });
  }, [createConsolidation, consolidationTemplates]);

  useEffect(() => {
    if (sourceFiles.length === 0) {
      setSourceFolderNames({});
      return;
    }

    setSourceFolderNames((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getFileKey(file);
        const existingName = previous[fileKey];
        next[fileKey] = existingName ? existingName : getBaseName(file.name);
      });
      return next;
    });

    setSourceConsolidationDivisions((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getFileKey(file);
        const detected = detectDivisionAndIAFromFilename(file.name);
        const existingDivision = previous[fileKey];
        next[fileKey] = existingDivision ?? detected.division;
      });
      return next;
    });

    setSourceConsolidationIAs((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getFileKey(file);
        const detected = detectDivisionAndIAFromFilename(file.name);
        const existingIA = previous[fileKey];
        next[fileKey] = existingIA ?? detected.ia;
      });
      return next;
    });
  }, [sourceFiles]);

  useEffect(() => {
    if (!consolidationTemplateId.trim()) {
      window.localStorage.removeItem(scannerConsolidationTemplateStorageKey);
      return;
    }
    window.localStorage.setItem(
      scannerConsolidationTemplateStorageKey,
      consolidationTemplateId.trim(),
    );
  }, [consolidationTemplateId]);

  const generateBillingUnits = async () => {
    if (sourceFiles.length === 0) {
      setMessage("Please upload one or more source Excel files first.");
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
    setMessage("Generating billing unit files...");
    setIsFinalizing(false);
    setElapsedSeconds(0);
    setIsOverlayVisible(true);
    setIsOverlayOpaque(false);
    window.requestAnimationFrame(() => {
      setIsOverlayOpaque(true);
    });
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
    }
    elapsedIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);

    try {
      const blob = await generateBillingUnitsZip(sourceFiles, {
        templateId: selectedTemplateId,
        createConsolidation,
        consolidationTemplateId,
        createMergedConsolidation,
        mergedConsolidationFileName,
        billingUnitFolderName,
        sourceFolderNames,
        sourceConsolidationDivisions,
        sourceConsolidationIAs,
      });
      const outputName = zipName.trim() || defaultZipName;
      const filename = outputName.endsWith(".zip")
        ? outputName
        : `${outputName}.zip`;
      downloadBlob(blob, filename);

      setMessage("Success. Billing Unit ZIP has been downloaded.");
      setIsFinalizing(true);
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      await wait(OVERLAY_OPAQUE_MS);
      setIsOverlayOpaque(false);
      await wait(OVERLAY_FADE_MS);
      setIsOverlayVisible(false);
    } catch (error) {
      setMessage(
        getErrorMessage(error, ERROR_MESSAGES.FAILED_GENERATE_BILLING_UNITS),
      );
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      setIsOverlayOpaque(false);
      await wait(OVERLAY_ERROR_FADE_MS);
      setIsOverlayVisible(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAllSelections = () => {
    setSourceFiles([]);
    setSelectedTemplateId("");
    setCreateConsolidation(false);
    setCreateMergedConsolidation(false);
    setMergedConsolidationFileName(DEFAULT_MERGED_CONSOLIDATION_FILE_NAME);
    setConsolidationTemplateId("");
    setBillingUnitFolderName(defaultBillingUnitFolderName);
    setSourceFolderNames({});
    setSourceConsolidationDivisions({});
    setSourceConsolidationIAs({});
    setMessage("");
  };

  useEffect(() => {
    return () => {
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current);
      }
    };
  }, []);

  const updateFolderName = (fileKey: string, value: string) => {
    const sanitized = sanitizeFolderName(value);
    setSourceFolderNames((previous) => ({
      ...previous,
      [fileKey]: sanitized,
    }));
  };

  const updateDivision = (fileKey: string, value: string) => {
    setSourceConsolidationDivisions((previous) => ({
      ...previous,
      [fileKey]: value.replace(/[^0-9]/g, ""),
    }));
  };

  const updateIA = (fileKey: string, value: string) => {
    setSourceConsolidationIAs((previous) => ({
      ...previous,
      [fileKey]: value.trimStart(),
    }));
  };

  const missingRequirements: string[] = [];
  if (sourceFiles.length === 0) {
    missingRequirements.push("Upload one or more source Excel files.");
  }
  if (!selectedTemplateId) {
    missingRequirements.push("Select a saved IFR Scanner template.");
  }
  if (createConsolidation && !consolidationTemplateId) {
    missingRequirements.push("Select a consolidation template.");
  }

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <MagnifyingGlassIcon size={18} className="text-white" />
          </span>
          IFR Scanner
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <FileXlsIcon size={12} className="text-white" />
            Billing Unit Extraction
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <DownloadSimpleIcon size={12} className="text-white" />
            ZIP Output
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85 text-justify">
          Upload master lists and scan files to automatically generate one
          billing unit workbook per lot with consistent naming and folder
          structure. Select your template, configure optional consolidation, and
          download everything in one ZIP. This flow streamlines repetitive
          encoding, reduces manual errors, and accelerates report preparation
          for field teams across all divisions.
        </p>
      </div>

      <div className="grid gap-4">
        <FileUploadZone
          onFilesSelected={setSourceFiles}
          label="IFR Source Files (Required)"
          description="Upload one or many .xlsx/.xls files. Each uploaded file is processed as a separate division folder in the ZIP with one billing unit subfolder."
        />
      </div>

      <SourceFileList
        files={sourceFiles}
        billingUnitFolderName={billingUnitFolderName}
        sourceFolderNames={sourceFolderNames}
        sourceConsolidationDivisions={sourceConsolidationDivisions}
        sourceConsolidationIAs={sourceConsolidationIAs}
        createConsolidation={createConsolidation}
        onFolderNameChange={updateFolderName}
        onDivisionChange={updateDivision}
        onIAChange={updateIA}
        onBillingUnitFolderNameChange={setBillingUnitFolderName}
      />

      <label className="mt-4 block" htmlFor="zip-name-input">
        <span className="mb-2 block text-sm font-medium text-white/90">
          ZIP File Name
        </span>
        <input
          id="zip-name-input"
          type="text"
          aria-label="Set output zip file name"
          value={zipName}
          onChange={(e) => setZipName(e.target.value)}
          className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder={defaultZipName}
        />
        <span className="mt-2 block text-xs leading-5 text-white/80">
          Sets the final downloaded ZIP name that contains all generated billing
          unit files. Use a clear batch label like{" "}
          <span className="font-medium">division-3-week-7</span> so your team
          can quickly identify the correct output.
        </span>
      </label>

      <TemplateManager
        scope="ifr-scanner"
        selectedTemplateId={selectedTemplateId}
        onSelectedTemplateIdChange={setSelectedTemplateId}
      />
      <p className="mt-2 text-xs leading-5 text-white/80">
        Select the saved IFR Scanner template used to generate each lot billing
        unit workbook. This template controls the output workbook layout and
        cell mapping.
      </p>

      <ConsolidationConfig
        createConsolidation={createConsolidation}
        createMergedConsolidation={createMergedConsolidation}
        mergedConsolidationFileName={mergedConsolidationFileName}
        consolidationTemplates={consolidationTemplates}
        consolidationTemplateId={consolidationTemplateId}
        isLoadingTemplates={isLoadingConsolidationTemplates}
        onCreateConsolidationChange={setCreateConsolidation}
        onCreateMergedConsolidationChange={setCreateMergedConsolidation}
        onMergedFileNameChange={setMergedConsolidationFileName}
        onTemplateIdChange={setConsolidationTemplateId}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Generate billing unit zip file"
          onClick={() => {
            void generateBillingUnits();
          }}
          disabled={
            isGenerating ||
            sourceFiles.length === 0 ||
            !selectedTemplateId ||
            (createConsolidation && !consolidationTemplateId)
          }
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
        >
          <DownloadSimpleIcon size={18} />
          {isGenerating ? "Generating..." : "Scan and Generate"}
        </button>

        <button
          type="button"
          aria-label="Clear uploaded files"
          onClick={clearAllSelections}
          disabled={isGenerating}
          className="inline-flex items-center rounded-lg border border-white/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/60"
        >
          Clear
        </button>
      </div>
      {missingRequirements.length > 0 && (
        <div className="mt-3 rounded-lg border border-white/50 bg-white/20 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-md">
          <p className="text-sm font-medium text-white">
            Requirements before generate:
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-white/90">
            {missingRequirements.map((item) => `- ${item}`).join("\n")}
          </p>
        </div>
      )}
      <p className="mt-2 text-xs leading-5 text-white/80">
        Click <span className="font-medium">Scan and Generate</span> to process
        your uploaded source files and download the ZIP immediately. Use{" "}
        <span className="font-medium">Clear</span> to reset all selected files,
        template choices, and optional consolidation settings.
      </p>

      {message && (
        <p
          className="mt-4 rounded-lg border border-white/35 bg-white/10 px-4 py-3 text-sm text-white"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      <ProcessingOverlay
        isVisible={isOverlayVisible}
        isOpaque={isOverlayOpaque}
        isFinalizing={isFinalizing}
        elapsedSeconds={elapsedSeconds}
      />
    </section>
  );
}
