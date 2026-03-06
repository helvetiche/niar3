import { useRef, useState } from "react";
import toast from "react-hot-toast";
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

export function useConsolidateLandProfiles() {
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
      setSelectedTemplateId("");
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

  const handleTemplateIdChange = (id: string) => {
    setSelectedTemplateId(id);
    setTemplateFile(null);
    if (templateInputRef.current) {
      templateInputRef.current.value = "";
    }
  };

  const fetchTemplateBlob = async (templateId: string): Promise<Blob> => {
    const response = await fetch(`/api/v1/templates/${templateId}`);
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
    });

    return formData;
  };

  const downloadConsolidatedFile = (blob: Blob) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consolidated-land-profiles-${Date.now()}.xlsx`;
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
    const errors = JSON.parse(response.headers.get("X-Errors") || "[]");
    const warnings = JSON.parse(response.headers.get("X-Warnings") || "[]");

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
      setIsProcessing(false);
    }
  };

  const canProceedToStep = (step: number): boolean => {
    if (step === 0) return !!(templateFile || selectedTemplateId);
    if (step === 1) return landProfileFiles.length > 0;
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
    // Handlers
    handleTemplateSelection,
    handleLandProfileSelection,
    removeLandProfileFile,
    removeTemplateFile,
    handleTemplateIdChange,
    handleConsolidate,
    canProceedToStep,
  };
}
