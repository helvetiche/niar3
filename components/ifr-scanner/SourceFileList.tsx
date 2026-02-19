"use client";

import { FileXlsIcon } from "@phosphor-icons/react";
import {
  getFileKey,
  getBaseName,
  sanitizeFolderName,
  buildConsolidationFileName,
} from "@/lib/file-utils";

interface SourceFileListProps {
  files: File[];
  billingUnitFolderName: string;
  sourceFolderNames: Record<string, string>;
  sourceConsolidationDivisions: Record<string, string>;
  sourceConsolidationIAs: Record<string, string>;
  createConsolidation: boolean;
  onFolderNameChange: (fileKey: string, value: string) => void;
  onDivisionChange: (fileKey: string, value: string) => void;
  onIAChange: (fileKey: string, value: string) => void;
  onBillingUnitFolderNameChange: (value: string) => void;
}

const defaultConsolidationDivision = "0";
const defaultConsolidationIA = "IA";
const defaultBillingUnitFolderName = "billing unit";

export function SourceFileList({
  files,
  billingUnitFolderName,
  sourceFolderNames,
  sourceConsolidationDivisions,
  sourceConsolidationIAs,
  createConsolidation,
  onFolderNameChange,
  onDivisionChange,
  onIAChange,
  onBillingUnitFolderNameChange,
}: SourceFileListProps) {
  if (files.length === 0) return null;

  return (
    <section className="mt-3 rounded-xl border border-white/35 bg-white/10 p-4">
      <p className="flex items-center gap-2 text-sm text-white">
        <FileXlsIcon size={16} className="text-white" />
        Selected source files: {String(files.length)}
      </p>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-medium text-white/90">
          Billing Unit Folder Name
        </span>
        <input
          type="text"
          aria-label="Set billing unit folder name"
          value={billingUnitFolderName}
          onChange={(e) =>
            onBillingUnitFolderNameChange(sanitizeFolderName(e.target.value))
          }
          className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder={defaultBillingUnitFolderName}
        />
      </label>

      <div className="mt-4 space-y-4">
        {files.map((file) => {
          const fileKey = getFileKey(file);
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
            true,
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
                  onChange={(e) => onFolderNameChange(fileKey, e.target.value)}
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
                      onChange={(e) =>
                        onDivisionChange(fileKey, e.target.value)
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
                      onChange={(e) => onIAChange(fileKey, e.target.value)}
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
  );
}
