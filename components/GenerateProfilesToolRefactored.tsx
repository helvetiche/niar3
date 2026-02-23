"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  FileXlsIcon,
} from "@phosphor-icons/react";
import { generateBillingUnitsZip } from "@/lib/api/billing-units";
import { TemplateManager } from "@/components/TemplateManager";
import { downloadBlob, getErrorMessage } from "@/lib/utils";
import { DEFAULT_MERGED_CONSOLIDATION_FILE_NAME } from "@/lib/file-utils";
import { ERROR_MESSAGES } from "@/constants/error-messages";
import { FileUploadSection } from "@/components/ifr-scanner/FileUploadSection";
import { SourceFileMapping } from "@/components/ifr-scanner/SourceFileMapping";
import { ConsolidationSettings } from "@/components/ifr-scanner/ConsolidationSettings";
import { ProcessingOverlay } from "@/components/ifr-scanner/ProcessingOverlay";
import { useIfrScanner } from "@/hooks/useIfrScanner";
import { useProcessingTimer } from "@/hooks/useProcessingTimer";

const defaultZipName = "BILLING UNITS";
const defaultBillingUnitFolderName = "billing unit";

export function GenerateProfilesToolRefactored() {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [zipName, setZipName] = useState(defaultZipName);
  const [createConsolidation, setCreateConsolidation] = useState(false);
  const [createMergedConsolidation, setCreateMergedConsolidation] =
    useState(false);
  const [mergedConsolidationFileName, setMergedConsolidationFileName] =
    useState(DEFAULT_MERGED_CONSOLIDATION_FILE_NAME);
  const [billingUnitFolderName, setBillingUnitFolderName] = useState(
    defaultBillingUnitFolderName,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const sourceInputRef = useRef<HTMLInputElement | null>(null);

  const {
    sourceFiles,
    setSourceFiles,
    sourceFolderNames,
    sourceConsolidationDivisions,
    sourceConsolidationIAs,
    consolidationTemplates,
    consolidationTemplateId,
    setConsolidationTemplateId,
    isLoadingConsolidationTemplates,
    loadConsolidationTemplates,
    updateFolderName,
    updateDivision,
    updateIA,
  } = useIfrScanner();

  const {
    isOverlayVisible,
    isOverlayOpaque,
    elapsedSeconds,
    isFinalizing,
    startTimer,
    finishSuccess,
    finishError,
  } = useProcessingTimer();

  useEffect(() => {
    if (createConsolidation) {
      void loadConsolidationTemplates();
    }
  }, [createConsolidation, loadConsolidationTemplates]);

  const handleSourceSelection = (incoming: FileList | null) => {
    setSourceFiles(Array.from(incoming ?? []));
  };

  const generateProfiles = async () => {
    if (sourceFiles.length === 0) {
      toast.error("Please upload one or more source Excel files first.");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("Please select a template from Template Manager.");
      return;
    }
    if (createConsolidation && !consolidationTemplateId) {
      toast.error("Please select a consolidation template.");
      return;
    }

    setIsGenerating(true);
    startTimer();

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

      toast.success("Billing Unit ZIP has been downloaded.");
      await finishSuccess();
    } catch (error) {
      toast.error(
        getErrorMessage(error, ERROR_MESSAGES.FAILED_GENERATE_BILLING_UNITS),
      );
      await finishError();
    } finally {
      setIsGenerating(false);
    }
  };

  const clearFiles = () => {
    setSourceFiles([]);
    setSelectedTemplateId("");
    setCreateConsolidation(false);
    setCreateMergedConsolidation(false);
    setMergedConsolidationFileName(DEFAULT_MERGED_CONSOLIDATION_FILE_NAME);
    setConsolidationTemplateId("");
    setBillingUnitFolderName(defaultBillingUnitFolderName);
    if (sourceInputRef.current) sourceInputRef.current.value = "";
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
        <FileUploadSection
          onFilesSelected={handleSourceSelection}
          inputRef={sourceInputRef}
        />
      </div>

      <SourceFileMapping
        files={sourceFiles}
        billingUnitFolderName={billingUnitFolderName}
        sourceFolderNames={sourceFolderNames}
        sourceConsolidationDivisions={sourceConsolidationDivisions}
        sourceConsolidationIAs={sourceConsolidationIAs}
        createConsolidation={createConsolidation}
        onBillingUnitFolderNameChange={setBillingUnitFolderName}
        onFolderNameChange={updateFolderName}
        onDivisionChange={updateDivision}
        onIAChange={updateIA}
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
          onChange={(event) => setZipName(event.target.value)}
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

      <ConsolidationSettings
        createConsolidation={createConsolidation}
        createMergedConsolidation={createMergedConsolidation}
        consolidationTemplateId={consolidationTemplateId}
        consolidationTemplates={consolidationTemplates}
        mergedConsolidationFileName={mergedConsolidationFileName}
        isLoadingTemplates={isLoadingConsolidationTemplates}
        onCreateConsolidationChange={(checked) => {
          setCreateConsolidation(checked);
          if (!checked) setCreateMergedConsolidation(false);
        }}
        onCreateMergedConsolidationChange={setCreateMergedConsolidation}
        onConsolidationTemplateIdChange={setConsolidationTemplateId}
        onMergedConsolidationFileNameChange={setMergedConsolidationFileName}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Generate billing unit zip file"
          onClick={() => void generateProfiles()}
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
          onClick={clearFiles}
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

      <ProcessingOverlay
        isVisible={isOverlayVisible}
        isOpaque={isOverlayOpaque}
        isFinalizing={isFinalizing}
        elapsedSeconds={elapsedSeconds}
      />
    </section>
  );
}
