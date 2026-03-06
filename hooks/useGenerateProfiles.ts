import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTemplates } from "@/hooks/useTemplates";
import { generateBillingUnitsZip } from "@/lib/api/billing-units";
import { getBaseName, getFileKey, sanitizeFolderName } from "@/lib/file-utils";
import { downloadBlob, getErrorMessage } from "@/lib/utils";
import { ERROR_MESSAGES } from "@/constants/error-messages";

const defaultZipName = "BILLING UNITS";
const defaultBillingUnitFolderName = "billing unit";
const OVERLAY_OPAQUE_MS = 280;
const OVERLAY_FADE_MS = 320;
const OVERLAY_ERROR_FADE_MS = 240;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export function useGenerateProfiles() {
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [zipName, setZipName] = useState(defaultZipName);
  const [billingUnitFolderName, setBillingUnitFolderName] = useState(
    defaultBillingUnitFolderName,
  );
  const [sourceFolderNames, setSourceFolderNames] = useState<
    Record<string, string>
  >({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isOverlayOpaque, setIsOverlayOpaque] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const elapsedIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: ifrTemplates = [] } = useTemplates("ifr-scanner");

  useEffect(() => {
    if (sourceFiles.length === 0) {
      setSourceFolderNames({});
      return;
    }

    setSourceFolderNames((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getFileKey(file);
        const existingName = previous[fileKey];
        next[fileKey] = existingName ? existingName : getBaseName(file.name);
      });
      return next;
    });
  }, [sourceFiles]);

  useEffect(() => {
    return () => {
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelection = (incoming: FileList | null) => {
    setSourceFiles(Array.from(incoming ?? []));
  };

  const updateFolderName = (fileKey: string, value: string) => {
    const sanitized = sanitizeFolderName(value);
    setSourceFolderNames((previous) => ({
      ...previous,
      [fileKey]: sanitized,
    }));
  };

  const startTimer = () => {
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
    }
    elapsedIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
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

  const generateBillingUnits = async () => {
    if (sourceFiles.length === 0) {
      toast.error("Please upload one or more source Excel files first.");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("Please select a template from Template Manager.");
      return;
    }

    setIsGenerating(true);
    setIsFinalizing(false);
    setElapsedSeconds(0);
    showOverlay();
    startTimer();

    try {
      const blob = await generateBillingUnitsZip(sourceFiles, {
        templateId: selectedTemplateId,
        billingUnitFolderName,
        sourceFolderNames,
      });
      const outputName = zipName.trim() || defaultZipName;
      const filename = outputName.endsWith(".zip")
        ? outputName
        : `${outputName}.zip`;
      downloadBlob(blob, filename);

      toast.success("Billing Unit ZIP has been downloaded.");
      setIsFinalizing(true);
      stopTimer();
      await wait(OVERLAY_OPAQUE_MS);
      await hideOverlay(OVERLAY_FADE_MS);
    } catch (error) {
      toast.error(
        getErrorMessage(error, ERROR_MESSAGES.FAILED_GENERATE_BILLING_UNITS),
      );
      stopTimer();
      await hideOverlay(OVERLAY_ERROR_FADE_MS);
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceedToStep = (step: number): boolean => {
    if (step === 0) return sourceFiles.length > 0;
    if (step === 2) return !!selectedTemplateId;
    return true;
  };

  return {
    // Refs
    fileInputRef,
    // State
    sourceFiles,
    selectedTemplateId,
    zipName,
    billingUnitFolderName,
    sourceFolderNames,
    isGenerating,
    isOverlayVisible,
    isOverlayOpaque,
    elapsedSeconds,
    isFinalizing,
    ifrTemplates,
    // Handlers
    handleFileSelection,
    setSelectedTemplateId,
    setZipName,
    setBillingUnitFolderName,
    updateFolderName,
    generateBillingUnits,
    canProceedToStep,
  };
}
