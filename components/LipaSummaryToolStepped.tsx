"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  DownloadSimpleIcon,
  FilePdfIcon,
  FileTextIcon,
  TrashIcon,
  UploadSimpleIcon,
  CheckCircleIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { WorkspaceStepper } from "@/components/WorkspaceStepper";
import {
  buildLipaSummaryReport,
  scanLipaFile,
  type LipaScannedFileResult,
} from "@/lib/api/lipa-summary";
import { downloadBlob, getErrorMessage } from "@/lib/utils";

type LipaUploadItem = {
  id: string;
  file: File;
  divisionName: string;
  pageNumber: string;
};

const defaultReportTitle = "LIST OF IRRIGATED AND PLANTED AREA (LIPA)";
const defaultSeason = "DRY CROPPING SEASON 2025";
const defaultOutputFileName = "LIPA Summary Report";

const normalizeDivisionFromFileName = (fileName: string): string =>
  fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const createItemId = (file: File, index: number): string =>
  `${file.name}-${String(file.lastModified)}-${String(file.size)}-${String(index)}`;

export function LipaSummaryToolStepped() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<LipaUploadItem[]>([]);
  const [title, setTitle] = useState(defaultReportTitle);
  const [season, setSeason] = useState(defaultSeason);
  const [outputFileName, setOutputFileName] = useState(defaultOutputFileName);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const handleIncomingFiles = (incoming: FileList | null) => {
    const incomingFiles = Array.from(incoming ?? []).filter((file) =>
      file.name.toLowerCase().endsWith(".pdf"),
    );

    if (incomingFiles.length === 0) {
      toast.error("Please upload PDF files only.");
      return;
    }

    setItems((previous) => {
      const existingKeys = new Set(
        previous.map(
          (item) =>
            `${item.file.name}-${String(item.file.lastModified)}-${String(item.file.size)}`,
        ),
      );
      const added = incomingFiles
        .filter(
          (file) =>
            !existingKeys.has(
              `${file.name}-${String(file.lastModified)}-${String(file.size)}`,
            ),
        )
        .map((file, index) => ({
          id: createItemId(file, previous.length + index),
          file,
          divisionName: normalizeDivisionFromFileName(file.name) || "DIVISION",
          pageNumber: "1",
        }));

      return [...previous, ...added];
    });
  };

  const handleDivisionChange = (id: string, divisionName: string) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, divisionName } : item,
      ),
    );
  };

  const handlePageNumberChange = (id: string, pageNumber: string) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, pageNumber: pageNumber.replace(/[^0-9]/g, "") }
          : item,
      ),
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  };

  const handleGenerate = async () => {
    if (items.length === 0) {
      toast.error("Please upload at least one PDF file.");
      return;
    }

    setIsGenerating(true);
    setProgressPercent(0);
    setProgressLabel("Starting...");

    try {
      const scannedResults: LipaScannedFileResult[] = [];
      const totalFiles = items.length;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const currentProgress = Math.round(((i + 1) / totalFiles) * 50);
        setProgressPercent(currentProgress);
        setProgressLabel(`Scanning ${item.file.name}...`);

        const scanned = await scanLipaFile({
          file: item.file,
          mapping: {
            fileIndex: i,
            fileName: item.file.name,
            divisionName: item.divisionName,
            pageNumber: Number.parseInt(item.pageNumber || "1", 10),
          },
        });
        scannedResults.push(scanned);
      }

      setProgressPercent(60);
      setProgressLabel("Building report...");

      const reportResult = await buildLipaSummaryReport({
        scannedFiles: scannedResults,
        title: title.trim() || defaultReportTitle,
        season: season.trim() || defaultSeason,
        outputFileName: outputFileName.trim() || defaultOutputFileName,
      });

      setProgressPercent(100);
      setProgressLabel("Complete!");

      downloadBlob(reportResult.blob, reportResult.fileName);

      toast.success("LIPA Summary Report generated successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate LIPA summary."));
    } finally {
      setIsGenerating(false);
      setProgressPercent(0);
      setProgressLabel("");
    }
  };

  const steps = [
    {
      title: "Upload PDFs",
      description: "Select LIPA files",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Upload LIPA PDFs</h3>
            <p className="mt-1 text-sm text-white/80">
              Upload one or more LIPA PDF files to generate a summary report.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => handleIncomingFiles(e.target.files)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleIncomingFiles(e.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/5 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/10"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              Drag and drop PDF files here, or click to browse
            </span>
          </button>

          {items.length > 0 && (
            <div className="rounded-xl border border-white/35 bg-white/5 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <CheckCircleIcon size={16} className="text-white" />
                {items.length} file(s) selected
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Configure Files",
      description: "Set divisions",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Configure Files</h3>
            <p className="mt-1 text-sm text-white/80">
              Set division names and page numbers for each file.
            </p>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-white/30 bg-white/5 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-white">
                    {item.file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="rounded p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs text-white/70">
                      Division Name
                    </span>
                    <input
                      type="text"
                      value={item.divisionName}
                      onChange={(e) =>
                        handleDivisionChange(item.id, e.target.value)
                      }
                      className="w-full rounded border border-white/30 bg-white/5 px-2 py-1 text-sm text-white focus:border-white focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-white/70">
                      Page Number
                    </span>
                    <input
                      type="text"
                      value={item.pageNumber}
                      onChange={(e) =>
                        handlePageNumberChange(item.id, e.target.value)
                      }
                      className="w-full rounded border border-white/30 bg-white/5 px-2 py-1 text-sm text-white focus:border-white focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Report Settings",
      description: "Title & output",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Report Settings</h3>
            <p className="mt-1 text-sm text-white/80">
              Configure the report title, season, and output file name.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
              <FileTextIcon size={16} className="text-white" />
              Report Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultReportTitle}
              className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
              <PencilSimpleIcon size={16} className="text-white" />
              Season
            </span>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder={defaultSeason}
              className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
              <DownloadSimpleIcon size={16} className="text-white" />
              Output File Name
            </span>
            <input
              type="text"
              value={outputFileName}
              onChange={(e) => setOutputFileName(e.target.value)}
              placeholder={defaultOutputFileName}
              className="w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>
        </div>
      ),
    },
    {
      title: "Review",
      description: "Generate report",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Review & Generate
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Review your configuration and generate the summary report.
            </p>
          </div>

          <div className="rounded-lg border border-white/30 bg-white/5 p-4">
            <h4 className="mb-3 text-sm font-medium text-white">Summary</h4>
            <div className="space-y-2 text-sm text-white/90">
              <p>
                <span className="text-white/70">PDF Files:</span> {items.length}
              </p>
              <p>
                <span className="text-white/70">Report Title:</span>{" "}
                {title || defaultReportTitle}
              </p>
              <p>
                <span className="text-white/70">Season:</span>{" "}
                {season || defaultSeason}
              </p>
              <p>
                <span className="text-white/70">Output Name:</span>{" "}
                {outputFileName || defaultOutputFileName}
              </p>
            </div>
          </div>

          {isGenerating && (
            <div className="rounded-lg border border-white/30 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-white">
                <span>{progressLabel}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
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
            <FileTextIcon size={18} className="text-white" />
          </span>
          LIPA Summary
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <FilePdfIcon size={12} className="text-white" />
            PDF Scanning
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <DownloadSimpleIcon size={12} className="text-white" />
            Summary Report
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85">
          Follow the steps below to generate a LIPA summary report.
        </p>
      </div>

      <WorkspaceStepper
        steps={steps}
        onComplete={() => void handleGenerate()}
        canProceed={(step) => {
          if (step === 0) return items.length > 0;
          return true;
        }}
        completeButtonText={isGenerating ? "Generating..." : "Generate Report"}
      />
    </section>
  );
}
