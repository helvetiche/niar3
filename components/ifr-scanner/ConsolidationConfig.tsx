"use client";

import { CheckSquareIcon } from "@phosphor-icons/react";
import type { StoredTemplate } from "@/lib/api/templates";
import { DEFAULT_MERGED_CONSOLIDATION_FILE_NAME } from "@/lib/file-utils";

interface ConsolidationConfigProps {
  createConsolidation: boolean;
  createMergedConsolidation: boolean;
  mergedConsolidationFileName: string;
  consolidationTemplates: StoredTemplate[];
  consolidationTemplateId: string;
  isLoadingTemplates: boolean;
  onCreateConsolidationChange: (value: boolean) => void;
  onCreateMergedConsolidationChange: (value: boolean) => void;
  onMergedFileNameChange: (value: string) => void;
  onTemplateIdChange: (value: string) => void;
}

export function ConsolidationConfig({
  createConsolidation,
  createMergedConsolidation,
  mergedConsolidationFileName,
  consolidationTemplates,
  consolidationTemplateId,
  isLoadingTemplates,
  onCreateConsolidationChange,
  onCreateMergedConsolidationChange,
  onMergedFileNameChange,
  onTemplateIdChange,
}: ConsolidationConfigProps) {
  return (
    <section className="mt-4 rounded-xl border border-white/35 bg-white/10 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-white/40 bg-white/10 text-emerald-800 focus:ring-white/60"
          checked={createConsolidation}
          onChange={(e) => {
            const nextChecked = e.target.checked;
            onCreateConsolidationChange(nextChecked);
            if (!nextChecked) {
              onCreateMergedConsolidationChange(false);
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
              onChange={(e) => onTemplateIdChange(e.target.value)}
              disabled={isLoadingTemplates}
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
                onChange={(e) =>
                  onCreateMergedConsolidationChange(e.target.checked)
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
                  onChange={(e) => onMergedFileNameChange(e.target.value)}
                  className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder={DEFAULT_MERGED_CONSOLIDATION_FILE_NAME}
                />
                <span className="mt-2 block text-xs text-white/80">
                  This filename is used for the merged workbook added to the ZIP
                  root.
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
  );
}
