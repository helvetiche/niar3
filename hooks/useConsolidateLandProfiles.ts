import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useTemplates } from "@/hooks/useTemplates";
import { getErrorMessage } from "@/lib/utils";

interface UploadedFile {
  file: File;
  id: string;
  divisionNumber?: string;
  irrigationAssociation?: string;
}

interface ConsolidationResult {
  count: number;
  errors: string[];
  warnings: string[];
}

export function useConsolidateLandProfiles() {
  const templateInputRef = useRef<HTMLInputElement | null>(null);
  const landProfileInputRef = useRef<HTMLInputElement | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [landProfileFiles, setLandProfileFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ConsolidationResult | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isOverlayOpaque, setIsOverlayOpaque] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const { data: consolidationTemplates = [] } = useTemplates("consolidation");

  // Auto-select the first template when templates are loaded
  useEffect(() => {
    if (
      consolidationTemplates.length > 0 &&
      !selectedTemplateId &&
      !templateFile
    ) {
      setSelectedTemplateId(consolidationTemplates[0].id);
    }
  }, [consolidationTemplates, selectedTemplateId, templateFile]);

  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const startTimer = () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
    }
    elapsedIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  };

  const showOverlay = () => {
    setIsOverlayVisible(true);
    setIsOverlayOpaque(false);
    window.requestAnimationFrame(() => {
      setIsOverlayOpaque(true);
    });
  };

  const hideOverlay = async (fadeMs: number) => {
    setIsOverlayOpaque(false);
    await wait(fadeMs);
    setIsOverlayVisible(false);
  };

  const handleTemplateSelection = (incoming: FileList | null) => {
    const file = incoming?.[0];
    if (file) {
      setTemplateFile(file);
      setSelectedTemplateId("");
      setResult(null);
    }
  };

  const handleLandProfileSelection = (incoming: FileList | null) => {
    const files = Array.from(incoming ?? []);
    const newFiles = files.map((file) => {
      // Parse filename: DIV. {DIVISION NO.} - {DIVISION NAME} IA.xlsx
      const fileName = file.name.replace(/\.(xlsx|xls)$/i, ""); // Remove extension
      const match = fileName.match(/DIV\.\s*(\d+)\s*-\s*(.+?)\s*IA$/i);

      let divisionNumber = "";
      let irrigationAssociation = "";

      if (match) {
        divisionNumber = match[1]; // Extract division number
        irrigationAssociation = match[2].trim(); // Extract division name (IA)
      }

      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        divisionNumber,
        irrigationAssociation,
      };
    });

    setLandProfileFiles((prev) => [...prev, ...newFiles]);
    setResult(null);

    if (landProfileInputRef.current) {
      landProfileInputRef.current.value = "";
    }
  };

  const removeLandProfileFile = (id: string) => {
    setLandProfileFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileDetails = (
    id: string,
    field: "divisionNumber" | "irrigationAssociation",
    value: string,
  ) => {
    setLandProfileFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
  };

  const removeTemplateFile = () => {
    setTemplateFile(null);
    if (templateInputRef.current) {
      templateInputRef.current.value = "";
    }
  };

  const handleTemplateIdChange = (id: string) => {
    setSelectedTemplateId(id);
    setTemplateFile(null);
    if (templateInputRef.current) {
      templateInputRef.current.value = "";
    }
  };

  const fetchTemplateBlob = async (templateId: string): Promise<Blob> => {
    const response = await fetch(`/api/v1/templates/${templateId}/download`);
    if (!response.ok) {
      throw new Error("Failed to fetch template");
    }
    return await response.blob();
  };

  const buildFormData = async (): Promise<FormData> => {
    const formData = new FormData();

    if (templateFile) {
      formData.append("template", templateFile);
    } else if (selectedTemplateId) {
      const templateBlob = await fetchTemplateBlob(selectedTemplateId);
      const templateFileName =
        consolidationTemplates.find((t) => t.id === selectedTemplateId)?.name ||
        "template.xlsx";
      formData.append("template", templateBlob, templateFileName);
    }

    landProfileFiles.forEach((item, index) => {
      formData.append(`landProfile_${index}`, item.file);
      formData.append(`divisionNumber_${index}`, item.divisionNumber || "");
      formData.append(
        `irrigationAssociation_${index}`,
        item.irrigationAssociation || "",
      );
    });

    return formData;
  };

  const downloadConsolidatedFile = (blob: Blob) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Format: CONSOLIDATION MM/DD/YYYY
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    const filename = `CONSOLIDATION ${month}-${day}-${year}.zip`;

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const parseConsolidationResult = (
    response: Response,
  ): ConsolidationResult => {
    const processedCount = parseInt(
      response.headers.get("X-Processed-Count") || "0",
    );

    // Decode base64 encoded headers
    const errorsHeader = response.headers.get("X-Errors") || "";
    const warningsHeader = response.headers.get("X-Warnings") || "";

    let errors: string[] = [];
    let warnings: string[] = [];

    try {
      if (errorsHeader) {
        const decoded = atob(errorsHeader);
        errors = JSON.parse(decoded);
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("Failed to parse errors header:", e);
      }
    }

    try {
      if (warningsHeader) {
        const decoded = atob(warningsHeader);
        warnings = JSON.parse(decoded);
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("Failed to parse warnings header:", e);
      }
    }

    return { count: processedCount, errors, warnings };
  };

  const handleConsolidate = async () => {
    if (
      (!templateFile && !selectedTemplateId) ||
      landProfileFiles.length === 0
    ) {
      toast.error("Please select a template and upload IFR files.");
      return;
    }

    setIsProcessing(true);
    setIsFinalizing(false);
    setElapsedSeconds(0);
    showOverlay();
    startTimer();

    try {
      const formData = await buildFormData();

      const response = await fetch("/api/v1/consolidate-land-profiles", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to consolidate files");
      }

      setIsFinalizing(true);

      const consolidationResult = parseConsolidationResult(response);
      const blob = await response.blob();

      downloadConsolidatedFile(blob);
      setResult(consolidationResult);

      if (consolidationResult.errors.length === 0) {
        toast.success(
          `Successfully consolidated ${consolidationResult.count} IFR file(s)!`,
        );
      } else {
        toast.success(
          `Consolidated with ${consolidationResult.errors.length} error(s). Check results for details.`,
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to consolidate IFR files."));
      setResult(null);
    } finally {
      stopTimer();
      await hideOverlay(300);
      setIsProcessing(false);
    }
  };

  const canProceedToStep = (step: number): boolean => {
    if (step === 0) return landProfileFiles.length > 0;
    if (step === 1) {
      return landProfileFiles.every(
        (f) => f.divisionNumber && f.irrigationAssociation,
      );
    }
    return true;
  };

  return {
    // Refs
    templateInputRef,
    landProfileInputRef,
    // State
    templateFile,
    selectedTemplateId,
    landProfileFiles,
    isProcessing,
    result,
    consolidationTemplates,
    isOverlayVisible,
    isOverlayOpaque,
    elapsedSeconds,
    isFinalizing,
    // Handlers
    handleTemplateSelection,
    handleLandProfileSelection,
    removeLandProfileFile,
    removeTemplateFile,
    handleTemplateIdChange,
    handleConsolidate,
    canProceedToStep,
    updateFileDetails,
  };
}
