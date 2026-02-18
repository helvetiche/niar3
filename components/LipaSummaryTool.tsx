"use client";

import { useRef, useState } from "react";
import {
  DownloadSimpleIcon,
  FilePdfIcon,
  FileTextIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import {
  buildLipaSummaryReport,
  scanLipaFile,
  type LipaScannedFileResult,
  type LipaSummaryFileMapping,
} from "@/lib/api/lipa-summary";

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

export function LipaSummaryTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<LipaUploadItem[]>([]);
  const [title, setTitle] = useState(defaultReportTitle);
  const [season, setSeason] = useState(defaultSeason);
  const [outputFileName, setOutputFileName] = useState(defaultOutputFileName);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [message, setMessage] = useState("");

  const handleIncomingFiles = (incoming: FileList | null) => {
    const incomingFiles = Array.from(incoming ?? []).filter((file) =>
      file.name.toLowerCase().endsWith(".pdf"),
    );

    if (incomingFiles.length === 0) {
      setMessage("Please upload PDF files only.");
      return;
    }

    setItems((previous) => {
      const existingKeys = new Set(
        previous.map((item) => `${item.file.name}-${String(item.file.lastModified)}-${String(item.file.size)}`),
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
    setMessage("");
  };

  const handleDivisionChange = (id: string, divisionName: string) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, divisionName } : item)),
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

  const handleRemoveFile = (id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  };

  const handleReset = () => {
    setItems([]);
    setTitle(defaultReportTitle);
    setSeason(defaultSeason);
    setOutputFileName(defaultOutputFileName);
    setProgressPercent(0);
    setProgressLabel("");
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildMappings = (): LipaSummaryFileMapping[] =>
    items.map((item, index) => ({
      fileIndex: index,
      fileName: item.file.name,
      divisionName: item.divisionName.trim(),
      pageNumber: Number.parseInt(item.pageNumber ?? "0", 10),
    }));

  const handleGenerate = async () => {
    if (items.length === 0) {
      setMessage("Please upload at least one PDF file.");
      return;
    }

    const hasBlankDivision = items.some((item) => !item.divisionName.trim());
    if (hasBlankDivision) {
      setMessage("Every file must have a division name before generation.");
      return;
    }

    const hasInvalidPage = items.some((item) => {
      const pageNumber = Number.parseInt(item.pageNumber || "0", 10);
      return !Number.isInteger(pageNumber) || pageNumber < 0;
    });
    if (hasInvalidPage) {
      setMessage("Every file must have a valid page number (0 or higher).");
      return;
    }

    setIsGenerating(true);
    setProgressPercent(0);
    setProgressLabel("Preparing files...");
    setMessage("Scanning PDFs with AI and building LIPA report...");
    let succeeded = false;

    try {
      const mappings = buildMappings();
      const scannedFiles: LipaScannedFileResult[] = [];

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const mapping = mappings[index];
        if (!mapping) {
          throw new Error("Missing scan mapping for one or more files.");
        }
        const startedPercent = Math.max(
          1,
          Math.round((index / Math.max(1, items.length)) * 90),
        );
        setProgressPercent(startedPercent);
        setProgressLabel(
          `Scanning ${String(index + 1)} of ${String(items.length)}: ${item.file.name}`,
        );

        const scanned = await scanLipaFile({
          file: item.file,
          mapping,
        });
        scannedFiles.push(scanned);

        const completedPercent = Math.round(((index + 1) / items.length) * 90);
        setProgressPercent(completedPercent);
      }

      setProgressLabel("Building final Excel report...");
      setProgressPercent(95);

      const result = await buildLipaSummaryReport({
        scannedFiles,
        title: title.trim(),
        season: season.trim(),
        outputFileName: outputFileName.trim(),
      });

      const blobUrl = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setProgressPercent(100);
      setProgressLabel("Completed");

      setMessage(
        `Success. Scanned ${String(result.scannedFiles)} PDF file(s) and extracted ${String(result.extractedAssociations)} association record(s).`,
      );
      succeeded = true;
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Failed to generate LIPA summary report.";
      setMessage(text);
    } finally {
      setIsGenerating(false);
      if (!succeeded) {
        setTimeout(() => {
          setProgressPercent(0);
          setProgressLabel("");
        }, 1200);
      }
    }
  };

  return (
    <section className="flex h-full w-full flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-zinc-900">
          <FileTextIcon size={22} className="text-emerald-700" />
          LIPA Summary
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Upload PDF files, assign each file to a division, then generate a final
          Excel LIPA report immediately. This workflow does not save uploaded files
          to Firebase storage.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-800">
            Report Title
          </span>
          <input
            type="text"
            aria-label="Report title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            placeholder={defaultReportTitle}
          />
          <span className="mt-2 block text-xs leading-5 text-zinc-600">
            Main heading shown in the generated Excel report.
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-800">Season</span>
          <input
            type="text"
            aria-label="Season"
            value={season}
            onChange={(event) => setSeason(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            placeholder={defaultSeason}
          />
          <span className="mt-2 block text-xs leading-5 text-zinc-600">
            Subtitle row for cropping season or reporting period.
          </span>
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
            <DownloadSimpleIcon size={16} className="text-emerald-700" />
            Output File Name
          </span>
          <input
            type="text"
            aria-label="Output file name"
            value={outputFileName}
            onChange={(event) => setOutputFileName(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            placeholder={defaultOutputFileName}
          />
          <span className="mt-2 block text-xs leading-5 text-zinc-600">
            Download name for the final `.xlsx` report.
          </span>
        </label>
      </div>

      <div className="mt-5">
        <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
          <FilePdfIcon size={18} className="text-emerald-700" />
          Source PDF Files
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          aria-label="Upload PDF files for LIPA summary"
          onChange={(event) => {
            handleIncomingFiles(event.target.files);
          }}
          className="hidden"
        />

        <button
          type="button"
          aria-label="Choose PDF files"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleIncomingFiles(event.dataTransfer.files);
          }}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-8 text-base text-zinc-700 transition hover:border-emerald-600 hover:bg-emerald-50"
        >
          <UploadSimpleIcon size={34} className="text-emerald-700" />
          <span className="font-medium">Drag and drop PDFs here, or click to browse</span>
        </button>
        <p className="mt-2 text-xs leading-5 text-zinc-600">
          Upload one or more PDF documents. Each file must have a division name and
          a target page number. The AI will scan only one page number per file.
        </p>
      </div>

      {items.length > 0 && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="mb-3 text-sm font-medium text-zinc-800">
            Division Mapping per File
          </p>
          <p className="mb-3 text-xs leading-5 text-zinc-600">
            Set both the division and the exact page number to scan. LIPA Summary
            strictly processes one page per PDF.
          </p>
          <p className="mb-3 text-xs leading-5 text-zinc-600">
            Page input guide (same style as NIA Automation):{" "}
            <span className="font-medium">0</span> means last page,{" "}
            <span className="font-medium">1</span> means page 1,{" "}
            <span className="font-medium">1,3,5</span> and{" "}
            <span className="font-medium">1-5</span> are multi-page examples from
            the old flow. For this LIPA tool, use only one value per file (
            <span className="font-medium">0</span> or a single page number).
          </p>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-[1fr_220px_120px_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {String(index + 1)}. {item.file.name}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Size: {(item.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <input
                  type="text"
                  aria-label={`Division for ${item.file.name}`}
                  value={item.divisionName}
                  onChange={(event) =>
                    handleDivisionChange(item.id, event.target.value)
                  }
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  placeholder="Division name"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  aria-label={`Page number for ${item.file.name}`}
                  value={item.pageNumber ?? "1"}
                  onChange={(event) =>
                    handlePageNumberChange(item.id, event.target.value)
                  }
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  placeholder="Page #"
                />
                <button
                  type="button"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => handleRemoveFile(item.id)}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 transition hover:bg-zinc-100"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Generate LIPA summary report"
          onClick={() => {
            void handleGenerate();
          }}
          disabled={isGenerating || items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          <DownloadSimpleIcon size={18} />
          {isGenerating ? "Generating..." : "Generate LIPA Report"}
        </button>

        <button
          type="button"
          aria-label="Reset LIPA summary form"
          onClick={handleReset}
          disabled={isGenerating}
          className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          Reset
        </button>
      </div>
      {isGenerating && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-600">
            <span>{progressLabel || "Processing..."}</span>
            <span>{String(progressPercent)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-emerald-700 transition-all duration-500 ease-out"
              style={{ width: `${String(progressPercent)}%` }}
            />
          </div>
        </div>
      )}
      <p className="mt-2 text-xs leading-5 text-zinc-600">
        Generation returns your final report immediately as an Excel file. No
        uploaded documents are stored by this LIPA Summary flow.
      </p>

      {message && (
        <p
          className="mt-4 whitespace-pre-line rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </section>
  );
}
