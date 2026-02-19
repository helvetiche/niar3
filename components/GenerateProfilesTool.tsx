"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckSquareIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  DownloadSimpleIcon,
  FileXlsIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { generateBillingUnitsZip } from "@/lib/api/billing-units";
import { TemplateManager } from "@/components/TemplateManager";
import { listTemplates, type StoredTemplate } from "@/lib/api/templates";

const defaultZipName = "BILLING UNITS";
const defaultConsolidationDivision = "0";
const defaultConsolidationIA = "IA";
const defaultMergedConsolidationFileName = "ALL DIVISION CONSOLIDATED";
const defaultBillingUnitFolderName = "billing unit";
const scannerConsolidationTemplateStorageKey =
  "ifr-scanner:last-consolidation-template-id";

const sanitizeFolderInput = (value: string): string =>
  value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

const getBaseName = (fileName: string): string => {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) return trimmed;
  return trimmed.slice(0, lastDot);
};

const getSourceFileKey = (file: File): string =>
  `${file.name}::${String(file.size)}::${String(file.lastModified)}`;

const detectDivisionAndIAFromFilename = (
  fileName: string,
): { division: string; ia: string } => {
  const baseName = getBaseName(fileName).replace(/_/g, " ").trim();
  const divisionMatch = /\bDIV\.?\s*([0-9]{1,2})\b/i.exec(baseName);
  if (!divisionMatch) {
    return {
      division: defaultConsolidationDivision,
      ia: defaultConsolidationIA,
    };
  }

  const division = String(Number.parseInt(divisionMatch[1], 10));
  const matchStart = divisionMatch.index ?? 0;
  const remainderStart = matchStart + divisionMatch[0].length;
  let iaPart = baseName.slice(remainderStart).trim();

  iaPart = iaPart.replace(/^[-:–—]+\s*/, "");
  iaPart = iaPart.replace(/\s{2,}/g, " ");

  return {
    division: division || defaultConsolidationDivision,
    ia: iaPart || defaultConsolidationIA,
  };
};

