import { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import {
  mergeFiles,
  type MergeMode,
  type PdfPageOrderItem,
} from "@/lib/api/merge-files";
import { getBaseName } from "@/lib/file-utils";
import { downloadBlob, getErrorMessage } from "@/lib/utils";

type PdfPageItem = PdfPageOrderItem & {
  id: string;
  label: string;
};

const pdfDefaultName = "Merged PDF Document";
const excelDefaultName = "Merged Excel Workbook";

export function useMergeFiles() {
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

  const processIncomingFiles = useCallback(
    async (incomingFileList: FileList | null) => {
      const incomingFiles = Array.from(incomingFileList ?? []);
      if (incomingFiles.length === 0) return;

      setFiles(incomingFiles);
      setMessage("");

      if (mode === "pdf") {
        setIsPreparingPages(true);
        try {
          const pages = await buildPdfPages(incomingFiles);
          setPdfPages(pages);
        } catch (error) {
          setMessage(getErrorMessage(error, "Could not read PDF files"));
        } finally {
          setIsPreparingPages(false);
        }
      } else {
        const names: Record<string, string> = {};
        incomingFiles.forEach((file, index) => {
          names[index] = getBaseName(file.name);
        });
        setExcelPageNames(names);
      }
    },
    [mode],
  );

  const changeMergeMode = useCallback(
    (nextMode: MergeMode) => {
      if (nextMode === mode) return;
      setMode(nextMode);
      setFileName(nextMode === "pdf" ? pdfDefaultName : excelDefaultName);
      setFiles([]);
      setPdfPages([]);
      setExcelPageNames({});
      setMessage("");
      setIsPreparingPages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [mode],
  );

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setPdfPages((items) => {
      const nextItems = [...items];
      const [movedItem] = nextItems.splice(fromIndex, 1);
      if (!movedItem) return items;
      nextItems.splice(toIndex, 0, movedItem);
      return nextItems;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setExcelPageNames((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const updateExcelPageName = useCallback(
    (fileIndex: number, value: string) => {
      setExcelPageNames((prev) => ({
        ...prev,
        [fileIndex]: value,
      }));
    },
    [],
  );

  const executeMerge = useCallback(async () => {
    if (files.length === 0) {
      setMessage("Please select files to merge first.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Merging files...");

    try {
      const result = await mergeFiles({
        mode,
        files,
        fileName: fileName.trim() || defaultFileName,
        pageOrder: mode === "pdf" ? pdfPages : undefined,
        excelPageNames: mode === "excel" ? Object.values(excelPageNames) : undefined,
      });

      downloadBlob(result.blob, result.fileName);
      setMessage(`Success! ${mode.toUpperCase()} file downloaded.`);
    } catch (error) {
      setMessage(getErrorMessage(error, "Merge failed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [files, mode, pdfPages, excelPageNames, fileName, defaultFileName]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setPdfPages([]);
    setExcelPageNames({});
    setMessage("");
    setIsPreparingPages(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return {
    fileInputRef,
    draggedIndexRef,
    mode,
    files,
    pdfPages,
    excelPageNames,
    fileName,
    message,
    isSubmitting,
    isPreparingPages,
    defaultFileName,
    processIncomingFiles,
    changeMergeMode,
    reorderPages,
    removeFile,
    updateExcelPageName,
    executeMerge,
    clearAll,
    setFileName,
  };
}
