import { useRef, useState } from "react";
import toast from "react-hot-toast";
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

export function useLipaSummary() {
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

  const canProceedToStep = (step: number): boolean => {
    if (step === 0) return items.length > 0;
    return true;
  };

  return {
    // Refs
    fileInputRef,
    // State
    items,
    title,
    season,
    outputFileName,
    isGenerating,
    progressPercent,
    progressLabel,
    // Handlers
    handleIncomingFiles,
    handleDivisionChange,
    handlePageNumberChange,
    handleRemoveItem,
    setTitle,
    setSeason,
    setOutputFileName,
    handleGenerate,
    canProceedToStep,
  };
}
