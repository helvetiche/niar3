"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  DownloadSimpleIcon,
  FileXlsIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
  FolderIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { WorkspaceStepper } from "@/components/WorkspaceStepper";
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

export function GenerateProfilesToolStepped() {
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
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isOverlayOpaque, setIsOverlayOpaque] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const elapsedIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data: consolidationTemplates = [],
    isLoading: isLoadingConsolidationTemplates,
    error: templatesError,
  } = useTemplates(createConsolidation ? "consolidate-ifr" : ("" as never));

  useEffect(() => {
    if (templatesError) {
      toast.error(
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

  const handleFileSelection = (incoming: FileList | null) => {
    setSourceFiles(Array.from(incoming ?? []));
  };

  const generateBillingUnits = async () => {
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

      toast.success("Billing Unit ZIP has been downloaded.");
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
      toast.error(
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

  useEffect(() => {
    return () => {
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current);
      }
    };
  }, []);

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
        <p className="mt-2 text-sm text-white/85">
          Follow the steps below to scan and generate billing units.
        </p>
      </div>

      <Stepper
        initialStep={1}
        stepCircleContainerClassName="!bg-emerald-800/50 !border-emerald-700"
        contentClassName="!px-0"
        footerClassName="!px-0"
        nextButtonProps={{
          className:
            "!bg-white !text-emerald-900 hover:!bg-emerald-50 font-medium",
        }}
        backButtonProps={{
          className: "!text-white/80 hover:!text-white",
        }}
      >
        <Step>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              Upload Source Files
            </h3>
            <p className="text-sm text-white/80">
              Upload one or more Excel files (.xlsx or .xls) containing IFR
              data.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={(e) => handleFileSelection(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelection(e.dataTransfer.files);
              }}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/10 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/15"
            >
              <UploadSimpleIcon size={34} className="text-white" />
              <span className="font-medium">
                Drag and drop Excel files here, or click to browse
              </span>
            </button>

            {sourceFiles.length > 0 && (
              <div className="rounded-xl border border-white/35 bg-white/10 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <CheckCircleIcon size={16} className="text-white" />
                  {sourceFiles.length} file(s) selected
                </p>
                <ul className="space-y-1 text-sm text-white/80">
                  {sourceFiles.map((file, idx) => (
                    <li key={idx} className="truncate">
                      • {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Step>

        <Step>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              Configure File Mappings
            </h3>
            <p className="text-sm text-white/80">
              Set folder names and metadata for each uploaded file.
            </p>

            <div className="rounded-xl border border-white/35 bg-white/10 p-4">
              <label className="mb-3 block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <FolderIcon size={16} className="text-white" />
                  Billing Unit Folder Name
                </span>
                <input
                  type="text"
                  value={billingUnitFolderName}
                  onChange={(e) =>
                    setBillingUnitFolderName(sanitizeFolderName(e.target.value))
                  }
                  placeholder={defaultBillingUnitFolderName}
                  className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>

              <div className="space-y-3">
                {sourceFiles.map((file) => {
                  const fileKey = getFileKey(file);
                  const folderName = sourceFolderNames[fileKey] || "";
                  const division = sourceConsolidationDivisions[fileKey] || "";
                  const ia = sourceConsolidationIAs[fileKey] || "";

                  return (
                    <div
                      key={fileKey}
                      className="rounded-lg border border-white/30 bg-white/5 p-3"
                    >
                      <p className="mb-2 truncate text-sm font-medium text-white">
                        {file.name}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="block">
                          <span className="mb-1 block text-xs text-white/70">
                            Folder Name
                          </span>
                          <input
                            type="text"
                            value={folderName}
                            onChange={(e) =>
                              updateFolderName(fileKey, e.target.value)
                            }
                            className="w-full rounded border border-white/30 bg-white/10 px-2 py-1 text-sm text-white focus:border-white focus:outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-white/70">
                            Division
                          </span>
                          <input
                            type="text"
                            value={division}
                            onChange={(e) =>
                              updateDivision(fileKey, e.target.value)
                            }
                            className="w-full rounded border border-white/30 bg-white/10 px-2 py-1 text-sm text-white focus:border-white focus:outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-white/70">
                            IA
                          </span>
                          <input
                            type="text"
                            value={ia}
                            onChange={(e) => updateIA(fileKey, e.target.value)}
                            className="w-full rounded border border-white/30 bg-white/10 px-2 py-1 text-sm text-white focus:border-white focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              Template & Output Settings
            </h3>
            <p className="text-sm text-white/80">
              Select your IFR Scanner template and set the output ZIP name.
            </p>

            <section className="rounded-xl border border-white/35 bg-white/10 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <FileXlsIcon size={16} className="text-white" />
                IFR Scanner Template
              </p>
              <TemplateManager
                scope="ifr-scanner"
                selectedTemplateId={selectedTemplateId}
                onSelectedTemplateIdChange={setSelectedTemplateId}
              />
            </section>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <DownloadSimpleIcon size={16} className="text-white" />
                ZIP File Name
              </span>
              <input
                type="text"
                value={zipName}
                onChange={(e) => setZipName(e.target.value)}
                placeholder={defaultZipName}
                className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </label>
          </div>
        </Step>

        <Step>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              Consolidation Options
            </h3>
            <p className="text-sm text-white/80">
              Optionally create consolidated billing unit files.
            </p>

            <div className="rounded-xl border border-white/35 bg-white/10 p-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={createConsolidation}
                  onChange={(e) => setCreateConsolidation(e.target.checked)}
                  className="h-4 w-4 rounded border-white/40 bg-white/10 text-emerald-600 focus:ring-2 focus:ring-white/30"
                />
                <span className="text-sm font-medium text-white">
                  Create consolidation files
                </span>
              </label>

              {createConsolidation && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="mb-2 text-sm font-medium text-white">
                      Consolidation Template
                    </p>
                    {isLoadingConsolidationTemplates ? (
                      <p className="text-xs text-white/70">
                        Loading templates...
                      </p>
                    ) : consolidationTemplates.length === 0 ? (
                      <p className="text-xs text-white/70">
                        No consolidation templates available.
                      </p>
                    ) : (
                      <select
                        value={consolidationTemplateId}
                        onChange={(e) =>
                          setConsolidationTemplateId(e.target.value)
                        }
                        className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      >
                        {consolidationTemplates.map((template) => (
                          <option
                            key={template.id}
                            value={template.id}
                            className="bg-gray-800"
                          >
                            {template.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={createMergedConsolidation}
                      onChange={(e) =>
                        setCreateMergedConsolidation(e.target.checked)
                      }
                      className="h-4 w-4 rounded border-white/40 bg-white/10 text-emerald-600 focus:ring-2 focus:ring-white/30"
                    />
                    <span className="text-sm font-medium text-white">
                      Create merged consolidation file
                    </span>
                  </label>

                  {createMergedConsolidation && (
                    <label className="block">
                      <span className="mb-1 block text-xs text-white/70">
                        Merged File Name
                      </span>
                      <input
                        type="text"
                        value={mergedConsolidationFileName}
                        onChange={(e) =>
                          setMergedConsolidationFileName(e.target.value)
                        }
                        placeholder={DEFAULT_MERGED_CONSOLIDATION_FILE_NAME}
                        className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              Review & Generate
            </h3>
            <p className="text-sm text-white/80">
              Review your configuration and generate the billing units.
            </p>

            <div className="rounded-xl border border-white/35 bg-white/10 p-4">
              <h4 className="mb-3 text-sm font-medium text-white">Summary</h4>
              <div className="space-y-2 text-sm text-white/90">
                <p>
                  <span className="text-white/70">Source Files:</span>{" "}
                  {sourceFiles.length}
                </p>
                <p>
                  <span className="text-white/70">Template:</span>{" "}
                  {selectedTemplateId || "Not selected"}
                </p>
                <p>
                  <span className="text-white/70">ZIP Name:</span>{" "}
                  {zipName || defaultZipName}
                </p>
                <p>
                  <span className="text-white/70">Consolidation:</span>{" "}
                  {createConsolidation ? "Enabled" : "Disabled"}
                </p>
                {createConsolidation && (
                  <>
                    <p>
                      <span className="text-white/70">
                        Consolidation Template:
                      </span>{" "}
                      {consolidationTemplateId || "Not selected"}
                    </p>
                    <p>
                      <span className="text-white/70">Merged File:</span>{" "}
                      {createMergedConsolidation ? "Yes" : "No"}
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void generateBillingUnits()}
              disabled={
                isGenerating ||
                sourceFiles.length === 0 ||
                !selectedTemplateId ||
                (createConsolidation && !consolidationTemplateId)
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
            >
              <DownloadSimpleIcon size={18} />
              {isGenerating ? "Generating..." : "Scan and Generate"}
            </button>
          </div>
        </Step>
      </Stepper>

      <ProcessingOverlay
        isVisible={isOverlayVisible}
        isOpaque={isOverlayOpaque}
        isFinalizing={isFinalizing}
        elapsedSeconds={elapsedSeconds}
      />
    </section>
  );
}
