"use client";

import {
  DownloadSimpleIcon,
  FileXlsIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
  FolderIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { WorkspaceStepper } from "@/components/WorkspaceStepper";
import { TemplateManagerInline } from "@/components/TemplateManagerInline";
import { ProcessingOverlay } from "@/components/ifr-scanner/ProcessingOverlay";
import { useGenerateProfiles } from "@/hooks/useGenerateProfiles";
import { getFileKey } from "@/lib/file-utils";
import { sanitizeFolderName } from "@/lib/file-utils";

const defaultBillingUnitFolderName = "billing unit";

export function GenerateProfilesToolStepped() {
  const {
    fileInputRef,
    sourceFiles,
    selectedTemplateId,
    zipName,
    billingUnitFolderName,
    sourceFolderNames,
    isGenerating,
    isOverlayVisible,
    isOverlayOpaque,
    elapsedSeconds,
    isFinalizing,
    ifrTemplates,
    handleFileSelection,
    setSelectedTemplateId,
    setZipName,
    setBillingUnitFolderName,
    updateFolderName,
    generateBillingUnits,
    canProceedToStep,
  } = useGenerateProfiles();

  const steps = [
    {
      title: "Upload Files",
      description: "Select source files",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Upload Source Files
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Upload one or more Excel files (.xlsx or .xls) containing IFR
              data.
            </p>
          </div>

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
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/5 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/10"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              Drag and drop Excel files here, or click to browse
            </span>
          </button>

          {sourceFiles.length > 0 && (
            <div className="rounded-xl border border-white/35 bg-white/5 p-4">
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
      ),
    },
    {
      title: "Configure",
      description: "Set file mappings",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Configure File Mappings
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Set folder names for each uploaded file.
            </p>
          </div>

          <label className="block">
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
              className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          <div className="space-y-3">
            {sourceFiles.map((file) => {
              const fileKey = getFileKey(file);
              const folderName = sourceFolderNames[fileKey] || "";

              return (
                <div
                  key={fileKey}
                  className="rounded-lg border border-white/30 bg-white/5 p-3"
                >
                  <p className="mb-2 truncate text-sm font-medium text-white">
                    {file.name}
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-xs text-white/70">
                      Division Folder Name
                    </span>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) =>
                        updateFolderName(fileKey, e.target.value)
                      }
                      className="w-full rounded border border-white/30 bg-white/5 px-2 py-1 text-sm text-white focus:border-white focus:outline-none"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      title: "Template",
      description: "Select template",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Template & Output Settings
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Select your IFR Scanner template and set the output ZIP name.
            </p>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <FileXlsIcon size={16} className="text-white" />
              IFR Scanner Template
            </p>
            <TemplateManagerInline
              scope="ifr-scanner"
              selectedTemplateId={selectedTemplateId}
              onSelectedTemplateIdChange={setSelectedTemplateId}
            />
          </div>

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
              className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>
        </div>
      ),
    },
    {
      title: "Review",
      description: "Generate output",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Review & Generate
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Review your configuration and generate the billing units.
            </p>
          </div>

          <div className="rounded-lg border border-white/30 bg-white/5 p-4">
            <h4 className="mb-3 text-sm font-medium text-white">Summary</h4>
            <div className="space-y-2 text-sm text-white/90">
              <p>
                <span className="text-white/70">Source Files:</span>{" "}
                {sourceFiles.length}
              </p>
              <p>
                <span className="text-white/70">Template:</span>{" "}
                {selectedTemplateId
                  ? ifrTemplates.find((t) => t.id === selectedTemplateId)
                      ?.name || selectedTemplateId
                  : "Not selected"}
              </p>
              <p>
                <span className="text-white/70">ZIP Name:</span>{" "}
                {zipName || defaultZipName}
              </p>
              <p>
                <span className="text-white/70">Billing Unit Folder:</span>{" "}
                {billingUnitFolderName || defaultBillingUnitFolderName}
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-3 shadow-xl shadow-emerald-950/30 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
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

      <WorkspaceStepper
        steps={steps}
        onComplete={() => void generateBillingUnits()}
        canProceed={canProceedToStep}
        completeButtonText={isGenerating ? "Generating..." : "Generate"}
      />

      <ProcessingOverlay
        isVisible={isOverlayVisible}
        isOpaque={isOverlayOpaque}
        isFinalizing={isFinalizing}
        elapsedSeconds={elapsedSeconds}
      />
    </section>
  );
}