const buildConsolidationFileName = (division: string, ia: string): string => {
  const digits = division.replace(/[^0-9]/g, "");
  const paddedDivision = digits ? digits.padStart(2, "0") : "00";
  const iaName = ia.trim().toUpperCase() || "IA";
  return `${paddedDivision} ${iaName} CONSOLIDATED.xlsx`;
};

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const formatElapsedTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${String(secs)}s`;
  return `${String(mins)}m ${String(secs).padStart(2, "0")}s`;
};

export function GenerateProfilesTool() {
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [zipName, setZipName] = useState(defaultZipName);
  const [createConsolidation, setCreateConsolidation] = useState(false);
  const [createMergedConsolidation, setCreateMergedConsolidation] =
    useState(false);
  const [mergedConsolidationFileName, setMergedConsolidationFileName] =
    useState(defaultMergedConsolidationFileName);
  const [consolidationTemplates, setConsolidationTemplates] = useState<
    StoredTemplate[]
  >([]);
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
  const [isLoadingConsolidationTemplates, setIsLoadingConsolidationTemplates] =
    useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isOverlayOpaque, setIsOverlayOpaque] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);

  const handleSourceSelection = (incoming: FileList | null) => {
    setSourceFiles(Array.from(incoming ?? []));
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
          if (previous && items.some((item) => item.id === previous))
            return previous;
          const savedTemplateId = window.localStorage.getItem(
            scannerConsolidationTemplateStorageKey,
          );
          if (
            savedTemplateId &&
            items.some((item) => item.id === savedTemplateId)
          ) {
            return savedTemplateId;
          }
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

  useEffect(() => {
    if (sourceFiles.length === 0) {
      setSourceFolderNames({});
      return;
    }

    setSourceFolderNames((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getSourceFileKey(file);
        const existingName = previous[fileKey];
        next[fileKey] = existingName ? existingName : getBaseName(file.name);
      });
      return next;
    });

    setSourceConsolidationDivisions((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getSourceFileKey(file);
        const detected = detectDivisionAndIAFromFilename(file.name);
        const existingDivision = previous[fileKey];
        next[fileKey] = existingDivision ?? detected.division;
      });
      return next;
    });

    setSourceConsolidationIAs((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getSourceFileKey(file);
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

  const handleGenerateProfiles = async () => {
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

      setMessage("Success. Billing Unit ZIP has been downloaded.");
      setIsFinalizing(true);
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      await wait(280);
      setIsOverlayOpaque(false);
      await wait(320);
      setIsOverlayVisible(false);
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Failed to generate billing unit files.";
      setMessage(text);
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      setIsOverlayOpaque(false);
      await wait(240);
      setIsOverlayVisible(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearFiles = () => {
    setSourceFiles([]);
    setSelectedTemplateId("");
    setCreateConsolidation(false);
    setCreateMergedConsolidation(false);
    setMergedConsolidationFileName(defaultMergedConsolidationFileName);
    setConsolidationTemplateId("");
    setBillingUnitFolderName(defaultBillingUnitFolderName);
    setSourceFolderNames({});
    setSourceConsolidationDivisions({});
    setSourceConsolidationIAs({});
    setMessage("");
    if (sourceInputRef.current) sourceInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current);
      }
    };
  }, []);

  const handleFolderNameChange = (fileKey: string, value: string) => {
    const sanitized = sanitizeFolderInput(value);
    setSourceFolderNames((previous) => ({
      ...previous,
      [fileKey]: sanitized,
    }));
  };

  const handleDivisionChange = (fileKey: string, value: string) => {
    setSourceConsolidationDivisions((previous) => ({
      ...previous,
      [fileKey]: value.replace(/[^0-9]/g, ""),
    }));
  };

  const handleIAChange = (fileKey: string, value: string) => {
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
        <div className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
            <FileXlsIcon size={18} className="text-white" />
            IFR Source Files (Required)
          </span>

          <input
            id="source-files-input"
            ref={sourceInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            aria-label="Upload one or more source Excel files"
            onChange={(event) => {
              handleSourceSelection(event.target.files);
            }}
            className="hidden"
          />

          <button
            type="button"
            aria-label="Choose source Excel files"
            onClick={() => sourceInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleSourceSelection(event.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/10 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/15"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              Drag and drop IFR source files, or click to browse
            </span>
          </button>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
              <FileXlsIcon size={12} className="text-white" />
              Supported: .xlsx, .xls
            </span>
          </div>

          <p className="mt-2 text-xs text-white/80">
            Upload one or many .xlsx/.xls files. Each uploaded file is processed
            as a separate division folder in the ZIP with one{" "}
            <span className="font-medium">billing unit</span> subfolder.
          </p>
        </div>
      </div>

      {sourceFiles.length > 0 && (
        <section className="mt-3 rounded-xl border border-white/35 bg-white/10 p-4">
          <p className="flex items-center gap-2 text-sm text-white">
            <FileXlsIcon size={16} className="text-white" />
            Selected source files: {String(sourceFiles.length)}
          </p>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-white/90">
              Billing Unit Folder Name
            </span>
            <input
              type="text"
              aria-label="Set billing unit folder name"
              value={billingUnitFolderName}
              onChange={(event) =>
                setBillingUnitFolderName(
                  sanitizeFolderInput(event.target.value),
                )
              }
              className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder={defaultBillingUnitFolderName}
            />
          </label>

          <div className="mt-4 space-y-4">
            {sourceFiles.map((file) => {
              const fileKey = getSourceFileKey(file);
              const folderName =
                sourceFolderNames[fileKey] || getBaseName(file.name);
              const profilesFolder =
                billingUnitFolderName.trim() || defaultBillingUnitFolderName;
              const divisionValue =
                sourceConsolidationDivisions[fileKey] ??
                defaultConsolidationDivision;
              const iaValue =
                sourceConsolidationIAs[fileKey] ?? defaultConsolidationIA;
              const consolidationFileName = buildConsolidationFileName(
                divisionValue,
                iaValue,
              );

              return (
                <div
                  key={fileKey}
                  className="rounded-lg border border-white/30 bg-white/10 p-3"
                >
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-white/85">
                      Division Folder Name for {file.name}
                    </span>
                    <input
                      type="text"
                      aria-label={`Set division folder name for ${file.name}`}
                      value={folderName}
                      onChange={(event) =>
                        handleFolderNameChange(fileKey, event.target.value)
                      }
                      className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      placeholder={getBaseName(file.name)}
                    />
                  </label>

                  {createConsolidation && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-medium text-white/85">
                          Division for {file.name}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          aria-label={`Set consolidation division for ${file.name}`}
                          value={divisionValue}
                          onChange={(event) =>
                            handleDivisionChange(fileKey, event.target.value)
                          }
                          className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                          placeholder={defaultConsolidationDivision}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-medium text-white/85">
                          IA for {file.name}
                        </span>
                        <input
                          type="text"
                          aria-label={`Set consolidation IA for ${file.name}`}
                          value={iaValue}
                          onChange={(event) =>
                            handleIAChange(fileKey, event.target.value)
                          }
                          className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                          placeholder={defaultConsolidationIA}
                        />
                      </label>
                    </div>
                  )}

                  <div className="mt-3 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs text-white">
                    <p className="font-medium">{folderName || "division"}/</p>
                    {createConsolidation && (
                      <p className="pl-4">{consolidationFileName}</p>
                    )}
                    <p className="pl-4">{profilesFolder}/</p>
                    <p className="pl-8 text-white/70">
                      ...generated billing unit files
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
        onSelectedTemplateIdChange={(id) => {
          setSelectedTemplateId(id);
        }}
      />
      <p className="mt-2 text-xs leading-5 text-white/80">
        Select the saved IFR Scanner template used to generate each lot billing
        unit workbook. This template controls the output workbook layout and
        cell mapping.
      </p>

      <section className="mt-4 rounded-xl border border-white/35 bg-white/10 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/40 bg-white/10 text-emerald-800 focus:ring-white/60"
            checked={createConsolidation}
            onChange={(event) => {
              const nextChecked = event.target.checked;
              setCreateConsolidation(nextChecked);
              if (!nextChecked) {
                setCreateMergedConsolidation(false);
              }
            }}
            aria-label="Create consolidation file from generated billing units"
          />
          <span>
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <CheckSquareIcon size={16} className="text-white" />
              Create Consolidation
            </span>
            <span className="mt-1 block text-xs text-white/80">
              Enable this to generate a consolidated XLSX and include it in the
              same ZIP.
            </span>
          </span>
        </label>

        {createConsolidation && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/90">
                Consolidation Template
              </span>
              <select
                aria-label="Select consolidation template"
                value={consolidationTemplateId}
                onChange={(event) =>
                  setConsolidationTemplateId(event.target.value)
                }
                disabled={isLoadingConsolidationTemplates}
                className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="">Select template...</option>
                {consolidationTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs text-white/80">
                Uses saved templates from Consolidate Billing Unit scope. This
                template is used to build the combined workbook included in the
                ZIP.
              </span>
            </label>

            <div className="md:col-span-2 rounded-lg border border-white/30 bg-white/10 p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-white/40 bg-white/10 text-emerald-800 focus:ring-white/60"
                  checked={createMergedConsolidation}
                  onChange={(event) =>
                    setCreateMergedConsolidation(event.target.checked)
                  }
                  aria-label="Create merged xlsx file from all consolidated outputs"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium text-white">
                    <CheckSquareIcon size={16} className="text-white" />
                    Create Merged XLSX File
                  </span>
                  <span className="mt-1 block text-xs text-white/80">
                    Combine all generated consolidation files into one workbook
                    with separate sheets for each source file.
                  </span>
                </span>
              </label>

              {createMergedConsolidation && (
                <label className="mt-3 block">
                  <span className="mb-2 block text-sm font-medium text-white/90">
                    Combined Consolidation File Name
                  </span>
                  <input
                    type="text"
                    aria-label="Set merged consolidation file name"
                    value={mergedConsolidationFileName}
                    onChange={(event) =>
                      setMergedConsolidationFileName(event.target.value)
                    }
                    className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder={defaultMergedConsolidationFileName}
                  />
                  <span className="mt-2 block text-xs text-white/80">
                    This filename is used for the merged workbook added to the
                    ZIP root.
                  </span>
                </label>
              )}
            </div>

            <p className="md:col-span-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs text-white/85">
              Consolidation filename is automatic per file:{" "}
              <span className="font-medium">
                [Division (2 digits)] [IA NAME] CONSOLIDATED.xlsx
              </span>
              . Example:{" "}
              <span className="font-medium">
                08 BAGONG PAG-ASA CONSOLIDATED.xlsx
              </span>
              .
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Generate billing unit zip file"
          onClick={() => {
            void handleGenerateProfiles();
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
          onClick={handleClearFiles}
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

      {isOverlayVisible && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-emerald-900/90 backdrop-blur-sm transition-opacity duration-300 ${
            isOverlayOpaque ? "opacity-100" : "opacity-0"
          }`}
          aria-live="polite"
        >
          <div className="w-[92%] max-w-lg rounded-2xl border border-white/15 bg-emerald-950/55 p-6 text-white shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              {isFinalizing ? (
                <CheckCircleIcon
                  size={28}
                  weight="fill"
                  className="text-white"
                />
              ) : (
                <WrenchIcon size={28} weight="duotone" className="text-white" />
              )}
              <p className="text-lg font-medium">
                {isFinalizing ? "Done" : "Processing IFR"}
              </p>
            </div>

            <div className="relative h-4 overflow-hidden rounded-full bg-emerald-950/80 ring-2 ring-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
              <div className="scanner-loading-bar absolute left-0 top-0 h-full w-2/5 rounded-full bg-white" />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-white/90">
              <p>
                {isFinalizing
                  ? "Finalizing and preparing download..."
                  : "Please wait..."}
              </p>
              <p className="inline-flex items-center gap-1 tabular-nums font-medium">
                <ClockCountdownIcon size={14} />
                Time Elapsed: {formatElapsedTime(elapsedSeconds)}
              </p>
            </div>

            <p className="mt-2 text-xs text-white/80">
              Do not interrupt or close this window while processing.
            </p>
          </div>
        </div>
      )}
      <style jsx>{`
        .scanner-loading-bar {
          animation: scanner-loading-slide 1.2s ease-in-out infinite;
        }

        @keyframes scanner-loading-slide {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(170%);
          }
          100% {
            transform: translateX(-120%);
          }
        }
      `}</style>
    </section>
  );
}
