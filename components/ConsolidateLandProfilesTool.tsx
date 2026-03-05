"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  UploadSimpleIcon,
  FileIcon,
  XIcon,
  DownloadSimpleIcon,
  CheckCircleIcon,
  MicrosoftExcelLogoIcon,
  FolderOpenIcon,
  InfoIcon,
  FileXlsIcon,
} from "@phosphor-icons/react";
import { WorkspaceStepper } from "@/components/WorkspaceStepper";
import { TemplateManagerInline } from "@/components/TemplateManagerInline";
import { useTemplates } from "@/hooks/useTemplates";
import { getErrorMessage } from "@/lib/utils";

interface UploadedFile {
  file: File;
  id: string;
}

interface ConsolidationResult {
  count: number;
  errors: string[];
  warnings: string[];
}

export default function ConsolidateLandProfilesTool() {
  const templateInputRef = useRef<HTMLInputElement | null>(null);
  const landProfileInputRef = useRef<HTMLInputElement | null>(null);

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [landProfileFiles, setLandProfileFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ConsolidationResult | null>(null);

  const { data: consolidationTemplates = [] } = useTemplates("consolidation");

  const handleTemplateSelection = (incoming: FileList | null) => {
    const file = incoming?.[0];
    if (file) {
      setTemplateFile(file);
      setSelectedTemplateId(""); // Clear template manager selection
      setResult(null);
    }
  };

  const handleLandProfileSelection = (incoming: FileList | null) => {
    const files = Array.from(incoming ?? []);
    const newFiles = files.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));

    setLandProfileFiles((prev) => [...prev, ...newFiles]);
    setResult(null);

    if (landProfileInputRef.current) {
      landProfileInputRef.current.value = "";
    }
  };

  const removeLandProfileFile = (id: string) => {
    setLandProfileFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const removeTemplateFile = () => {
    setTemplateFile(null);
    if (templateInputRef.current) {
      templateInputRef.current.value = "";
    }
  };

  const handleConsolidate = async () => {
    if ((!templateFile && !selectedTemplateId) || landProfileFiles.length === 0) {
      toast.error("Please select a template and upload IFR files.");
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();

      // Use uploaded template file or fetch from template manager
      if (templateFile) {
        formData.append("template", templateFile);
      } else if (selectedTemplateId) {
        // Fetch the template from the server
        const templateResponse = await fetch(`/api/v1/templates/${selectedTemplateId}`);
        if (!templateResponse.ok) {
          throw new Error("Failed to fetch template");
        }
        const templateBlob = await templateResponse.blob();
        const templateFileName = consolidationTemplates.find(t => t.id === selectedTemplateId)?.name || "template.xlsx";
        formData.append("template", templateBlob, templateFileName);
      }

      landProfileFiles.forEach((item, index) => {
        formData.append(`landProfile_${index}`, item.file);
      });

      const response = await fetch("/api/v1/consolidate-land-profiles", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to consolidate files");
      }

      const processedCount = parseInt(
        response.headers.get("X-Processed-Count") || "0",
      );
      const errors = JSON.parse(response.headers.get("X-Errors") || "[]");
      const warnings = JSON.parse(response.headers.get("X-Warnings") || "[]");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `consolidated-land-profiles-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setResult({ count: processedCount, errors, warnings });

      if (errors.length === 0) {
        toast.success(
          `Successfully consolidated ${processedCount} land profile(s)!`,
        );
      } else {
        toast.success(
          `Consolidated with ${errors.length} error(s). Check results for details.`,
        );
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to consolidate land profiles."),
      );
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    {
      title: "Select Template",
      description: "Choose or upload",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Select Template File
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Choose a saved template or upload a new consolidation template
              Excel file.
            </p>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <FileXlsIcon size={16} className="text-white" />
              Consolidation Template
            </p>
            <TemplateManagerInline
              scope="consolidation"
              selectedTemplateId={selectedTemplateId}
              onSelectedTemplateIdChange={(id) => {
                setSelectedTemplateId(id);
                setTemplateFile(null); // Clear uploaded file
                if (templateInputRef.current) {
                  templateInputRef.current.value = "";
                }
              }}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-emerald-900 px-2 text-white/60">OR</span>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-white">
              Upload Template File
            </p>
            <input
              ref={templateInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleTemplateSelection(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => templateInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleTemplateSelection(e.dataTransfer.files);
              }}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/5 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/10"
            >
              <UploadSimpleIcon size={34} className="text-white" />
              <span className="font-medium">
                Drag and drop template file here, or click to browse
              </span>
            </button>

            {templateFile && (
              <div className="mt-3 rounded-xl border border-white/35 bg-white/5 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <CheckCircleIcon size={16} className="text-white" />
                  Template file selected
                </p>
                <div className="flex items-center justify-between rounded-lg border border-white/20 bg-white/5 p-3">
                  <div className="flex items-center gap-2">
                    <FileIcon size={18} className="text-white/80" />
                    <span className="text-sm text-white">
                      {templateFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeTemplateFile}
                    className="rounded p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Upload IFR Files",
      description: "Select IFR files",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Upload IFR Files
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Upload one or more IFR Excel files to consolidate. Files will be
              processed and merged into the template.
            </p>
          </div>

          <input
            ref={landProfileInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={(e) => handleLandProfileSelection(e.target.files)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => landProfileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleLandProfileSelection(e.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/5 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/10"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              Drag and drop IFR files here, or click to browse
            </span>
          </button>

          {landProfileFiles.length > 0 && (
            <div className="rounded-xl border border-white/35 bg-white/5 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                <CheckCircleIcon size={16} className="text-white" />
                {landProfileFiles.length} IFR file(s) selected
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {landProfileFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-white/20 bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <FileIcon size={18} className="text-white/80" />
                      <span className="text-sm text-white">
                        {item.file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLandProfileFile(item.id)}
                      className="rounded p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
                    >
                      <XIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Review",
      description: "Consolidate files",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Review & Consolidate
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Review your files and consolidate them into a single output file.
            </p>
          </div>

          <div className="rounded-lg border border-white/30 bg-white/5 p-4">
            <h4 className="mb-3 text-sm font-medium text-white">Summary</h4>
            <div className="space-y-2 text-sm text-white/90">
              <p>
                <span className="text-white/70">Template:</span>{" "}
                {templateFile
                  ? templateFile.name
                  : selectedTemplateId
                    ? consolidationTemplates.find((t) => t.id === selectedTemplateId)
                        ?.name || "Selected"
                    : "Not selected"}
              </p>
              <p>
                <span className="text-white/70">IFR Files:</span>{" "}
                {landProfileFiles.length}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-white/30 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <InfoIcon size={16} className="text-white/60" />
              Processing Notes
            </div>
            <ul className="space-y-1 text-sm text-white/80">
              <li className="flex gap-2">
                <span className="text-white/60">•</span>
                <span>
                  The system extracts data from sheets "00 ACC DETAILS 01" and
                  "01 SOA 01"
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-white/60">•</span>
                <span>
                  IFR calculations are performed automatically using the
                  irrigation rate table
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-white/60">•</span>
                <span>Duplicate crop seasons per lot are removed</span>
              </li>
              <li className="flex gap-2">
                <span className="text-white/60">•</span>
                <span>
                  Years before 1975 and 75-D are skipped, but 75-W is included
                </span>
              </li>
            </ul>
          </div>

          {result && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon
                    size={20}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-green-300"
                  />
                  <div className="text-sm text-white">
                    <p className="font-medium">
                      Successfully processed {result.count} land profile(s)!
                    </p>
                    <p className="mt-1 text-white/80">
                      The consolidated file has been downloaded.
                    </p>
                  </div>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-yellow-300">
                    <InfoIcon size={16} />
                    Important Notes ({result.warnings.length})
                  </div>
                  <ul className="space-y-1 text-sm text-yellow-200/90">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-yellow-300/60">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-300">
                    <XIcon size={16} />
                    Errors ({result.errors.length})
                  </div>
                  <ul className="space-y-1 text-sm text-red-200/90">
                    {result.errors.map((err, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-red-300/60">•</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-3 shadow-xl shadow-emerald-950/30 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <MicrosoftExcelLogoIcon size={18} className="text-white" />
          </span>
          Consolidate Land Profiles
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <FolderOpenIcon size={12} className="text-white" />
            IFR Consolidation
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <DownloadSimpleIcon size={12} className="text-white" />
            Excel Output
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85">
          Consolidate multiple IFR files into a single output file with
          automatic calculations.
        </p>
      </div>

      <WorkspaceStepper
        steps={steps}
        onComplete={() => void handleConsolidate()}
        canProceed={(step) => {
          if (step === 0) return !!(templateFile || selectedTemplateId);
          if (step === 1) return landProfileFiles.length > 0;
          return true;
        }}
        completeButtonText={isProcessing ? "Processing..." : "Consolidate"}
      />
    </section>
  );
}
