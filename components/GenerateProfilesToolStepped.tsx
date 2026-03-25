"use client";

import {
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
  FolderIcon,
  CheckCircleIcon,
  FileXlsIcon,
} from "@phosphor-icons/react";
import { WorkspaceStepper } from "@/components/WorkspaceStepper";
import { ProcessingOverlay } from "@/components/ifr-scanner/ProcessingOverlay";
import {
  defaultBillingUnitFolderName,
  defaultZipName,
  useGenerateProfiles,
} from "@/hooks/useGenerateProfiles";
import { getFileKey } from "@/lib/file-utils";
import { sanitizeFolderName } from "@/lib/file-utils";

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
            <h3 className="text-lg font-medium text-white">Upload IFR</h3>
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

          <div className="rounded-lg border border-white/30 bg-white/5 p-4">
            <div className="overflow-x-auto">
              <table className="w-full border border-white/30 text-sm">
                <thead className="border-b border-white/20 bg-white/5">
                  <tr className="text-left text-white">
                    <th className="border-r border-white/20 p-3 font-semibold">
                      File Name
                    </th>
                    <th className="p-3 font-semibold">Division Folder Name</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceFiles.map((file, idx) => {
                    const fileKey = getFileKey(file);
                    const folderName = sourceFolderNames[fileKey] || "";

                    return (
                      <tr
                        key={fileKey}
                        className={`border-b border-white/10 last:border-b-0 ${
                          idx % 2 === 0 ? "bg-white/5" : ""
                        }`}
                      >
                        <td className="border-r border-white/20 p-3 text-white/90">
                          {file.name}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={folderName}
                            onChange={(e) =>
                              updateFolderName(fileKey, e.target.value)
                            }
                            placeholder="Enter division folder name"
                            className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
            <div className="overflow-x-auto">
              <table className="w-full border border-white/30 text-sm">
                <thead className="border-b border-white/20 bg-white/5">
                  <tr className="text-left text-white">
                    <th className="border-r border-white/20 p-3 font-semibold">
                      Field
                    </th>
                    <th className="p-3 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="border-r border-white/20 p-3 text-white/70">
                      Source Files
                    </td>
                    <td className="p-3 text-white">{sourceFiles.length}</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="border-r border-white/20 p-3 text-white/70">
                      Template
                    </td>
                    <td className="p-3 text-white">
                      {selectedTemplateId
                        ? ifrTemplates.find((t) => t.id === selectedTemplateId)
                            ?.name || "Auto-selected"
                        : "Auto-selected"}
                    </td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="border-r border-white/20 p-3 text-white/70">
                      ZIP Name
                    </td>
                    <td className="p-3 text-white">
                      {zipName || defaultZipName}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-white/20 p-3 text-white/70">
                      Billing Unit Folder
                    </td>
                    <td className="p-3 text-white">
                      {billingUnitFolderName || defaultBillingUnitFolderName}
                    </td>
                  </tr>
                </tbody>
              </table>
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
          Generate Billing Unit
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
