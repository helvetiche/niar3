"use client";

import { useRef, useState } from "react";
import {
  ArrowsDownUpIcon,
  ArrowsMergeIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  FileXlsIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { PDFDocument } from "pdf-lib";
import {
  mergeFiles,
  type MergeMode,
  type PdfPageOrderItem,
} from "@/lib/api/merge-files";
import { getFileKey, getBaseName } from "@/lib/file-utils";
import { downloadBlob, getErrorMessage } from "@/lib/utils";

type PdfPageItem = PdfPageOrderItem & {
  id: string;
  label: string;
};

const pdfDefaultName = "Merged PDF Document";
const excelDefaultName = "Merged Excel Workbook";

const reorderItems = <T,>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] => {
  if (fromIndex === toIndex) return items;
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  if (!movedItem) return items;
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

export function MergeFilesTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draggedIndexRef = useRef<number | null>(null);

  const [mode, setMode] = useState<MergeMode>("pdf");
  const [files, setFiles] = useState<File[]>([]);
  const [pdfPages, setPdfPages] = useState<PdfPageItem[]>([]);
  const [excelPageNames, setExcelPageNames] = useState<Record<string, string>>(
    {},
  );
  const [fileName, setFileName] = useState(pdfDefaultName);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingPages, setIsPreparingPages] = useState(false);

  const defaultFileName = mode === "pdf" ? pdfDefaultName : excelDefaultName;

  const clearSelections = () => {
    setFiles([]);
    setPdfPages([]);
    setExcelPageNames({});
    setMessage("");
    setIsPreparingPages(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleModeChange = (nextMode: MergeMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setFileName(nextMode === "pdf" ? pdfDefaultName : excelDefaultName);
    clearSelections();
  };

  const buildPdfPages = async (
    incomingFiles: File[],
  ): Promise<PdfPageItem[]> => {
    const pages: PdfPageItem[] = [];

    for (let fileIndex = 0; fileIndex < incomingFiles.length; fileIndex += 1) {
      const file = incomingFiles[fileIndex];
      const fileBytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(fileBytes);
      const pageCount = doc.getPageCount();

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        pages.push({
          id: `${String(fileIndex)}-${String(pageIndex)}`,
          fileIndex,
          pageIndex,
          label: `${file.name} - Page ${String(pageIndex + 1)}`,
        });
      }
    }

    return pages;
  };

  const handleIncomingFiles = async (incomingFileList: FileList | null) => {
    const incomingFiles = Array.from(incomingFileList ?? []);
    const filteredIncomingFiles = incomingFiles.filter((file) =>
      mode === "pdf"
        ? file.name.toLowerCase().endsWith(".pdf")
        : /\.(xlsx|xls)$/i.test(file.name),
    );

    if (filteredIncomingFiles.length === 0) return;

    const existingKeys = new Set(files.map((file) => getFileKey(file)));
    const uniqueIncomingFiles = filteredIncomingFiles.filter(
      (file) => !existingKeys.has(getFileKey(file)),
    );
    if (uniqueIncomingFiles.length === 0) return;

    const nextFiles = [...files, ...uniqueIncomingFiles];

    setFiles(nextFiles);
    setExcelPageNames((previous) => {
      const next: Record<string, string> = {};
      nextFiles.forEach((file) => {
        const key = getFileKey(file);
        next[key] = previous[key] ?? getBaseName(file.name);
      });
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMessage("");

    if (mode !== "pdf" || nextFiles.length === 0) {
      setPdfPages([]);
      return;
    }

    try {
      setIsPreparingPages(true);
      setMessage("Reading PDF pages for sequence editor...");
      const pages = await buildPdfPages(nextFiles);
      setPdfPages(pages);
      setMessage("");
    } catch (error) {
      setPdfPages([]);
      setMessage(
        getErrorMessage(error, "Failed to read one or more PDF files."),
      );
    } finally {
      setIsPreparingPages(false);
    }
  };

  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index;
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndexRef.current === null) return;
    setPdfPages((previous) =>
      reorderItems(previous, draggedIndexRef.current as number, targetIndex),
    );
    draggedIndexRef.current = null;
  };

  const handleMovePage = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === pdfPages.length - 1) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    setPdfPages((previous) => reorderItems(previous, index, nextIndex));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setMessage("Please upload at least two files.");
      return;
    }

    if (mode === "pdf" && pdfPages.length === 0) {
      setMessage("No PDF pages detected. Please reselect your PDF files.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Merging files...");

    try {
      const result = await mergeFiles({
        mode,
        files,
        fileName: fileName.trim(),
        excelPageNames:
          mode === "excel"
            ? files.map(
                (file) => excelPageNames[getFileKey(file)]?.trim() ?? "",
              )
            : undefined,
        pageOrder:
          mode === "pdf"
            ? pdfPages.map((item) => ({
                fileIndex: item.fileIndex,
                pageIndex: item.pageIndex,
              }))
            : undefined,
      });

      downloadBlob(result.blob, result.fileName);

      const outputTypeLabel = mode === "pdf" ? "pages" : "worksheets";
      setMessage(
        `Success. Merged ${String(result.mergedCount)} ${outputTypeLabel} into ${result.fileName}.`,
      );
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to merge files."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptedTypes = mode === "pdf" ? ".pdf" : ".xlsx,.xls";

  const handleExcelPageNameChange = (fileKey: string, value: string) => {
    setExcelPageNames((previous) => ({
      ...previous,
      [fileKey]: value,
    }));
  };

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <ArrowsMergeIcon size={18} className="text-white" />
          </span>
          Merge Files
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <FilePdfIcon size={12} className="text-white" />
            PDF Page Ordering
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <FileXlsIcon size={12} className="text-white" />
            Excel Workbook Merge
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85 text-justify">
          Merge multiple PDFs with precise drag-and-drop page sequencing, or
          combine Excel workbooks into one organized file while preserving each
          source sheet. Set a clear output filename, review your selected files,
          then download instantly. The tool is optimized for quick batch
          processing, cleaner handoffs, and consistent document packaging across
          teams daily.
        </p>
      </div>

      <div className="mb-4">
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
          <div>
            <span className="mb-1 block text-sm font-medium text-white/90">
              Mode
            </span>
            <div className="inline-flex rounded-lg border border-white/35 bg-white/10 p-1 backdrop-blur-sm">
              <button
                type="button"
                aria-label="Switch to PDF merge mode"
                onClick={() => handleModeChange("pdf")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  mode === "pdf"
                    ? "bg-white text-emerald-900"
                    : "text-white hover:bg-white/15"
                }`}
              >
                Combine PDF
              </button>
              <button
                type="button"
                aria-label="Switch to Excel merge mode"
                onClick={() => handleModeChange("excel")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  mode === "excel"
                    ? "bg-white text-emerald-900"
                    : "text-white hover:bg-white/15"
                }`}
              >
                Combine Excel
              </button>
            </div>
          </div>

          <label className="min-w-0" htmlFor="merge-output-file-name-input">
            <span className="mb-1 flex items-center gap-2 text-sm font-medium text-white/90">
              <DownloadSimpleIcon size={16} className="text-white" />
              Output File Name
            </span>
            <input
              id="merge-output-file-name-input"
              type="text"
              aria-label="Input output file name"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              className="w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder={defaultFileName}
            />
          </label>
        </div>

        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          <p className="text-xs leading-5 text-white/80">
            Use <span className="font-medium">Combine PDF</span> when you need
            one final PDF with custom page order. Use{" "}
            <span className="font-medium">Combine Excel</span> to merge multiple
            workbooks where each worksheet remains separate.
          </p>
          <p className="text-xs leading-5 text-white/80">
            This value becomes your downloaded output filename. Keep it short
            and clear (for example:{" "}
            <span className="font-medium">Week 7 PDF Batch</span> or{" "}
            <span className="font-medium">Division 3 Excel Merge</span>).
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
            {mode === "pdf" ? (
              <FilePdfIcon size={18} className="text-white" />
            ) : (
              <FileXlsIcon size={18} className="text-white" />
            )}
            {mode === "pdf" ? "PDF Files" : "Excel Files"}
          </span>

          <input
            id="merge-file-input"
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            multiple
            aria-label={
              mode === "pdf"
                ? "Upload one or more PDF files"
                : "Upload one or more Excel files"
            }
            onChange={(event) => {
              void handleIncomingFiles(event.target.files);
            }}
            className="hidden"
          />

          <button
            type="button"
            aria-label={
              mode === "pdf" ? "Choose PDF files" : "Choose Excel files"
            }
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              void handleIncomingFiles(event.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/10 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/15"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              {mode === "pdf"
                ? "Drag and drop PDF files here, or click to browse"
                : "Drag and drop Excel files here, or click to browse"}
            </span>
          </button>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
              {mode === "pdf" ? (
                <FilePdfIcon size={12} className="text-white" />
              ) : (
                <FileXlsIcon size={12} className="text-white" />
              )}
              Supported: {mode === "pdf" ? ".pdf" : ".xlsx, .xls"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-white/80">
            Upload at least two files. For PDF mode, only{" "}
            <span className="font-medium">.pdf</span> files are accepted and
            every page can be reordered before merge. For Excel mode, upload{" "}
            <span className="font-medium">.xlsx</span> or{" "}
            <span className="font-medium">.xls</span> files and all source
            worksheets will be copied into one combined workbook.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-2 text-sm text-white/85">
            {mode === "pdf" ? (
              <FilePdfIcon size={16} className="text-white" />
            ) : (
              <FileXlsIcon size={16} className="text-white" />
            )}
            Selected files: {String(files.length)}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/80">
            Tip: keep file sets related to the same report or date range so
            merged output stays organized for your team.
          </p>
        </div>
      )}

      {mode === "pdf" && pdfPages.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/35 bg-white/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <ArrowsDownUpIcon size={16} className="text-white" />
            PDF Page Sequence
          </div>
          <p className="mb-3 text-xs text-white/80">
            Drag and drop rows to define your merged PDF page order before
            combining.
          </p>
          <p className="mb-3 text-xs leading-5 text-white/80">
            Sequence starts at <span className="font-medium">#1</span> and
            follows top to bottom. You can drag rows or use keyboard arrows
            while focused on a row for accessibility.
          </p>
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {pdfPages.map((item, index) => (
              <li key={item.id}>
                <div
                  draggable
                  tabIndex={0}
                  onDragStart={() => {
                    handleDragStart(index);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={() => {
                    handleDrop(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      handleMovePage(index, "up");
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      handleMovePage(index, "down");
                    }
                  }}
                  aria-label={`PDF sequence item ${String(index + 1)} ${item.label}`}
                  className="flex items-center justify-between rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm text-white shadow-sm shadow-emerald-950/10"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="mr-2 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-emerald-900">
                        #{String(index + 1)}
                      </span>
                      {item.label}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${item.label} up`}
                      onClick={() => handleMovePage(index, "up")}
                      className="rounded border border-white/40 px-2 py-1 text-xs text-white transition hover:bg-white/15"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.label} down`}
                      onClick={() => handleMovePage(index, "down")}
                      className="rounded border border-white/40 px-2 py-1 text-xs text-white transition hover:bg-white/15"
                    >
                      Down
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === "excel" && files.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/35 bg-white/10 p-4">
          <p className="mb-3 text-sm font-medium text-white">
            Excel Page Name per File
          </p>
          <p className="mb-3 text-xs text-white/80">
            Set the page (sheet) name to use for each uploaded Excel file in the
            merged workbook.
          </p>
          <div className="space-y-3">
            {files.map((file, index) => {
              const fileKey = getFileKey(file);
              return (
                <div
                  key={fileKey}
                  className="grid gap-2 rounded-lg border border-white/30 bg-white/10 p-3 md:grid-cols-[1fr_280px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {String(index + 1)}. {file.name}
                    </p>
                  </div>
                  <input
                    type="text"
                    aria-label={`Page name for ${file.name}`}
                    value={excelPageNames[fileKey] ?? ""}
                    onChange={(event) =>
                      handleExcelPageNameChange(fileKey, event.target.value)
                    }
                    className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder={getBaseName(file.name)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Merge selected files and download output"
          onClick={() => {
            void handleMerge();
          }}
          disabled={
            isSubmitting ||
            isPreparingPages ||
            files.length < 2 ||
            (mode === "pdf" && pdfPages.length === 0)
          }
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80"
        >
          <ArrowsMergeIcon size={18} />
          {isSubmitting ? "Merging..." : "Merge Files"}
        </button>

        <button
          type="button"
          aria-label="Reset selected files and merge settings"
          onClick={clearSelections}
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg border border-white/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/60"
        >
          Reset
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-white/80">
        Click <span className="font-medium">Merge Files</span> to generate and
        download your final output immediately. Use{" "}
        <span className="font-medium">Reset</span> to clear files, page order,
        and status messages before starting a new batch.
      </p>

      {message && (
        <p
          className="mt-4 whitespace-pre-line rounded-lg border border-white/35 bg-white/10 px-4 py-3 text-sm text-white"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </section>
  );
}
